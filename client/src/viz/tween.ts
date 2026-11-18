/*
  Frame tweening (dm.md job E1): between two frames, every numeric geometry
  property glides from its old value to its new one over TWEEN_MS with the
  theme's --ease-standard curve, driven by requestAnimationFrame. Arrows whose
  ends are element ids are re-snapped by the renderer on every tick, so edges
  follow their vertices. Under prefers-reduced-motion, mode="static" and
  print the player never tweens (it shows the target frame directly).

  Only geometry tweens here; opacity / fill / stroke keep their CSS
  transition (viz.css). This module is shared with Node tests — keep it
  dependency-free and erasable-syntax only.
*/
import type { VizElement } from './schema.ts'
import type { VizFrame } from './frames.ts'

export const TWEEN_MS = 450

/** Numeric geometry properties that tween between frames. */
export const TWEEN_KEYS = ['x', 'y', 'w', 'h', 'cx', 'cy', 'r', 'r0', 'start', 'end', 'cell', 'cellW', 'cellH', 'size', 'curve', 'angle'] as const

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** cubic-bezier(0.2, 0, 0, 1) — the theme's --ease-standard (index.css). */
export function easeStandard(t: number): number {
  const x1 = 0.2, y1 = 0, x2 = 0, y2 = 1
  if (t <= 0) return 0
  if (t >= 1) return 1
  // Newton–Raphson on x(t) = t, then evaluate y.
  let u = t
  for (let i = 0; i < 8; i++) {
    const xu = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u
    const dxu = 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2)
    if (Math.abs(dxu) < 1e-6) break
    u -= (xu - t) / dxu
  }
  u = Math.min(1, Math.max(0, u))
  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u
}

const isPoint = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'

function tweenPoints(a: unknown, b: unknown, t: number): unknown {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return b
  if (!a.every(isPoint) || !b.every(isPoint)) return b
  return b.map((p, i) => [lerp(a[i][0], p[0], t), lerp(a[i][1], p[1], t)])
}

/**
 * The frame shown at time t between `from` and `to` (0 ≤ t ≤ 1). Elements are
 * matched by id; only the TWEEN_KEYS (and equal-length `points`) interpolate.
 * Elements with nothing to tween keep their object identity, so memoised
 * renderers skip them. At t = 1 the result is exactly `to`.
 */
export function interpolateFrames(from: VizFrame, to: VizFrame, t: number): VizFrame {
  if (t >= 1) return to
  if (t <= 0) return from
  const prev = new Map(from.elements.map((e) => [e.id, e]))
  const k = Math.min(1, Math.max(0, t))
  const elements = to.elements.map((el) => {
    const p = prev.get(el.id)
    if (!p || (p as VizElement).type !== el.type) return el
    const a = p as unknown as Record<string, unknown>
    const b = el as unknown as Record<string, unknown>
    const tweened: Record<string, unknown> = {}
    for (const key of TWEEN_KEYS) {
      const va = a[key]
      const vb = b[key]
      if (typeof va === 'number' && typeof vb === 'number' && va !== vb) tweened[key] = lerp(va, vb, easeStandard(k))
    }
    if ('points' in a || 'points' in b) {
      const pts = tweenPoints(a.points, b.points, easeStandard(k))
      if (pts !== b.points) tweened.points = pts
    }
    if (Object.keys(tweened).length === 0) return el
    return { ...el, ...tweened } as VizElement
  })
  return { ...to, elements }
}
