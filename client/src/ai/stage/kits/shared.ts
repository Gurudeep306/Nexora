/*
  What every Stage kit shares: the drawing context, theme colour roles,
  maths → scene coordinates with the 2D/3D lift, number formatting and
  compiled formulas.
*/
import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { toScene, type V3 } from '../../three/coords'
export { toScene }
import { mix, type Palette3D } from '../../three/theme3d'
import { compile } from '../expr'
import type { StageTone } from '../spec'

export interface ElCtx {
  p: Palette3D
  /** 0 = flat 2D seen from above, 1 = full 3D. Heights are multiplied by it. */
  lift: number
  params: Record<string, number>
  /** 1 when the element is in focus, less when not. */
  dim: (id: string) => number
  tip: (e: ThreeEvent<PointerEvent> | null, text?: string) => void
}

export const toneColor = (p: Palette3D, t: StageTone | undefined, fallback: StageTone = 'ink') => {
  const k = t ?? fallback
  return { ink: p.ink, ink2: p.ink2, muted: p.muted, hair: p.strong, accent: p.accent, info: p.info, success: p.success, warning: p.warning, error: p.error }[k]
}
/** A quiet tint for surfaces and empty cells. */
export const surfaceTint = (p: Palette3D) => mix(p.surface, p.ink, p.dark ? 0.22 : 0.14)
/** Height colour: paper at the bottom, ochre at the top (one hue reads as "how much"). */
export const heightRamp = (p: Palette3D): [string, string] => [mix(p.surface, p.ink, p.dark ? 0.16 : 0.07), mix(p.surface, p.warning, p.dark ? 0.6 : 0.62)]
/** Maths point → scene, with the height flattened by lift. */
export const at3 = (v: V3, lift: number): V3 => toScene(v[0], v[1], v[2] * lift)
export const fmt = (v: number) => (Math.abs(v) < 0.0005 ? '0' : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(Math.abs(v) >= 10 ? 1 : 2))
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** A formula in x, y and the scene's parameters, compiled once per formula. */
export function useFormula(src: string | undefined, params: Record<string, number>) {
  const names = Object.keys(params).sort().join(',')
  const fn = useMemo(() => (src ? compile(src, ['x', 'y', ...names.split(',').filter(Boolean)]) : null), [src, names])
  return useMemo(() => (fn ? (x: number, y: number) => fn({ ...params, x, y }) : null), [fn, params])
}

/** A formula in the given variables and the scene's parameters, compiled once. Returns null when there is no formula. */
export function useFn(src: string | undefined, vars: string[], params: Record<string, number>) {
  const names = Object.keys(params).sort().join(',')
  const vs = vars.join(',')
  const fn = useMemo(() => (src ? compile(src, [...vs.split(','), ...names.split(',').filter(Boolean)]) : null), [src, vs, names])
  return useMemo(() => {
    if (!fn) return null
    const keys = vs.split(',')
    return (...args: number[]) => {
      const env: Record<string, number> = { ...params }
      keys.forEach((k, i) => (env[k] = args[i]))
      const v = fn(env)
      return Number.isFinite(v) ? v : NaN
    }
  }, [fn, vs, params])
}
/** Opacity of an element: its own, times how much it is in focus. */
export const opOf = (el: { id: string; opacity?: number }, c: ElCtx) => (el.opacity ?? 1) * c.dim(el.id)
/** Categorical tones for classes and series, in a fixed order. */
export const SERIES: StageTone[] = ['info', 'warning', 'success', 'error', 'ink2', 'accent']

/**
 * A flat diagram's plane. Offsets (X right, Y up the page) map to the scene;
 * with `stand`, the plane lies on the floor in 2D and stands upright in 3D
 * (it turns up about its bottom edge as the scene lifts). Z lifts off the plane.
 */
export function planeMap(at: V3 | undefined, lift: number, stand = false) {
  const [ax, ay, az] = at ?? [0, 0, 0]
  const s = stand ? lift : 0
  return (X: number, Y: number, Z = 0): V3 => toScene(ax + X, ay + Y * (1 - s) - Z * s, az * lift + Y * s + Z * (1 - s) * Math.max(lift, 0.002))
}
/** "Nice" tick values covering [lo, hi]. */
export function ticks(lo: number, hi: number, n = 4): number[] {
  if (!(hi > lo)) return [lo]
  const raw = (hi - lo) / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v)
  return out
}
