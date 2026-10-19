/*
  Adder Race — the pure logic behind the Chapter 4 Live Lab (Digital Logic,
  arithmetic circuits).

  Everything mirrors content/gate-notes/_checks/dl/arithlib.py:
    - a netlist is a list of nodes in topological order, each
      { name, op, args }; op is AND, OR, XOR, NOR (any fan-in), BUF or MUX
      (args = [select, d0, d1]); "0" and "1" are constants;
    - rippleNet / claNet / carrySelectNet build the same circuits as
      arithlib.rca / cla / carry_select (full adder = two half adders + OR;
      CLA with fan-in-k blocks and as many lookahead levels as needed);
    - labNet adds the adder–subtractor row y_i = b_i XOR K with carry in K
      and the flags V = c_n XOR c_(n-1), Z = NOR(sums) (arithlib.lab_adder);
    - arrival is the static longest-path time (a delay per gate type, BUF 0);
    - simulate is the transport-delay simulation: the circuit is settled on
      the old inputs, the new inputs arrive at t = 0, and each gate's output
      at time t is its function of its inputs at time t − d. It returns each
      line's waveform and the time of its last change (its settling time).

  Bit conventions: a0 … a(n−1) with a0 the LSB; carries c0 (= K) … cn; sums
  s0 … s(n−1). Dependency-free and erasable-syntax only:
  tests/gate-notes.test.js imports it in Node and checks it against vectors
  that content/gate-notes/_checks/dl/l4_lab_vectors.py computes with arithlib.
*/

export type Op = 'AND' | 'OR' | 'XOR' | 'NOR' | 'BUF' | 'MUX'
export interface GateNode {
  name: string
  op: Op
  args: string[]
}
export type Net = GateNode[]
export type Kind = 'rca' | 'cla'
export interface Delays {
  [op: string]: number
}

/* ── Builders ─────────────────────────────────────────────────────────── */

/** A full adder from two half adders and an OR (tag keeps the internal names unique). */
function fullAdder(a: string, b: string, cin: string, s: string, cout: string, tag: string): Net {
  const p = `p${tag}`
  const g = `g${tag}`
  const t = `t${tag}`
  return [
    { name: p, op: 'XOR', args: [a, b] },
    { name: g, op: 'AND', args: [a, b] },
    { name: s, op: 'XOR', args: [p, cin] },
    { name: t, op: 'AND', args: [p, cin] },
    { name: cout, op: 'OR', args: [g, t] },
  ]
}

/** n-bit ripple-carry adder (arithlib.rca): operand names are lists, bit 0 first. */
export function rippleNet(n: number, A: string[], B: string[], cin: string, s = 's', c = 'c', tag = ''): Net {
  const net: Net = []
  let carry = cin
  for (let i = 0; i < n; i++) {
    const nxt = `${c}${i + 1}`
    net.push(...fullAdder(A[i], B[i], carry, `${s}${i}`, nxt, `${tag}${i}`))
    carry = nxt
  }
  return net
}

/** Two-level carries out[k] = G_k + P_k G_(k−1) + … + P_k…P_0·cin (arithlib.lookahead). */
function lookahead(gs: string[], ps: string[], cin: string, out: string[], tag: string): Net {
  const net: Net = []
  for (let k = 0; k < gs.length; k++) {
    const terms = [gs[k]]
    for (let j = k - 1; j >= -1; j--) {
      const lits = [...ps.slice(j + 1, k + 1), j >= 0 ? gs[j] : cin]
      const t = `${tag}a${k}_${j + 1}`
      net.push({ name: t, op: 'AND', args: lits })
      terms.push(t)
    }
    net.push({ name: out[k], op: 'OR', args: terms })
  }
  return net
}

const levelsOf = (L: number, k: number) => {
  let d = 0
  let size = 1
  while (size < L) {
    size *= k
    d++
  }
  return d
}

/** n-bit carry look-ahead adder with fan-in-k blocks (arithlib.cla). */
export function claNet(n: number, k = 4, cin = 'c0', b = 'b'): Net {
  const net: Net = []
  for (let i = 0; i < n; i++) {
    net.push({ name: `p${i}`, op: 'XOR', args: [`a${i}`, `${b}${i}`] })
    net.push({ name: `g${i}`, op: 'AND', args: [`a${i}`, `${b}${i}`] })
  }
  const made = new Set<string>()
  const gp = (lo: number, hi: number): [string, string] => {
    if (hi - lo === 1) return [`g${lo}`, `p${lo}`]
    const G = `G${lo}_${hi}`
    const P = `P${lo}_${hi}`
    if (!made.has(G)) {
      const size = (hi - lo) / k
      const subs = Array.from({ length: k }, (_, j) => gp(lo + j * size, lo + (j + 1) * size))
      const gs = subs.map((x) => x[0])
      const ps = subs.map((x) => x[1])
      const terms = [gs[k - 1]]
      for (let j = k - 2; j >= 0; j--) {
        const t = `${G}a${j}`
        net.push({ name: t, op: 'AND', args: [...ps.slice(j + 1), gs[j]] })
        terms.push(t)
      }
      net.push({ name: G, op: 'OR', args: terms })
      net.push({ name: P, op: 'AND', args: ps })
      made.add(G)
    }
    return [G, P]
  }
  const local = (lo: number, hi: number, cIn: string) => {
    const idx = Array.from({ length: hi - lo }, (_, j) => lo + j)
    net.push(...lookahead(idx.map((i) => `g${i}`), idx.map((i) => `p${i}`), cIn, idx.map((i) => `c${i + 1}`), `L${lo}_${hi}`))
  }
  // Carries c(lo+1) … c(hi) (top) or c(lo+1) … c(hi−1) (inside a block whose carry out is made above).
  const carries = (lo: number, hi: number, cIn: string, top: boolean) => {
    const L = hi - lo
    if (L <= k) {
      local(lo, top ? hi : hi - 1, cIn)
      return
    }
    const size = Math.pow(k, levelsOf(L, k) - 1)
    const blocks = Array.from({ length: L / size }, (_, j) => [lo + j * size, lo + (j + 1) * size] as const)
    const use = top ? blocks : blocks.slice(0, -1)
    const subs = use.map(([x, y]) => gp(x, y))
    net.push(...lookahead(subs.map((s) => s[0]), subs.map((s) => s[1]), cIn, use.map(([, y]) => `c${y}`), `T${lo}_${hi}`))
    blocks.forEach(([x, y], j) => carries(x, y, j === 0 ? cIn : `c${x}`, false))
  }
  carries(0, n, cin, true)
  for (let i = 0; i < n; i++) net.push({ name: `s${i}`, op: 'XOR', args: [`p${i}`, i === 0 ? cin : `c${i}`] })
  return order(net)
}

/** Carry-select adder with blocks of blk bits (arithlib.carry_select): MUX args are [select, d0, d1]. */
export function carrySelectNet(n: number, blk: number): Net {
  const bits = (p: string, lo: number) => Array.from({ length: blk }, (_, i) => `${p}${lo + i}`)
  const net: Net = rippleNet(blk, bits('a', 0), bits('b', 0), 'c0', 's', 'c', 'r')
  for (let j = 1; j < n / blk; j++) {
    const lo = j * blk
    for (const v of [0, 1]) net.push(...rippleNet(blk, bits('a', lo), bits('b', lo), String(v), `s${v}_${j}_`, `c${v}_${j}_`, `x${v}${j}_`))
    const sel = `c${lo}`
    for (let i = 0; i < blk; i++) net.push({ name: `s${lo + i}`, op: 'MUX', args: [sel, `s0_${j}_${i}`, `s1_${j}_${i}`] })
    net.push({ name: `c${lo + blk}`, op: 'MUX', args: [sel, `c0_${j}_${blk}`, `c1_${j}_${blk}`] })
  }
  return net
}

/** Topological order (stable), as arithlib.order. */
export function order(net: Net): Net {
  const names = new Set(net.map((x) => x.name))
  const done = new Set<string>()
  const out: Net = []
  let pending = net
  while (pending.length) {
    const rest: Net = []
    for (const node of pending) {
      if (node.args.every((a) => !names.has(a) || done.has(a))) {
        out.push(node)
        done.add(node.name)
      } else rest.push(node)
    }
    if (rest.length === pending.length) throw new Error('netlist has a cycle')
    pending = rest
  }
  return out
}

/** The Adder Race circuit: XOR row y_i = b_i ⊕ K, carry in K, then the adder and the flags. */
export function labNet(kind: Kind, n: number): Net {
  const net: Net = Array.from({ length: n }, (_, i) => ({ name: `y${i}`, op: 'XOR' as Op, args: [`b${i}`, 'K'] }))
  const A = Array.from({ length: n }, (_, i) => `a${i}`)
  const Y = Array.from({ length: n }, (_, i) => `y${i}`)
  net.push(...(kind === 'rca' ? rippleNet(n, A, Y, 'K') : claNet(n, 4, 'K', 'y')))
  net.push({ name: 'V', op: 'XOR', args: [`c${n}`, `c${n - 1}`] })
  net.push({ name: 'Z', op: 'NOR', args: Array.from({ length: n }, (_, i) => `s${i}`) })
  return order(net)
}

export const labInputs = (n: number) => [...Array.from({ length: n }, (_, i) => `a${i}`), ...Array.from({ length: n }, (_, i) => `b${i}`), 'K']

export function labEnv(n: number, a: number, b: number, K: number): Record<string, number> {
  const e: Record<string, number> = { K }
  for (let i = 0; i < n; i++) {
    e[`a${i}`] = Math.floor(a / 2 ** i) % 2
    e[`b${i}`] = Math.floor(b / 2 ** i) % 2
  }
  return e
}

/* ── Evaluation and timing ────────────────────────────────────────────── */

function gateFn(op: Op, xs: number[]): number {
  switch (op) {
    case 'AND':
      return xs.every((x) => x === 1) ? 1 : 0
    case 'OR':
      return xs.some((x) => x === 1) ? 1 : 0
    case 'XOR':
      return xs.reduce((s, x) => s + x, 0) % 2
    case 'NOR':
      return xs.some((x) => x === 1) ? 0 : 1
    case 'BUF':
      return xs[0]
    case 'MUX':
      return xs[0] ? xs[2] : xs[1]
  }
}

const delayOf = (op: Op, delays?: Delays) => (op === 'BUF' ? 0 : (delays?.[op] ?? delays?.['*'] ?? 1))

/** Every line's settled value for one input row. */
export function evaluate(net: Net, env: Record<string, number>): Record<string, number> {
  const v: Record<string, number> = { ...env, '0': 0, '1': 1 }
  for (const node of net) v[node.name] = gateFn(node.op, node.args.map((a) => v[a]))
  return v
}

/** Static arrival time of every line (longest path; BUF and wires cost 0). */
export function arrival(net: Net, inputs: string[], delays?: Delays): Record<string, number> {
  const t: Record<string, number> = { '0': 0, '1': 0 }
  for (const x of inputs) t[x] = 0
  for (const node of net) t[node.name] = Math.max(...node.args.map((a) => t[a])) + delayOf(node.op, delays)
  return t
}

export interface SimResult {
  /** Time of each line's last change (0 if it never changes). */
  settle: Record<string, number>
  /** Each line's value at t = 0 … horizon. */
  wave: Record<string, number[]>
  horizon: number
}

/** Transport-delay simulation from the settled `old` inputs to `next` (arithlib.simulate). */
export function simulate(net: Net, inputs: string[], old: Record<string, number>, next: Record<string, number>, delays?: Delays): SimResult {
  const st = arrival(net, inputs, delays)
  const T = Math.max(...Object.values(st)) + 1
  const vOld = evaluate(net, old)
  const wave: Record<string, number[]> = {}
  for (const x of inputs) wave[x] = Array(T + 1).fill(next[x])
  const at = (sig: string, t: number) => (sig === '0' ? 0 : sig === '1' ? 1 : t < 0 ? vOld[sig] : wave[sig][t])
  for (const node of net) {
    const d = delayOf(node.op, delays)
    const w: number[] = []
    for (let t = 0; t <= T; t++) w.push(gateFn(node.op, node.args.map((a) => at(a, t - d))))
    wave[node.name] = w
  }
  const settle: Record<string, number> = {}
  for (const [x, w] of Object.entries(wave)) {
    let last = 0
    let prev = x in vOld ? vOld[x] : w[0]
    w.forEach((v, t) => {
      if (v !== prev) last = t
      prev = v
    })
    settle[x] = last
  }
  return { settle, wave, horizon: T }
}

/* ── The race ─────────────────────────────────────────────────────────── */

export interface RaceSide {
  kind: Kind
  /** Gates in the adder (the XOR row and the flag gates included). */
  gates: number
  /** Worst-case (static) delay of the sums and the carry out. */
  worst: number
  /** When this input change has settled (last change of any sum, the carry out, V or Z). */
  settled: number
  sim: SimResult
}

export interface RaceResult {
  n: number
  /** Raw bit patterns of the result and the operands as fed to the adder. */
  sum: number
  C: number
  V: number
  N: number
  Z: number
  sides: Record<Kind, RaceSide>
}

export const outputsOf = (n: number) => [...Array.from({ length: n }, (_, i) => `s${i}`), `c${n}`, 'V']

/** Race both adders on the same input change (operands as n-bit patterns; K = 1 subtracts). */
export function race(n: number, prev: { a: number; b: number; K: number }, next: { a: number; b: number; K: number }, xorDelay = 1): RaceResult {
  const delays: Delays = { XOR: xorDelay }
  const ins = labInputs(n)
  const old = labEnv(n, prev.a, prev.b, prev.K)
  const nw = labEnv(n, next.a, next.b, next.K)
  const sides = {} as Record<Kind, RaceSide>
  let fin: Record<string, number> = {}
  for (const kind of ['rca', 'cla'] as const) {
    const net = labNet(kind, n)
    const sim = simulate(net, ins, old, nw, delays)
    const t = arrival(net, ins, delays)
    const outs = outputsOf(n)
    sides[kind] = {
      kind,
      gates: net.filter((x) => x.op !== 'BUF').length,
      worst: Math.max(...outs.slice(0, n + 1).map((x) => t[x])),
      settled: Math.max(...[...outs, 'Z'].map((x) => sim.settle[x])),
      sim,
    }
    fin = evaluate(net, nw)
  }
  let sum = 0
  for (let i = 0; i < n; i++) sum += fin[`s${i}`] * 2 ** i
  return { n, sum, C: fin[`c${n}`], V: fin.V, N: fin[`s${n - 1}`], Z: fin.Z, sides }
}

/** Signed (2's-complement) value of an n-bit pattern. */
export const signed = (v: number, n: number) => {
  const m = ((v % 2 ** n) + 2 ** n) % 2 ** n
  return m >= 2 ** (n - 1) ? m - 2 ** n : m
}

/** The n-bit pattern of an integer (wraps like the hardware). */
export const pattern = (v: number, n: number) => ((Math.trunc(v) % 2 ** n) + 2 ** n) % 2 ** n

export const bitsText = (v: number, n: number) => pattern(v, n).toString(2).padStart(n, '0')

/* ── Scaling ──────────────────────────────────────────────────────────── */

export interface ScaleRow {
  n: number
  rca: number
  cla: number
  csel: number
}

/** Worst-case delays (unit gates; MUX = 2 levels as AND-OR) from the built netlists. */
export function scaling(widths = [4, 8, 16, 32, 64]): ScaleRow[] {
  return widths.map((n) => {
    const ins = [...Array.from({ length: n }, (_, i) => `a${i}`), ...Array.from({ length: n }, (_, i) => `b${i}`), 'c0']
    const worst = (net: Net, d?: Delays) => {
      const t = arrival(net, ins, d)
      return Math.max(...[...Array.from({ length: n }, (_, i) => `s${i}`), `c${n}`].map((x) => t[x]))
    }
    const A = Array.from({ length: n }, (_, i) => `a${i}`)
    const B = Array.from({ length: n }, (_, i) => `b${i}`)
    return { n, rca: worst(rippleNet(n, A, B, 'c0')), cla: worst(claNet(n)), csel: worst(carrySelectNet(n, 4), { MUX: 2 }) }
  })
}
