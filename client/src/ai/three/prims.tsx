/*
 * Building blocks for AI-course 3D scenes. Math coordinates (x, y, z) map to
 * the screen as x → right, y → depth, z → up (three.js has y up), so a
 * surface z = f(x, y) stands up like a landscape. Colours come from the
 * theme (Palette3D); nothing here has a raw colour of its own.
 */
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { BufferAttribute, Color, DoubleSide, InstancedMesh, Object3D, PlaneGeometry, Quaternion, Vector3 } from 'three'
import { Html, Line } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { cn } from '@/lib/utils'

import { toScene, type V3 } from './coords'
import { Mat } from './studio'
export type { V3 }

/**
 * A function surface z = f(x, y), lit softly, with a sparse grid of lines on it.
 * `ramp` colours it by height (low → high, two theme colours), so valleys and
 * peaks read at a glance. `onPick` gets the math (x, y) of a click on it (not
 * of a drag that turned the view).
 */
export function SurfaceMesh({ f, range, n = 64, scale = 1, color, line, opacity = 0.88, lines = 8, ramp, onPick, onTip }: { f: (x: number, y: number) => number; range: [number, number]; n?: number; scale?: number; color: string; line: string; opacity?: number; lines?: number; ramp?: [string, string]; onPick?: (x: number, y: number) => void; onTip?: (e: ThreeEvent<PointerEvent> | null, x: number, y: number) => void }) {
  const [lo, hi] = range
  const size = hi - lo
  const geo = useMemo(() => {
    const g = new PlaneGeometry(size, size, n, n)
    const pos = g.attributes.position as BufferAttribute
    const zs: number[] = []
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (lo + hi) / 2
      const y = pos.getY(i) + (lo + hi) / 2
      const z = f(x, y)
      zs.push(z)
      const [sx, sy, sz] = toScene(x, y, z * scale)
      pos.setXYZ(i, sx, sy, sz)
    }
    if (ramp) {
      // Height colour on a gentle curve (square root), so the low ground keeps detail.
      const zmin = Math.min(...zs)
      const zmax = Math.max(...zs)
      const a = new Color(ramp[0])
      const b = new Color(ramp[1])
      const col = new Float32Array(pos.count * 3)
      const c = new Color()
      zs.forEach((z, i) => {
        c.copy(a).lerp(b, Math.sqrt((z - zmin) / (zmax - zmin || 1)))
        col.set([c.r, c.g, c.b], i * 3)
      })
      g.setAttribute('color', new BufferAttribute(col, 3))
    }
    g.computeVertexNormals()
    return g
  }, [f, lo, hi, n, scale, size, ramp])
  const grid = useMemo(() => {
    const pts: V3[][] = []
    for (let k = 0; k <= lines; k++) {
      const c = lo + (size * k) / lines
      const a: V3[] = []
      const b: V3[] = []
      for (let i = 0; i <= 48; i++) {
        const u = lo + (size * i) / 48
        a.push(toScene(c, u, f(c, u) * scale + 0.004))
        b.push(toScene(u, c, f(u, c) * scale + 0.004))
      }
      pts.push(a, b)
    }
    return pts
  }, [f, lo, size, lines, scale])
  return (
    <group>
      <mesh
        geometry={geo}
        onClick={
          onPick
            ? (e) => {
                if (e.delta > 4) return // that was a drag to turn the view
                e.stopPropagation()
                onPick(e.point.x, -e.point.z)
              }
            : undefined
        }
        onPointerMove={onTip ? (e) => onTip(e, e.point.x, -e.point.z) : undefined}
        onPointerOver={onPick ? () => (document.body.style.cursor = 'crosshair') : undefined}
        onPointerOut={(e) => {
          if (onPick) document.body.style.cursor = ''
          onTip?.(null, 0, 0)
          void e
        }}
      >
        <Mat color={ramp ? '#ffffff' : color} vertexColors={!!ramp} side={DoubleSide} roughness={0.85} metalness={0} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {grid.map((pts, i) => (
        <Line key={i} points={pts} color={line} lineWidth={0.8} transparent opacity={0.55} />
      ))}
    </group>
  )
}

/** Level curves f(x, y) = c, by marching squares, drawn flat at height `at` (a contour map under the surface). */
export function Contours({ f, range, levels, at = 0, color, n = 90 }: { f: (x: number, y: number) => number; range: [number, number]; levels: number[]; at?: number; color: string; n?: number }) {
  const segs = useMemo(() => {
    const [lo, hi] = range
    const h = (hi - lo) / n
    const val: number[][] = []
    for (let i = 0; i <= n; i++) {
      val.push([])
      for (let j = 0; j <= n; j++) val[i].push(f(lo + i * h, lo + j * h))
    }
    const out: V3[][] = []
    for (const c of levels) {
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const corners: [number, number, number][] = [
            [i, j, val[i][j]],
            [i + 1, j, val[i + 1][j]],
            [i + 1, j + 1, val[i + 1][j + 1]],
            [i, j + 1, val[i][j + 1]],
          ]
          const cross: V3[] = []
          for (let e = 0; e < 4; e++) {
            const [ai, aj, av] = corners[e]
            const [bi, bj, bv] = corners[(e + 1) % 4]
            if ((av - c) * (bv - c) < 0) {
              const t = (c - av) / (bv - av)
              cross.push(toScene(lo + (ai + (bi - ai) * t) * h, lo + (aj + (bj - aj) * t) * h, at))
            }
          }
          if (cross.length >= 2) out.push([cross[0], cross[1]])
          if (cross.length === 4) out.push([cross[2], cross[3]])
        }
    }
    return out
  }, [f, range, levels, at, n])
  const flat = useMemo(() => segs.flat(), [segs])
  if (!flat.length) return null
  return <Line points={flat} segments color={color} lineWidth={1} transparent opacity={0.7} />
}

/** A path through scene points, drawn up to `upTo` (a fractional index), with a ball at its head. */
export function PathLine({ points, color, upTo, width = 2.5, ball = 0.09, opacity = 1 }: { points: V3[]; color: string; upTo?: number; width?: number; ball?: number; opacity?: number }) {
  const k = Math.max(0, Math.min(points.length - 1, upTo ?? points.length - 1))
  const i = Math.floor(k)
  const f = k - i
  const head: V3 = i + 1 < points.length ? (points[i].map((v, d) => v + (points[i + 1][d] - v) * f) as V3) : points[i]
  const shown = [...points.slice(0, i + 1), head]
  return (
    <group>
      {shown.length > 1 && <Line points={shown} color={color} lineWidth={width} transparent={opacity < 1} opacity={opacity} />}
      <mesh position={head}>
        <sphereGeometry args={[ball, 20, 20]} />
        <Mat color={color} roughness={0.4} transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </group>
  )
}

/** An arrow from one scene point to another. */
export function Arrow({ from, to, color, radius = 0.025 }: { from: V3; to: V3; color: string; radius?: number }) {
  const a = new Vector3(...from)
  const b = new Vector3(...to)
  const dir = b.clone().sub(a)
  const len = dir.length()
  if (len < 1e-6) return null
  const head = Math.min(0.25, len * 0.3)
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize())
  const shaftMid = a.clone().add(dir.clone().multiplyScalar((len - head) / 2 / len))
  const headPos = a.clone().add(dir.clone().multiplyScalar((len - head / 2) / len))
  return (
    <group>
      <mesh position={shaftMid} quaternion={q}>
        <cylinderGeometry args={[radius, radius, len - head, 12]} />
        <Mat color={color} roughness={0.5} />
      </mesh>
      <mesh position={headPos} quaternion={q}>
        <coneGeometry args={[radius * 3, head, 16]} />
        <Mat color={color} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** A text label pinned to a point in the scene, in the page's own fonts. */
export function Label({ at, children, muted, className, opacity = 1 }: { at: V3; children: ReactNode; muted?: boolean; className?: string; opacity?: number }) {
  return (
    <Html position={at} center zIndexRange={[10, 0]} className={cn('ai3d-label', muted && 'is-muted', className)} style={opacity < 1 ? { opacity } : undefined}>
      {children}
    </Html>
  )
}

/** Three axes through the origin, with their names. Math axes: x, y on the floor, z up. */
export function Axes({ size = 3, color, names = ['x', 'y', 'z'] }: { size?: number; color: string; names?: [string, string, string] }) {
  const ends: V3[] = [toScene(size, 0, 0), toScene(0, size, 0), toScene(0, 0, size)]
  return (
    <group>
      {ends.map((e, i) => (
        <group key={i}>
          <Line points={[[0, 0, 0], e]} color={color} lineWidth={1} />
          <Label at={e.map((v) => v * 1.08) as V3} muted>
            {names[i]}
          </Label>
        </group>
      ))}
    </group>
  )
}

/** Many small spheres (one draw call), each with its own colour. */
export function Points3D({ points, colors, r = 0.06, onTip, opacity = 1 }: { points: V3[]; colors: string[]; r?: number; onTip?: (e: ThreeEvent<PointerEvent> | null, index: number) => void; opacity?: number }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    points.forEach((p, i) => {
      o.position.set(...p)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(colors[i] ?? colors[0]))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [points, colors])
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, points.length]}
      key={points.length}
      onPointerMove={onTip ? (e) => e.instanceId != null && onTip(e, e.instanceId) : undefined}
      onPointerOut={onTip ? () => onTip(null, -1) : undefined}
    >
      <sphereGeometry args={[r, 14, 14]} />
      <Mat roughness={0.55} transparent={opacity < 1} opacity={opacity} />
    </instancedMesh>
  )
}

/** A lattice of lines in 3D, moved by a 3 × 3 matrix: what a linear map does to all of space. */
export function GridWarp({ A, n = 4, size = 2, color, opacity = 0.6 }: { A: number[][]; n?: number; size?: number; color: string; opacity?: number }) {
  const lines = useMemo(() => {
    const map = (x: number, y: number, z: number) => {
      const v = [x, y, z]
      const w = A.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
      return toScene(w[0], w[1], w[2])
    }
    const out: V3[][] = []
    const ticks = Array.from({ length: 2 * n + 1 }, (_, i) => -size + (i * size) / n)
    for (const a of ticks)
      for (const b of ticks) {
        out.push([map(-size, a, b), map(size, a, b)])
        out.push([map(a, -size, b), map(a, size, b)])
        out.push([map(a, b, -size), map(a, b, size)])
      }
    return out
  }, [A, n, size])
  return <Line points={lines.flat()} segments color={color} lineWidth={0.7} transparent opacity={opacity} />
}

/** A grid of cells as raised tiles: height and shade show each value (a feature map, an image, a matrix). */
export function CellGrid({ grid, at = [0, 0, 0], cell = 0.3, height = 0.25, low, high, highlight, hiColor, onTip, opacity = 1 }: { grid: number[][]; at?: V3; cell?: number; height?: number; low: string; high: string; highlight?: (i: number, j: number) => boolean; hiColor?: string; onTip?: (e: ThreeEvent<PointerEvent> | null, i: number, j: number) => void; opacity?: number }) {
  const ref = useRef<InstancedMesh>(null)
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const max = Math.max(1e-9, ...grid.flat().map(Math.abs))
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    const lo = new Color(low)
    const hi = new Color(high)
    let k = 0
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const v = Math.abs(grid[i][j]) / max
        const h = 0.02 + v * height
        o.position.set(at[0] + (j - (cols - 1) / 2) * cell, at[1] + h / 2, at[2] + (i - (rows - 1) / 2) * cell)
        o.scale.set(cell * 0.92, h, cell * 0.92)
        o.updateMatrix()
        m.setMatrixAt(k, o.matrix)
        m.setColorAt(k, highlight?.(i, j) && hiColor ? c.set(hiColor) : c.copy(lo).lerp(hi, v))
        k++
      }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [grid, at, cell, height, low, high, highlight, hiColor, rows, cols, max])
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, rows * cols]}
      key={`${rows}x${cols}`}
      onPointerMove={onTip ? (e) => e.instanceId != null && onTip(e, Math.floor(e.instanceId / cols), e.instanceId % cols) : undefined}
      onPointerOut={onTip ? () => onTip(null, -1, -1) : undefined}
    >
      <boxGeometry args={[1, 1, 1]} />
      <Mat roughness={0.7} transparent={opacity < 1} opacity={opacity} />
    </instancedMesh>
  )
}

/** A flat square outline on the floor (the plane z = at), as a quiet reference. */
export function Floor({ range, at = 0, color }: { range: [number, number]; at?: number; color: string }) {
  const [lo, hi] = range
  const pts = [toScene(lo, lo, at), toScene(hi, lo, at), toScene(hi, hi, at), toScene(lo, hi, at), toScene(lo, lo, at)]
  return <Line points={pts} color={color} lineWidth={1} />
}
