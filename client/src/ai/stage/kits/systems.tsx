/*
  Stage kit: systems. A memory bar (what fills a GPU's memory, segment by
  segment, against its capacity, split across devices for ZeRO/FSDP) and a
  timeline (lanes of blocks over time: pipeline stages and their bubbles,
  streams, schedules) with a "now" cursor. Slabs in 3D, flat in 2D.
*/
import type { ThreeEvent } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { FlatText } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import { Mat } from '../../three/studio'
import type { StageElement, StageTone } from '../spec'
import { at3, fmt, opOf, SERIES, toneColor, type ElCtx } from './shared'

function Slab({ x, y, w, h, z, depth, color, opacity, onTip }: { x: number; y: number; w: number; h: number; z: number; depth: number; color: string; opacity: number; onTip?: (e: ThreeEvent<PointerEvent> | null) => void }) {
  const d = Math.max(0.01, depth)
  const p = at3([x + w / 2, y + h / 2, z], 1)
  return (
    <mesh position={[p[0], p[1] + d / 2, p[2]]} scale={[Math.max(0.001, w * 0.995), d, Math.max(0.001, h * 0.98)]} onPointerMove={onTip ? (e) => onTip(e) : undefined} onPointerOut={onTip ? () => onTip(null) : undefined}>
      <boxGeometry args={[1, 1, 1]} />
      <Mat color={color} roughness={0.7} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

const outline = (x: number, y: number, w: number, h: number, z: number): V3[] => [at3([x, y, z], 1), at3([x + w, y, z], 1), at3([x + w, y + h, z], 1), at3([x, y + h, z], 1), at3([x, y, z], 1)]

export function MembarEl({ el, c }: { el: Extract<StageElement, { type: 'membar' }>; c: ElCtx }) {
  const [W, H] = el.size ?? [6, 0.5]
  const o = opOf(el, c)
  const base = el.at ?? [0, 0, 0]
  const N = Math.max(1, Math.round(el.devices ?? 1))
  const sharded = new Set(el.sharded ?? [])
  const per = el.segments.map((g, k) => (N > 1 && sharded.has(k) ? g.value / N : g.value))
  const used = per.reduce((a, b) => a + b, 0)
  const cap = el.total ?? used
  // The bar's scale: the capacity, or what is used when that is more (then the capacity is marked).
  const total = Math.max(cap, used, 1e-9)
  const over = el.total != null && used > el.total + 1e-9
  const unit = el.unit ? ` ${el.unit}` : ''
  const z = base[2] * c.lift
  const depth = 0.18 * c.lift
  const muted = toneColor(c.p, 'muted')
  const rowGap = H + (N > 1 ? 0.5 : 0)
  // A legend above the bar: every part named once, whatever its width.
  const lw = el.segments.map((g) => 0.62 + g.label.length * 0.075)
  const legend = el.segments.map((g, k) => ({ g, k, x: base[0] - W / 2 + lw.slice(0, k).reduce((a, b) => a + b, 0) }))
  return (
    <group>
      {legend.map(({ g, k, x }) => (
        <group key={`lg${k}`}>
          <Slab x={x} y={base[1] + H + 0.32} w={0.22} h={0.22} z={z} depth={0.04} color={mix(c.p.surface, toneColor(c.p, (g.tone ?? SERIES[k % SERIES.length]) as StageTone), 0.6)} opacity={o} />
          <FlatText text={g.label} at={at3([x + 0.32, base[1] + H + 0.43, z], 1)} size={0.14} color={toneColor(c.p, 'ink')} align="left" opacity={o} />
        </group>
      ))}
      {Array.from({ length: N }, (_, d) => {
        const y = base[1] - d * rowGap
        let x = base[0] - W / 2
        return (
          <group key={d}>
            <Line points={outline(base[0] - W / 2, y, W, H, z + 0.001)} color={toneColor(c.p, 'hair')} lineWidth={1} transparent opacity={o} />
            {el.segments.map((g, k) => {
              const w = (per[k] / total) * W
              const x0 = x
              x += w
              const col = mix(c.p.surface, toneColor(c.p, (g.tone ?? SERIES[k % SERIES.length]) as StageTone), 0.6)
              return (
                <group key={k}>
                  <Slab x={x0} y={y} w={w} h={H} z={z} depth={depth} color={col} opacity={o} onTip={(e) => c.tip(e, e ? `${g.label}: ${fmt(per[k])}${unit}${N > 1 ? (sharded.has(k) ? ` (1/${N} of ${fmt(g.value)})` : ' (a full copy)') : ''}` : undefined)} />
                  {w > 0.55 && <FlatText text={`${fmt(per[k])}${unit}`} at={at3([x0 + w / 2, y + H / 2, z + depth + 0.035], 1)} size={0.13} color={toneColor(c.p, 'ink')} opacity={o} />}
                </group>
              )
            })}
            {N > 1 && <FlatText text={`GPU ${d}`} at={at3([base[0] - W / 2 - 0.12, y + H / 2, z], 1)} size={0.14} color={muted} align="right" opacity={o} />}
            {over && <Line points={[at3([base[0] - W / 2 + (cap / total) * W, y - 0.12, z + 0.25 * c.lift + 0.01], 1), at3([base[0] - W / 2 + (cap / total) * W, y + H + 0.12, z + 0.25 * c.lift + 0.01], 1)]} color={toneColor(c.p, 'error')} lineWidth={2.4} transparent opacity={o} />}
            <FlatText text={over ? `${fmt(used)}${unit} needed, ${fmt(cap)}${unit} on the GPU` : `${fmt(used)} of ${fmt(cap)}${unit}`} at={at3([base[0] + W / 2, y - 0.2, z], 1)} size={0.13} color={over ? toneColor(c.p, 'error') : muted} align="right" opacity={o} />
          </group>
        )
      })}
    </group>
  )
}

export function TimelineEl({ el, c }: { el: Extract<StageElement, { type: 'timeline' }>; c: ElCtx }) {
  const [W, H] = el.size ?? [7, 2.4]
  const o = opOf(el, c)
  const base = el.at ?? [0, 0, 0]
  const t0 = el.span?.[0] ?? Math.min(...el.blocks.map((b) => b.start))
  const t1 = el.span?.[1] ?? Math.max(...el.blocks.map((b) => b.end))
  const L = el.lanes.length
  const lh = H / L
  const X = (t: number) => base[0] - W / 2 + ((t - t0) / (t1 - t0 || 1)) * W
  const Y = (l: number) => base[1] + H / 2 - (l + 1) * lh
  const z = base[2] * c.lift
  const muted = toneColor(c.p, 'muted')
  return (
    <group>
      {el.lanes.map((name, l) => (
        <group key={l}>
          <Line points={[at3([X(t0), Y(l), z], 1), at3([X(t1), Y(l), z], 1)]} color={toneColor(c.p, 'hair')} lineWidth={0.8} transparent opacity={o} />
          <FlatText text={name} at={at3([X(t0) - 0.12, Y(l) + lh / 2, z], 1)} size={0.14} color={muted} align="right" opacity={o} />
        </group>
      ))}
      {el.blocks.map((b, k) => {
        const later = el.now != null && b.start >= el.now
        const col = mix(c.p.surface, toneColor(c.p, b.tone ?? el.tone, 'info'), later ? 0.15 : 0.6)
        const x = X(b.start)
        const w = X(b.end) - x
        return (
          <group key={k}>
            <Slab x={x} y={Y(b.lane) + lh * 0.12} w={w} h={lh * 0.76} z={z} depth={0.14 * c.lift} color={col} opacity={o} onTip={(e) => c.tip(e, e ? `${el.lanes[b.lane]}: ${b.label ?? 'block'} (${fmt(b.start)} → ${fmt(b.end)})` : undefined)} />
            {b.label && w > 0.28 && <FlatText text={b.label} at={at3([x + w / 2, Y(b.lane) + lh / 2, z + 0.14 * c.lift + 0.035], 1)} size={Math.min(0.15, lh * 0.32)} color={toneColor(c.p, later ? 'muted' : 'ink')} opacity={o} />}
          </group>
        )
      })}
      {el.now != null && <Line points={[at3([X(el.now), Y(L - 1) - 0.1, z + 0.02], 1), at3([X(el.now), Y(-1) + 0.1, z + 0.02], 1)]} color={toneColor(c.p, 'accent')} lineWidth={2} transparent opacity={o} />}
      <FlatText text={fmt(t0)} at={at3([X(t0), Y(L - 1) - 0.22, z], 1)} size={0.13} color={muted} opacity={o} />
      <FlatText text={fmt(t1)} at={at3([X(t1), Y(L - 1) - 0.22, z], 1)} size={0.13} color={muted} opacity={o} />
    </group>
  )
}
