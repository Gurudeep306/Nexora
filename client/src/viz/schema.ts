/*
  Nexora Viz — the declarative scene format.

  A scene is a fixed canvas (width × height, in viewBox units) holding a list
  of elements, plus an ordered list of steps. Each step is a caption and a
  list of patches ({ id, set }) applied on top of the previous frame, so a
  scene is a small, diff-able animation script:

    { "version": 1, "title": "…", "width": 640, "height": 240,
      "intro": "What the first frame shows",
      "elements": [ { "id": "b3", "type": "box", "x": 40, "y": 60, "w": 60, "h": 60, "label": "1" } ],
      "steps": [ { "caption": "…", "patches": [ { "id": "b3", "set": { "tone": "accent" } } ] } ] }

  Colours are never literal: `tone` (stroke/text) and `fill` name theme roles
  (see VIZ_TONES), so every scene follows the palette and dark mode.

  Narrow screens: a scene may add a second canvas, `"narrow": { "width",
  "height", "below"? }`, used when the figure is narrower than `below` CSS
  pixels (default 560). In that layout each element may move or resize
  through its own `"narrow": { …geometry… }` override, and an element marked
  `"only": "wide"` or `"only": "narrow"` exists in one layout only (so a
  32-bit row can be drawn as one strip on desktop and as stacked fields on a
  phone). Steps are shared: a patch to an element that is absent from the
  current layout is ignored, and a layout override always wins over a patch
  for the geometry it names.

  This module is shared: the reader imports it, and scripts/build-gate-notes.js
  loads it in Node (type-stripped) to validate every viz/<name>.json. Keep it
  dependency-free and erasable-syntax only.
*/

export const VIZ_TONES = ['ink', 'muted', 'accent', 'subject', 'success', 'warning', 'danger', 'info'] as const
export type VizTone = (typeof VIZ_TONES)[number]

export const VIZ_ELEMENT_TYPES = ['box', 'circle', 'node', 'text', 'arrow', 'line', 'table', 'grid', 'bits', 'arc', 'gate', 'loop'] as const
export type VizElementType = (typeof VIZ_ELEMENT_TYPES)[number]
/** Logic-gate symbols (the `gate` element). */
export const VIZ_GATE_KINDS = ['and', 'or', 'not', 'buf', 'nand', 'nor', 'xor', 'xnor'] as const
export type VizGateKind = (typeof VIZ_GATE_KINDS)[number]

export const VIZ_LAYOUTS = ['wide', 'narrow'] as const
export type VizLayout = (typeof VIZ_LAYOUTS)[number]
/** Default width (CSS px) below which a scene with a `narrow` canvas switches to it. */
export const VIZ_NARROW_BELOW = 560
/** Properties an element's `narrow` override may change: geometry and text size only, never content. */
export const VIZ_LAYOUT_KEYS = ['x', 'y', 'w', 'h', 'cx', 'cy', 'r', 'r0', 'start', 'end', 'cell', 'cellW', 'cellH', 'size', 'points', 'from', 'to', 'curve', 'anchor', 'angle'] as const

export type VizPoint = [number, number]
/** An arrow end: a point, or the id of an element (snaps to its outline). */
export type VizEnd = VizPoint | string
export type VizCell = [number, number]

interface Common {
  id: string
  /** Stroke and text colour (default ink). */
  tone?: VizTone
  /** Fill colour, drawn as a soft wash (default none). */
  fill?: VizTone | 'none'
  /** How strong the fill wash is. */
  emphasis?: 'soft' | 'strong'
  hidden?: boolean
  /** 0–1. */
  opacity?: number
  dashed?: boolean
  /** Draw this element in one layout only (needs a top-level `narrow` canvas). */
  only?: VizLayout
  /** Geometry used in the narrow layout (keys from VIZ_LAYOUT_KEYS). */
  narrow?: Record<string, unknown>
}

export interface VizBox extends Common {
  type: 'box'
  x: number
  y: number
  w: number
  h: number
  label?: string
  /** Label in the monospace face (numbers, bits, code). */
  mono?: boolean
  size?: number
}
export interface VizCircle extends Common {
  type: 'circle' | 'node'
  cx: number
  cy: number
  r: number
  label?: string
  mono?: boolean
  size?: number
}
export interface VizText extends Common {
  type: 'text'
  x: number
  y: number
  text: string
  size?: number
  anchor?: 'start' | 'middle' | 'end'
  weight?: 'normal' | 'bold'
  mono?: boolean
}
export interface VizArrow extends Common {
  type: 'arrow'
  from: VizEnd
  to: VizEnd
  label?: string
  /** Bend as a fraction of the length (−1…1); 0 = straight. */
  curve?: number
  head?: 'end' | 'both' | 'none'
}
export interface VizLine extends Common {
  type: 'line'
  points: VizPoint[]
  label?: string
}
export interface VizTable extends Common {
  type: 'table'
  x: number
  y: number
  cellW: number
  cellH: number
  rows: string[][]
  /** First row is a header. */
  header?: boolean
  highlight?: VizCell[]
  mono?: boolean
}
export interface VizGrid extends Common {
  type: 'grid'
  x: number
  y: number
  rows: number
  cols: number
  cell: number
  values?: (string | number)[][]
  highlight?: VizCell[]
  mono?: boolean
}
export interface VizBits extends Common {
  type: 'bits'
  x: number
  y: number
  /** One character per cell, e.g. "1011". */
  bits: string
  cell?: number
  /** Small labels above each cell (e.g. place values). */
  labels?: string[]
  /** Small labels below each cell. */
  below?: string[]
  /** Highlighted cell indexes (0 = leftmost). */
  highlight?: number[]
}

/**
 * An annular sector (r0 > 0) or a pie slice (r0 = 0 or omitted): wheels,
 * rotary encoder discs, the halves of a number circle. Angles are degrees
 * clockwise from 12 o'clock; end − start is at most 360 (a full ring).
 */
export interface VizArc extends Common {
  type: 'arc'
  cx: number
  cy: number
  /** Outer radius. */
  r: number
  /** Inner radius (0 = a pie slice). */
  r0?: number
  start: number
  end: number
  /** Drawn at the middle of the band. */
  label?: string
  mono?: boolean
  size?: number
}

/**
 * A logic-gate symbol drawn in the box (x, y, w, h): the body, the XOR back
 * curve, the output bubble of NAND / NOR / XNOR / NOT, and optional input
 * bubbles (De Morgan's alternative symbols). Input pins are evenly spaced;
 * the output pin is the middle of the right edge (see gateShape in
 * geometry.ts). Wires are ordinary `line` elements.
 */
export interface VizGate extends Common {
  type: 'gate'
  x: number
  y: number
  w: number
  h: number
  kind: VizGateKind
  /** Number of inputs (default 2; NOT and BUF always have 1). */
  inputs?: number
  /** Indexes (0 = top) of inputs drawn with an inversion bubble. */
  bubbles?: number[]
  /** Small text inside the body (e.g. "G1"). */
  label?: string
  mono?: boolean
  size?: number
}

/**
 * A self-loop on the outline of another element (a node in a graph). `angle`
 * is degrees clockwise from 12 o'clock where the loop attaches; `size` is the
 * loop's radius (default 0.9 × the node's radius). `head: "end"` draws an
 * arrowhead (digraphs). The loop follows its node when the node moves (E1).
 */
export interface VizLoop extends Common {
  type: 'loop'
  /** Id of the element the loop is drawn on (a node/circle/box…). */
  on: string
  /** Where the loop attaches, degrees clockwise from 12 o'clock (default 0 = up). */
  angle?: number
  /** Loop radius (default 0.9 × the target's radius). */
  size?: number
  label?: string
  mono?: boolean
  head?: 'end' | 'none'
}

export type VizElement = VizBox | VizCircle | VizText | VizArrow | VizLine | VizTable | VizGrid | VizBits | VizArc | VizGate | VizLoop

export interface VizPatch {
  id: string
  set: Record<string, unknown>
}
export interface VizStep {
  caption: string
  patches: VizPatch[]
}
export interface VizNarrowCanvas {
  width: number
  height: number
  /** Switch to this canvas when the figure is narrower than this many CSS px (default 560). */
  below?: number
}
export interface VizSpec {
  version: 1
  title: string
  width: number
  height: number
  /** Optional second canvas for phones; see the header comment. */
  narrow?: VizNarrowCanvas
  /** Caption for the first frame (before any step). */
  intro?: string
  elements: VizElement[]
  steps: VizStep[]
}

/* ── Validation ──────────────────────────────────────────────────────────── */

const ID_RE = /^[a-zA-Z][\w-]{0,39}$/
const MAX_ELEMENTS = 400
const MAX_STEPS = 60

type Check = (v: unknown) => string | null
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const num = (min = -1e6, max = 1e6): Check => (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? null : `must be a number in [${min}, ${max}]`
const int = (min: number, max: number): Check => (v) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? null : `must be an integer in [${min}, ${max}]`
const str = (max = 200): Check => (v) => (typeof v === 'string' && v.length <= max ? null : `must be a string (≤ ${max} chars)`)
const bool: Check = (v) => (typeof v === 'boolean' ? null : 'must be true or false')
const oneOf = (vals: readonly string[]): Check => (v) =>
  typeof v === 'string' && vals.includes(v) ? null : `must be one of ${vals.join(' | ')}`
const point: Check = (v) =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) ? null : 'must be [x, y]'
const end: Check = (v) => (typeof v === 'string' ? (ID_RE.test(v) ? null : 'must be an element id') : point(v))
const cells: Check = (v) =>
  Array.isArray(v) && v.length <= 400 && v.every((c) => Array.isArray(c) && c.length === 2 && c.every((n) => Number.isInteger(n) && n >= 0))
    ? null
    : 'must be a list of [row, col]'
const strList = (maxLen: number, maxItem = 40): Check => (v) =>
  Array.isArray(v) && v.length <= maxLen && v.every((s) => typeof s === 'string' && s.length <= maxItem) ? null : `must be a list of ≤ ${maxLen} short strings`

const COMMON: Record<string, Check> = {
  id: (v) => (typeof v === 'string' && ID_RE.test(v) ? null : 'must be an id (letter first, then letters, digits, - or _)'),
  type: oneOf(VIZ_ELEMENT_TYPES),
  tone: oneOf(VIZ_TONES),
  fill: oneOf([...VIZ_TONES, 'none']),
  emphasis: oneOf(['soft', 'strong']),
  hidden: bool,
  opacity: num(0, 1),
  dashed: bool,
  only: oneOf(VIZ_LAYOUTS),
  narrow: (v) => (isObj(v) ? null : 'must be an object of layout overrides'),
}
const LABEL = { label: str(80), mono: bool, size: num(8, 48) }

const FIELDS: Record<VizElementType, { required: string[]; props: Record<string, Check> }> = {
  box: { required: ['x', 'y', 'w', 'h'], props: { x: num(), y: num(), w: num(1), h: num(1), ...LABEL } },
  circle: { required: ['cx', 'cy', 'r'], props: { cx: num(), cy: num(), r: num(1), ...LABEL } },
  node: { required: ['cx', 'cy', 'r'], props: { cx: num(), cy: num(), r: num(1), ...LABEL } },
  text: {
    required: ['x', 'y', 'text'],
    props: { x: num(), y: num(), text: str(200), size: num(8, 48), anchor: oneOf(['start', 'middle', 'end']), weight: oneOf(['normal', 'bold']), mono: bool },
  },
  arrow: { required: ['from', 'to'], props: { from: end, to: end, label: str(80), curve: num(-1, 1), head: oneOf(['end', 'both', 'none']) } },
  line: {
    required: ['points'],
    props: {
      points: (v) => (Array.isArray(v) && v.length >= 2 && v.length <= 200 && v.every((p) => point(p) === null) ? null : 'must be 2–200 [x, y] points'),
      label: str(80),
    },
  },
  table: {
    required: ['x', 'y', 'cellW', 'cellH', 'rows'],
    props: {
      x: num(),
      y: num(),
      cellW: num(4),
      cellH: num(4),
      rows: (v) =>
        Array.isArray(v) && v.length >= 1 && v.length <= 40 && v.every((r) => Array.isArray(r) && r.length <= 20 && r.every((c) => typeof c === 'string' && c.length <= 40))
          ? null
          : 'must be 1–40 rows of ≤ 20 short strings',
      header: bool,
      highlight: cells,
      mono: bool,
    },
  },
  grid: {
    required: ['x', 'y', 'rows', 'cols', 'cell'],
    props: {
      x: num(),
      y: num(),
      rows: int(1, 40),
      cols: int(1, 40),
      cell: num(4),
      values: (v) =>
        Array.isArray(v) && v.every((r) => Array.isArray(r) && r.every((c) => (typeof c === 'string' && c.length <= 12) || (typeof c === 'number' && Number.isFinite(c))))
          ? null
          : 'must be rows of short strings or numbers',
      highlight: cells,
      mono: bool,
    },
  },
  arc: {
    required: ['cx', 'cy', 'r', 'start', 'end'],
    props: { cx: num(), cy: num(), r: num(1), r0: num(0), start: num(-720, 720), end: num(-720, 720), ...LABEL },
  },
  gate: {
    required: ['x', 'y', 'w', 'h', 'kind'],
    props: {
      x: num(),
      y: num(),
      w: num(8),
      h: num(8),
      kind: oneOf(VIZ_GATE_KINDS),
      inputs: int(1, 8),
      bubbles: (v) => (Array.isArray(v) && v.length <= 8 && v.every((n) => Number.isInteger(n) && n >= 0 && n < 8) ? null : 'must be a list of input indexes (0–7)'),
      ...LABEL,
    },
  },
  bits: {
    required: ['x', 'y', 'bits'],
    props: {
      x: num(),
      y: num(),
      bits: (v) => (typeof v === 'string' && v.length >= 1 && v.length <= 64 ? null : 'must be a string of 1–64 characters'),
      cell: num(8, 120),
      labels: strList(64, 16),
      below: strList(64, 16),
      highlight: (v) => (Array.isArray(v) && v.length <= 64 && v.every((n) => Number.isInteger(n) && n >= 0) ? null : 'must be a list of cell indexes'),
    },
  },
  loop: {
    required: ['on'],
    props: { on: end, angle: num(-720, 720), size: num(2, 200), label: str(80), mono: bool, head: oneOf(['end', 'none']) },
  },
}

/** Problems with one element, as "path: message" strings. */
function checkElement(el: unknown, where: string): string[] {
  if (!isObj(el)) return [`${where}: must be an object`]
  const errs: string[] = []
  const typeErr = COMMON.type!(el.type)
  if (typeErr) return [`${where}.type: ${typeErr}`]
  const def = FIELDS[el.type as VizElementType]
  for (const k of def.required) if (el[k] === undefined) errs.push(`${where}.${k}: is required for a ${el.type}`)
  for (const [k, v] of Object.entries(el)) {
    const check = COMMON[k] ?? def.props[k]
    if (!check) {
      errs.push(`${where}.${k}: unknown property for a ${el.type}`)
      continue
    }
    const e = check(v)
    if (e) errs.push(`${where}.${k}: ${e}`)
  }
  if (el.type === 'grid' && Array.isArray(el.values)) {
    const rows = el.rows as number
    const cols = el.cols as number
    if (el.values.length > rows || el.values.some((r) => Array.isArray(r) && r.length > cols)) errs.push(`${where}.values: larger than rows × cols`)
  }
  if (el.type === 'arc' && typeof el.start === 'number' && typeof el.end === 'number') {
    const sweep = el.end - el.start
    if (!(sweep > 0 && sweep <= 360)) errs.push(`${where}.end: must be after start, at most one full turn (360°) later`)
    if (typeof el.r0 === 'number' && typeof el.r === 'number' && el.r0 >= el.r) errs.push(`${where}.r0: inner radius must be smaller than r`)
  }
  if (el.type === 'gate') {
    const single = el.kind === 'not' || el.kind === 'buf'
    const n = single ? 1 : typeof el.inputs === 'number' ? el.inputs : 2
    if (single && el.inputs !== undefined && el.inputs !== 1) errs.push(`${where}.inputs: a ${el.kind} gate has exactly one input`)
    if (Array.isArray(el.bubbles) && el.bubbles.some((b) => typeof b === 'number' && b >= n)) errs.push(`${where}.bubbles: an index is not an input of this gate (it has ${n})`)
  }
  if (isObj(el.narrow)) {
    const { narrow, ...rest } = el
    for (const k of Object.keys(narrow)) {
      if (!(VIZ_LAYOUT_KEYS as readonly string[]).includes(k)) errs.push(`${where}.narrow.${k}: only geometry can change per layout (${VIZ_LAYOUT_KEYS.join(', ')})`)
      else if (!def.props[k]) errs.push(`${where}.narrow.${k}: unknown property for a ${el.type}`)
    }
    if (el.only === 'wide') errs.push(`${where}.narrow: an element drawn only in the wide layout has no narrow geometry`)
    for (const e of checkElement({ ...rest, ...narrow }, `${where}.narrow`)) if (!errs.includes(e)) errs.push(e)
  }
  if (el.type === 'bits' && typeof el.bits === 'string') {
    for (const k of ['labels', 'below'] as const) {
      const list = el[k]
      if (Array.isArray(list) && list.length !== el.bits.length) errs.push(`${where}.${k}: needs one entry per bit (${el.bits.length})`)
    }
  }
  return errs
}

/** Every problem with a scene spec; [] when it is valid. Paths are JSON-ish ("steps[2].patches[0].set.tone"). */
export function validateVizSpec(spec: unknown): string[] {
  if (!isObj(spec)) return ['spec: must be an object']
  const errs: string[] = []
  const allowed = new Set(['$schema', 'version', 'title', 'width', 'height', 'narrow', 'intro', 'elements', 'steps'])
  for (const k of Object.keys(spec)) if (!allowed.has(k)) errs.push(`${k}: unknown top-level property`)
  if (spec.version !== 1) errs.push('version: must be 1')
  const t = str(120)(spec.title)
  if (t || !spec.title) errs.push(`title: ${t ?? 'is required'}`)
  for (const k of ['width', 'height'] as const) {
    const e = num(40, 4000)(spec[k])
    if (e) errs.push(`${k}: ${e}`)
  }
  if (spec.narrow !== undefined) {
    if (!isObj(spec.narrow)) errs.push('narrow: must be { width, height, below? }')
    else {
      for (const k of Object.keys(spec.narrow)) if (!['width', 'height', 'below'].includes(k)) errs.push(`narrow.${k}: unknown property`)
      for (const k of ['width', 'height'] as const) {
        const e = num(40, 4000)(spec.narrow[k])
        if (e) errs.push(`narrow.${k}: ${e}`)
      }
      if (spec.narrow.below !== undefined) {
        const e = int(200, 2000)(spec.narrow.below)
        if (e) errs.push(`narrow.below: ${e}`)
      }
    }
  }
  if (spec.intro !== undefined) {
    const e = str(400)(spec.intro)
    if (e) errs.push(`intro: ${e}`)
  }
  if (!Array.isArray(spec.elements) || spec.elements.length === 0 || spec.elements.length > MAX_ELEMENTS) {
    errs.push(`elements: must be a list of 1–${MAX_ELEMENTS} elements`)
    return errs
  }
  const byId = new Map<string, Record<string, unknown>>()
  spec.elements.forEach((el, i) => {
    const e = checkElement(el, `elements[${i}]`)
    errs.push(...e)
    if (isObj(el) && typeof el.id === 'string') {
      if (byId.has(el.id)) errs.push(`elements[${i}].id: duplicate id "${el.id}"`)
      byId.set(el.id, el)
    }
  })
  const checkEnds = (el: Record<string, unknown>, where: string) => {
    if (el.type !== 'arrow') return
    for (const k of ['from', 'to']) {
      const v = el[k]
      if (typeof v === 'string' && !byId.has(v)) errs.push(`${where}.${k}: no element with id "${v}"`)
      if (typeof v === 'string' && (byId.get(v)?.type === 'arrow' || byId.get(v)?.type === 'loop')) errs.push(`${where}.${k}: cannot attach to another arrow or loop`)
    }
  }
  const checkLoop = (el: Record<string, unknown>, where: string) => {
    if (el.type !== 'loop') return
    const v = el.on
    if (typeof v === 'string' && !byId.has(v)) errs.push(`${where}.on: no element with id "${v}"`)
    if (typeof v === 'string' && (byId.get(v)?.type === 'arrow' || byId.get(v)?.type === 'loop')) errs.push(`${where}.on: a loop must be drawn on a shape, not an arrow or loop`)
  }
  spec.elements.forEach((el, i) => isObj(el) && (checkEnds(el, `elements[${i}]`), checkLoop(el, `elements[${i}]`)))
  // Layouts: per-element layout data needs the second canvas, and an arrow must find its ends in every layout it is drawn in.
  const inLayout = (el: Record<string, unknown> | undefined, layout: VizLayout) => !!el && (el.only === undefined || el.only === layout)
  spec.elements.forEach((el, i) => {
    if (!isObj(el)) return
    if ((el.only !== undefined || el.narrow !== undefined) && !isObj(spec.narrow)) errs.push(`elements[${i}]: "only" and "narrow" need a top-level narrow canvas`)
    if (el.type === 'arrow') {
      for (const layout of VIZ_LAYOUTS) {
        if (!inLayout(el, layout)) continue
        for (const k of ['from', 'to']) {
          const v = el[k]
          if (typeof v === 'string' && byId.has(v) && !inLayout(byId.get(v), layout)) errs.push(`elements[${i}].${k}: "${v}" is not drawn in the ${layout} layout`)
        }
      }
    }
    if (el.type === 'loop' && typeof el.on === 'string' && byId.has(el.on)) {
      for (const layout of VIZ_LAYOUTS) {
        if (inLayout(el, layout) && !inLayout(byId.get(el.on), layout)) errs.push(`elements[${i}].on: "${el.on}" is not drawn in the ${layout} layout`)
      }
    }
  })

  if (!Array.isArray(spec.steps) || spec.steps.length > MAX_STEPS) {
    errs.push(`steps: must be a list of at most ${MAX_STEPS} steps`)
    return errs
  }
  // Replay the steps so every patched element is still valid in its frame.
  const state = new Map([...byId].map(([id, el]) => [id, { ...el }]))
  spec.steps.forEach((step, si) => {
    const w = `steps[${si}]`
    if (!isObj(step)) return errs.push(`${w}: must be an object`)
    for (const k of Object.keys(step)) if (k !== 'caption' && k !== 'patches') errs.push(`${w}.${k}: unknown property`)
    const c = str(400)(step.caption)
    if (c || !String(step.caption ?? '').trim()) errs.push(`${w}.caption: ${c ?? 'is required (it is the text alternative)'}`)
    if (!Array.isArray(step.patches)) return errs.push(`${w}.patches: must be a list`)
    step.patches.forEach((p, pi) => {
      const pw = `${w}.patches[${pi}]`
      if (!isObj(p) || typeof p.id !== 'string' || !isObj(p.set)) return errs.push(`${pw}: must be { id, set: {…} }`)
      const cur = state.get(p.id)
      if (!cur) return errs.push(`${pw}.id: no element with id "${p.id}"`)
      if ('id' in p.set || 'type' in p.set) errs.push(`${pw}.set: cannot change id or type`)
      if ('only' in p.set || 'narrow' in p.set) errs.push(`${pw}.set: cannot change the layout (only, narrow)`)
      const next = { ...cur, ...p.set }
      for (const e of checkElement(next, `${pw}.set`)) errs.push(e)
      checkEnds(next, `${pw}.set`)
      checkLoop(next, `${pw}.set`)
      state.set(p.id, next)
    })
  })
  return errs
}
