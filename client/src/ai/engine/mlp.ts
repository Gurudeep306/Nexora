/*
 * A tiny 2 → 3 → 1 network learning XOR, trained here in the browser with
 * plain gradient descent. Every weight, activation and gradient a scene shows
 * comes from this file (seeded, so it is the same on every visit).
 */
import { rng } from './linalg'

export const XOR: { x: [number, number]; y: number }[] = [
  { x: [0, 0], y: 0 },
  { x: [0, 1], y: 1 },
  { x: [1, 0], y: 1 },
  { x: [1, 1], y: 0 },
]

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

export interface Net {
  W1: number[][] // 3 × 2
  b1: number[] // 3
  W2: number[] // 1 × 3
  b2: number
}

export interface Pass {
  x: [number, number]
  z1: number[]
  a1: number[]
  z2: number
  yhat: number
  loss: number
  /** Gradients of the loss for this example (backpropagation). */
  dz2: number
  dW2: number[]
  da1: number[]
  dz1: number[]
  dW1: number[][]
}

export function initNet(seed = 7): Net {
  const r = rng(seed)
  const u = () => (r() * 2 - 1) * 1.5
  return { W1: [0, 1, 2].map(() => [u(), u()]), b1: [u(), u(), u()], W2: [u(), u(), u()], b2: u() }
}

/** One example forward and backward. Loss: binary cross-entropy. Hidden: tanh. Output: sigmoid. */
export function pass(n: Net, x: [number, number], y: number): Pass {
  const z1 = n.W1.map((w, i) => w[0] * x[0] + w[1] * x[1] + n.b1[i])
  const a1 = z1.map(Math.tanh)
  const z2 = a1.reduce((s, a, i) => s + a * n.W2[i], n.b2)
  const yhat = sigmoid(z2)
  const loss = -(y * Math.log(yhat + 1e-12) + (1 - y) * Math.log(1 - yhat + 1e-12))
  const dz2 = yhat - y // ∂L/∂z2 for sigmoid + cross-entropy
  const dW2 = a1.map((a) => dz2 * a)
  const da1 = n.W2.map((w) => dz2 * w)
  const dz1 = da1.map((d, i) => d * (1 - a1[i] ** 2)) // tanh' = 1 − tanh²
  const dW1 = dz1.map((d) => [d * x[0], d * x[1]])
  return { x, z1, a1, z2, yhat, loss, dz2, dW2, da1, dz1, dW1 }
}

export const predict = (n: Net, x0: number, x1: number) => pass(n, [x0, x1], 0).yhat

/** Train with full-batch gradient descent; returns snapshots of the net along the way. */
export function train(epochs = 1500, lr = 0.5, seed = 7, every = 50): { net: Net; history: { epoch: number; loss: number; net: Net }[] } {
  const net = initNet(seed)
  const history: { epoch: number; loss: number; net: Net }[] = []
  const copy = (n: Net): Net => ({ W1: n.W1.map((r) => [...r]), b1: [...n.b1], W2: [...n.W2], b2: n.b2 })
  for (let e = 0; e <= epochs; e++) {
    const ps = XOR.map((d) => pass(net, d.x, d.y))
    const loss = ps.reduce((s, p) => s + p.loss, 0) / ps.length
    if (e % every === 0) history.push({ epoch: e, loss, net: copy(net) })
    if (e === epochs) break
    const m = ps.length
    for (let i = 0; i < 3; i++) {
      net.W2[i] -= (lr * ps.reduce((s, p) => s + p.dW2[i], 0)) / m
      net.b1[i] -= (lr * ps.reduce((s, p) => s + p.dz1[i], 0)) / m
      for (let j = 0; j < 2; j++) net.W1[i][j] -= (lr * ps.reduce((s, p) => s + p.dW1[i][j], 0)) / m
    }
    net.b2 -= (lr * ps.reduce((s, p) => s + p.dz2, 0)) / m
  }
  return { net, history }
}

/** A net part-way between two snapshots (for smooth playback of training): every weight interpolated. */
export function lerpNet(a: Net, b: Net, t: number): Net {
  const l = (x: number, y: number) => x + (y - x) * t
  return { W1: a.W1.map((r, i) => r.map((w, j) => l(w, b.W1[i][j]))), b1: a.b1.map((v, i) => l(v, b.b1[i])), W2: a.W2.map((v, i) => l(v, b.W2[i])), b2: l(a.b2, b.b2) }
}
