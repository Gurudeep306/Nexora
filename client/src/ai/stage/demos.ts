/*
  Four Stage scenes that show what the engine can do, each built from real
  numbers (the engine computes them; nothing is typed in). A course writes
  scenes the same way: as data, by hand or built from the engine like these.
*/
import { rng } from '../engine/linalg.ts'
import { train, pass, XOR } from '../engine/mlp.ts'
import { Tape } from '../engine/tape.ts'
import { traceScene } from './trace.ts'
import type { StageSpec, V3 } from './spec.ts'

const r3 = (v: number) => Math.round(v * 1000) / 1000

/* ── Attention: scores → softmax → weights rising as bars ─────────────── */

export function attentionScene(): StageSpec {
  const tokens = ['The', 'cat', 'sat', 'down']
  const d = 4
  const rnd = rng(11)
  const rand = () => Array.from({ length: d }, () => r3((rnd() * 2 - 1) * 1.4))
  const Q = tokens.map(rand)
  const K = tokens.map(rand)
  // Causal (masked) self-attention, as in GPT: a token only looks at itself and earlier tokens.
  const scores = Q.map((q, i) => K.map((k, j) => (j <= i ? r3(q.reduce((s, v, t) => s + v * k[t], 0) / Math.sqrt(d)) : 0)))
  const weights = scores.map((row, i) => {
    const ex = row.map((s, j) => (j <= i ? Math.exp(s) : 0))
    const z = ex.reduce((a, b) => a + b, 0)
    return ex.map((e) => r3(e / z))
  })
  const cell = 0.7
  const labels = tokens.flatMap((tk, i) => [
    { id: `row${i}`, type: 'label' as const, at: [-1.75 * cell - 0.8, (1.5 - i) * cell, 0] as V3, text: tk, tone: 'ink' as const },
    { id: `col${i}`, type: 'label' as const, at: [(i - 1.5) * cell, 1.5 * cell + 0.75, 0] as V3, text: tk, tone: 'muted' as const },
  ])
  return {
    version: 1,
    title: 'Attention: who looks at whom',
    description: 'A grid with one row per token (the one looking) and one column per token (the one looked at), for the sentence "The cat sat down". It starts as raw scores q·k divided by the square root of d, with later tokens masked out. Softmax turns each row into probabilities. Then the grid rises into 3D bars, so the strongest attention stands tallest.',
    dim: 2,
    camera: { position: [3.2, 4.6, 5.8], target: [0, 0.4, 0] },
    elements: [{ id: 'grid', type: 'bars', values: scores, cell, height: 1.8, numbers: true, tip: 'weight' }, ...labels],
    steps: [
      { label: 'Raw scores', caption: 'Each [cell](#grid) is a query–key dot product, scaled by √d. Masked cells (the future) are left at 0.', tex: 's_{ij} = \\frac{\\mathbf q_i \\cdot \\mathbf k_j}{\\sqrt{d}}, \\quad j \\le i', ms: 1800 },
      { label: 'Softmax, row by row', caption: 'Each row becomes probabilities that add up to 1: how much each token attends to each earlier one.', tex: 'a_{ij} = \\frac{e^{s_{ij}}}{\\sum_{j\' \\le i} e^{s_{ij\'}}}', set: [{ id: 'grid', set: { values: weights } }], pause: true, ms: 1600 },
      { label: 'Rise into 3D', caption: 'Now height is the weight. "sat" attends most to the tallest bar in its row.', dim: 3, focus: ['grid', 'row2', 'col0', 'col1', 'col2'], ms: 2000 },
      { label: 'Look around', caption: 'Drag to turn it. Every row adds up to 1; the first token can only look at itself.', view: { camera: [-3.6, 3.8, 4.6], target: [0, 0.5, 0] } },
    ],
  }
}

/* ── A network: what it computes, forward and backward ────────────────── */

export function networkScene(): StageSpec {
  const net = train(1500, 0.5, 7, 50).history[8].net // part-trained, so the gradients are visible
  const ex = XOR[1]
  const P = pass(net, ex.x, ex.y)
  const layers = [2, 3, 1]
  return {
    version: 1,
    title: 'Inside a network: one example, forward and backward',
    description: `A 2–3–1 network with its real weights, drawn as jars (neurons) joined by ribbons (weights). Forward: from the input (${ex.x.join(', ')}), a bead travels along every ribbon, sized by what that connection contributes (weight × value); each hidden jar fills to its activation while a small tanh curve shows the squashing; then the output fills to ${r3(P.yhat)}. The weight matrices float above, lit while they are used. Then the scene rises into 3D, and the gradients travel back: each neuron shows ∂L/∂z.`,
    dim: 2,
    camera: { position: [0.4, 5.4, 6.2], target: [0, 0.4, -0.5] },
    elements: [
      {
        id: 'net',
        type: 'network',
        layers,
        weights: [net.W1.map((r) => r.map(r3)), [net.W2.map(r3)]],
        values: [ex.x, P.a1.map(r3), [r3(P.yhat)]],
        pre: [ex.x, P.z1.map(r3), [r3(P.z2)]],
        grads: [[0, 0], P.dz1.map(r3), [r3(P.dz2)]],
        acts: ['linear', 'tanh', 'sigmoid'],
        names: ['input', 'hidden (tanh)', 'output (σ)'],
        matrices: true,
        forward: 0,
        backward: 0,
      },
    ],
    steps: [
      { label: 'The input', caption: `Two inputs, x = (${ex.x.join(', ')}). The [network](#net)'s weights are the ribbons: thicker means larger, blue means negative.`, ms: 1400 },
      { label: 'Forward: hidden layer', caption: 'Along every ribbon a bead carries weight × value into the next neuron; bigger beads matter more. Each neuron adds them up (z) and squashes the sum with tanh (the little curve).', tex: `\\mathbf z_1 = W_1\\mathbf x + \\mathbf b_1 = (${P.z1.map(r3).join(',\\ ')}),\\quad \\mathbf a_1 = \\tanh(\\mathbf z_1) = (${P.a1.map(r3).join(',\\ ')})`, set: [{ id: 'net', set: { forward: 1 } }], ms: 3200 },
      { label: 'Forward: output', caption: 'The hidden values flow on; the sigmoid turns their sum into a probability.', tex: `z_2 = \\mathbf w_2^{\\top}\\mathbf a_1 + b_2 = ${r3(P.z2)},\\quad \\hat y = \\sigma(z_2) = ${r3(P.yhat)}`, set: [{ id: 'net', set: { forward: 2 } }], ms: 3000, pause: true },
      { label: 'Rise into 3D', caption: 'In 3D each jar stands at its full height: the fill is the activation, so you can compare every neuron at a glance.', dim: 3, ms: 2200 },
      { label: 'Backward: output', caption: `The loss blames the output first: ∂L/∂z = ŷ − y = ${r3(P.dz2)}.`, tex: `\\frac{\\partial L}{\\partial z_2} = \\hat y - y = ${r3(P.dz2)}`, set: [{ id: 'net', set: { backward: 1 } }], ms: 2200 },
      { label: 'Backward: hidden', caption: 'The blame flows back along each ribbon, scaled by its weight and by the slope of tanh at that neuron.', tex: `\\frac{\\partial L}{\\partial \\mathbf z_1} = \\big(\\mathbf w_2\\,\\tfrac{\\partial L}{\\partial z_2}\\big) \\odot (1 - \\mathbf a_1^2) = (${P.dz1.map(r3).join(',\\ ')})`, set: [{ id: 'net', set: { backward: 2 } }], ms: 2600, pause: true },
      { label: 'Look around', caption: 'Drag to turn it; hover a jar for z, its activation and its gradient, or a matrix cell for its weight.', view: { camera: [-3.9, 3.3, 5.2], target: [0.2, 0.5, -0.3] } },
    ],
  }
}

/* ── The Gaussian and its score field ──────────────────────────────────── */

export function scoreScene(): StageSpec {
  const rnd = rng(5)
  // 60 real samples from the final Gaussian (correlation 0.8), by Box–Muller.
  const rho = 0.8
  const samples: V3[] = Array.from({ length: 60 }, () => {
    const u1 = Math.max(1e-12, rnd())
    const u2 = rnd()
    const a = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const b = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
    return [r3(a), r3(rho * a + Math.sqrt(1 - rho * rho) * b), 0]
  })
  const density = 'exp(-(x^2 - 2*rho*x*y + y^2) / (2*(1 - rho^2))) / (2*pi*sqrt(1 - rho^2))'
  return {
    version: 1,
    title: 'A Gaussian, its score, and its shape in 3D',
    description: 'A two-dimensional Gaussian drawn first as a flat heat map with contour lines. Arrows show its score, the gradient of the log-density: they always point towards higher density. Then the map rises into a 3D bell, and the correlation grows from 0 to 0.8, tilting the bell and turning the arrows. Finally, sixty real samples from the tilted Gaussian appear on the floor.',
    dim: 2,
    params: { rho: 0 },
    camera: { position: [5.6, 5.4, 6.8], target: [0, 0.6, 0] },
    elements: [
      { id: 'bell', type: 'surface', f: density, range: [-3, 3], scale: 14, tip: 'density' },
      { id: 'rings', type: 'contours', f: density, range: [-3, 3], levels: [0.01, 0.03, 0.06, 0.1, 0.14] },
      { id: 'score', type: 'field', fx: '-(x - rho*y) / (1 - rho^2)', fy: '-(y - rho*x) / (1 - rho^2)', range: [-2.6, 2.6], n: 11, hidden: true },
      { id: 'samples', type: 'points', points: samples, tone: 'accent', r: 0.05, hidden: true, tip: 'a sample' },
      { id: 'axes', type: 'axes', size: 3.2, names: ['x₁', 'x₂', 'p(x)'] },
    ],
    steps: [
      { label: 'A heat map', caption: 'Seen from above, the [density](#bell) is a heat map: darker ochre is more likely. The [rings](#rings) are contour lines.', tex: 'p(\\mathbf x) = \\mathcal N\\big(\\mathbf 0, \\Sigma\\big), \\quad \\Sigma = \\begin{pmatrix}1 & \\rho\\\\ \\rho & 1\\end{pmatrix}', ms: 1600 },
      { label: 'The score', caption: 'The [score](#score) is the gradient of log p: at every point it points uphill, towards more likely places. Diffusion models learn exactly this field.', tex: '\\nabla_{\\mathbf x}\\log p(\\mathbf x) = -\\Sigma^{-1}\\mathbf x', set: [{ id: 'score', set: { hidden: false } }], pause: true, ms: 1800 },
      { label: 'Rise into 3D', caption: 'Lift it: the heat map becomes the bell, and the arrows sit on the floor beneath it.', dim: 3, ms: 2200 },
      { label: 'Correlation 0.8', caption: 'As ρ grows the bell narrows along one diagonal and the score arrows turn with it. The camera moves to the side to show it.', params: { rho: 0.8 }, view: { camera: [7.6, 3.4, -1.2], target: [0, 0.6, 0] }, ms: 2600 },
      { label: 'Samples', caption: 'Sixty real [samples](#samples) from this Gaussian: they crowd where the bell is high.', set: [{ id: 'samples', set: { hidden: false } }] },
    ],
  }
}

/* ── Tensor shapes: one sequence on paper, a batch in depth ──────────── */

export function tensorScene(): StageSpec {
  const rnd = rng(3)
  const B = 4
  const T = 6
  const C = 8
  const values = Array.from({ length: B * T * C }, () => r3(rnd()))
  return {
    version: 1,
    title: 'Tensor shapes: B × T × C',
    description: 'On paper, one sequence is a matrix: T = 6 tokens as rows, C = 8 features as columns. Rise into 3D and the batch dimension appears: B = 4 sequences stacked, the B × T × C tensor every transformer layer reads and writes. Hover a cell to read its index and value.',
    dim: 2,
    camera: { position: [4.2, 4.4, 5.2], target: [0, 0.5, 0] },
    elements: [{ id: 'x', type: 'tensor', shape: [B, T, C], values, cell: 0.34, names: ['B (batch)', 'T (tokens)', 'C (features)'] }],
    steps: [
      { label: 'One sequence: T × C', caption: 'Seen from above, the [tensor](#x) looks like one matrix: a row per token, a column per feature.', tex: 'X \\in \\mathbb R^{T \\times C} = \\mathbb R^{6 \\times 8}', ms: 1800 },
      { label: 'A batch: B × T × C', caption: 'In 3D the batch appears: four sequences stacked, processed together.', tex: '\\mathsf X \\in \\mathbb R^{B \\times T \\times C} = \\mathbb R^{4 \\times 6 \\times 8}', dim: 3, ms: 2200 },
      { label: 'Another angle', caption: 'Every layer of a transformer takes a tensor of this shape and returns one of the same shape.', view: { camera: [-4.6, 3.6, 4.2], target: [0, 0.6, 0] } },
    ],
  }
}

/* ── Built by the generator: the computation itself becomes the scene ── */

/** The same small network, run on the tape: its forward pass, its loss and every gradient. */
export function mlpTraceScene(): StageSpec {
  const net = train(1500, 0.5, 7, 50).history[8].net
  const ex = XOR[1]
  const t = new Tape()
  const x = t.input('x', [ex.x.slice()])
  const W1 = t.param('W1', net.W1[0].map((_, j) => net.W1.map((row) => r3(row[j])))) // 2 × 3
  const b1 = t.param('b1', [net.b1.map(r3)])
  const z1 = t.add(t.matmul(x, W1, 'xW1'), b1, 'z1')
  const a1 = t.tanh(z1, 'a1')
  const W2 = t.param('W2', net.W2.map((w) => [r3(w)])) // 3 × 1
  const b2 = t.param('b2', [[r3(net.b2)]])
  const z2 = t.add(t.matmul(a1, W2, 'a1W2'), b2, 'z2')
  const yhat = t.sigmoid(z2, 'yhat')
  const y = t.input('y', [[ex.y]])
  const L = t.bce(yhat, y, 'L')
  t.backward(L)
  return traceScene(t, {
    title: 'Generated: a network, forward and backward, from its own computation',
    description: `This scene was not drawn by hand: the network's computation was run on the tape, and the scene was built from that record. Every matrix is a grid of its real numbers; each step computes one of them, with beads flying from the cells that feed it. After the loss, the scene rises into 3D and the gradients flow back, one matrix at a time, down to the weights.`,
    loss: L,
    notes: { xW1: 'Each hidden neuron gets the inputs times its weights, added up.', z1: 'Add each hidden neuron’s bias.', yhat: 'The sigmoid turns the output into a probability.' },
  })
}

/** One self-attention head on four tokens, run on the tape and turned into a scene by the generator. */
export function attentionTraceScene(): StageSpec {
  const rnd = rng(21)
  const m = (r: number, c: number, s = 1) => Array.from({ length: r }, () => Array.from({ length: c }, () => r3((rnd() * 2 - 1) * s)))
  const t = new Tape()
  const X = t.input('X', m(4, 4))
  const Q = t.matmul(X, t.param('Wq', m(4, 2, 0.9)), 'Q')
  const K = t.matmul(X, t.param('Wk', m(4, 2, 0.9)), 'K')
  const V = t.matmul(X, t.param('Wv', m(4, 2, 0.9)), 'V')
  const S = t.scale(t.matmul(Q, t.transpose(K, 'KT'), 'QKT'), r3(1 / Math.sqrt(2)), 'S')
  const A = t.softmax(S, 'A')
  t.matmul(A, V, 'O')
  return traceScene(t, {
    title: 'Generated: one attention head, from its own computation',
    description: 'One self-attention head on four tokens (X: one row per token, small random weights for the example), run on the tape and turned into a scene by the generator. Queries, keys and values are the tokens times three weight matrices; the scores are queries times keys, scaled by one over the square root of 2; softmax makes each row a set of weights; the output mixes the values with those weights. Every number is the real one.',
    notes: { Q: 'Each token’s query: what it is looking for.', K: 'Each token’s key: what it offers.', V: 'Each token’s value: what it passes on.', QKT: 'Every query against every key: a score for each pair of tokens.', A: 'Each row becomes weights that add up to 1: how much each token attends to each other one.', O: 'Each token’s output is its weighted mix of all the values.' },
    cell: 0.4,
  })
}
