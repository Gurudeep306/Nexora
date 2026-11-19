/*
  Stage kit: shapes. Circles, ellipses, rectangles and polygons (outline or
  filled), boxes and spheres, a plane through a point with a normal, and a
  region map: a classifier's decision over the plane, computed from its
  formula, with the boundary drawn where the decision changes.
*/
import { useEffect, useMemo } from 'react'
import { CanvasTexture, Color, DoubleSide, LinearFilter, SRGBColorSpace } from 'three'
import { Line } from '@react-three/drei'
import { Contours, Quads } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import { Mat } from '../../three/studio'
import type { StageElement, StageTone } from '../spec'
import { at3, fmt, opOf, SERIES, toneColor, useFn, type ElCtx } from './shared'

type El<T extends StageElement['type']> = { el: Extract<StageElement, { type: T }>; c: ElCtx }

/** The outline of a flat shape, as maths [x, y] offsets. */
function outline(el: Extract<StageElement, { type: 'shape' }>): [number, number][] {
  const s = el.size ?? [1]
  const ring = (rx: number, ry: number) => Array.from({ length: 97 }, (_, i) => [rx * Math.cos((i / 96) * 2 * Math.PI), ry * Math.sin((i / 96) * 2 * Math.PI)] as [number, number])
  if (el.kind === 'circle') return ring(s[0], s[0])
  if (el.kind === 'ellipse') return ring(s[0], s[1] ?? s[0])
  if (el.kind === 'rect') {
    const w = s[0] / 2
    const h = (s[1] ?? s[0]) / 2
    return [[-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]]
  }
  if (el.kind === 'polygon') return [...(el.points ?? []), el.points![0]]
  return []
}

export function ShapeEl({ el, c }: El<'shape'>) {
  const o = opOf(el, c)
  const col = toneColor(c.p, el.tone, 'ink2')
  const at = el.at ?? [0, 0, 0]
  const rot = ((el.rotate ?? 0) * Math.PI) / 180
  const turn = ([x, y]: [number, number]): V3 => [at[0] + x * Math.cos(rot) - y * Math.sin(rot), at[1] + x * Math.sin(rot) + y * Math.cos(rot), at[2]]
  if (el.kind === 'box' || el.kind === 'sphere') {
    const s = el.size ?? [1, 1, 1]
    const lift = Math.max(0.02, c.lift)
    const pos = at3([at[0], at[1], at[2] + (el.kind === 'box' ? ((s[2] ?? s[0]) * lift) / 2 / Math.max(c.lift, 1e-3) : 0)], c.lift)
    return (
      <mesh position={pos} rotation={[0, rot, 0]} scale={el.kind === 'box' ? [s[0], (s[2] ?? s[0]) * lift, s[1] ?? s[0]] : [s[0], s[0] * lift, s[0]]}>
        {el.kind === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <sphereGeometry args={[1, 40, 28]} />}
        <Mat color={el.fill === false ? mix(c.p.surface, col, 0.25) : col} transparent={o < 1 || el.fill === false} opacity={el.fill === false ? 0.35 * o : o} />
      </mesh>
    )
  }
  const ring = outline(el).map(turn)
  const pts = ring.map((q) => at3(q, c.lift))
  const cen = turn([0, 0])
  const fan: V3[][] = el.fill ? ring.slice(0, -1).map((q, i) => [at3(cen, c.lift), at3(q, c.lift), at3(ring[i + 1], c.lift), at3(cen, c.lift)]) : []
  return (
    <group>
      {fan.length > 0 && <Quads quads={fan} colors={[mix(c.p.surface, col, 0.4)]} opacity={0.7 * o} />}
      <Line points={pts} color={col} lineWidth={el.width ?? 2} dashed={el.dashed} dashSize={0.08} gapSize={0.06} transparent opacity={o} />
    </group>
  )
}

export function PlaneEl({ el, c }: El<'plane'>) {
  const n = el.normal
  const len = Math.hypot(...n)
  const N = n.map((v) => v / len) as V3
  // Two directions in the plane: any vector not along N, made perpendicular.
  const a: V3 = Math.abs(N[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  const cross = (p: V3, q: V3): V3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]
  const U = cross(N, a)
  const ul = Math.hypot(...U)
  const u = U.map((v) => v / ul) as V3
  const v = cross(N, u)
  const s = el.size ?? 1.6
  const at = el.at ?? [0, 0, 0]
  const corner = (i: number, j: number): V3 => at3([at[0] + s * (i * u[0] + j * v[0]), at[1] + s * (i * u[1] + j * v[1]), at[2] + s * (i * u[2] + j * v[2])], c.lift)
  const q = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
  const col = toneColor(c.p, el.tone, 'info')
  const o = opOf(el, c)
  return (
    <group>
      <Quads quads={[q]} colors={[mix(c.p.surface, col, 0.45)]} opacity={0.45 * o} />
      <Line points={[...q, q[0]]} color={col} lineWidth={1.4} transparent opacity={o} />
    </group>
  )
}

export function RegionEl({ el, c }: El<'region'>) {
  const f = useFn(el.f, ['x', 'y'], c.params)
  const n = el.n ?? 160
  const [lo, hi] = el.range
  const k = el.classes ?? 2
  const tones = el.tones?.join(',') ?? ''
  const cols = useMemo(() => Array.from({ length: k }, (_, i) => { const t = (tones ? tones.split(',')[i] : SERIES[i]) as StageTone; return new Color(t === 'hair' ? c.p.surface : mix(c.p.surface, toneColor(c.p, t), c.p.dark ? 0.34 : 0.2)) }), [k, c.p, tones])
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = n
    cv.height = n
    const t = new CanvasTexture(cv)
    t.colorSpace = SRGBColorSpace
    t.magFilter = LinearFilter
    return t
  }, [n])
  useEffect(() => () => tex.dispose(), [tex])
  const cls = (x: number, y: number) => {
    const v = f ? f(x, y) : 0
    return el.classes ? Math.max(0, Math.min(k - 1, Math.round(v))) : v > 0 ? 1 : 0
  }
  // Repaint whenever the formula or its parameters change (they glide between steps).
  useMemo(() => {
    const cv = tex.image as HTMLCanvasElement
    const g = cv.getContext('2d')
    if (!g || !f) return
    const img = g.createImageData(n, n)
    const grid: number[] = []
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) grid.push(cls(lo + ((j + 0.5) / n) * (hi - lo), hi - ((i + 0.5) / n) * (hi - lo)))
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = grid[i * n + j]
        const col = cols[v]
        const o = (i * n + j) * 4
        img.data[o] = Math.round(col.r * 255)
        img.data[o + 1] = Math.round(col.g * 255)
        img.data[o + 2] = Math.round(col.b * 255)
        img.data[o + 3] = 255
      }
    g.putImageData(img, 0, 0)
    tex.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tex, f, n, lo, hi, k, cols, el.classes])
  const size = hi - lo
  const mid = (lo + hi) / 2
  // The boundary: a smooth contour where the decision changes (sign 0, or between classes).
  const levels = el.classes ? Array.from({ length: k - 1 }, (_, i) => i + 0.5) : [0]
  return (
    <group>
      {f && el.boundary !== false && <Contours f={(x, y) => f(x, y)} range={el.range} levels={levels} at={0.012} color={toneColor(c.p, 'ink')} n={140} width={2.2} opacity={opOf(el, c)} />}
    <mesh
      position={at3([mid, mid, -0.004], c.lift)}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={(e) => {
        if (!e.uv) return
        const x = lo + e.uv.x * size
        const y = lo + e.uv.y * size
        c.tip(e, `${el.tip ? `${el.tip}\n` : ''}x = ${fmt(x)}, y = ${fmt(y)} → ${f ? fmt(f(x, y)) : ''}`)
      }}
      onPointerOut={() => c.tip(null)}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent opacity={opOf(el, c)} side={DoubleSide} toneMapped={false} depthWrite={false} />
    </mesh>
    </group>
  )
}
