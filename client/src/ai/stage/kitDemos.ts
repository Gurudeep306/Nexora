/*
  One scene per Stage kit, each computed here from first principles (value
  iteration, a convolution, bigram counts, a training run, memory sums, a
  pipeline schedule). Nothing is typed in: change the inputs and every number,
  caption and formula follows. These are also the patterns a course copies.
*/
import { rng } from '../engine/linalg.ts'
import type { StageElement, StageSpec, StageStep, V3 } from './spec.ts'

const r2 = (v: number) => Math.round(v * 100) / 100
const r3 = (v: number) => Math.round(v * 1000) / 1000

/* ── Plots: secant to tangent, then rectangles to area ───────────────── */

export function calculusScene(): StageSpec {
  const f = (x: number) => Math.sin(x) + 1
  const a = 1
  const [lo, hi] = [0.5, 2.5]
  const exact = hi - lo + Math.cos(lo) - Math.cos(hi)
  const mid = (n: number) => {
    const w = (hi - lo) / n
    let s = 0
    for (let i = 0; i < n; i++) s += f(lo + w * (i + 0.5)) * w
    return s
  }
  const slope = (h: number) => (f(a + h) - f(a)) / h
  const at: V3 = [-1.6, -1, 0]
  const steps: StageStep[] = [
    { label: 'A curve', caption: 'The [curve](#f) y = sin x + 1, drawn from left to right.', tex: 'y = \\sin x + 1', set: [{ id: 'f', set: { upTo: 0 } }], ms: 400 },
    { label: 'Drawn', caption: 'The whole [curve](#f) from x = 0 to π.', set: [{ id: 'f', set: { upTo: 1 } }], ms: 1600 },
    ...[1.5, 0.5, 0.05].map((h) => ({
      label: `Secant, h = ${h}`,
      caption: `The slope between x = 1 and x = ${r2(a + h)}: rise over run.`,
      tex: `\\frac{f(1 + ${h}) - f(1)}{${h}} = ${r3(slope(h))}`,
      set: [{ id: 'f', set: { tangent: a, h } }],
      focus: ['f'],
      ms: 1500,
    })),
    { label: 'The tangent', caption: 'As h shrinks, the secant turns into the tangent. Its slope is the derivative.', tex: `f'(1) = \\cos 1 = ${r3(Math.cos(a))}`, set: [{ id: 'f', set: { h: 0.0001 } }], pause: true, ms: 1400 },
    ...[4, 16, 64].map((n) => ({
      label: `${n} rectangles`,
      caption: `${n} rectangles under the curve from 0.5 to 2.5, each as tall as the curve at its middle.`,
      tex: `\\sum_{i=1}^{${n}} f(m_i)\\,\\Delta x = ${r3(mid(n))}`,
      set: [{ id: 'f', set: { tangent: undefined, h: undefined, fill: [lo, hi], riemann: n } }],
      ms: 1500,
    })),
    { label: 'The area', caption: 'Thinner and thinner rectangles close in on the exact area: the integral.', tex: `\\int_{0.5}^{2.5} (\\sin x + 1)\\,dx = ${r3(exact)}`, set: [{ id: 'f', set: { riemann: undefined } }], pause: true, ms: 1400 },
  ]
  return {
    version: 1,
    title: 'Slope and area of one curve',
    description: 'The curve y = sin x + 1. A secant through x = 1 shortens until it is the tangent (slope cos 1), then rectangles under the curve between 0.5 and 2.5 get thinner until their total is the integral.',
    dim: 2,
    camera: { position: [0, 6, 5.5], target: [0, 0, -0.4] },
    elements: [
      { id: 'xa', type: 'line', points: [[at[0] - 0.2, at[1], 0], [at[0] + 3.4, at[1], 0]] },
      { id: 'ya', type: 'line', points: [[at[0], at[1] - 0.2, 0], [at[0], at[1] + 2.3, 0]] },
      { id: 'xl', type: 'label', at: [at[0] + 3.55, at[1], 0], text: 'x', tone: 'muted' },
      { id: 'f', type: 'curve', f: 'sin(x) + 1', range: [0, Math.PI], at, upTo: 0 },
    ],
    steps,
  }
}

/* ── Plots: dice averages settle; averages of ten dice look Gaussian ──── */

export function diceScene(): StageSpec {
  const rnd = rng(7)
  const roll = () => 1 + Math.floor(rnd() * 6)
  const N = 600
  let sum = 0
  const avg: number[] = []
  for (let i = 1; i <= N; i++) {
    sum += roll()
    avg.push(r3(sum / i))
  }
  const means: number[] = []
  for (let k = 0; k < 3000; k++) {
    let s = 0
    for (let j = 0; j < 10; j++) s += roll()
    means.push(s / 10)
  }
  const m = means.reduce((a, b) => a + b, 0) / means.length
  const sd = Math.sqrt(means.reduce((a, b) => a + (b - m) ** 2, 0) / means.length)
  const xs = avg.map((_, i) => i + 1)
  return {
    version: 1,
    title: 'Averages of dice',
    description: 'A running average of 600 simulated dice rolls settles at 3.5 (the law of large numbers). Then 3000 averages of ten dice each are counted into a histogram, which comes out bell-shaped (the central limit theorem).',
    dim: 2,
    camera: { position: [0, 8, 6.5], target: [0, 0, -0.6] },
    elements: [
      { id: 'run', type: 'chart', kind: 'line', at: [-4.6, -0.2, 0], size: [4, 2.4], series: [avg, avg.map(() => 3.5)], xs, yRange: [1, 6], names: ['average so far', '3.5'], tones: ['info', 'muted'], xLabel: 'rolls', upTo: 0.01 },
      { id: 'hist', type: 'chart', kind: 'hist', at: [0.8, -0.2, 0], size: [4, 2.4], samples: means, bins: 17, range: [0.95, 6.05], xLabel: 'average of 10 dice', hidden: true },
    ],
    steps: [
      { label: 'A few rolls', caption: 'With a few rolls the [average](#run) jumps around.', tex: `\\bar x_{10} = ${avg[9]}`, set: [{ id: 'run', set: { upTo: 10 / N } }], ms: 1200 },
      { label: '100 rolls', caption: 'It wanders less as rolls pile up.', tex: `\\bar x_{100} = ${avg[99]}`, set: [{ id: 'run', set: { upTo: 100 / N } }], ms: 1800 },
      { label: '600 rolls', caption: 'And settles near the expected value 3.5: the law of large numbers.', tex: `\\bar x_{600} = ${avg[N - 1]}, \\quad \\mathbb E[X] = 3.5`, set: [{ id: 'run', set: { upTo: 1 } }], pause: true, ms: 2200 },
      { label: 'Many averages', caption: 'Now take 3000 averages of ten dice and count them: the [histogram](#hist) is a bell, though one die is flat.', tex: `\\text{mean} = ${r3(m)},\\; \\text{sd} = ${r3(sd)} \\approx \\tfrac{1.708}{\\sqrt{10}} = ${r3(1.7078 / Math.sqrt(10))}`, set: [{ id: 'hist', set: { hidden: false } }], ms: 1600 },
      { label: 'Stand them up', caption: 'Both charts stand up in 3D.', dim: 3, ms: 2000 },
    ],
  }
}

/* ── Shapes: logistic regression learns its boundary ─────────────────── */

export function logisticScene(): StageSpec {
  const rnd = rng(3)
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd())
  const pts: { x: number; y: number; t: number }[] = []
  for (let i = 0; i < 40; i++) pts.push({ x: r2(-1 + 0.75 * gauss()), y: r2(-0.6 + 0.75 * gauss()), t: 0 })
  for (let i = 0; i < 40; i++) pts.push({ x: r2(1 + 0.75 * gauss()), y: r2(0.8 + 0.75 * gauss()), t: 1 })
  let [w1, w2, b] = [0.3, -0.4, 0.2]
  const sig = (z: number) => 1 / (1 + Math.exp(-z))
  const snaps = new Map<number, { w1: number; w2: number; b: number; acc: number; loss: number }>()
  const keep = [0, 1, 5, 30, 300]
  for (let ep = 0; ep <= 300; ep++) {
    let loss = 0
    let ok = 0
    let g1 = 0
    let g2 = 0
    let gb = 0
    for (const p of pts) {
      const q = sig(w1 * p.x + w2 * p.y + b)
      loss -= p.t * Math.log(q + 1e-12) + (1 - p.t) * Math.log(1 - q + 1e-12)
      ok += (q > 0.5 ? 1 : 0) === p.t ? 1 : 0
      g1 += (q - p.t) * p.x
      g2 += (q - p.t) * p.y
      gb += q - p.t
    }
    if (keep.includes(ep)) snaps.set(ep, { w1: r3(w1), w2: r3(w2), b: r3(b), acc: ok / pts.length, loss: loss / pts.length })
    const lr = 0.5 / pts.length
    w1 -= lr * g1
    w2 -= lr * g2
    b -= lr * gb
  }
  const s0 = snaps.get(0)!
  return {
    version: 1,
    title: 'A classifier learns its boundary',
    description: 'Eighty points of two classes. Logistic regression starts with a poor line and, by gradient descent, turns it until it separates the classes; then the probability rises into 3D as an S-shaped surface over the plane.',
    dim: 2,
    params: { w1: s0.w1, w2: s0.w2, b: s0.b },
    camera: { position: [0, 7.5, 6], target: [0, 0, 0] },
    elements: [
      { id: 'reg', type: 'region', f: 'w1*x + w2*y + b', range: [-3, 3] },
      { id: 'pts', type: 'points', points: pts.map((p) => [p.x, p.y, p.t * 2] as V3), tones: pts.map((p) => (p.t ? 'warning' : 'info')), r: 0.08, tips: pts.map((p) => `class ${p.t} at (${p.x}, ${p.y})`) },
      { id: 'sig', type: 'surface', f: '2 / (1 + exp(-(w1*x + w2*y + b)))', range: [-3, 3], hidden: true, ramp: false },
    ],
    steps: [
      ...keep.map((ep, i): StageStep => {
      const s = snaps.get(ep)!
      return {
        label: ep === 0 ? 'A first guess' : `Epoch ${ep}`,
        caption: ep === 0 ? 'Two classes of [points](#pts). The [regions](#reg) are what the model says now: a poor first guess.' : `After ${ep} steps of gradient descent the boundary has turned. ${Math.round(s.acc * 100)}% of points are on their side.`,
        tex: `w = (${s.w1}, ${s.w2}),\\; b = ${s.b},\\; \\text{loss} = ${r3(s.loss)}`,
        params: { w1: s.w1, w2: s.w2, b: s.b },
        ms: i ? 1800 : 600,
        pause: ep === 300,
      }
    }),
      { label: 'Probability as height', caption: 'In 3D the model’s probability σ(w·x + b) is a [surface](#sig): low over one class, high over the other. The boundary is where it crosses one half.', tex: 'p(y = 1 \\mid x) = \\sigma(w^\\top x + b)', set: [{ id: 'sig', set: { hidden: false } }], dim: 3, ms: 2200 },
    ],
  }
}

/* ── Graphs: forward and backward through a small computation ────────── */

export function graphScene(): StageSpec {
  const [x, y, z] = [2, -3, 4]
  const q = x * y
  const f = q + z
  // Backward: df/dq = 1, df/dz = 1, df/dx = y·1, df/dy = x·1.
  type N = Extract<StageElement, { type: 'graph' }>['nodes'][number]
  const nodes = (vals: Partial<Record<string, number>>, lit: string[] = []): N[] =>
    [
      { id: 'x', label: 'x' },
      { id: 'y', label: 'y' },
      { id: 'z', label: 'z' },
      { id: 'q', label: '×' },
      { id: 'f', label: '+' },
    ].map((n) => ({ ...n, ...(vals[n.id] != null ? { value: vals[n.id] } : {}), ...(lit.includes(n.id) ? { tone: 'accent' as const } : {}) }))
  const edges = (grads?: Record<string, number>) => [
    { from: 'x', to: 'q', ...(grads ? { label: `∂f/∂x = ${grads.x}` } : {}) },
    { from: 'y', to: 'q', ...(grads ? { label: `∂f/∂y = ${grads.y}` } : {}) },
    { from: 'q', to: 'f', ...(grads ? { label: `∂f/∂q = ${grads.q}` } : {}) },
    { from: 'z', to: 'f', ...(grads ? { label: `∂f/∂z = ${grads.z}` } : {}) },
  ]
  const g = { x: y, y: x, q: 1, z: 1 }
  const set = (s: Record<string, unknown>) => [{ id: 'g', set: s }]
  return {
    version: 1,
    title: 'Values forward, gradients back',
    description: 'The computation f = x·y + z with x = 2, y = −3, z = 4, as a graph. Values flow forward to f = −2; then gradients flow backward: ∂f/∂x = −3, ∂f/∂y = 2, ∂f/∂z = 1.',
    dim: 2,
    camera: { position: [0, 6, 4.8], target: [0, 0, 0] },
    elements: [{ id: 'g', type: 'graph', layout: 'layered', directed: true, spread: 1.3, nodes: nodes({ x, y, z }), edges: edges(), flow: 0, flowEdges: [0, 1] }],
    steps: [
      { label: 'The inputs', caption: 'x = 2, y = −3 and z = 4 go in on the left.', tex: 'f(x, y, z) = x\\,y + z', ms: 900 },
      { label: 'Multiply', caption: 'x and y flow into the product node.', tex: `q = x\\,y = ${q}`, set: set({ flow: 1, flowEdges: [0, 1], nodes: nodes({ x, y, z, q }, ['q']) }), ms: 1600 },
      { label: 'Add', caption: 'q and z flow into the sum: the output.', tex: `f = q + z = ${f}`, set: set({ flow: 0 }), ms: 300 },
      { label: 'Add', caption: 'q and z flow into the sum: the output.', tex: `f = q + z = ${f}`, set: set({ flow: 1, flowEdges: [2, 3], nodes: nodes({ x, y, z, q, f }, ['f']) }), pause: true, ms: 1600 },
      { label: 'Backward', caption: 'Now the gradient flows back from f. A sum passes it on unchanged; a product swaps in the other input.', tex: `\\frac{\\partial f}{\\partial q} = 1,\\; \\frac{\\partial f}{\\partial x} = y = ${g.x},\\; \\frac{\\partial f}{\\partial y} = x = ${g.y}`, set: set({ flow: 0, reverse: true, flowEdges: [0, 1, 2, 3] }), ms: 300 },
      { label: 'Backward', caption: 'Each edge now carries how much f changes when its input moves.', tex: `\\frac{\\partial f}{\\partial q} = 1,\\; \\frac{\\partial f}{\\partial x} = y = ${g.x},\\; \\frac{\\partial f}{\\partial y} = x = ${g.y}`, set: set({ flow: 1, edges: edges(g), nodes: nodes({ x, y, z, q, f }, ['x', 'y', 'z']) }), pause: true, ms: 2000 },
      { label: 'Values as height', caption: 'In 3D each node stands as tall as its value.', dim: 3, ms: 1800 },
    ],
  }
}

/* ── Vision: a kernel slides over an image ────────────────────────────── */

export function convScene(): StageSpec {
  const H = 8
  const img = Array.from({ length: H }, (_, i) => Array.from({ length: H }, (_, j) => (i >= 2 && i <= 5 && j >= 2 && j <= 5 ? 0.9 : 0.1)))
  const K = [
    [1, 0, -1],
    [1, 0, -1],
    [1, 0, -1],
  ]
  const out = Array.from({ length: H - 2 }, (_, i) => Array.from({ length: H - 2 }, (_, j) => r2(K.reduce((s, row, a) => s + row.reduce((t, k, b) => t + k * img[i + a][j + b], 0), 0))))
  const terms = (i: number, j: number) =>
    K.flatMap((row, a) => row.map((k, b) => (k ? `${k > 0 ? '+' : '-'}${img[i + a][j + b]}` : ''))).filter(Boolean).join(' ').replace(/^\+/, '')
  const at = (i: number, j: number): StageStep => ({
    label: `Position (${i}, ${j})`,
    caption: `The [kernel](#k) sits on the [window](#img); the output is the sum of the nine products.`,
    tex: `y_{${i}${j}} = ${terms(i, j)} = ${out[i][j]}`,
    set: [
      { id: 'img', set: { window: [i, j, 3, 3] } },
      { id: 'o', set: { highlight: [[i, j]] } },
    ],
    focus: ['img', 'k', 'o'],
    ms: 1300,
  })
  return {
    version: 1,
    title: 'A kernel sliding over an image',
    description: 'An 8 × 8 grey image of a bright square. A 3 × 3 vertical-edge kernel slides over it; each output is the sum of nine products. The output is large on the square’s left edge, negative on its right edge, and zero where the image is flat.',
    dim: 2,
    camera: { position: [0, 7.5, 5.5], target: [0, 0, 0.2] },
    elements: [
      { id: 'img', type: 'image', pixels: img, at: [-2.3, 0, 0], cell: 0.42, numbers: true, window: [0, 0, 3, 3] },
      { id: 'k', type: 'tiles', values: K, at: [0.2, 1.75, 0], cell: 0.5, numbers: true },
      { id: 'kl', type: 'label', at: [0.2, 2.7, 0], text: 'kernel', tone: 'muted' },
      { id: 'o', type: 'bars', values: out, at: [2.4, 0, 0], cell: 0.42, height: 0.9, numbers: true, hidden: true },
      { id: 'ol', type: 'label', at: [2.4, -1.6, 0], text: 'output (6 × 6)', tone: 'muted', hidden: true },
    ],
    steps: [
      { label: 'The image', caption: 'An 8 × 8 [image](#img): a bright square on a dark ground, as numbers 0 … 1.', ms: 900 },
      { ...at(0, 0), set: [...(at(0, 0).set ?? []), { id: 'o', set: { hidden: false } }, { id: 'ol', set: { hidden: false } }] },
      at(1, 1),
      at(2, 1),
      at(2, 4),
      { label: 'Every position', caption: 'Done at every position, the [output](#o) lights up on the vertical edges: positive on the left edge, negative on the right.', set: [{ id: 'o', set: { highlight: [] } }], pause: true, ms: 1400 },
      { label: 'As height', caption: 'In 3D the image’s brightness and the output’s size stand up as height.', set: [{ id: 'img', set: { relief: 0.6 } }], dim: 3, ms: 2000 },
    ],
  }
}

/* ── Vision: intersection over union of two boxes ────────────────────── */

export function iouScene(): StageSpec {
  const A = { x: -1.5, y: -1, w: 2.4, h: 1.8 }
  const B = { x: -0.4, y: -0.4, w: 2.4, h: 1.8 }
  const ix = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x))
  const iy = Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y))
  const inter = ix * iy
  const uni = A.w * A.h + B.w * B.h - inter
  return {
    version: 1,
    title: 'Intersection over union',
    description: 'A predicted box and a true box. Their overlap divided by the area they cover together is the IoU, the score detectors use to say how well a box matches.',
    dim: 2,
    camera: { position: [0, 6, 4.2], target: [0, 0, 0] },
    elements: [
      { id: 'b', type: 'boxes', boxes: [{ ...A, label: 'true box', tone: 'success' }, { ...B, label: 'prediction', tone: 'info' }] },
      { id: 'i', type: 'shape', kind: 'rect', at: [Math.max(A.x, B.x) + ix / 2, Math.max(A.y, B.y) + iy / 2, 0], size: [ix, iy], fill: true, tone: 'accent', hidden: true },
    ],
    steps: [
      { label: 'Two boxes', caption: 'The [true box](#b) and the predicted one.', tex: `|A| = ${r2(A.w * A.h)},\\; |B| = ${r2(B.w * B.h)}`, ms: 900 },
      { label: 'Overlap', caption: 'Their [overlap](#i).', tex: `|A \\cap B| = ${r2(ix)} \\times ${r2(iy)} = ${r2(inter)}`, set: [{ id: 'i', set: { hidden: false } }], ms: 1300 },
      { label: 'IoU', caption: 'Overlap over the area they cover together. 1 is a perfect match; 0 is no overlap.', tex: `\\text{IoU} = \\frac{${r2(inter)}}{${r2(A.w * A.h)} + ${r2(B.w * B.h)} - ${r2(inter)}} = ${r3(inter / uni)}`, pause: true, ms: 1300 },
    ],
  }
}

/* ── Language: next-word probabilities from counts ────────────────────── */

export function bigramScene(): StageSpec {
  const text = 'the cat sat on the mat . the cat ate the fish .'.split(' ')
  const counts = new Map<string, Map<string, number>>()
  for (let i = 0; i + 1 < text.length; i++) {
    const m = counts.get(text[i]) ?? new Map<string, number>()
    m.set(text[i + 1], (m.get(text[i + 1]) ?? 0) + 1)
    counts.set(text[i], m)
  }
  const next = (w: string) => {
    const m = counts.get(w)!
    const tot = [...m.values()].reduce((a, b) => a + b, 0)
    return [...m.entries()].map(([k, v]) => ({ w: k, c: v, p: v / tot }))
  }
  const after = next('the')
  const theAt = text.flatMap((w, i) => (w === 'the' ? [i] : []))
  // Greedy generation from "the" (ties go to the word seen first).
  const gen = ['the']
  const gp = [1]
  for (let k = 0; k < 4; k++) {
    const best = next(gen[gen.length - 1]).reduce((a, b) => (b.p > a.p ? b : a))
    gen.push(best.w)
    gp.push(r3(best.p))
  }
  return {
    version: 1,
    title: 'Next word from counts',
    description: `A tiny text of ${text.length} words. Counting which word follows "the" gives next-word probabilities (${after.map((a) => `${a.w} ${a.c}/${theAt.length}`).join(', ')}); always taking the most likely word generates "${gen.join(' ')}".`,
    dim: 2,
    camera: { position: [0, 7, 5.5], target: [0, 0, -0.3] },
    elements: [
      { id: 't', type: 'tokens', tokens: text, at: [0, 1.6, 0], cell: 0.62, upTo: 0 },
      { id: 'n', type: 'tokens', tokens: after.map((a) => a.w), probs: after.map((a) => r3(a.p)), at: [-2.2, -0.9, 0], cell: 0.9, hidden: true },
      { id: 'nl', type: 'label', at: [-2.2, -1.5, 0], text: 'after "the"', tone: 'muted', hidden: true },
      { id: 'g', type: 'tokens', tokens: gen.slice(1), probs: gp.slice(1), at: [2.1, -0.9, 0], cell: 0.75, upTo: 0, hidden: true },
      { id: 'gl', type: 'label', at: [2.1, -1.5, 0], text: 'generated after "the"', tone: 'muted', hidden: true },
    ],
    steps: [
      { label: 'A text', caption: 'A tiny [text](#t), split into words.', set: [{ id: 't', set: { upTo: text.length } }], ms: 1800 },
      { label: 'Count what follows "the"', caption: '"the" appears ' + theAt.length + ' times; look at the word after each.', set: [{ id: 't', set: { highlight: theAt.flatMap((i) => [i, i + 1]) } }], ms: 1200 },
      { label: 'Probabilities', caption: 'Counts divided by the total are the [next-word probabilities](#n).', tex: after.map((a) => `p(\\text{${a.w}} \\mid \\text{the}) = \\tfrac{${a.c}}{${theAt.length}}`).join(',\\; '), set: [{ id: 'n', set: { hidden: false } }, { id: 'nl', set: { hidden: false } }], pause: true, ms: 1400 },
      { label: 'Generate', caption: 'Start from "the" and always take the most likely next word.', set: [{ id: 'g', set: { hidden: false } }, { id: 'gl', set: { hidden: false } }], ms: 900 },
      { label: 'Generate', caption: 'One word at a time, each with its probability.', tex: gen.slice(1).map((w, i) => `p(\\text{${w}} \\mid \\text{${gen[i]}}) = ${gp[i + 1]}`).join(',\\; '), set: [{ id: 'g', set: { upTo: gen.length - 1 } }], pause: true, ms: 2600 },
      { label: 'Bars stand up', caption: 'In 3D the probability bars stand up.', dim: 3, ms: 1800 },
    ],
  }
}

/* ── RL: value iteration on a grid world ──────────────────────────────── */

export function gridScene(): StageSpec {
  const R = 4
  const C = 5
  const gamma = 0.9
  const walls = [[1, 1], [2, 3]] as [number, number][]
  const rewards = [[0, 4, 1], [1, 4, -1]] as [number, number, number][]
  const isWall = (i: number, j: number) => walls.some(([a, b]) => a === i && b === j)
  const term = (i: number, j: number) => rewards.find(([a, b]) => a === i && b === j)
  const moves = [[-1, 0], [0, 1], [1, 0], [0, -1]]
  const go = (i: number, j: number, k: number): [number, number] => {
    const a = i + moves[k][0]
    const b = j + moves[k][1]
    return a < 0 || a >= R || b < 0 || b >= C || isWall(a, b) ? [i, j] : [a, b]
  }
  const q = (V: number[][], i: number, j: number, k: number) => {
    const [a, b] = go(i, j, k)
    const t = term(a, b)
    return t ? t[2] : gamma * V[a][b]
  }
  let V = Array.from({ length: R }, () => new Array(C).fill(0))
  const sweeps: number[][][] = [V]
  for (let s = 0; s < 60; s++) {
    const W = V.map((row, i) => row.map((_, j) => (isWall(i, j) || term(i, j) ? 0 : r3(Math.max(...[0, 1, 2, 3].map((k) => q(V, i, j, k)))))))
    const delta = Math.max(...W.flat().map((v, n) => Math.abs(v - V.flat()[n])))
    V = W
    sweeps.push(V)
    if (delta < 1e-9) break
  }
  const policy = V.map((row, i) => row.map((_, j) => (isWall(i, j) || term(i, j) ? 0 : 1 + [0, 1, 2, 3].reduce((best, k) => (q(V, i, j, k) > q(V, i, j, best) + 1e-12 ? k : best), 0))))
  const path: [number, number][] = [[3, 0]]
  while (path.length < 20) {
    const [i, j] = path[path.length - 1]
    if (term(i, j)) break
    path.push(go(i, j, policy[i][j] - 1))
  }
  const shown = [1, 2, 3, sweeps.length - 1]
  return {
    version: 1,
    title: 'Values spreading over a grid world',
    description: `A ${R} × ${C} grid world with a +1 goal, a −1 pit and two walls, discount ${gamma}. Value iteration spreads the goal's value backwards sweep by sweep until it stops changing (${sweeps.length - 1} sweeps); the greedy policy then walks the agent to the goal.`,
    dim: 2,
    camera: { position: [0, 7, 5], target: [0, 0, 0] },
    elements: [{ id: 'w', type: 'gridworld', rows: R, cols: C, walls, rewards, values: sweeps[0], cell: 0.85, agent: path[0] }],
    steps: [
      { label: 'The world', caption: 'The agent starts bottom left. Reaching +1 ends well, −1 ends badly. Every value starts at 0.', tex: `V_0(s) = 0`, ms: 900 },
      ...shown.map((k) => ({
        label: k === sweeps.length - 1 ? `Converged (sweep ${k})` : `Sweep ${k}`,
        caption: k === 1 ? 'One sweep: only the cells next to the goal learn its value.' : k === sweeps.length - 1 ? 'The values stop changing: this is V*.' : 'Each sweep pushes value one step further, shrunk by γ.',
        tex: `V_{${k}}(s) = \\max_a \\big[r + \\gamma\\, V_{${k - 1}}(s')\\big],\\; \\gamma = ${gamma}`,
        set: [{ id: 'w', set: { values: sweeps[k] } }],
        ms: 1500,
        pause: k === sweeps.length - 1,
      })),
      { label: 'The policy', caption: 'In each cell, the action with the best value: the greedy policy.', set: [{ id: 'w', set: { policy } }], ms: 1300 },
      ...path.slice(1).map((p, k) => ({ label: 'The agent walks', caption: 'Following the arrows reaches the goal by the shortest safe path.', set: [{ id: 'w', set: { agent: p, trail: path.slice(0, k + 2) } }], ms: 520 })),
      { label: 'Values as height', caption: 'In 3D the values stand as height: a hill climbing to the goal.', dim: 3, ms: 2000 },
    ],
  }
}

/* ── Systems: what fills memory when training a 7B model ──────────────── */

export function memoryScene(): StageSpec {
  const P = 7e9
  const GB = 1e9
  const seg = [
    { label: 'weights (fp16)', value: (2 * P) / GB, tone: 'info' as const },
    { label: 'gradients (fp16)', value: (2 * P) / GB, tone: 'warning' as const },
    { label: 'Adam: fp32 weights, m, v', value: (12 * P) / GB, tone: 'success' as const },
  ]
  const total = seg.reduce((a, b) => a + b.value, 0)
  return {
    version: 1,
    title: 'Memory to train a 7B model',
    description: `Training 7 billion parameters with Adam in mixed precision needs 16 bytes per parameter: ${total} GB before any activations, more than an 80 GB GPU holds. Split across 8 GPUs (ZeRO stage 3), each holds ${total / 8} GB.`,
    dim: 2,
    camera: { position: [0, 7, 5.4], target: [0, 0, -0.6] },
    elements: [{ id: 'm', type: 'membar', segments: seg.map((s) => ({ ...s, value: 0 })), total: 80, unit: 'GB', size: [7, 0.5], at: [0, 1.2, 0] }],
    steps: [
      { label: 'An 80 GB GPU', caption: 'One GPU with 80 GB of memory, empty.', ms: 800 },
      ...seg.map((s, k) => ({
        label: s.label,
        caption: k === 0 ? 'Weights in fp16: 2 bytes per parameter.' : k === 1 ? 'Gradients, same size again.' : 'Adam keeps an fp32 copy of the weights plus two moments: 12 bytes per parameter.',
        tex: `7 \\times 10^9 \\times ${[2, 2, 12][k]}\\ \\text{bytes} = ${s.value}\\ \\text{GB}`,
        set: [{ id: 'm', set: { segments: seg.map((q, i) => ({ ...q, value: i <= k ? q.value : 0 })) } }],
        ms: 1400,
      })),
      { label: 'It does not fit', caption: `${total} GB, before activations: more than one GPU holds.`, tex: `16\\ \\text{bytes} \\times 7 \\times 10^9 = ${total}\\ \\text{GB} > 80\\ \\text{GB}`, pause: true, ms: 1000 },
      { label: 'Split across 8 GPUs', caption: 'ZeRO stage 3 gives each GPU one eighth of every part.', tex: `${total} / 8 = ${total / 8}\\ \\text{GB per GPU}`, set: [{ id: 'm', set: { devices: 8, sharded: [0, 1, 2] } }], view: { camera: [0, 12.5, 7.6], target: [0, 0, 1.9] }, pause: true, ms: 1800 },
    ],
  }
}

/* ── Systems: the pipeline bubble ─────────────────────────────────────── */

export function pipelineSchedule(p: number, m: number) {
  const blocks: { lane: number; start: number; end: number; label: string; tone: 'info' | 'warning' }[] = []
  const fEnd: number[][] = Array.from({ length: p }, () => new Array(m).fill(0))
  for (let s = 0; s < p; s++)
    for (let j = 0; j < m; j++) {
      const start = Math.max(s ? fEnd[s - 1][j] : 0, j ? fEnd[s][j - 1] : 0)
      fEnd[s][j] = start + 1
      blocks.push({ lane: s, start, end: start + 1, label: `F${j + 1}`, tone: 'info' })
    }
  const bEnd: number[][] = Array.from({ length: p }, () => new Array(m).fill(0))
  for (let s = p - 1; s >= 0; s--)
    for (let k = 0; k < m; k++) {
      const j = m - 1 - k
      const start = Math.max(s < p - 1 ? bEnd[s + 1][j] : fEnd[p - 1][m - 1], k ? bEnd[s][j + 1] : fEnd[s][m - 1])
      bEnd[s][j] = start + 2
      blocks.push({ lane: s, start, end: start + 2, label: `B${j + 1}`, tone: 'warning' })
    }
  const end = Math.max(...blocks.map((b) => b.end))
  const busy = blocks.reduce((a, b) => a + b.end - b.start, 0)
  return { blocks, end, idle: 1 - busy / (p * end) }
}

export function pipelineScene(): StageSpec {
  const p = 4
  const a = pipelineSchedule(p, 4)
  const b = pipelineSchedule(p, 8)
  const lanes = Array.from({ length: p }, (_, s) => `GPU ${s}`)
  return {
    version: 1,
    title: 'The pipeline bubble',
    description: `A model split into ${p} stages on ${p} GPUs. Micro-batches flow forward (F) then backward (B). The idle gaps are the bubble: ${Math.round(a.idle * 100)}% of the time with 4 micro-batches, ${Math.round(b.idle * 100)}% with 8.`,
    dim: 2,
    camera: { position: [0, 7.5, 5.2], target: [0, 0, 0] },
    elements: [{ id: 'tl', type: 'timeline', lanes, blocks: a.blocks, size: [7.2, 2.6], span: [0, a.end], now: 0 }],
    steps: [
      { label: 'Four stages', caption: 'Each GPU holds a quarter of the layers. Time runs left to right.', ms: 900 },
      { label: 'Forward and back', caption: 'A micro-batch must finish one stage before the next can start, so GPUs wait.', set: [{ id: 'tl', set: { now: a.end } }], ms: 3200 },
      { label: 'The bubble', caption: 'The empty space is idle time.', tex: `\\text{idle} = ${r3(a.idle)} = \\frac{p - 1}{m + p - 1} = \\frac{3}{7}`, pause: true, ms: 900 },
      { label: 'More micro-batches', caption: 'Eight smaller micro-batches fill the pipe better.', tex: `\\text{idle} = ${r3(b.idle)} = \\frac{3}{11}`, set: [{ id: 'tl', set: { blocks: b.blocks, span: [0, b.end], now: b.end } }], pause: true, ms: 1600 },
    ],
  }
}

/* ── Text: running code line by line ──────────────────────────────────── */

export function codeScene(): StageSpec {
  const scores = [62, 75, 88, 91]
  const lines = ['scores = [62, 75, 88, 91]', 'total = 0', 'for s in scores:', '    total = total + s', 'mean = total / len(scores)']
  const steps: StageStep[] = []
  const vars: [string, string][] = []
  const put = (k: string, v: string) => {
    const i = vars.findIndex(([n]) => n === k)
    if (i >= 0) vars[i] = [k, v]
    else vars.push([k, v])
  }
  const run = (line: number, label: string, caption: string, hl: [number, number][] = []) =>
    steps.push({ label, caption, set: [{ id: 'code', set: { active: line, vars: vars.map((v) => [...v]) } }, { id: 'tbl', set: { highlight: hl } }], ms: 1000 })
  put('scores', `[${scores.join(', ')}]`)
  run(0, 'Line 1', 'A list of four exam scores.')
  let total = 0
  put('total', '0')
  run(1, 'Line 2', 'A running total, starting at 0.')
  scores.forEach((s, i) => {
    put('s', String(s))
    run(2, `Loop, s = ${s}`, `Take the next score: ${s}.`, [[i, 1]])
    total += s
    put('total', String(total))
    run(3, `total = ${total}`, `Add it: the total is now ${total}.`, [[i, 1]])
  })
  put('mean', String(total / scores.length))
  run(4, 'Line 5', `Divide by how many there are: the mean is ${total / scores.length}.`)
  steps[steps.length - 1].pause = true
  return {
    version: 1,
    title: 'Running code line by line',
    description: `Five lines of Python that average four scores. Each step runs one line and shows the variables it has made: the total climbs to ${total} and the mean is ${total / scores.length}.`,
    dim: 2,
    camera: { position: [0, 6, 4], target: [0, 0, 0] },
    elements: [
      { id: 'code', type: 'code', lines, at: [-1.4, 0, 0], active: 0, vars: [] },
      { id: 'tbl', type: 'table', header: ['#', 'score'], rows: scores.map((s, i) => [i + 1, s]), at: [2.4, 0, 0] },
    ],
    steps,
  }
}

/** Every kit demo, in catalogue order (the tests check that each is a valid scene). */
export const KIT_DEMOS: { kit: string; make: () => StageSpec }[] = [
  { kit: 'Plots', make: calculusScene },
  { kit: 'Plots', make: diceScene },
  { kit: 'Shapes', make: logisticScene },
  { kit: 'Graphs', make: graphScene },
  { kit: 'Vision', make: convScene },
  { kit: 'Vision', make: iouScene },
  { kit: 'Language', make: bigramScene },
  { kit: 'Reinforcement learning', make: gridScene },
  { kit: 'Systems', make: memoryScene },
  { kit: 'Systems', make: pipelineScene },
  { kit: 'Code and tables', make: codeScene },
]
