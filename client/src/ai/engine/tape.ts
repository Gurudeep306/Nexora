/*
  The tape: a small matrix engine that records every operation it runs,
  with its real values, and then runs the backward pass to give every
  gradient. Stage builds animations from the tape (stage/trace.ts), so any
  computation written here becomes a scene without drawing it by hand.

    const t = new Tape()
    const x = t.input('x', [[0, 1]])
    const W = t.param('W1', [[…], …])
    const z = t.matmul(x, W, 'z1')
    const a = t.tanh(z, 'a1')
    …
    t.backward(loss)

  Every value is a matrix (rows × columns; a vector is 1 × n). Shared with
  Node tests: dependency-free and erasable-syntax only.
*/

export type M = number[][]
export type Op = 'input' | 'param' | 'matmul' | 'add' | 'mul' | 'scale' | 'transpose' | 'tanh' | 'sigmoid' | 'relu' | 'softmax' | 'bce' | 'mse'

export interface TNode {
  id: number
  op: Op
  label: string
  inputs: number[]
  value: M
  grad: M | null
  /** For scale: the factor. */
  k?: number
}

const shape = (a: M): [number, number] => [a.length, a[0]?.length ?? 0]
const zeros = (r: number, c: number): M => Array.from({ length: r }, () => new Array(c).fill(0))
const map = (a: M, f: (v: number, i: number, j: number) => number): M => a.map((row, i) => row.map((v, j) => f(v, i, j)))
const matmul = (a: M, b: M): M => a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)))
const transpose = (a: M): M => a[0].map((_, j) => a.map((r) => r[j]))
const sig = (z: number) => 1 / (1 + Math.exp(-z))

export class Tape {
  nodes: TNode[] = []

  private push(op: Op, label: string, inputs: number[], value: M, k?: number): number {
    const id = this.nodes.length
    this.nodes.push({ id, op, label, inputs, value, grad: null, ...(k != null ? { k } : {}) })
    return id
  }
  v(id: number): M {
    return this.nodes[id].value
  }

  input(label: string, value: M) {
    return this.push('input', label, [], value)
  }
  param(label: string, value: M) {
    return this.push('param', label, [], value)
  }
  matmul(a: number, b: number, label: string) {
    const [, ac] = shape(this.v(a))
    const [br] = shape(this.v(b))
    if (ac !== br) throw new Error(`matmul ${label}: ${shape(this.v(a)).join('×')} times ${shape(this.v(b)).join('×')}`)
    return this.push('matmul', label, [a, b], matmul(this.v(a), this.v(b)))
  }
  /** a + b; b may be one row, added to every row of a (a bias). */
  add(a: number, b: number, label: string) {
    const B = this.v(b)
    return this.push('add', label, [a, b], map(this.v(a), (v, i, j) => v + (B.length === 1 ? B[0][j] : B[i][j])))
  }
  /** Element by element. */
  mul(a: number, b: number, label: string) {
    const B = this.v(b)
    return this.push('mul', label, [a, b], map(this.v(a), (v, i, j) => v * B[i][j]))
  }
  scale(a: number, k: number, label: string) {
    return this.push('scale', label, [a], map(this.v(a), (v) => v * k), k)
  }
  transpose(a: number, label: string) {
    return this.push('transpose', label, [a], transpose(this.v(a)))
  }
  tanh(a: number, label: string) {
    return this.push('tanh', label, [a], map(this.v(a), Math.tanh))
  }
  sigmoid(a: number, label: string) {
    return this.push('sigmoid', label, [a], map(this.v(a), sig))
  }
  relu(a: number, label: string) {
    return this.push('relu', label, [a], map(this.v(a), (v) => Math.max(0, v)))
  }
  /** Softmax of each row. */
  softmax(a: number, label: string) {
    return this.push(
      'softmax',
      label,
      [a],
      this.v(a).map((row) => {
        const m = Math.max(...row)
        const e = row.map((v) => Math.exp(v - m))
        const s = e.reduce((x, y) => x + y, 0)
        return e.map((v) => v / s)
      }),
    )
  }
  /** Mean binary cross-entropy of predictions p against targets y (same shape); a 1 × 1 result. */
  bce(p: number, y: number, label: string) {
    const P = this.v(p)
    const Y = this.v(y)
    let s = 0
    let n = 0
    P.forEach((row, i) =>
      row.forEach((v, j) => {
        s += -(Y[i][j] * Math.log(v + 1e-12) + (1 - Y[i][j]) * Math.log(1 - v + 1e-12))
        n++
      }),
    )
    return this.push('bce', label, [p, y], [[s / n]])
  }
  /** Mean squared error; a 1 × 1 result. */
  mse(p: number, y: number, label: string) {
    const P = this.v(p)
    const Y = this.v(y)
    let s = 0
    let n = 0
    P.forEach((row, i) =>
      row.forEach((v, j) => {
        s += (v - Y[i][j]) ** 2
        n++
      }),
    )
    return this.push('mse', label, [p, y], [[s / n]])
  }

  /** Reverse-mode differentiation from a 1 × 1 node: fills every grad. */
  backward(out: number) {
    for (const n of this.nodes) n.grad = zeros(...shape(n.value))
    this.nodes[out].grad = [[1]]
    for (let id = out; id >= 0; id--) {
      const n = this.nodes[id]
      const g = n.grad!
      const acc = (k: number, d: M) => {
        const G = this.nodes[k].grad!
        if (d.length === G.length) d.forEach((row, i) => row.forEach((v, j) => (G[i][j] += v)))
        else d.forEach((row) => row.forEach((v, j) => (G[0][j] += v))) // a broadcast row (bias) collects every row
      }
      const [a, b] = n.inputs
      switch (n.op) {
        case 'matmul':
          acc(a, matmul(g, transpose(this.v(b))))
          acc(b, matmul(transpose(this.v(a)), g))
          break
        case 'add':
          acc(a, g)
          acc(b, g)
          break
        case 'mul':
          acc(a, map(g, (v, i, j) => v * this.v(b)[i][j]))
          acc(b, map(g, (v, i, j) => v * this.v(a)[i][j]))
          break
        case 'scale':
          acc(a, map(g, (v) => v * n.k!))
          break
        case 'transpose':
          acc(a, transpose(g))
          break
        case 'tanh':
          acc(a, map(g, (v, i, j) => v * (1 - n.value[i][j] ** 2)))
          break
        case 'sigmoid':
          acc(a, map(g, (v, i, j) => v * n.value[i][j] * (1 - n.value[i][j])))
          break
        case 'relu':
          acc(a, map(g, (v, i, j) => (this.v(a)[i][j] > 0 ? v : 0)))
          break
        case 'softmax':
          acc(
            a,
            n.value.map((row, i) => {
              const dot = row.reduce((s, y, j) => s + y * g[i][j], 0)
              return row.map((y, j) => y * (g[i][j] - dot))
            }),
          )
          break
        case 'bce': {
          const P = this.v(a)
          const Y = this.v(b)
          const cnt = P.length * P[0].length
          acc(a, map(P, (p, i, j) => (g[0][0] * (p - Y[i][j])) / (p * (1 - p) + 1e-12) / cnt))
          break
        }
        case 'mse': {
          const P = this.v(a)
          const Y = this.v(b)
          const cnt = P.length * P[0].length
          acc(a, map(P, (p, i, j) => (g[0][0] * 2 * (p - Y[i][j])) / cnt))
          break
        }
      }
    }
  }
}
