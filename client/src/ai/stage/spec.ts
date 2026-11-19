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
  /* ── plots ── */
  | (Base & {
      type: 'curve'
      /** y = f(x) (in x and the params), or a parametric curve x(t), y(t). */
      f?: string
      x?: string
      y?: string
      /** x range (or t range for a parametric curve). */
      range: [number, number]
      /** Where the curve's origin sits, and how its units scale (x, y). */
      at?: V3
      scale?: [number, number]
      /** Drawn up to this fraction (0 … 1). */
      upTo?: number
      /** Shade the area between the curve and y = 0 over this x range. */
      fill?: [number, number]
      /** Riemann rectangles over the fill range (how many). */
      riemann?: number
      /** Tangent line at this x (and the secant to x + h when h is given). */
      tangent?: number
      h?: number
      /** Stand up in a vertical plane in 3D (x right, y up). Default lies on the floor. */
      upright?: boolean
      width?: number
      dashed?: boolean
      n?: number
    })
  | (Base & {
      type: 'chart'
      kind: 'line' | 'bars' | 'hist'
      at?: V3
      /** Width and height of the plot box. */
      size?: [number, number]
      /** line: one list of y per series; bars: one list of values. */
      series?: number[][]
      xs?: number[]
      /** hist: raw samples, counted into bins. */
      samples?: number[]
      bins?: number
      range?: [number, number]
      yRange?: [number, number]
      logX?: boolean
      logY?: boolean
      names?: string[]
      labels?: string[]
      tones?: StageTone[]
      xLabel?: string
      yLabel?: string
      /** Drawn up to this fraction (0 … 1). */
      upTo?: number
      /** A vertical marker at this x. */
      marker?: number
    })
  /* ── shapes ── */
  | (Base & {
      type: 'shape'
      kind: 'circle' | 'ellipse' | 'rect' | 'polygon' | 'box' | 'sphere'
      at?: V3
      /** circle/sphere: [r]; ellipse/rect: [w, h]; box: [w, d, h]. */
      size?: number[]
      /** Polygon corners [x, y] (relative to at). */
      points?: [number, number][]
      /** Turn about the vertical axis, in degrees. */
      rotate?: number
      fill?: boolean
      dashed?: boolean
      width?: number
    })
  | (Base & { type: 'plane'; at?: V3; normal: V3; size?: number })
  | (Base & {
      type: 'region'
      /** A score in x, y: its sign picks the side (or, with classes, its rounded value picks the class). */
      f: string
      range: [number, number]
      classes?: number
      n?: number
      boundary?: boolean
    })
  /* ── graphs ── */
  | (Base & {
      type: 'graph'
      nodes: { id: string; label?: string; at?: [number, number] | V3; value?: number; tone?: StageTone; r?: number }[]
      edges: { from: string; to: string; label?: string; w?: number; tone?: StageTone; dashed?: boolean }[]
      layout?: 'given' | 'tree' | 'layered' | 'ring'
      directed?: boolean
      at?: V3
      spread?: number
      /** Beads travelling along the edges (0 … 1), all of them or only `flowEdges` (indices). */
      flow?: number
      flowEdges?: number[]
      /** Beads go from `to` back to `from` (a backward pass). */
      reverse?: boolean
      lit?: string[]
    })
  /* ── vision ── */
  | (Base & {
      type: 'image'
      /** Grey levels 0 … 1, rows × columns; or rgb[row][col] = [r, g, b] 0 … 1. */
      pixels?: number[][]
      rgb?: [number, number, number][][]
      at?: V3
      cell?: number
      /** 0 … 1: pull the three colour channels apart into layers (3D). */
      split?: number
      /** Draw a patch grid every `patch` pixels. */
      patch?: number
      /** A highlighted window [row, col, rows, cols] (a kernel, a patch). */
      window?: [number, number, number, number]
      /** Brightness as height in 3D. */
      relief?: number
      numbers?: boolean
    })
  | (Base & { type: 'boxes'; boxes: { x: number; y: number; w: number; h: number; label?: string; tone?: StageTone }[]; at?: V3 })
  /* ── language ── */
  | (Base & {
      type: 'tokens'
      tokens: string[]
      at?: V3
      /** Width of one token chip. */
      cell?: number
      /** A probability (or weight) per token, drawn as a bar. */
      probs?: number[]
      highlight?: number[]
      masked?: number[]
      tones?: StageTone[]
      /** How many tokens are shown (glides: tokens appear one by one). */
      upTo?: number
      vertical?: boolean
    })
  /* ── reinforcement learning ── */
  | (Base & {
      type: 'gridworld'
      rows: number
      cols: number
      at?: V3
      cell?: number
      walls?: [number, number][]
      /** Cells with a reward (shown as its number) — terminal cells too. */
      rewards?: [number, number, number][]
      /** A value per cell: a heat map in 2D, heights in 3D. */
      values?: number[][]
      /** Policy per cell: 0 none, 1 up, 2 right, 3 down, 4 left. */
      policy?: number[][]
      /** The agent's cell [row, col] (glides between cells). */
      agent?: [number, number]
      trail?: [number, number][]
    })
  /* ── systems ── */
  | (Base & {
      type: 'membar'
      segments: { label: string; value: number; tone?: StageTone }[]
      /** The capacity the bar stands for (the segments fill part of it). */
      total?: number
      unit?: string
      at?: V3
      size?: [number, number]
      /** Split the bar across this many devices (each gets 1/N of the split segments). */
      devices?: number
      /** Which segments are split across devices (indices); the rest are copied on every device. */
      sharded?: number[]
    })
  | (Base & {
      type: 'timeline'
      lanes: string[]
      blocks: { lane: number; start: number; end: number; label?: string; tone?: StageTone }[]
      at?: V3
      size?: [number, number]
      span?: [number, number]
      /** A cursor at this time; blocks after it are faint. */
      now?: number
    })
  /* ── text ── */
  | (Base & { type: 'code'; lines: string[]; active?: number; vars?: [string, string][]; at?: V3 })
  | (Base & { type: 'table'; rows: (string | number)[][]; header?: string[]; highlight?: [number, number][]; at?: V3 })

export type StageElementType = StageElement['type']
export const STAGE_TYPES: readonly StageElementType[] = ['surface', 'contours', 'field', 'points', 'path', 'arrow', 'line', 'label', 'axes', 'lattice', 'ellipsoid', 'tiles', 'bars', 'tensor', 'network', 'beads', 'curve', 'chart', 'shape', 'plane', 'region', 'graph', 'image', 'boxes', 'tokens', 'gridworld', 'membar', 'timeline', 'code', 'table']

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
      case 'curve':
        range()
        if (e.f != null) formula(at, e.f, ['x'])
        else if (e.x != null && e.y != null) {
          formula(`${at} x`, e.x, ['t'])
          formula(`${at} y`, e.y, ['t'])
        } else errs.push(`${at}: give f (y in terms of x) or x and y (in terms of t)`)
        if (e.fill != null && !(Array.isArray(e.fill) && e.fill.length === 2 && e.fill.every(isNum))) errs.push(`${at}: fill must be [from, to]`)
        if (e.riemann != null && !(Number.isInteger(e.riemann) && e.riemann > 0 && e.riemann <= 400)) errs.push(`${at}: riemann must be 1 … 400 rectangles`)
        break
      case 'chart':
        if (!['line', 'bars', 'hist'].includes(e.kind)) errs.push(`${at}: kind must be line, bars or hist`)
        else if (e.kind === 'hist') {
          if (!Array.isArray(e.samples) || !e.samples.length || e.samples.length > 100000 || !e.samples.every(isNum)) errs.push(`${at}: samples must be numbers (at most 100000)`)
        } else if (!Array.isArray(e.series) || !e.series.length || !e.series.every((r) => Array.isArray(r) && r.length > 0 && r.length <= 5000 && r.every(isNum))) errs.push(`${at}: series must be lists of numbers`)
        if (e.xs != null && (!Array.isArray(e.xs) || !e.xs.every(isNum) || e.xs.length !== e.series?.[0]?.length)) errs.push(`${at}: xs must have one x per value`)
        if (e.logY && e.series?.some((r) => r.some((v) => v <= 0))) errs.push(`${at}: logY needs positive values`)
        break
      case 'shape':
        if (!['circle', 'ellipse', 'rect', 'polygon', 'box', 'sphere'].includes(e.kind)) errs.push(`${at}: kind must be circle, ellipse, rect, polygon, box or sphere`)
        if (e.kind === 'polygon' && (!Array.isArray(e.points) || e.points.length < 3 || !e.points.every((q) => Array.isArray(q) && q.length === 2 && q.every(isNum)))) errs.push(`${at}: a polygon needs at least three [x, y] points`)
        if (e.size != null && (!Array.isArray(e.size) || !e.size.every((v) => isNum(v) && v >= 0))) errs.push(`${at}: size must be numbers`)
        if (e.at != null && !isV3(e.at)) errs.push(`${at}: at must be [x, y, z]`)
        break
      case 'plane':
        if (!isV3(e.normal) || Math.hypot(...e.normal) < 1e-9) errs.push(`${at}: normal must be a non-zero [x, y, z]`)
        break
      case 'region':
        range()
        formula(at, e.f, ['x', 'y'])
        if (e.classes != null && !(Number.isInteger(e.classes) && e.classes >= 2 && e.classes <= 6)) errs.push(`${at}: classes must be 2 … 6`)
        break
      case 'graph': {
        const nodeIds = new Set<string>()
        if (!Array.isArray(e.nodes) || !e.nodes.length || e.nodes.length > 200) errs.push(`${at}: nodes must be a list (1 … 200)`)
        for (const n of e.nodes ?? []) {
          if (!n || typeof n.id !== 'string') errs.push(`${at}: every node needs an id`)
          else if (nodeIds.has(n.id)) errs.push(`${at}: node "${n.id}" used twice`)
          else nodeIds.add(n.id)
          if ((e.layout ?? 'given') === 'given' && !(Array.isArray(n?.at) && (n.at.length === 2 || n.at.length === 3) && n.at.every(isNum))) errs.push(`${at}: node "${n?.id}" needs at [x, y] (or use a layout)`)
        }
        if (!Array.isArray(e.edges)) errs.push(`${at}: edges must be a list`)
        for (const g of e.edges ?? []) if (!nodeIds.has(g?.from) || !nodeIds.has(g?.to)) errs.push(`${at}: edge ${g?.from} → ${g?.to} names a missing node`)
        if (e.layout != null && !['given', 'tree', 'layered', 'ring'].includes(e.layout)) errs.push(`${at}: layout must be given, tree, layered or ring`)
        for (const l of e.lit ?? []) if (!nodeIds.has(l)) errs.push(`${at}: lit node "${l}" is missing`)
        break
      }
      case 'image': {
        const g = e.pixels != null ? isGrid(e.pixels, 64) && e.pixels.every((r) => r.every((v) => v >= 0 && v <= 1)) : Array.isArray(e.rgb) && e.rgb.length > 0 && e.rgb.length <= 64 && e.rgb.every((r) => Array.isArray(r) && r.length === e.rgb![0].length && r.length <= 64 && r.every((q) => Array.isArray(q) && q.length === 3 && q.every((v) => isNum(v) && v >= 0 && v <= 1)))
        if (!g) errs.push(`${at}: give pixels (grey 0 … 1) or rgb ([r, g, b] 0 … 1), at most 64 × 64`)
        if (e.window != null && !(Array.isArray(e.window) && e.window.length === 4 && e.window.every((v) => Number.isInteger(v) && v >= 0))) errs.push(`${at}: window must be [row, col, rows, cols]`)
        break
      }
      case 'boxes':
        if (!Array.isArray(e.boxes) || !e.boxes.every((b) => b && [b.x, b.y, b.w, b.h].every(isNum) && b.w > 0 && b.h > 0)) errs.push(`${at}: boxes need x, y, w, h (w, h > 0)`)
        break
      case 'tokens':
        if (!Array.isArray(e.tokens) || !e.tokens.length || e.tokens.length > 128 || !e.tokens.every((t) => typeof t === 'string')) errs.push(`${at}: tokens must be 1 … 128 strings`)
        if (e.probs != null && (!Array.isArray(e.probs) || e.probs.length !== e.tokens?.length || !e.probs.every(isNum))) errs.push(`${at}: probs must have one number per token`)
        break
      case 'gridworld': {
        const R = e.rows
        const C = e.cols
        if (!(Number.isInteger(R) && R > 0 && R <= 24 && Number.isInteger(C) && C > 0 && C <= 24)) {
          errs.push(`${at}: rows and cols must be 1 … 24`)
          break
        }
        const inside = (q: unknown) => Array.isArray(q) && q.length >= 2 && Number.isInteger(q[0]) && Number.isInteger(q[1]) && q[0] >= 0 && q[0] < R && q[1] >= 0 && q[1] < C
        if (e.walls && !e.walls.every(inside)) errs.push(`${at}: walls must be cells inside the grid`)
        if (e.rewards && !e.rewards.every((q) => inside(q) && isNum(q[2]))) errs.push(`${at}: rewards must be [row, col, reward]`)
        if (e.values && !(isGrid(e.values, 24) && e.values.length === R && e.values[0].length === C)) errs.push(`${at}: values must be rows × cols`)
        if (e.policy && !(isGrid(e.policy, 24) && e.policy.length === R && e.policy[0].length === C && e.policy.every((r) => r.every((v) => [0, 1, 2, 3, 4].includes(v))))) errs.push(`${at}: policy must be rows × cols of 0 … 4`)
        if (e.agent && !(Array.isArray(e.agent) && e.agent.length === 2 && e.agent.every(isNum))) errs.push(`${at}: agent must be [row, col]`)
        if (e.trail && !e.trail.every(inside)) errs.push(`${at}: trail must be cells inside the grid`)
        break
      }
      case 'membar':
        if (!Array.isArray(e.segments) || !e.segments.length || !e.segments.every((g) => g && typeof g.label === 'string' && isNum(g.value) && g.value >= 0)) errs.push(`${at}: segments need a label and a value ≥ 0`)
        if (e.devices != null && !(Number.isInteger(e.devices) && e.devices >= 1 && e.devices <= 64)) errs.push(`${at}: devices must be 1 … 64`)
        break
      case 'timeline':
        if (!Array.isArray(e.lanes) || !e.lanes.length || !e.lanes.every((l) => typeof l === 'string')) errs.push(`${at}: lanes must be names`)
        if (!Array.isArray(e.blocks) || !e.blocks.every((b) => b && Number.isInteger(b.lane) && b.lane >= 0 && b.lane < (e.lanes?.length ?? 0) && isNum(b.start) && isNum(b.end) && b.end > b.start)) errs.push(`${at}: blocks need a lane, start and end (end > start)`)
        break
      case 'code':
        if (!Array.isArray(e.lines) || !e.lines.length || e.lines.length > 60 || !e.lines.every((l) => typeof l === 'string')) errs.push(`${at}: lines must be 1 … 60 strings`)
        if (e.vars && !(Array.isArray(e.vars) && e.vars.every((v) => Array.isArray(v) && v.length === 2 && typeof v[0] === 'string'))) errs.push(`${at}: vars must be [name, value] pairs`)
        break
      case 'table':
        if (!Array.isArray(e.rows) || !e.rows.length || e.rows.length > 40 || !e.rows.every((r) => Array.isArray(r) && r.length === e.rows[0].length && r.every((v) => typeof v === 'string' || isNum(v)))) errs.push(`${at}: rows must be 1 … 40 equal rows of text or numbers`)
        break
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

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Glide between two values of the same shape: numbers and (nested) arrays of numbers; anything else switches halfway. */
export function blendValue(a: unknown, b: unknown, u: number): unknown {
  if (a === b) return a
  if (isNum(a) && isNum(b)) return a + (b - a) * u
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x, i) => blendValue(x, b[i], u))
  if (isPlain(a) && isPlain(b)) {
    const out: Record<string, unknown> = { ...b }
    for (const k of Object.keys(b)) if (k in a) out[k] = blendValue(a[k], b[k], u)
    return out
  }
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
