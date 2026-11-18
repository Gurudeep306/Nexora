/*
  Pure geometry for Nexora Viz shapes that are not plain SVG primitives.
  Dependency-free and erasable-syntax only, so Node tests can import it.

  Angles are in degrees, measured clockwise from 12 o'clock (the way a
  clock face or a counter wheel is read), so 0 = up, 90 = right.
*/

export type Pt = [number, number]

const round = (n: number) => Math.round(n * 100) / 100

/** Point at `deg` (clockwise from 12 o'clock) on a circle of radius r. */
export function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180
  return [round(cx + r * Math.sin(a)), round(cy - r * Math.cos(a))]
}

/**
 * SVG path data for an annular sector (r0 > 0) or a pie slice (r0 = 0)
 * from `start` to `end` degrees. A full turn (end − start = 360) is drawn as
 * two half-arcs, because one SVG arc cannot start and end at the same point.
 */
export function arcPath(cx: number, cy: number, r: number, r0: number, start: number, end: number): string {
  const sweep = end - start
  if (sweep >= 360) {
    const mid = start + 180
    const outer = (a: number, b: number) => {
      const [x1, y1] = polar(cx, cy, r, a)
      const [x2, y2] = polar(cx, cy, r, b)
      return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`
    }
    const ring = `${outer(start, mid)} ${outer(mid, start + 360).replace(/^M[^A]+/, '')}`
    if (r0 <= 0) return `${ring} Z`
    const [ix, iy] = polar(cx, cy, r0, start)
    const [mx, my] = polar(cx, cy, r0, mid)
    return `${ring} Z M${ix} ${iy} A${r0} ${r0} 0 0 0 ${mx} ${my} A${r0} ${r0} 0 0 0 ${ix} ${iy} Z`
  }
  const large = sweep > 180 ? 1 : 0
  const [x1, y1] = polar(cx, cy, r, start)
  const [x2, y2] = polar(cx, cy, r, end)
  if (r0 <= 0) return `M${round(cx)} ${round(cy)} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  const [x3, y3] = polar(cx, cy, r0, end)
  const [x4, y4] = polar(cx, cy, r0, start)
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r0} ${r0} 0 ${large} 0 ${x4} ${y4} Z`
}

/** Where an arc's label sits: the middle of the sweep, halfway across the band. */
export function arcLabelPoint(cx: number, cy: number, r: number, r0: number, start: number, end: number): Pt {
  const mid = (start + end) / 2
  const rr = r0 > 0 ? (r + r0) / 2 : r * 0.62
  return polar(cx, cy, rr, mid)
}

/* ── Logic-gate symbols ────────────────────────────────────────────────── */

export type GateKind = 'and' | 'or' | 'not' | 'buf' | 'nand' | 'nor' | 'xor' | 'xnor'

export interface GateShape {
  /** Body outline (path data). */
  body: string
  /** The second back curve of XOR / XNOR. */
  extra?: string
  /** Output inversion bubble. */
  outBubble?: { cx: number; cy: number; r: number }
  /** Input inversion bubbles, one per bubbled input. */
  inBubbles: { cx: number; cy: number; r: number }[]
  /** Where each input wire ends (left of any input bubble), top to bottom. */
  pins: Pt[]
  /** Where the output wire starts (the right edge, after any bubble). */
  out: Pt
}

const INVERTING: GateKind[] = ['nand', 'nor', 'xnor', 'not']
const OR_FAMILY: GateKind[] = ['or', 'nor', 'xor', 'xnor']

/** Radius of an inversion bubble for a gate of height h. */
export function gateBubbleR(h: number): number {
  return round(Math.max(3, Math.min(7, h * 0.12)))
}

/**
 * Geometry of a gate symbol drawn inside the box (x, y, w, h). The output
 * bubble, when there is one, sits inside the box's right end, so the output
 * pin is always (x + w, y + h/2). Input k of n is at y + h·(k + 1)/(n + 1);
 * on the curved back of the OR family the pin follows the curve. A bubbled
 * input moves its pin left by one bubble diameter. The generator in
 * content/gate-notes/_checks/dl/_viz_ch2.py mirrors this function.
 */
export function gateShape(kind: GateKind, x: number, y: number, w: number, h: number, inputs?: number, bubbles: number[] = []): GateShape {
  const single = kind === 'not' || kind === 'buf'
  const n = single ? 1 : Math.max(1, inputs ?? 2)
  const r = gateBubbleR(h)
  const inv = INVERTING.includes(kind)
  const wb = Math.max(4, w - (inv ? 2 * r : 0))
  const xor = kind === 'xor' || kind === 'xnor'
  const gap = xor ? round(Math.min(8, 0.14 * wb)) : 0
  const bx = x + gap
  const bw = wb - gap
  const mid = y + h / 2
  let body: string
  let extra: string | undefined
  if (single) body = `M${round(x)} ${round(y)} L${round(x + wb)} ${round(mid)} L${round(x)} ${round(y + h)} Z`
  else if (OR_FAMILY.includes(kind)) {
    body =
      `M${round(bx)} ${round(y)} Q${round(bx + 0.25 * bw)} ${round(mid)} ${round(bx)} ${round(y + h)} ` +
      `Q${round(bx + 0.62 * bw)} ${round(y + h)} ${round(bx + bw)} ${round(mid)} Q${round(bx + 0.62 * bw)} ${round(y)} ${round(bx)} ${round(y)} Z`
    if (xor) extra = `M${round(x)} ${round(y)} Q${round(x + 0.25 * bw)} ${round(mid)} ${round(x)} ${round(y + h)}`
  } else {
    const ry = h / 2
    const rx = Math.min(ry, bw)
    const flat = Math.max(0, bw - rx)
    body = `M${round(bx)} ${round(y)} H${round(bx + flat)} A${round(rx)} ${round(ry)} 0 0 1 ${round(bx + flat)} ${round(y + h)} H${round(bx)} Z`
  }
  const pins: Pt[] = []
  const inBubbles: GateShape['inBubbles'] = []
  for (let k = 0; k < n; k++) {
    const py = y + (h * (k + 1)) / (n + 1)
    const t = (py - y) / h
    // The OR-family back curve is a quadratic Bézier whose x bulges by 0.5·bw·t(1 − t).
    let px = OR_FAMILY.includes(kind) ? (xor ? x : bx) + 0.5 * bw * t * (1 - t) : x
    if (bubbles.includes(k)) {
      inBubbles.push({ cx: round(px - r), cy: round(py), r })
      px -= 2 * r
    }
    pins.push([round(px), round(py)])
  }
  return {
    body,
    extra,
    outBubble: inv ? { cx: round(x + wb + r), cy: round(mid), r } : undefined,
    inBubbles,
    pins,
    out: [round(x + w), round(mid)],
  }
}

/* ── Self-loops (the `loop` element, dm.md job E2) ───────────────────────── */

/**
 * Open arc path (stroke only, no fill) on a circle of radius r, from `start`
 * to `end` degrees clockwise from 12 o'clock. A full turn is drawn as two
 * half-arcs, because one SVG arc cannot start and end at the same point.
 */
export function arcStroke(cx: number, cy: number, r: number, start: number, end: number): string {
  const sweep = end - start
  if (sweep >= 360) {
    const mid = start + 180
    const [x1, y1] = polar(cx, cy, r, start)
    const [x2, y2] = polar(cx, cy, r, mid)
    const [x3, y3] = polar(cx, cy, r, end)
    return `M${x1} ${y1} A${r} ${r} 0 1 1 ${x2} ${y2} A${r} ${r} 0 1 1 ${x3} ${y3}`
  }
  const large = sweep > 180 ? 1 : 0
  const [x1, y1] = polar(cx, cy, r, start)
  const [x2, y2] = polar(cx, cy, r, end)
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

export interface LoopGeom {
  /** Arc path data of the loop (stroke). */
  d: string
  /** Attach point on the node's outline. */
  attach: Pt
  /** Far point of the loop (label anchor, and where arrows snap to). */
  anchor: Pt
  /** Arrowhead polygon at the arc end when head = "end" (digraphs). */
  head?: Pt[]
}

/**
 * A self-loop on the outline of a node (cx, cy, r) at `angle` degrees
 * (clockwise from 12 o'clock). The loop is a circle of radius `size` tangent
 * to the node at that point, drawn as a 280° arc with a 80° gap at the node.
 */
export function loopGeom(cx: number, cy: number, r: number, angle: number, size: number, head: 'end' | 'none' = 'none'): LoopGeom {
  const a = (angle * Math.PI) / 180
  const dir: Pt = [Math.sin(a), -Math.cos(a)]
  const attach: Pt = [round(cx + r * dir[0]), round(cy + r * dir[1])]
  const c: Pt = [round(attach[0] + size * dir[0]), round(attach[1] + size * dir[1])]
  const gap = 40 // half the opening at the node, in degrees
  const start = angle + 180 + gap
  const end = angle + 180 + 360 - gap
  const d = arcStroke(c[0], c[1], size, start, end)
  const anchor = polar(c[0], c[1], size, angle)
  let headPts: Pt[] | undefined
  if (head === 'end') {
    // Arrowhead at the arc's end: tip on the arc, base straddling the tangent
    // (clockwise travel at `end` runs in direction end + 90).
    const tip = polar(c[0], c[1], size, end)
    const bx = c[0] + (size - 9) * Math.sin(((end + 90) * Math.PI) / 180)
    const by = c[1] - (size - 9) * Math.cos(((end + 90) * Math.PI) / 180)
    const px = Math.cos(((end + 90) * Math.PI) / 180)
    const py = Math.sin(((end + 90) * Math.PI) / 180)
    headPts = [
      [round(bx - 4.5 * py), round(by + 4.5 * px)],
      [round(tip[0]), round(tip[1])],
      [round(bx + 4.5 * py), round(by - 4.5 * px)],
    ]
  }
  return { d, attach, anchor, head: headPts }
}
