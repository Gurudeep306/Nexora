/*
  Nexora Stage: one scene format for 2D and 3D, for every AI course.

  A scene is data: elements and a list of steps. Each step names what it is
  about, can move the camera, change any element (`set`), change named
  parameters (`params`), and switch between 2D and 3D (`dim`). Between two
  steps every number glides: positions, values, matrices, parameters, how far
  a path is drawn, opacity — and the whole scene can rise from a flat 2D
  diagram into 3D and back (`dim`), with the camera morphing with it.

  Coordinates are maths coordinates: x right, y away, z up. In 2D the scene
  is seen from straight above and every height is flattened (z × lift), so a
  surface becomes a heat map, bars become tiles, a point cloud becomes its
  2D projection.

    { "version": 1, "title": "…", "description": "…",
      "params": { "rho": 0 },
      "elements": [ { "id": "bell", "type": "surface", "f": "exp(-(x^2 - 2*rho*x*y + y^2) / (2*(1 - rho^2)))", "range": [-3, 3] } ],
      "steps": [ { "label": "Flat", "dim": 2 }, { "label": "Lift it", "dim": 3, "params": { "rho": 0.8 } } ] }

  Shared with Node tests and the content checker: dependency-free and
  erasable-syntax only.
*/
import { compile, ExprError } from './expr.ts'

export type V3 = [number, number, number]
export const STAGE_TONES = ['ink', 'ink2', 'muted', 'hair', 'accent', 'info', 'success', 'warning', 'error'] as const
export type StageTone = (typeof STAGE_TONES)[number]

interface Base {
  id: string
  /** Colour role (theme token); never a literal colour. */
  tone?: StageTone
  opacity?: number
  /** Not drawn (fades in and out between steps). */
  hidden?: boolean
  /** Shown when the pointer is over it. */
  tip?: string
}

export type StageElement =
  | (Base & { type: 'surface'; f?: string; z?: number[][]; range: [number, number]; scale?: number; ramp?: boolean; wire?: boolean; n?: number })
  | (Base & { type: 'contours'; f: string; range: [number, number]; levels: number[]; at?: number })
  | (Base & { type: 'field'; fx: string; fy: string; range: [number, number]; n?: number; length?: number; at?: number })
  | (Base & { type: 'points'; points: V3[]; tones?: StageTone[]; r?: number; tips?: string[] })
  | (Base & { type: 'path'; points: V3[]; upTo?: number; width?: number; ball?: number })
  | (Base & { type: 'arrow'; from: V3; to: V3; r?: number })
  | (Base & { type: 'line'; points: V3[]; dashed?: boolean; width?: number })
  | (Base & { type: 'label'; at: V3; text: string })
  | (Base & { type: 'axes'; size?: number; names?: [string, string, string] })
  | (Base & { type: 'lattice'; matrix: number[][]; n?: number; size?: number })
  | (Base & { type: 'ellipsoid'; matrix: number[][]; center?: V3 })
  | (Base & { type: 'tiles'; values: number[][]; at?: V3; cell?: number; height?: number; highlight?: [number, number][]; numbers?: boolean; tips?: string[][] })
  | (Base & { type: 'bars'; values: number[][]; at?: V3; cell?: number; height?: number; numbers?: boolean })
  | (Base & { type: 'tensor'; shape: [number, number, number]; values?: number[]; at?: V3; cell?: number; names?: [string, string, string] })
  | (Base & {
      type: 'network'
      layers: number[]
      at?: V3
      gap?: number
      spread?: number
      /** weights[l][i][j]: from neuron j of layer l to neuron i of layer l + 1. */
      weights?: number[][][]
      /** Activations per layer (the inputs for layer 0). */
      values?: number[][]
      /** Pre-activations z per layer (to show the activation squashing z into a). */
      pre?: number[][]
      /** ∂L/∂z per layer (the backward pass). */
      grads?: number[][]
      /** The activation function of each layer. */
      acts?: ('linear' | 'tanh' | 'sigmoid' | 'relu')[]
      /** Forward progress, 0 … layers − 1 (glides between steps). */
      forward?: number
      /** Backward progress, 0 (not started) … layers. */
      backward?: number
      /** Show each layer's weight matrix beside it. */
      matrices?: boolean
      names?: string[]
      lit?: number
    })
  | (Base & { type: 'beads'; from: V3[]; to: V3[]; progress: number; r?: number; arc?: number })

export type StageElementType = StageElement['type']
export const STAGE_TYPES: readonly StageElementType[] = ['surface', 'contours', 'field', 'points', 'path', 'arrow', 'line', 'label', 'axes', 'lattice', 'ellipsoid', 'tiles', 'bars', 'tensor', 'network', 'beads']

export interface StageStep {
  label: string
  /** Plain words. `[text](#id)` links a word to an element: hovering the word lights the element up. */
  caption?: string
  /** The step's formula (KaTeX), with its numbers. */
  tex?: string
  view?: { camera: V3; target: V3 }
  /** 2 = flat, seen from above; 3 = in depth. The change animates. */
  dim?: 2 | 3
  focus?: string[]
  pause?: boolean
  ms?: number
  /** Changes to elements, from this step on. */
  set?: { id: string; set: Record<string, unknown> }[]
  /** New values of named parameters, from this step on (formulas use them). */
  params?: Record<string, number>
}

export interface StageSpec {
  version: 1
  title: string
  /** The whole scene in words, for screen readers. */
  description: string
  camera?: { position: V3; target: V3 }
  dim?: 2 | 3
  params?: Record<string, number>
  elements: StageElement[]
  steps: StageStep[]
}

/* ── validation ────────────────────────────────────────────────────────── */

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isV3 = (v: unknown): v is V3 => Array.isArray(v) && v.length === 3 && v.every(isNum)
const isGrid = (v: unknown, max = 128): v is number[][] => Array.isArray(v) && v.length > 0 && v.length <= max && v.every((r) => Array.isArray(r) && r.length === (v as unknown[][])[0].length && r.length <= max && r.every(isNum))
const isMat3 = (v: unknown) => isGrid(v) && (v as number[][]).length === 3 && (v as number[][])[0].length === 3

/** Every problem with a scene, in plain words (empty when it is valid). */
export function validateStage(spec: unknown): string[] {
  const errs: string[] = []
  const s = spec as StageSpec
  if (!s || typeof s !== 'object') return ['A scene must be an object']
  if (s.version !== 1) errs.push('version must be 1')
  if (typeof s.title !== 'string' || !s.title.trim()) errs.push('title is required')
  if (typeof s.description !== 'string' || s.description.trim().length < 20) errs.push('description is required (the whole scene in words, for screen readers)')
  if (s.dim != null && s.dim !== 2 && s.dim !== 3) errs.push('dim must be 2 or 3')
  if (s.camera && (!isV3(s.camera.position) || !isV3(s.camera.target))) errs.push('camera needs position and target, each [x, y, z]')
  const params = Object.keys(s.params ?? {})
  for (const [k, v] of Object.entries(s.params ?? {})) if (!/^[a-zA-Z_]\w*$/.test(k) || !isNum(v)) errs.push(`param "${k}" must be a name with a number`)
  if (!Array.isArray(s.elements) || !s.elements.length) errs.push('elements must be a non-empty list')
  if (!Array.isArray(s.steps) || !s.steps.length) errs.push('steps must be a non-empty list')
  const ids = new Map<string, StageElement>()
  const formula = (where: string, src: unknown, vars: string[]) => {
    if (typeof src !== 'string') return errs.push(`${where}: a formula (string) is required`)
    try {
      compile(src, [...vars, ...params])
    } catch (e) {
      errs.push(`${where}: ${e instanceof ExprError ? e.message : String(e)}`)
    }
  }
  for (const el of s.elements ?? []) {
    const e = el as StageElement & Record<string, unknown>
    const at = `element "${e?.id ?? '?'}"`
    if (!e || typeof e.id !== 'string' || !e.id) {
      errs.push('every element needs an id')
      continue
    }
    if (ids.has(e.id)) errs.push(`${at}: id used twice`)
    ids.set(e.id, e)
    if (!STAGE_TYPES.includes(e.type)) {
      errs.push(`${at}: unknown type "${String(e.type)}" (use one of ${STAGE_TYPES.join(', ')})`)
      continue
    }
    if (e.tone != null && !STAGE_TONES.includes(e.tone)) errs.push(`${at}: unknown tone "${String(e.tone)}"`)
    if (e.opacity != null && (!isNum(e.opacity) || e.opacity < 0 || e.opacity > 1)) errs.push(`${at}: opacity must be 0 … 1`)
    const range = () => {
      const r = e.range as unknown
      if (!Array.isArray(r) || r.length !== 2 || !r.every(isNum) || r[0] >= r[1]) errs.push(`${at}: range must be [low, high]`)
    }
    switch (e.type) {
      case 'surface':
        range()
        if (e.f != null) formula(at, e.f, ['x', 'y'])
        else if (!isGrid(e.z)) errs.push(`${at}: give f (a formula in x and y) or z (a grid of heights)`)
        break
      case 'contours':
        range()
        formula(at, e.f, ['x', 'y'])
        if (!Array.isArray(e.levels) || !e.levels.every(isNum)) errs.push(`${at}: levels must be numbers`)
        break
      case 'field':
        range()
        formula(`${at} fx`, e.fx, ['x', 'y'])
        formula(`${at} fy`, e.fy, ['x', 'y'])
        break
      case 'points':
        if (!Array.isArray(e.points) || !e.points.every(isV3) || e.points.length > 5000) errs.push(`${at}: points must be [x, y, z] (at most 5000)`)
        if (e.tones && (!Array.isArray(e.tones) || e.tones.length !== e.points?.length)) errs.push(`${at}: tones must have one per point`)
        break
      case 'path':
      case 'line':
        if (!Array.isArray(e.points) || e.points.length < 2 || !e.points.every(isV3)) errs.push(`${at}: points must be at least two [x, y, z]`)
        break
      case 'arrow':
        if (!isV3(e.from) || !isV3(e.to)) errs.push(`${at}: from and to must be [x, y, z]`)
        break
      case 'label':
        if (!isV3(e.at) || typeof e.text !== 'string') errs.push(`${at}: needs at [x, y, z] and text`)
        break
      case 'lattice':
      case 'ellipsoid':
        if (!isMat3(e.matrix)) errs.push(`${at}: matrix must be 3 × 3`)
        break
      case 'tiles':
      case 'bars':
        if (!isGrid(e.values, 64)) errs.push(`${at}: values must be a grid of numbers (at most 64 × 64)`)
        break
      case 'tensor':
        if (!Array.isArray(e.shape) || e.shape.length !== 3 || !e.shape.every((d) => Number.isInteger(d) && d > 0 && d <= 32)) errs.push(`${at}: shape must be three sizes, each 1 … 32`)
        else if (e.values && (!Array.isArray(e.values) || e.values.length !== e.shape[0] * e.shape[1] * e.shape[2] || !e.values.every(isNum))) errs.push(`${at}: values must have one number per cell`)
        break
      case 'network': {
        const ok = Array.isArray(e.layers) && e.layers.length >= 2 && e.layers.every((n) => Number.isInteger(n) && n > 0 && n <= 24)
        if (!ok) {
          errs.push(`${at}: layers must be at least two sizes, each 1 … 24`)
          break
        }
        const L = e.layers.length
        const perLayer = (name: string, v: unknown) => {
          if (v == null) return
          if (!Array.isArray(v) || v.length !== L || !v.every((r, l) => Array.isArray(r) && r.length === e.layers[l] && r.every(isNum))) errs.push(`${at}: ${name} must have one number per neuron, per layer`)
        }
        perLayer('values', e.values)
        perLayer('pre', e.pre)
        perLayer('grads', e.grads)
        if (e.weights != null && (!Array.isArray(e.weights) || e.weights.length !== L - 1 || !e.weights.every((m, l) => isGrid(m, 24) && m.length === e.layers[l + 1] && m[0].length === e.layers[l]))) errs.push(`${at}: weights[l] must be a ${'layers[l + 1] × layers[l]'} matrix for each layer`)
        if (e.acts != null && (!Array.isArray(e.acts) || e.acts.length !== L || !e.acts.every((a) => ['linear', 'tanh', 'sigmoid', 'relu'].includes(a)))) errs.push(`${at}: acts must name one activation per layer (linear, tanh, sigmoid or relu)`)
        if (e.forward != null && (!isNum(e.forward) || e.forward < 0 || e.forward > L - 1)) errs.push(`${at}: forward must be 0 … ${L - 1}`)
        if (e.backward != null && (!isNum(e.backward) || e.backward < 0 || e.backward > L)) errs.push(`${at}: backward must be 0 … ${L}`)
        break
      }
      case 'beads':
        if (!Array.isArray(e.from) || !Array.isArray(e.to) || e.from.length !== e.to.length || !e.from.every(isV3) || !e.to.every(isV3)) errs.push(`${at}: from and to must be equal lists of [x, y, z]`)
        if (!isNum(e.progress)) errs.push(`${at}: progress must be a number 0 … 1`)
        break
    }
  }
  ;(s.steps ?? []).forEach((st, i) => {
    const at = `step ${i + 1}`
    if (!st || typeof st.label !== 'string' || !st.label) errs.push(`${at}: label is required`)
    if (st?.dim != null && st.dim !== 2 && st.dim !== 3) errs.push(`${at}: dim must be 2 or 3`)
    if (st?.view && (!isV3(st.view.camera) || !isV3(st.view.target))) errs.push(`${at}: view needs camera and target`)
    if (st?.ms != null && (!isNum(st.ms) || st.ms < 50 || st.ms > 20000)) errs.push(`${at}: ms must be 50 … 20000`)
    for (const f of st?.focus ?? []) if (!ids.has(f)) errs.push(`${at}: focus "${f}" is not an element`)
    for (const p of st?.set ?? []) if (!ids.has(p.id)) errs.push(`${at}: set "${p.id}" is not an element`)
    for (const [k, v] of Object.entries(st?.params ?? {})) if (!params.includes(k) || !isNum(v)) errs.push(`${at}: param "${k}" must be declared in params and be a number`)
    for (const m of (st?.caption ?? '').matchAll(/\]\(#([^)]+)\)/g)) if (!ids.has(m[1])) errs.push(`${at}: caption links to "${m[1]}", which is not an element`)
  })
  return errs
}

/* ── the timeline ──────────────────────────────────────────────────────── */

export interface Frame {
  elements: Map<string, StageElement>
  params: Record<string, number>
  lift: number
}

/** The state after each step: the base, then every step's changes in order. */
export function buildFrames(s: StageSpec): Frame[] {
  const out: Frame[] = []
  let els = new Map(s.elements.map((e) => [e.id, e] as const))
  let params = { ...(s.params ?? {}) }
  let lift = (s.dim ?? 3) === 3 ? 1 : 0
  for (const st of s.steps) {
    if (st.set?.length) {
      els = new Map(els)
      for (const p of st.set) {
        const cur = els.get(p.id)
        if (cur) els.set(p.id, { ...cur, ...p.set } as StageElement)
      }
    }
    if (st.params) params = { ...params, ...st.params }
    if (st.dim) lift = st.dim === 3 ? 1 : 0
    out.push({ elements: els, params, lift })
  }
  return out
}

/** Glide between two values of the same shape: numbers and (nested) arrays of numbers; anything else switches halfway. */
export function blendValue(a: unknown, b: unknown, u: number): unknown {
  if (a === b) return a
  if (isNum(a) && isNum(b)) return a + (b - a) * u
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x, i) => blendValue(x, b[i], u))
  return u < 0.5 ? a : b
}

/** The scene part-way between two frames (u = 0 … 1). Elements that appear or disappear fade. */
export function blendFrames(A: Frame, B: Frame, u: number): Frame {
  if (u <= 0) return A
  if (u >= 1) return B
  const elements = new Map<string, StageElement>()
  for (const [id, b] of B.elements) {
    const a = A.elements.get(id)
    if (!a || a === b) {
      elements.set(id, b)
      continue
    }
    const e: Record<string, unknown> = { ...b }
    for (const k of Object.keys(b)) if (k !== 'id' && k !== 'type') e[k] = blendValue((a as unknown as Record<string, unknown>)[k], (b as unknown as Record<string, unknown>)[k], u)
    // Appearing and disappearing: fade the opacity instead of popping.
    const oa = a.hidden ? 0 : (a.opacity ?? 1)
    const ob = b.hidden ? 0 : (b.opacity ?? 1)
    e.hidden = oa === 0 && ob === 0
    e.opacity = oa + (ob - oa) * u
    elements.set(id, e as unknown as StageElement)
  }
  const params: Record<string, number> = { ...B.params }
  for (const k of Object.keys(B.params)) params[k] = (A.params[k] ?? B.params[k]) + (B.params[k] - (A.params[k] ?? B.params[k])) * u
  return { elements, params, lift: A.lift + (B.lift - A.lift) * u }
}

/** The frame at continuous time t (in steps), with an ease on each move. */
export function frameAt(frames: Frame[], t: number): Frame {
  const k = Math.max(0, Math.min(frames.length - 1, Math.floor(t + 1e-9)))
  const r = t - k
  if (k + 1 >= frames.length || r <= 0) return frames[k]
  const u = r < 0.5 ? 4 * r * r * r : 1 - (-2 * r + 2) ** 3 / 2
  return blendFrames(frames[k], frames[k + 1], u)
}
