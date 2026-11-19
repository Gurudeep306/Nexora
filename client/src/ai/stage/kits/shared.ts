/*
  What every Stage kit shares: the drawing context, theme colour roles,
  maths → scene coordinates with the 2D/3D lift, number formatting and
  compiled formulas.
*/
import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { toScene, type V3 } from '../../three/coords'
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
