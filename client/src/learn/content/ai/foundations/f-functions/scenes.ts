/*
  Scenes for "Functions and their graphs". Every value is computed from the
  function itself: the fares from 50 + 15x, the points from x², the shifted
  graphs from a(x − h)² + k with the parameters the captions name.
*/
import type { StageElement, StageSpec, StageStep, V3 } from '@/ai/stage/spec'
import { plotAxes, rd, signed } from '../../sceneKit.ts'

/** The running example: a taxi that charges ₹50 to start and ₹15 per kilometre. */
export const fare = (km: number) => 50 + 15 * km

/* ── 1. A function is a machine: one input in, one output out ─────────── */

export function machineScene(): StageSpec {
  const trips = [2, 5, 8]
  type N = Extract<StageElement, { type: 'graph' }>['nodes'][number]
  const nodes = (x?: number): N[] => [
    { id: 'in', label: x == null ? 'x' : `${x} km`, at: [-3, 0], r: 0.5, tone: 'info' },
    { id: 'f', label: '50 + 15x', at: [0, 0], r: 0.75 },
    { id: 'out', label: x == null ? 'f(x)' : `₹${fare(x)}`, at: [3, 0], r: 0.5, tone: x == null ? undefined : 'success' },
  ]
  const steps: StageStep[] = [
    { label: 'The rule', caption: 'A taxi charges ₹50 to start and ₹15 for every kilometre. The rule takes the distance in and gives the fare out.', tex: 'f(x) = 50 + 15x', ms: 1200 },
  ]
  trips.forEach((x, i) => {
    const rows = trips.slice(0, i + 1).map((t) => [t, `₹${fare(t)}`])
    steps.push({ label: `${x} km`, caption: `Put in ${x} km.`, tex: `f(${x}) = 50 + 15 \\times ${x}`, set: [{ id: 'm', set: { nodes: nodes(x), flow: 0, flowEdges: [0] } }], ms: 300 })
    steps.push({
      label: `${x} km → ₹${fare(x)}`,
      caption: `The rule works it out: ${x} km costs ₹${fare(x)}. Each input gives exactly one output.`,
      tex: `f(${x}) = 50 + ${15 * x} = ${fare(x)}`,
      set: [
        { id: 'm', set: { flow: 1, flowEdges: [0, 1] } },
        { id: 'tab', set: { rows } },
      ],
      ms: 1500,
    })
  })
  steps[steps.length - 1].pause = true
  return {
    version: 1,
    title: 'A function is a rule: one input in, one output out',
    description: 'A function drawn as a machine. The distance goes in on the left, the rule 50 + 15x works on it, and the fare comes out on the right: 2 km gives ₹80, 5 km gives ₹125, 8 km gives ₹170. A table collects each input with its output.',
    dim: 2,
    camera: { position: [0.6, 8.4, 3.2], target: [0.6, 0, -0.6] },
    elements: [
      { id: 'm', type: 'graph', nodes: nodes(), edges: [{ from: 'in', to: 'f' }, { from: 'f', to: 'out' }], directed: true, flow: 0 },
      { id: 'tab', type: 'table', header: ['x (km)', 'f(x)'], rows: [['—', '—']], at: [5.6, 0, 0] },
    ],
    steps,
  }
}

/* ── 2. From a table to a graph: f(x) = x² traces its curve ───────────── */

export function traceScene(): StageSpec {
  const sq = (x: number) => x * x
  const coarse = [-2, -1, 0, 1, 2]
  const fine = Array.from({ length: 17 }, (_, i) => -2 + i * 0.25)
  const els: StageElement[] = [
    ...plotAxes([-2.6, 2.6], [-0.6, 4.6]),
    { id: 'p5', type: 'points', points: coarse.map((x) => [x, sq(x), 0] as V3), tones: coarse.map(() => 'info'), r: 0.09, hidden: true, tips: coarse.map((x) => `(${signed(x)}, ${sq(x)})`) },
    { id: 'p17', type: 'points', points: fine.map((x) => [x, sq(x), 0] as V3), tones: fine.map(() => 'info'), r: 0.06, hidden: true, tips: fine.map((x) => `(${signed(x, 2)}, ${rd(sq(x), 4)})`) },
    { id: 'f', type: 'curve', f: 'x^2', range: [-2.1, 2.1], upTo: 0, hidden: true },
    { id: 'tab', type: 'table', header: ['x', 'x²'], rows: coarse.map((x) => [signed(x), sq(x)]), at: [4.4, 2, 0], hidden: true },
  ]
  const ride = [-2, -1.2, 0, 0.7, 1.5, 2]
  return {
    version: 1,
    title: 'A table becomes points, the points become a curve',
    description: 'The function f(x) = x squared. First a table of five inputs and outputs; each pair becomes a point. More points fill in, then the whole curve is drawn: a U-shaped parabola. Finally a point rides along the curve, with dashed lines showing its x and its f(x).',
    dim: 2,
    camera: { position: [1, 9, 4.2], target: [1, 0, -2] },
    elements: els,
    steps: [
      { label: 'A table', caption: 'Square each number: the [table](#tab) pairs each input x with its output x².', tex: 'f(x) = x^2', set: [{ id: 'tab', set: { hidden: false } }], ms: 1200 },
      { label: 'Pairs become points', caption: 'Each pair (x, x²) is a [point](#p5): go x along, then x² up.', tex: '(-2, 4),\\ (-1, 1),\\ (0, 0),\\ (1, 1),\\ (2, 4)', set: [{ id: 'p5', set: { hidden: false } }], ms: 1500 },
      { label: 'More points', caption: 'Seventeen inputs, a quarter apart. The points start to look like a [curve](#p17).', set: [{ id: 'p17', set: { hidden: false } }], ms: 1400 },
      { label: 'Every input', caption: 'Every real x has its point. Together they make one unbroken curve: the graph of f.', set: [{ id: 'f', set: { hidden: false, upTo: 1 } }, { id: 'p17', set: { hidden: true } }], ms: 2200 },
      ...ride.map(
        (x, i): StageStep => ({
          label: `x = ${signed(x, 1)}`,
          caption: i === 0 ? 'Now pick any x and read its output straight off the graph: across to the curve, then over to the y axis.' : `x = ${signed(x, 1)} gives f(x) = ${rd(sq(x), 2)}.`,
          tex: `f(${signed(x, 1).replace('−', '-')}) = (${signed(x, 1).replace('−', '-')})^2 = ${rd(sq(x), 2)}`,
          set: [{ id: 'f', set: { dot: x, guides: true } }],
          focus: ['f', 'ax-x', 'ax-y'],
          ms: 1300,
          pause: i === ride.length - 1,
        }),
      ),
    ],
  }
}

/* ── 3. Shapes you will meet again ─────────────────────────────────────── */

export function shapesScene(): StageSpec {
  const shapes: { id: string; f: string; name: string; tex: string; say: string }[] = [
    { id: 'lin', f: '0.5*x + 1', name: 'a straight line', tex: 'f(x) = 0.5x + 1', say: 'A [straight line](#lin): every step of 1 to the right goes 0.5 up. 0.5 is its slope; 1 is where it crosses the y axis.' },
    { id: 'quad', f: 'x^2 - 1', name: 'a parabola', tex: 'f(x) = x^2 - 1', say: 'A [parabola](#quad): it falls, turns at its lowest point, and rises again.' },
    { id: 'absf', f: 'abs(x)', name: 'absolute value', tex: 'f(x) = |x|', say: 'The [absolute value](#absf): the distance from 0, so it is never negative. It has a sharp corner at 0.' },
    { id: 'relu', f: 'max(0, x)', name: 'ReLU', tex: 'f(x) = \\max(0, x)', say: '[ReLU](#relu): 0 for negative inputs, the input itself for positive ones. Almost every neural network uses it.' },
  ]
  const tones = ['info', 'warning', 'success', 'accent'] as const
  const els: StageElement[] = [...plotAxes([-3, 3], [-1.6, 3.4])]
  shapes.forEach((s, i) => els.push({ id: s.id, type: 'curve', f: s.f, range: [-2.8, 2.8], tone: tones[i], hidden: true, width: 2.6 }))
  return {
    version: 1,
    title: 'Four shapes you will meet again',
    description: 'Four graphs on the same axes: the straight line 0.5x + 1, the parabola x squared minus 1, the absolute value of x with its corner at 0, and ReLU, which is 0 for negative x and x itself for positive x.',
    dim: 2,
    camera: { position: [0, 8.8, 3.6], target: [0, 0, -0.9] },
    elements: els,
    steps: shapes.map((s, i) => ({ label: s.name, caption: s.say, tex: s.tex, set: [{ id: s.id, set: { hidden: false } }], focus: [s.id, 'ax-x', 'ax-y'], ms: 1500, pause: i === shapes.length - 1 })),
  }
}

/* ── 4. Moving and stretching a graph ─────────────────────────────────── */

export function moveScene(): StageSpec {
  const moves: { a: number; h: number; k: number; label: string; say: string }[] = [
    { a: 1, h: 0, k: 0, label: 'Start: x²', say: 'Start with the parabola f(x) = x². Its lowest point is at (0, 0).' },
    { a: 1, h: 2, k: 0, label: 'Replace x by x − 2', say: 'Replace x by (x − 2). The whole graph moves 2 to the right, not the left.' },
    { a: 1, h: 2, k: 1, label: 'Add 1', say: 'Add 1 to the output. Every point rises by 1.' },
    { a: 0.5, h: 2, k: 1, label: 'Multiply by ½', say: 'Multiply the output by ½. Every height above the lowest point halves: the U opens wider.' },
    { a: -0.5, h: 2, k: 1, label: 'Multiply by −½', say: 'A minus sign flips it upside down.' },
  ]
  const tex = (m: (typeof moves)[number]) => {
    const inner = m.h ? `(x - ${m.h})^2` : 'x^2'
    const a = m.a === 1 ? '' : m.a === 0.5 ? '\\tfrac12' : m.a === -0.5 ? '-\\tfrac12' : String(m.a)
    return `f(x) = ${a}${inner}${m.k ? ` + ${m.k}` : ''}`
  }
  return {
    version: 1,
    title: 'Moving and stretching a graph',
    description: 'The parabola x squared, drawn dashed for reference, and a copy that changes: replacing x by x − 2 moves it 2 to the right; adding 1 lifts it by 1; multiplying by one half widens it; multiplying by minus one half flips it upside down.',
    dim: 2,
    params: { a: 1, h: 0, k: 0 },
    camera: { position: [1, 9.5, 3.6], target: [1, 0, -0.6] },
    elements: [
      ...plotAxes([-2.6, 4.8], [-2.2, 4.4]),
      { id: 'base', type: 'curve', f: 'x^2', range: [-2.1, 2.1], tone: 'muted', dashed: true, width: 1.4 },
      { id: 'g', type: 'curve', f: 'a*(x - h)^2 + k', range: [-2.4, 4.6], tone: 'info', width: 2.8 },
      { id: 'lowest', type: 'label', at: [0, -0.4, 0], text: 'lowest point', tone: 'muted', hidden: true },
    ],
    steps: moves.map((m, i) => ({ label: m.label, caption: m.say, tex: tex(m), params: { a: m.a, h: m.h, k: m.k }, ms: 1700, pause: i === 1 || i === moves.length - 1 })),
  }
}

/* ── 5. Undoing a function: its inverse is its mirror image ───────────── */

export function inverseScene(): StageSpec {
  const f = (x: number) => 2 * x + 3
  const pts = [-1, 0, 1]
  return {
    version: 1,
    title: 'A function and its inverse are mirror images',
    description: 'The line f(x) = 2x + 3 and the line y = x. Each point (x, f(x)) is reflected across y = x to (f(x), x). The reflected points lie on a second line, (x − 3)/2: the inverse, which undoes f.',
    dim: 2,
    camera: { position: [0.8, 10.5, 4.2], target: [0.8, 0, -1.2] },
    elements: [
      ...plotAxes([-3.4, 5.6], [-3.4, 5.6], { step: 2 }),
      { id: 'mirror', type: 'curve', f: 'x', range: [-3.2, 5.4], tone: 'muted', dashed: true, width: 1.4 },
      { id: 'f', type: 'curve', f: '2*x + 3', range: [-3.1, 1.2], tone: 'info', width: 2.6 },
      { id: 'fp', type: 'points', points: pts.map((x) => [x, f(x), 0] as V3), tones: pts.map(() => 'info'), r: 0.09, tips: pts.map((x) => `(${signed(x)}, ${f(x)})`) },
      { id: 'gp', type: 'points', points: pts.map((x) => [x, f(x), 0] as V3), tones: pts.map(() => 'warning'), r: 0.09, hidden: true, tips: pts.map((x) => `(${f(x)}, ${signed(x)})`) },
      { id: 'g', type: 'curve', f: '(x - 3)/2', range: [-3.1, 5.4], tone: 'warning', width: 2.6, hidden: true },
      { id: 'fl', type: 'label', at: [-1.9, 1.6, 0], text: 'f(x) = 2x + 3' },
      { id: 'gl', type: 'label', at: [4.3, 1.3, 0], text: 'f⁻¹(x) = (x − 3)/2', hidden: true },
    ],
    steps: [
      { label: 'A function', caption: 'The line [f(x) = 2x + 3](#f), and three of its points.', tex: 'f(-1) = 1,\\quad f(0) = 3,\\quad f(1) = 5', ms: 1200 },
      { label: 'The mirror', caption: 'The dashed line is [y = x](#mirror): every point on it has its two numbers equal.', ms: 1100 },
      { label: 'Swap each pair', caption: 'Swap the two numbers of each point: (1, 5) becomes (5, 1). That is the same as reflecting it in the mirror.', tex: '(x, f(x)) \\longrightarrow (f(x), x)', set: [{ id: 'gp', set: { hidden: false, points: pts.map((x) => [f(x), x, 0] as V3) } }], ms: 1900 },
      { label: 'The inverse', caption: 'The swapped points lie on a new line: the [inverse](#g), which takes f’s output back to its input.', tex: 'f^{-1}(x) = \\frac{x - 3}{2}', set: [{ id: 'g', set: { hidden: false } }, { id: 'gl', set: { hidden: false } }], pause: true, ms: 1500 },
    ],
  }
}

/* ── 6. A function of two numbers is a surface ────────────────────────── */

export function surfaceScene(): StageSpec {
  const f = (x: number, y: number) => (x * x + y * y) / 2
  const [px, py] = [1.2, -0.8]
  return {
    version: 1,
    title: 'Two inputs, one output: a surface',
    description: 'The function f(x, y) = (x² + y²)/2. Seen from above it is a heat map with rings of equal height around the centre. Lifted into 3D it is a bowl: each point of the floor (x, y) rises to the height f(x, y). One point, (1.2, −0.8), is marked with its height.',
    dim: 2,
    camera: { position: [4.6, 5.6, 5.4], target: [0, 0.8, 0] },
    elements: [
      { id: 'bowl', type: 'surface', f: '(x^2 + y^2)/2', range: [-2, 2], scale: 0.9 },
      { id: 'rings', type: 'contours', f: '(x^2 + y^2)/2', range: [-2, 2], levels: [0.25, 0.75, 1.5, 2.5] },
      { id: 'ax', type: 'axes', size: 2.6, names: ['x', 'y', 'f(x, y)'] },
      { id: 'pt', type: 'points', points: [[px, py, f(px, py) * 0.9]], tones: ['accent'], r: 0.1, tips: [`f(${px}, ${py}) = ${rd(f(px, py))}`] },
      { id: 'stem', type: 'line', points: [[px, py, 0], [px, py, f(px, py) * 0.9]], dashed: true, hidden: true },
    ],
    steps: [
      { label: 'From above', caption: 'Two inputs, x and y, pick a point on the floor. The [shading](#bowl) shows the output there: darker ochre is bigger. The [rings](#rings) join points with equal output.', tex: 'f(x, y) = \\frac{x^2 + y^2}{2}', ms: 1600 },
      { label: 'Lift it', caption: 'Now let each output be a height. The flat map rises into a bowl.', set: [{ id: 'stem', set: { hidden: false } }], dim: 3, ms: 2400 },
      { label: 'One point', caption: `The marked [point](#pt): x = ${px}, y = ${signed(py, 1)}, height ${rd(f(px, py))}.`, tex: `f(${px}, ${py}) = \\frac{${rd(px * px, 2)} + ${rd(py * py, 2)}}{2} = ${rd(f(px, py))}`, pause: true, ms: 1400 },
      { label: 'Why this matters', caption: 'Training an AI model means finding the lowest point of a surface like this one, but with millions of inputs instead of two. Drag to look around.', ms: 1200 },
    ],
  }
}
