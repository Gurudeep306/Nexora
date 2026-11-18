/* Loss surfaces with exact gradients, and the optimisers that walk them. */

export interface Surface2 {
  id: string
  name: string
  /** The formula, for KaTeX. */
  tex: string
  f: (x: number, y: number) => number
  grad: (x: number, y: number) => [number, number]
  range: [number, number]
  start: [number, number]
}

export const SURFACES: Surface2[] = [
  {
    id: 'valley',
    name: 'A long, narrow valley',
    tex: 'f(x, y) = \\tfrac{1}{2}\\left(x^2 + 10\\,y^2\\right)',
    f: (x, y) => 0.5 * (x * x + 10 * y * y),
    grad: (x, y) => [x, 10 * y],
    range: [-3, 3],
    start: [-2.8, 0.9],
  },
  {
    id: 'rosenbrock',
    name: 'The Rosenbrock banana',
    tex: 'f(x, y) = (1 - x)^2 + 5\\,(y - x^2)^2',
    f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)],
    range: [-2, 2],
    start: [-1.6, 1.8],
  },
  {
    id: 'saddle',
    name: 'A saddle point',
    tex: 'f(x, y) = \\tfrac{1}{2}\\left(x^2 - y^2\\right) + \\tfrac{1}{20}\\,y^4',
    f: (x, y) => 0.5 * (x * x - y * y) + 0.05 * y ** 4,
    grad: (x, y) => [x, -y + 0.2 * y ** 3],
    range: [-3, 3],
    start: [2.6, 0.02],
  },
]

export interface Step {
  x: number
  y: number
  f: number
  gx: number
  gy: number
}

export interface OptimizerSpec {
  id: 'gd' | 'momentum' | 'adam'
  name: string
  /** The update rule, for KaTeX. */
  tex: string
}

export const OPTIMIZERS: OptimizerSpec[] = [
  { id: 'gd', name: 'Gradient descent', tex: '\\boldsymbol\\theta \\leftarrow \\boldsymbol\\theta - \\eta\\,\\nabla f' },
  { id: 'momentum', name: 'Momentum', tex: '\\mathbf v \\leftarrow \\beta\\mathbf v + \\nabla f,\\;\\; \\boldsymbol\\theta \\leftarrow \\boldsymbol\\theta - \\eta\\,\\mathbf v' },
  { id: 'adam', name: 'Adam', tex: '\\boldsymbol\\theta \\leftarrow \\boldsymbol\\theta - \\eta\\,\\hat{\\mathbf m} / (\\sqrt{\\hat{\\mathbf v}} + \\epsilon)' },
]

/** Run an optimiser for `n` steps from the surface's start. Every point is a real iterate. */
export function run(s: Surface2, opt: OptimizerSpec['id'], n: number, lr: number): Step[] {
  let [x, y] = s.start
  const out: Step[] = []
  let vx = 0
  let vy = 0
  let mx = 0
  let my = 0
  let sx = 0
  let sy = 0
  const b1 = 0.9
  const b2 = 0.999
  for (let t = 0; t <= n; t++) {
    const [gx, gy] = s.grad(x, y)
    out.push({ x, y, f: s.f(x, y), gx, gy })
    if (t === n || !Number.isFinite(x + y)) break
    if (opt === 'gd') {
      x -= lr * gx
      y -= lr * gy
    } else if (opt === 'momentum') {
      vx = 0.9 * vx + gx
      vy = 0.9 * vy + gy
      x -= lr * vx
      y -= lr * vy
    } else {
      mx = b1 * mx + (1 - b1) * gx
      my = b1 * my + (1 - b1) * gy
      sx = b2 * sx + (1 - b2) * gx * gx
      sy = b2 * sy + (1 - b2) * gy * gy
      const k = t + 1
      x -= (lr * (mx / (1 - b1 ** k))) / (Math.sqrt(sx / (1 - b2 ** k)) + 1e-8)
      y -= (lr * (my / (1 - b1 ** k))) / (Math.sqrt(sy / (1 - b2 ** k)) + 1e-8)
    }
    // Keep a diverging run visible but finite.
    const lim = s.range[1] * 3
    x = Math.max(-lim, Math.min(lim, x))
    y = Math.max(-lim, Math.min(lim, y))
  }
  return out
}

/** Sensible learning rates per surface and optimiser (Adam's η is a step size, not a gradient scale). */
export const LR: Record<string, Record<OptimizerSpec['id'], number>> = {
  valley: { gd: 0.15, momentum: 0.05, adam: 0.2 },
  rosenbrock: { gd: 0.02, momentum: 0.004, adam: 0.08 },
  saddle: { gd: 0.15, momentum: 0.05, adam: 0.15 },
}
