/*
  Stage kit: graphs. Nodes and edges for computation graphs, trees (decision
  trees, search trees, Bayes trees), layered graphs (MDPs, trellises, message
  passing) and rings (GPUs in a collective). Layouts are computed; edges can
  carry arrows, weights and labels; beads flow along them, forward or back.
  In 3D a node's value becomes its height.
*/
import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import { Line } from '@react-three/drei'
import { FlatText } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import { Mat } from '../../three/studio'
import type { StageElement } from '../spec'
import { at3, clamp01, fmt, opOf, toneColor, type ElCtx } from './shared'
import { layoutGraph } from '../layout'

type G = Extract<StageElement, { type: 'graph' }>

export function GraphEl({ el, c }: { el: G; c: ElCtx }) {
  const pos = useMemo(() => layoutGraph(el), [el])
  const o = opOf(el, c)
  const base = el.at ?? [0, 0, 0]
  const P = (id: string, z = 0): V3 => {
    const q = pos.get(id) ?? [0, 0, 0]
    return at3([base[0] + q[0], base[1] + q[1], base[2] + q[2] + z], c.lift)
  }
  const lit = new Set(el.lit ?? [])
  const byId = new Map(el.nodes.map((n) => [n.id, n]))
  const r0 = (id: string) => byId.get(id)?.r ?? 0.24
  const vmax = Math.max(1e-9, ...el.nodes.map((n) => Math.abs(n.value ?? 0)))
  const flowU = el.flow == null ? 0 : clamp01(el.flow)
  const flowSet = el.flowEdges ? new Set(el.flowEdges) : null
  const muted = toneColor(c.p, 'muted')
  return (
    <group>
      {el.edges.map((e, i) => {
        const a = new Vector3(...P(e.from))
        const b = new Vector3(...P(e.to))
        const d = b.clone().sub(a)
        const len = d.length()
        if (len < 1e-6) return null
        const dir = d.clone().normalize()
        const s = a.clone().add(dir.clone().multiplyScalar(r0(e.from)))
        const t = b.clone().sub(dir.clone().multiplyScalar(r0(e.to) + (el.directed ? 0.02 : 0)))
        const col = toneColor(c.p, e.tone, 'muted')
        const w = e.w == null ? 1.4 : 1 + Math.min(5, Math.abs(e.w) * 3)
        const mid = s.clone().add(t).multiplyScalar(0.5)
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir)
        const flowing = el.flow != null && flowU > 0 && flowU < 1 && (!flowSet || flowSet.has(i))
        const u = el.reverse ? 1 - flowU : flowU
        const bead = s.clone().add(t.clone().sub(s).multiplyScalar(u))
        return (
          <group key={i}>
            <Line points={[s.toArray() as V3, t.toArray() as V3]} color={col} lineWidth={w} dashed={e.dashed} dashSize={0.08} gapSize={0.06} transparent opacity={o} />
            {el.directed && (
              <mesh position={t.clone().sub(dir.clone().multiplyScalar(0.07)).toArray() as V3} quaternion={q}>
                <coneGeometry args={[0.06, 0.15, 14]} />
                <Mat color={col} transparent={o < 1} opacity={o} />
              </mesh>
            )}
            {e.label && (() => {
              // Beside the edge, on the side facing up the page, so it never sits on a node's numbers.
              let px = -dir.z
              let pz = dir.x
              if (pz > 0) {
                px = -px
                pz = -pz
              }
              const k = 0.16 / (Math.hypot(px, pz) || 1)
              return <FlatText text={e.label} at={[mid.x + px * k, mid.y + 0.02, mid.z + pz * k]} size={0.13} color={toneColor(c.p, 'ink')} opacity={o} />
            })()}
            {flowing && (
              <mesh position={bead.toArray() as V3}>
                <sphereGeometry args={[0.07, 16, 16]} />
                <Mat color={toneColor(c.p, el.reverse ? 'info' : 'accent')} />
              </mesh>
            )}
          </group>
        )
      })}
      {el.nodes.map((n) => {
        const h = 0.08 + (n.value != null ? (Math.abs(n.value) / vmax) * 0.9 : 0) * Math.max(0.02, c.lift)
        const r = r0(n.id)
        const col = lit.has(n.id) ? toneColor(c.p, 'accent') : toneColor(c.p, n.tone, 'ink2')
        const p = P(n.id)
        const short = (n.label ?? '').length <= 3
        return (
          <group key={n.id}>
            <mesh
              position={[p[0], p[1] + h / 2, p[2]]}
              onPointerMove={(e) => c.tip(e, `${n.label ?? n.id}${n.value != null ? ` = ${fmt(n.value)}` : ''}`)}
              onPointerOut={() => c.tip(null)}
            >
              <cylinderGeometry args={[r, r, h, 40]} />
              <Mat color={mix(c.p.surface, col, lit.has(n.id) ? 0.85 : 0.55)} transparent={o < 1} opacity={o} />
            </mesh>
            {n.label && <FlatText text={n.label} at={short ? [p[0], p[1] + h + 0.01, p[2]] : [p[0], p[1] + 0.01, p[2] + r + 0.17]} size={short ? r * 0.75 : 0.15} color={toneColor(c.p, 'ink')} opacity={o} weight={600} />}
            {n.value != null && <FlatText text={fmt(n.value)} at={[p[0], p[1] + 0.01, p[2] + r + (short ? 0.17 : 0.38)]} size={0.13} color={muted} opacity={o * (1 - c.lift)} />}
          </group>
        )
      })}
    </group>
  )
}
