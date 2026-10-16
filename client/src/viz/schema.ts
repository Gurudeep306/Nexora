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

  This module is shared: the reader imports it, and scripts/build-gate-notes.js
  loads it in Node (type-stripped) to validate every viz/<name>.json. Keep it
  dependency-free and erasable-syntax only.
*/

export const VIZ_TONES = ['ink', 'muted', 'accent', 'subject', 'success', 'warning', 'danger', 'info'] as const
export type VizTone = (typeof VIZ_TONES)[number]

export const VIZ_ELEMENT_TYPES = ['box', 'circle', 'node', 'text', 'arrow', 'line', 'table', 'grid', 'bits'] as const
export type VizElementType = (typeof VIZ_ELEMENT_TYPES)[number]

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

export type VizElement = VizBox | VizCircle | VizText | VizArrow | VizLine | VizTable | VizGrid | VizBits

export interface VizPatch {
  id: string
  set: Record<string, unknown>
}
export interface VizStep {
  caption: string
  patches: VizPatch[]
}
export interface VizSpec {
  version: 1
  title: string
  width: number
  height: number
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
  const allowed = new Set(['$schema', 'version', 'title', 'width', 'height', 'intro', 'elements', 'steps'])
  for (const k of Object.keys(spec)) if (!allowed.has(k)) errs.push(`${k}: unknown top-level property`)
  if (spec.version !== 1) errs.push('version: must be 1')
  const t = str(120)(spec.title)
  if (t || !spec.title) errs.push(`title: ${t ?? 'is required'}`)
  for (const k of ['width', 'height'] as const) {
    const e = num(40, 4000)(spec[k])
    if (e) errs.push(`${k}: ${e}`)
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
      if (typeof v === 'string' && byId.get(v)?.type === 'arrow') errs.push(`${where}.${k}: cannot attach to another arrow`)
    }
  }
  spec.elements.forEach((el, i) => isObj(el) && checkEnds(el, `elements[${i}]`))

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
      const next = { ...cur, ...p.set }
      for (const e of checkElement(next, `${pw}.set`)) errs.push(e)
      checkEnds(next, `${pw}.set`)
      state.set(p.id, next)
    })
  })
  return errs
}
