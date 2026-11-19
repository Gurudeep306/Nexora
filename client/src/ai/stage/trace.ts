/*
  From a computation to a scene, automatically.

  Write a computation on the tape (engine/tape.ts) — a network, an attention
  head, a loss — and traceScene() turns its record into a Stage scene: every
  matrix becomes a grid of cells, laid out in columns in the order it was
  computed; every operation becomes a step in which its inputs light up and
  beads fly from the exact cells that feed each output cell (row × column for
  a product, cell to cell for tanh, every cell into the loss); the step's
  formula is written with the real names and shapes. After the forward pass
  the scene rises into 3D, where every value stands as a height; then the
  backward pass shows each gradient, matrix by matrix.

  Nothing about the model is drawn by hand, so the same code shows any model
  the tape can run. Shared with Node tests: erasable-syntax only.
*/
import type { M, TNode, Tape } from '../engine/tape.ts'
import type { StageElement, StageSpec, StageStep, V3 } from './spec.ts'

export interface TraceOptions {
  title: string
  description: string
  /** The 1 × 1 loss node, if the backward pass should be shown (call tape.backward(loss) first). */
  loss?: number
  /** Plain words for an operation's step, by node label. */
  notes?: Record<string, string>
  cell?: number
}

const r3 = (v: number) => Math.round(v * 1000) / 1000
const round = (m: M) => m.map((row) => row.map(r3))
const dims = (m: M) => [m.length, m[0]?.length ?? 0] as const
/** A node's name in TeX: W1 → W_{1}, a1 → a_{1}, Kt → K^{\top}. */
function texName(label: string): string {
  if (label === 'yhat') return '\\hat y'
  const t = /^(.*?)T$/.exec(label)
  if (t && t[1]) return `${texName(t[1])}^{\\top}`
  const m = /^([A-Za-z]+)(\d+)$/.exec(label)
  if (m) return `${m[1]}_{${m[2]}}`
  return /^[A-Za-z]$/.test(label) ? label : `\\mathrm{${label.replace(/_/g, '\\_')}}`
}
const texMat = (m: M) => (m.length * (m[0]?.length ?? 0) > 16 ? '' : ` = \\begin{pmatrix}${m.map((r) => r.map((v) => String(r3(v))).join('&')).join('\\\\')}\\end{pmatrix}`)

function formula(n: TNode, nodes: TNode[]): string {
  const L = texName(n.label)
  const [a, b] = n.inputs.map((i) => texName(nodes[i].label))
  switch (n.op) {
    case 'matmul':
      return `${L} = ${a}\\,${b}`
    case 'add':
      return `${L} = ${a} + ${b}`
    case 'mul':
      return `${L} = ${a} \\odot ${b}`
    case 'scale':
      return `${L} = ${r3(n.k ?? 1)} \\cdot ${a}`
    case 'transpose':
      return `${L} = ${texName(nodes[n.inputs[0]].label)}^{\\top}`
    case 'tanh':
      return `${L} = \\tanh(${a})`
    case 'sigmoid':
      return `${L} = \\sigma(${a}) = \\frac{1}{1 + e^{-${a}}}`
    case 'relu':
      return `${L} = \\max(0, ${a})`
    case 'softmax':
      return `${L}_{ij} = \\frac{e^{${a}_{ij}}}{\\sum_{k} e^{${a}_{ik}}}`
    case 'bce':
      return `${L} = -\\frac{1}{n}\\sum \\big[${b}\\log ${a} + (1-${b})\\log(1-${a})\\big]`
    case 'mse':
      return `${L} = \\frac{1}{n}\\sum (${a} - ${b})^2`
    default:
      return L
  }
}

const OP_WORDS: Partial<Record<TNode['op'], string>> = {
  matmul: 'Each cell is a row of the first matrix times a column of the second, added up.',
  add: 'Add them cell by cell (a single row is added to every row: a bias).',
  mul: 'Multiply them cell by cell.',
  scale: 'Multiply every cell by the same number.',
  transpose: 'Rows become columns.',
  tanh: 'Squash every cell into −1 … 1 with tanh.',
  sigmoid: 'Squash every cell into 0 … 1 with the sigmoid.',
  relu: 'Keep positive cells, set negative ones to 0.',
  softmax: 'Turn each row into probabilities that add up to 1.',
  bce: 'How wrong the predictions are: binary cross-entropy, averaged.',
  mse: 'How wrong the predictions are: the mean of the squared errors.',
}

export function traceScene(tape: Tape, opts: TraceOptions): StageSpec {
  const nodes = tape.nodes
  const cell = opts.cell ?? 0.42
  const gapX = 1.4
  const gapY = 0.9

  // Columns: inputs and parameters first, then each node one column after its latest input.
  const level = new Map<number, number>()
  for (const n of nodes) level.set(n.id, n.inputs.length ? 1 + Math.max(...n.inputs.map((i) => level.get(i)!)) : 0)
  // A parameter sits in the column just before the first operation that uses it.
  for (const n of nodes)
    if (n.op === 'param') {
      const users = nodes.filter((u) => u.inputs.includes(n.id)).map((u) => level.get(u.id)!)
      if (users.length) level.set(n.id, Math.max(0, Math.min(...users) - 1))
    }
  const cols = Math.max(...level.values()) + 1
  const colW = Array.from({ length: cols }, (_, l) => Math.max(...nodes.filter((n) => level.get(n.id) === l).map((n) => dims(n.value)[1] * cell)))
  const colX: number[] = []
  colW.forEach((w, l) => colX.push(l === 0 ? w / 2 : colX[l - 1] + colW[l - 1] / 2 + gapX + w / 2))
  // Rows within a column: stacked top to bottom, with room under each for its gradient.
  const pos = new Map<number, [number, number]>()
  const withGrad = opts.loss != null
  for (let l = 0; l < cols; l++) {
    const here = nodes.filter((n) => level.get(n.id) === l)
    const hs = here.map((n) => dims(n.value)[0] * cell * (withGrad && n.op !== 'input' && n.id !== opts.loss ? 2 : 1) + (withGrad ? gapY * 0.6 : 0))
    let y = (hs.reduce((a, b) => a + b, 0) + gapY * (here.length - 1)) / 2
    here.forEach((n, k) => {
      const h = dims(n.value)[0] * cell
      pos.set(n.id, [colX[l], y - h / 2])
      y -= hs[k] + gapY
    })
  }
  const midX = (colX[0] + colX[cols - 1]) / 2
  for (const [k, [x, y]] of pos) pos.set(k, [x - midX, y])

  const cellAt = (id: number, i: number, j: number, z = 0.18): V3 => {
    const [x, y] = pos.get(id)!
    const [r, c] = dims(nodes[id].value)
    return [x + (j - (c - 1) / 2) * cell, y - (i - (r - 1) / 2) * cell, z]
  }
  const gradAt = (id: number): [number, number] => {
    const [x, y] = pos.get(id)!
    return [x, y - dims(nodes[id].value)[0] * cell - gapY * 0.6]
  }

  const els: StageElement[] = []
  const computed = nodes.filter((n) => n.op !== 'input' && n.op !== 'param')
  for (const n of nodes) {
    const [x, y] = pos.get(n.id)!
    const [r, c] = dims(n.value)
    const kind = n.op === 'input' ? 'input' : n.op === 'param' ? 'parameter' : 'computed'
    els.push({ id: `n${n.id}`, type: 'bars', values: round(n.value), at: [x, y, 0], cell, height: 0.8, numbers: r * c <= 36, tone: n.op === 'input' ? 'ink' : n.op === 'param' ? 'ink2' : 'warning', hidden: kind === 'computed', tip: n.label })
    els.push({ id: `l${n.id}`, type: 'label', at: [x, y + (r * cell) / 2 + 0.32, 0], text: `${n.label}  (${r} × ${c})`, tone: kind === 'computed' ? 'ink' : 'muted', hidden: kind === 'computed' })
  }
  // Beads: from the exact cells that feed each output cell (at most 48 per step).
  for (const n of computed) {
    const from: V3[] = []
    const to: V3[] = []
    const [R, C] = dims(n.value)
    const [a, b] = n.inputs
    for (let i = 0; i < R && from.length < 48; i++)
      for (let j = 0; j < C && from.length < 48; j++) {
        const dst = cellAt(n.id, i, j)
        const srcs: V3[] = []
        if (n.op === 'matmul') {
          const [, ac] = dims(nodes[a].value)
          const [br] = dims(nodes[b].value)
          srcs.push(cellAt(a, i, (ac - 1) / 2), cellAt(b, (br - 1) / 2, j)) // the middle of the row and of the column
        } else if (n.op === 'transpose') srcs.push(cellAt(a, j, i))
        else if (n.op === 'bce' || n.op === 'mse') {
          const [pr, pc] = dims(nodes[a].value)
          for (let p = 0; p < pr; p++) for (let q = 0; q < pc; q++) srcs.push(cellAt(a, p, q))
        } else {
          srcs.push(cellAt(a, i, j))
          if (b != null && (n.op === 'add' || n.op === 'mul')) srcs.push(cellAt(b, dims(nodes[b].value)[0] === 1 ? 0 : i, j))
        }
        for (const s of srcs) {
          from.push(s)
          to.push(dst)
        }
      }
    els.push({ id: `b${n.id}`, type: 'beads', from, to, progress: 0, arc: 0.7, r: 0.06, tone: 'accent' })
  }
  // Gradients, under each matrix, shown in the backward pass.
  if (withGrad)
    for (const n of nodes) {
      if (n.op === 'input' || n.id === opts.loss || !n.grad) continue
      const [x, y] = gradAt(n.id)
      const [r, c] = dims(n.grad)
      els.push({ id: `g${n.id}`, type: 'tiles', values: round(n.grad), at: [x, y - (r * cell) / 2, 0], cell, height: 0.15, numbers: r * c <= 36, tone: 'info', hidden: true, tip: `∂L/∂${n.label}` })
      els.push({ id: `gl${n.id}`, type: 'label', at: [x, y + 0.15, 0], text: `∂L/∂${n.label}`, tone: 'muted', hidden: true })
    }

  const inputs = nodes.filter((n) => n.op === 'input' || n.op === 'param')
  const steps: StageStep[] = [
    {
      label: 'What goes in',
      caption: `${inputs.map((n) => `[${n.label}](#n${n.id})`).join(', ')}: the ${inputs.some((n) => n.op === 'param') ? 'inputs and the parameters' : 'inputs'}, with their real numbers.`,
      focus: inputs.flatMap((n) => [`n${n.id}`, `l${n.id}`]),
      ms: 1800,
    },
  ]
  for (const n of computed) {
    const deps = n.inputs.flatMap((i) => [`n${i}`, `l${i}`])
    steps.push({
      label: `${n.label} = ${n.op}(${n.inputs.map((i) => nodes[i].label).join(', ')})`,
      caption: `${opts.notes?.[n.label] ?? OP_WORDS[n.op] ?? ''} The result is [${n.label}](#n${n.id}).`,
      tex: formula(n, nodes) + (n.op === 'bce' || n.op === 'mse' ? ` = ${r3(n.value[0][0])}` : texMat(n.value)),
      set: [
        { id: `n${n.id}`, set: { hidden: false } },
        { id: `l${n.id}`, set: { hidden: false } },
        { id: `b${n.id}`, set: { progress: 1 } },
      ],
      focus: [`n${n.id}`, `l${n.id}`, `b${n.id}`, ...deps],
      ms: 2400,
    })
  }
  steps.push({ label: 'Every value as height', caption: 'Rise into 3D: every cell stands as tall as its value, so the whole computation can be compared at a glance.', dim: 3, ms: 2200, pause: !withGrad })
  if (withGrad) {
    for (const n of [...nodes].reverse()) {
      if (n.op === 'input' || n.id === opts.loss || !n.grad) continue
      steps.push({
        label: `∂L/∂${n.label}`,
        caption: n.op === 'param' ? `How the loss changes with each number of ${n.label}: the step that training takes.` : `The gradient reaches ${n.label}: how much each of its cells moves the loss.`,
        tex: `\\frac{\\partial L}{\\partial ${texName(n.label)}}${texMat(n.grad)}`,
        set: [
          { id: `g${n.id}`, set: { hidden: false } },
          { id: `gl${n.id}`, set: { hidden: false } },
        ],
        focus: [`g${n.id}`, `gl${n.id}`, `n${n.id}`, `l${n.id}`],
        ms: 1900,
      })
    }
    steps[steps.length - 1].pause = true
  }

  // Frame the whole computation.
  const xs = [...pos.values()].map(([x]) => x)
  const ys = [...pos.values()].map(([, y]) => y)
  const span = Math.max(4, Math.max(...xs) - Math.min(...xs) + 3, Math.max(...ys) - Math.min(...ys) + 3)
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2 - (withGrad ? 0.8 : 0)
  return {
    version: 1,
    title: opts.title,
    description: opts.description,
    dim: 2,
    camera: { position: [0, span * 0.75, -cy + span * 0.85], target: [0, 0, -cy] },
    elements: els,
    steps,
  }
}
