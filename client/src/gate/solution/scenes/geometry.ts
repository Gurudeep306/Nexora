import type { Transition } from 'motion/react'
import type { Cell, CellObj } from '../types'

/** One shared timing so every primitive moves in step. */
export const EASE: Transition = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.55 }

export function cellObj(c: Cell): CellObj {
  return c !== null && typeof c === 'object' ? c : { v: c }
}

export const show = (v: unknown) => (v === null || v === undefined ? '' : String(v))

/* ── Edge geometry (graph, automaton) ────────────────────────────────────── */

export interface Pt {
  x: number
  y: number
}

/**
 * Path from a to b between two circles of radius r, bent sideways by `bend`
 * (px, + = left of the direction of travel). Returns the path, the label
 * anchor and an arrowhead polygon at b.
 */
export function edgeGeometry(a: Pt, b: Pt, r: number, bend: number, rb = r) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const mx = (a.x + b.x) / 2 + nx * bend
  const my = (a.y + b.y) / 2 + ny * bend
  // control point so the curve passes through (mx, my)
  const cx = 2 * mx - (a.x + b.x) / 2
  const cy = 2 * my - (a.y + b.y) / 2
  const dir = (from: Pt, to: Pt) => {
    const l = Math.hypot(to.x - from.x, to.y - from.y) || 1
    return { x: (to.x - from.x) / l, y: (to.y - from.y) / l }
  }
  const da = dir(a, { x: cx, y: cy })
  const db = dir(b, { x: cx, y: cy })
  const s = { x: a.x + da.x * r, y: a.y + da.y * r }
  const e = { x: b.x + db.x * rb, y: b.y + db.y * rb }
  const d = bend === 0 ? `M${s.x},${s.y} L${e.x},${e.y}` : `M${s.x},${s.y} Q${cx},${cy} ${e.x},${e.y}`
  const head = arrowHead(e, { x: -db.x, y: -db.y })
  return { d, label: { x: mx, y: my }, head, normal: { x: nx, y: ny } }
}

/** Triangle with its tip at `tip`, pointing along unit vector `dir`. */
export function arrowHead(tip: Pt, dir: Pt, size = 9) {
  const bx = tip.x - dir.x * size
  const by = tip.y - dir.y * size
  const px = -dir.y * size * 0.5
  const py = dir.x * size * 0.5
  return `${tip.x},${tip.y} ${bx + px},${by + py} ${bx - px},${by - py}`
}

/** Self-loop above a circle at c with radius r. */
export function selfLoop(c: Pt, r: number) {
  const a = { x: c.x - r * 0.55, y: c.y - r * 0.84 }
  const b = { x: c.x + r * 0.55, y: c.y - r * 0.84 }
  const d = `M${a.x},${a.y} C${c.x - r * 1.5},${c.y - r * 2.9} ${c.x + r * 1.5},${c.y - r * 2.9} ${b.x},${b.y}`
  const head = arrowHead(b, norm({ x: b.x - (c.x + r * 1.1), y: b.y - (c.y - r * 2.2) }))
  return { d, label: { x: c.x, y: c.y - r * 2.45 }, head }
}

function norm(p: Pt): Pt {
  const l = Math.hypot(p.x, p.y) || 1
  return { x: p.x / l, y: p.y / l }
}

/** Fit arbitrary coordinates into a box with padding. */
export function fitPoints<T extends { x: number; y: number }>(pts: T[], w: number, h: number): T[] {
  if (!pts.length) return pts
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const sx = x1 > x0 ? w / (x1 - x0) : 0
  const sy = y1 > y0 ? h / (y1 - y0) : 0
  const s = Math.min(sx || sy || 1, sy || sx || 1)
  const ox = (w - (x1 - x0) * s) / 2
  const oy = (h - (y1 - y0) * s) / 2
  return pts.map((p) => ({ ...p, x: ox + (p.x - x0) * s, y: oy + (p.y - y0) * s }))
}
