/*
  Stage kit: neural networks.

  `network` shows what a network computes, not only how it is wired:
    - each neuron is an upright jar; its fill is the activation (ink for
      positive, info for negative), its value written above; in 2D the jars
      are discs shaded by value;
    - each weight is a ribbon: thickness = |w|, colour = sign;
    - forward (the `forward` number glides 0 → L−1): along every ribbon into
      the next layer a bead travels, sized by that connection's real
      contribution w·a; the jar then fills, and a small curve beside it shows
      the activation function squashing z into a;
    - the weight matrix of each layer floats beside it as tiles, lit while
      it is being used;
    - backward (`backward` glides 0 → L): gradient beads travel back, and
      each neuron shows ∂L/∂z.
  Matte surfaces and solid colours only: no glow, no bloom (house style).
*/
import { useMemo } from 'react'
import { CylinderGeometry, DoubleSide } from 'three'
import { Line } from '@react-three/drei'
import { CellGrid, Label } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import type { StageElement } from '../spec'
import { at3, clamp01, fmt, type ElCtx } from './shared'
import { Mat } from '../../three/studio'

type Net = Extract<StageElement, { type: 'network' }>
type Act = NonNullable<Net['acts']>[number]

const ACT: Record<Act, (z: number) => number> = {
  linear: (z) => z,
  tanh: Math.tanh,
  sigmoid: (z) => 1 / (1 + Math.exp(-z)),
  relu: (z) => Math.max(0, z),
}
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
const JAR_R = 0.3
const JAR_H = 1

function circle(cx: number, cy: number, z: number, r: number, lift: number): V3[] {
  return Array.from({ length: 41 }, (_, k) => {
    const a = (k / 40) * Math.PI * 2
    return at3([cx + r * Math.cos(a), cy + r * Math.sin(a), z], lift)
  })
}

export function NetworkEl({ el, c }: { el: Net; c: ElCtx }) {
  const L = el.layers.length
  const gap = el.gap ?? 2.6
  const spread = el.spread ?? 1.2
  const [bx, by, bz] = el.at ?? [0, 0, 0]
  const fwd = el.forward ?? (el.lit != null ? el.lit : L - 1)
  const back = el.backward ?? 0
  const o = (el.opacity ?? 1) * c.dim(el.id)
  const { p, lift } = c
  const jar = useMemo(() => new CylinderGeometry(JAR_R, JAR_R, 1, 36, 1, true), [])
  const fillGeo = useMemo(() => new CylinderGeometry(JAR_R * 0.84, JAR_R * 0.84, 1, 36), [])

  const xy = (l: number, i: number): [number, number] => [bx + (l - (L - 1) / 2) * gap, by + (i - (el.layers[l] - 1) / 2) * spread]
  const val = (l: number, i: number) => el.values?.[l]?.[i] ?? 0
  const w = (l: number, i: number, j: number) => el.weights?.[l - 1]?.[i]?.[j] ?? 0.5
  /** How full a layer's jars are: inputs always; a layer fills after its beads arrive. */
  const filled = (l: number) => (l === 0 ? 1 : clamp01((fwd - (l - 1) - 0.55) / 0.3))
  const gradKnown = (l: number) => back >= L - l
  const fillColor = (v: number) => mix(p.surface, v >= 0 ? p.ink2 : p.info, 0.35 + 0.65 * Math.min(1, Math.abs(v)))

  // Largest |w·a| per layer, so bead sizes compare within a layer.
  const maxContrib = el.layers.map((n, l) => {
    if (l === 0) return 1
    let m = 1e-9
    for (let i = 0; i < n; i++) for (let j = 0; j < el.layers[l - 1]; j++) m = Math.max(m, Math.abs(w(l, i, j) * val(l - 1, j)))
    return m
  })

  const parts: React.ReactNode[] = []

  // Ribbons (weights).
  for (let l = 1; l < L; l++) {
    const active = fwd > l - 1 && fwd < l
    const done = fwd >= l
    const backActive = back > L - l - 1 && back < L - l && l < L
    for (let i = 0; i < el.layers[l]; i++)
      for (let j = 0; j < el.layers[l - 1]; j++) {
        const ww = w(l, i, j)
        const [x0, y0] = xy(l - 1, j)
        const [x1, y1] = xy(l, i)
        const k = `r${l}-${i}-${j}`
        parts.push(
          <Line
            key={k}
            points={[at3([x0 + JAR_R, y0, bz + 0.06], lift), at3([x1 - JAR_R, y1, bz + 0.06], lift)]}
            color={ww >= 0 ? p.ink2 : p.info}
            lineWidth={0.6 + Math.min(4, Math.abs(ww) * 1.3)}
            transparent
            opacity={(active || backActive ? 0.9 : done ? 0.55 : 0.22) * o}
          />,
        )
        // Forward: a bead per connection, sized by its contribution w·a.
        const u = fwd - (l - 1)
        if (u > 0 && u < 0.6) {
          const t = u / 0.6
          const contrib = ww * val(l - 1, j)
          const r = 0.035 + 0.13 * (Math.abs(contrib) / maxContrib[l])
          parts.push(
            <mesh key={`f${k}`} position={at3([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, bz + 0.06 + 0.25 * Math.sin(Math.PI * t)], lift)}>
              <sphereGeometry args={[r, 14, 14]} />
              <Mat color={contrib >= 0 ? p.ink2 : p.info} roughness={0.6} transparent={o < 1} opacity={o} />
            </mesh>,
          )
        }
        // Backward: gradient beads travel back, sized by w·∂L/∂z of the neuron ahead.
        const g = el.grads?.[l]?.[i]
        const ub = back - (L - l - 1) - 1 // 0 … 1 while the gradient goes from layer l back to l − 1
        if (g != null && l > 0 && ub > 0 && ub < 1 && l - 1 >= 1) {
          const r = 0.035 + Math.min(0.12, Math.abs(ww * g) * 0.4)
          parts.push(
            <mesh key={`b${k}`} position={at3([x1 + (x0 - x1) * ub, y1 + (y0 - y1) * ub, bz + 0.06 + 0.25 * Math.sin(Math.PI * ub)], lift)}>
              <sphereGeometry args={[r, 14, 14]} />
              <Mat color={p.info} roughness={0.6} transparent={o < 1} opacity={o} />
            </mesh>,
          )
        }
      }
  }

  // Jars (neurons).
  el.layers.forEach((n, l) => {
    const f = filled(l)
    for (let i = 0; i < n; i++) {
      const v = val(l, i)
      const [x, y] = xy(l, i)
      const h = Math.max(0.01, JAR_H * Math.min(1, Math.abs(v)) * f)
      const z0 = bz
      const reached = l === 0 || fwd > l - 0.45
      const g = el.grads?.[l]?.[i]
      const showGrad = g != null && gradKnown(l)
      const tipText = `${el.names?.[l] ?? `layer ${l + 1}`}, neuron ${i + 1}${el.pre?.[l] ? `\nz = ${fmt(el.pre[l][i])}` : ''}${el.values ? `\n${l === 0 ? 'x' : 'a'} = ${fmt(v)}` : ''}${showGrad ? `\n∂L/∂z = ${fmt(g)}` : ''}`
      parts.push(
        <group key={`n${l}-${i}`}>
          {/* The jar's wall and rims. */}
          <mesh geometry={jar} position={at3([x, y, z0 + JAR_H / 2], lift)} scale={[1, Math.max(0.01, JAR_H * lift), 1]} onPointerMove={(e) => c.tip(e, tipText)} onPointerOut={() => c.tip(null)}>
            <Mat color={mix(p.surface, p.ink, 0.1)} transparent opacity={0.28 * o} side={DoubleSide} roughness={0.9} depthWrite={false} />
          </mesh>
          <Line points={circle(x, y, z0, JAR_R, lift)} color={reached ? p.ink2 : p.strong} lineWidth={1} transparent opacity={o} />
          {lift > 0.05 && <Line points={circle(x, y, z0 + JAR_H, JAR_R, lift)} color={p.strong} lineWidth={0.8} transparent opacity={o * lift} />}
          {/* The fill: the activation. */}
          {reached && f > 0 && (
            <mesh geometry={fillGeo} position={at3([x, y, z0 + h / 2], lift)} scale={[1, Math.max(0.01, h * lift), 1]}>
              <Mat color={fillColor(v)} roughness={0.75} transparent={o < 1} opacity={o} />
            </mesh>
          )}
          {/* The gradient, once it has arrived: a ring and its value. */}
          {showGrad && <Line points={circle(x, y, z0 + 0.02, JAR_R + 0.09, lift)} color={p.info} lineWidth={2} transparent opacity={o} />}
          <Label at={at3([x, y - JAR_R - 0.28, z0 + (JAR_H + 0.15) * lift], lift)} muted={!reached} opacity={Math.max(0.35, o)}>
            {reached && f > 0.5 ? `${l === 0 ? `x${SUB[i + 1] ?? i + 1}` : l === L - 1 ? 'ŷ' : 'a'} = ${fmt(v)}` : '·'}
            {showGrad ? ` · ∂L/∂z = ${fmt(g)}` : ''}
          </Label>
        </group>,
      )

      // The activation squashing z into a, while this layer fills.
      const u = fwd - (l - 1)
      const act = el.acts?.[l]
      const z = el.pre?.[l]?.[i]
      if (l > 0 && act && act !== 'linear' && z != null && u > 0.5 && u < 0.999) {
        const a = ACT[act]
        const W = 0.8
        const Hh = 0.55
        const ox = x + JAR_R + 0.25
        const oy = y - Hh / 2
        const lo = act === 'tanh' ? -1 : 0
        const pts = Array.from({ length: 33 }, (_, k) => {
          const zz = -3 + (6 * k) / 32
          return at3([ox + ((zz + 3) / 6) * W, oy + ((a(zz) - lo) / (1 - lo)) * Hh, z0 + 0.02], lift)
        })
        const zc = Math.max(-3, Math.min(3, z))
        parts.push(
          <group key={`act${l}-${i}`}>
            <Line points={[at3([ox, oy, z0 + 0.02], lift), at3([ox + W, oy, z0 + 0.02], lift)]} color={p.strong} lineWidth={0.6} transparent opacity={o} />
            <Line points={pts} color={p.ink2} lineWidth={1.3} transparent opacity={o} />
            <mesh position={at3([ox + ((zc + 3) / 6) * W, oy + ((a(zc) - lo) / (1 - lo)) * Hh, z0 + 0.04], lift)}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <Mat color={p.accent} roughness={0.5} />
            </mesh>
          </group>,
        )
      }
    }
  })

  // Weight matrices beside the network, lit while they are used.
  if (el.matrices && el.weights) {
    for (let l = 1; l < L; l++) {
      const Wm = el.weights[l - 1]
      const cell = 0.3
      const xm = bx + (l - 0.5 - (L - 1) / 2) * gap
      const top = by + Math.max(...el.layers.map((n) => ((n - 1) / 2) * spread)) + 0.9 + (Wm.length * cell) / 2
      const active = fwd > l - 1 && fwd < l
      parts.push(
        <group key={`W${l}`}>
          <CellGrid grid={Wm} at={at3([xm, top, bz], lift)} cell={cell} height={0.06 * Math.max(0.2, lift)} low={mix(p.surface, p.ink, 0.06)} high={p.ink2} highlight={() => active} hiColor={p.accent} opacity={o} onTip={(e, a, b) => c.tip(e, e ? `W${l}[${a + 1}, ${b + 1}] = ${fmt(Wm[a][b])}\nfrom ${el.names?.[l - 1] ?? `layer ${l}`} ${b + 1} to ${el.names?.[l] ?? `layer ${l + 1}`} ${a + 1}` : undefined)} />
          <Label at={at3([xm, top + (Wm.length * cell) / 2 + 0.3, bz], lift)} muted opacity={o}>
            {`W${l} (${Wm.length} × ${Wm[0].length})`}
          </Label>
          {Wm.length * Wm[0].length <= 30 &&
            Wm.flatMap((row, a) =>
              row.map((wv, b) => (
                <Label key={`w${l}-${a}-${b}`} at={at3([xm + (b - (row.length - 1) / 2) * cell, top - (a - (Wm.length - 1) / 2) * cell, bz + 0.1], lift)} className="ai3d-label-sm" opacity={o}>
                  {fmt(wv)}
                </Label>
              )),
            )}
        </group>,
      )
    }
  }

  // Layer names under each column.
  el.names?.forEach((name, l) => {
    const [x] = xy(l, 0)
    const yb = by - ((el.layers[l] - 1) / 2) * spread - 1
    parts.push(
      <Label key={`name${l}`} at={at3([x, yb, bz], lift)} muted opacity={o}>
        {name}
      </Label>,
    )
  })

  return <group>{parts}</group>
}
