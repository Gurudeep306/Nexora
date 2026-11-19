/*
  Stage kit: maths. Surfaces (formula or grid), contour lines, vector fields,
  points, paths, lines, arrows, labels, axes, a lattice moved by a matrix and
  a sphere moved by a matrix (an ellipsoid). Heights follow lift (2D ⇄ 3D).
*/
import { useMemo } from 'react'
import { DoubleSide, Matrix4, SphereGeometry } from 'three'
import { Line } from '@react-three/drei'
import { Arrow, Axes, Contours, GridWarp, Label, PathLine, Points3D, SurfaceMesh } from '../../three/prims'
import { toScene, type V3 } from '../../three/coords'
import { Mat } from '../../three/studio'
import type { StageElement, StageTone } from '../spec'
import { at3, fmt, heightRamp, surfaceTint, toneColor, useFormula, type ElCtx } from './shared'

type El<T extends StageElement['type']> = { el: Extract<StageElement, { type: T }>; c: ElCtx }
const op = (el: { id: string; opacity?: number }, c: ElCtx) => (el.opacity ?? 1) * c.dim(el.id)
const tone = (el: { tone?: StageTone }, c: ElCtx, t: StageTone) => toneColor(c.p, el.tone, t)

/** Heights from a grid, smoothly (bilinear) between its points. */
function gridFn(z: number[][], range: [number, number]) {
  const n = z.length - 1
  const m = z[0].length - 1
  return (x: number, y: number) => {
    const u = Math.max(0, Math.min(m, ((x - range[0]) / (range[1] - range[0])) * m))
    const v = Math.max(0, Math.min(n, ((y - range[0]) / (range[1] - range[0])) * n))
    const i = Math.min(n - 1, Math.floor(v))
    const j = Math.min(m - 1, Math.floor(u))
    const a = v - i
    const b = u - j
    return z[i][j] * (1 - a) * (1 - b) + z[i][j + 1] * (1 - a) * b + z[i + 1][j] * a * (1 - b) + z[i + 1][j + 1] * a * b
  }
}

export function SurfaceEl({ el, c }: { el: Extract<StageElement, { type: 'surface' }>; c: ElCtx }) {
  const f0 = useFormula(el.f, c.params)
  const fz = useMemo(() => (el.z ? gridFn(el.z, el.range) : null), [el.z, el.range])
  const f = f0 ?? fz
  if (!f) return null
  const o = (el.opacity ?? 0.9) * c.dim(el.id)
  const scale = (el.scale ?? 1) * Math.max(0.002, c.lift)
  return (
    <SurfaceMesh
      f={f}
      range={el.range}
      n={el.n ?? 64}
      scale={scale}
      color={surfaceTint(c.p)}
      ramp={el.ramp === false ? undefined : heightRamp(c.p)}
      line={c.p.strong}
      lines={el.wire === false ? 0 : 8}
      opacity={o}
      onTip={(e, x, y) => c.tip(e, e ? `${el.tip ? `${el.tip}\n` : ''}x = ${fmt(x)}, y = ${fmt(y)} → ${fmt(f(x, y))}` : undefined)}
    />
  )
}

export function ContoursEl({ el, c }: { el: Extract<StageElement, { type: 'contours' }>; c: ElCtx }) {
  const f = useFormula(el.f, c.params)
  if (!f) return null
  return <Contours f={f} range={el.range} levels={el.levels} at={(el.at ?? 0) * c.lift - 0.01} color={toneColor(c.p, el.tone, 'muted')} />
}

/** A field of arrows (a gradient, a score, a flow): one line object for all shafts and heads. */
export function FieldEl({ el, c }: { el: Extract<StageElement, { type: 'field' }>; c: ElCtx }) {
  const fx = useFormula(el.fx, c.params)
  const fy = useFormula(el.fy, c.params)
  const segs = useMemo(() => {
    if (!fx || !fy) return []
    const n = el.n ?? 13
    const [lo, hi] = el.range
    const h = (hi - lo) / (n - 1)
    const vs: { x: number; y: number; u: number; v: number; m: number }[] = []
    let max = 1e-9
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = lo + i * h
        const y = lo + j * h
        const u = fx(x, y)
        const v = fy(x, y)
        const m = Math.hypot(u, v)
        if (Number.isFinite(m)) {
          vs.push({ x, y, u, v, m })
          max = Math.max(max, m)
        }
      }
    const L = (el.length ?? 0.8) * h
    const z = (el.at ?? 0) * c.lift + 0.02
    const out: V3[] = []
    for (const q of vs) {
      if (q.m < 1e-9) continue
      const s = (L * Math.sqrt(q.m / max)) / q.m // longer arrows for stronger flow, gently (square root)
      const ex = q.x + q.u * s
      const ey = q.y + q.v * s
      const bx = -q.u / q.m
      const by = -q.v / q.m
      const hl = Math.min(0.35 * L, 0.5 * Math.hypot(ex - q.x, ey - q.y))
      out.push(toScene(q.x, q.y, z), toScene(ex, ey, z))
      for (const sgn of [1, -1]) out.push(toScene(ex, ey, z), toScene(ex + hl * (bx * 0.87 - sgn * by * 0.5), ey + hl * (by * 0.87 + sgn * bx * 0.5), z))
    }
    return out
  }, [fx, fy, el.n, el.range, el.length, el.at, c.lift])
  if (!segs.length) return null
  return <Line points={segs} segments color={toneColor(c.p, el.tone, 'info')} lineWidth={1.2} transparent opacity={(el.opacity ?? 0.9) * c.dim(el.id)} />
}

export function EllipsoidEl({ el, c }: { el: Extract<StageElement, { type: 'ellipsoid' }>; c: ElCtx }) {
  const M = el.matrix
  const geo = useMemo(() => {
    // Maths (x, y, z) → scene (x, z·lift, −y), applied after the matrix.
    const m4 = new Matrix4().set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1)
    const S = new Matrix4().set(1, 0, 0, 0, 0, 0, Math.max(0.002, c.lift), 0, 0, -1, 0, 0, 0, 0, 0, 1)
    const center = el.center ?? [0, 0, 0]
    const T = new Matrix4().makeTranslation(...at3(center, c.lift))
    return new SphereGeometry(1, 32, 20).applyMatrix4(T.multiply(S).multiply(m4))
  }, [M, el.center, c.lift])
  return (
    <mesh geometry={geo}>
      <Mat color={surfaceTint(c.p)} wireframe transparent opacity={(el.opacity ?? 0.45) * c.dim(el.id)} side={DoubleSide} />
    </mesh>
  )
}

export function PointsEl({ el, c }: El<'points'>) {
  const pts = el.points.map((q) => at3(q, c.lift))
  return <Points3D points={pts} colors={el.points.map((_, i) => toneColor(c.p, el.tones?.[i] ?? el.tone))} r={el.r ?? 0.07} opacity={op(el, c)} onTip={(e, i) => c.tip(e, e && i >= 0 ? (el.tips?.[i] ?? el.tip ?? `(${el.points[i].map(fmt).join(', ')})`) : undefined)} />
}
export function PathEl({ el, c }: El<'path'>) {
  return <PathLine points={el.points.map((q) => at3(q, c.lift))} upTo={el.upTo} color={tone(el, c, 'ink')} width={el.width ?? 2.5} ball={el.ball ?? 0.08} opacity={op(el, c)} />
}
export function LineEl({ el, c }: El<'line'>) {
  return <Line points={el.points.map((q) => at3(q, c.lift))} color={tone(el, c, 'muted')} lineWidth={el.width ?? 1.2} dashed={el.dashed} dashSize={0.08} gapSize={0.06} transparent opacity={op(el, c)} />
}
export function ArrowEl({ el, c }: El<'arrow'>) {
  return <Arrow from={at3(el.from, c.lift)} to={at3(el.to, c.lift)} color={tone(el, c, 'accent')} radius={el.r ?? 0.022} />
}
export function LabelEl({ el, c }: El<'label'>) {
  return (
    <Label at={at3(el.at, c.lift)} muted={el.tone === 'muted'} opacity={op(el, c)}>
      {el.text}
    </Label>
  )
}
export function AxesEl({ el, c }: El<'axes'>) {
  return <Axes size={el.size ?? 3} color={tone(el, c, 'muted')} names={c.lift > 0.3 ? el.names : el.names ? [el.names[0], el.names[1], ''] : ['x', 'y', '']} />
}
export function LatticeEl({ el, c }: El<'lattice'>) {
  return <GridWarp A={el.matrix.map((r, i) => (i === 2 ? r.map((v) => v * Math.max(0.002, c.lift)) : r))} n={el.n ?? 2} size={el.size ?? 1.5} color={tone(el, c, 'ink2')} opacity={0.55 * op(el, c)} />
}
