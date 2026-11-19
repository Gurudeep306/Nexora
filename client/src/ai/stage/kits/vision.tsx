/*
  Stage kit: vision. An image as real pixels (grey or colour) — its colour
  channels pulled apart into layers, brightness as relief in 3D, a patch grid
  (ViT), a highlighted window (a kernel, a receptive field) — and labelled
  boxes (detection, IoU). Pixels are the image's own data, so they keep their
  real colours; everything around them uses the theme.
*/
import type { ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { Line } from '@react-three/drei'
import { FlatText, NumberPlane } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import { Mat } from '../../three/studio'
import type { StageElement } from '../spec'
import { at3, clamp01, fmt, opOf, toneColor, type ElCtx } from './shared'

type El<T extends StageElement['type']> = { el: Extract<StageElement, { type: T }>; c: ElCtx }

/** One layer of pixels as instanced cells: colour per cell, height per cell. */
export function Pixels({ colors, heights, R, C, cell, origin, opacity, onTip }: { colors: string[]; heights: number[]; R: number; C: number; cell: number; origin: V3; opacity: number; onTip: (e: ThreeEvent<PointerEvent> | null, i: number, j: number) => void }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const col = new Color()
    for (let i = 0; i < R; i++)
      for (let j = 0; j < C; j++) {
        const k = i * C + j
        const h = Math.max(0.01, heights[k])
        o.position.set(origin[0] + (j - (C - 1) / 2) * cell, origin[1] + h / 2, origin[2] + (i - (R - 1) / 2) * cell)
        o.scale.set(cell * 0.98, h, cell * 0.98)
        o.updateMatrix()
        m.setMatrixAt(k, o.matrix)
        m.setColorAt(k, col.set(colors[k]))
      }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [colors, heights, R, C, cell, origin])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, R * C]} key={`${R}x${C}`} onPointerMove={(e) => e.instanceId != null && onTip(e, Math.floor(e.instanceId / C), e.instanceId % C)} onPointerOut={() => onTip(null, -1, -1)}>
      <boxGeometry args={[1, 1, 1]} />
      <Mat roughness={0.8} clearcoat={0} transparent={opacity < 1} opacity={opacity} />
    </instancedMesh>
  )
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`

export function ImageEl({ el, c }: El<'image'>) {
  const rgb = el.rgb
  const grey = el.pixels
  const R = rgb ? rgb.length : grey!.length
  const C = rgb ? rgb[0].length : grey![0].length
  const cell = el.cell ?? 0.2
  const o = opOf(el, c)
  const base = el.at ?? [0, 0, 0]
  const lum = (i: number, j: number) => (rgb ? 0.2126 * rgb[i][j][0] + 0.7152 * rgb[i][j][1] + 0.0722 * rgb[i][j][2] : grey![i][j])
  const relief = (el.relief ?? 0) * c.lift
  const split = clamp01(el.split ?? 0)
  const tip = (e: Parameters<typeof c.tip>[0], i: number, j: number) =>
    c.tip(e, e && i >= 0 ? `pixel [${i}, ${j}] = ${rgb ? `(${rgb[i][j].map(fmt).join(', ')})` : fmt(grey![i][j])}` : undefined)
  // Grey pixels are drawn in the theme's ink on its paper; colour pixels in their own colours.
  const greyCol = (v: number) => mix(c.p.surface, c.p.ink, clamp01(v))
  const layers: { colors: string[]; heights: number[]; origin: V3; name?: string }[] = []
  const W = C * cell
  if (rgb && split > 0.001) {
    const names = ['red', 'green', 'blue']
    for (let k = 0; k < 3; k++) {
      const colors: string[] = []
      const heights: number[] = []
      for (let i = 0; i < R; i++)
        for (let j = 0; j < C; j++) {
          const v = rgb[i][j][k]
          colors.push(hex(k === 0 ? v : 0, k === 1 ? v : 0, k === 2 ? v : 0))
          heights.push(0.02 + v * relief)
        }
      const off = (k - 1) * split
      layers.push({ colors, heights, origin: at3([base[0] + off * (W + 0.4) * (1 - c.lift * 0.6), base[1], base[2] + (k * split * 1.1 + 0.001)], c.lift), name: names[k] })
    }
  } else {
    const colors: string[] = []
    const heights: number[] = []
    for (let i = 0; i < R; i++)
      for (let j = 0; j < C; j++) {
        colors.push(rgb ? hex(...rgb[i][j]) : greyCol(grey![i][j]))
        heights.push(0.02 + lum(i, j) * relief)
      }
    layers.push({ colors, heights, origin: at3(base, c.lift) })
  }
  const top = at3(base, c.lift)
  const X = (j: number) => top[0] + (j - C / 2) * cell
  const Z = (i: number) => top[2] + (i - R / 2) * cell
  const yTop = top[1] + 0.03 + relief
  const lines: V3[][] = []
  if (el.patch && el.patch > 0) {
    for (let j = 0; j <= C; j += el.patch) lines.push([[X(j), yTop, Z(0)], [X(j), yTop, Z(R)]])
    for (let i = 0; i <= R; i += el.patch) lines.push([[X(0), yTop, Z(i)], [X(C), yTop, Z(i)]])
  }
  const win = el.window
  return (
    <group>
      {layers.map((l, k) => (
        <group key={k}>
          <Pixels colors={l.colors} heights={l.heights} R={R} C={C} cell={cell} origin={l.origin} opacity={o} onTip={tip} />
          {l.name && <FlatText text={l.name} at={[l.origin[0], l.origin[1] + 0.02, l.origin[2] + (R / 2) * cell + 0.22]} size={0.14} color={toneColor(c.p, 'muted')} opacity={o * split} />}
        </group>
      ))}
      {lines.map((q, i) => (
        <Line key={i} points={q} color={toneColor(c.p, 'accent')} lineWidth={1.2} transparent opacity={o} />
      ))}
      {win && (
        <Line
          points={[[X(win[1]), yTop + 0.01, Z(win[0])], [X(win[1] + win[3]), yTop + 0.01, Z(win[0])], [X(win[1] + win[3]), yTop + 0.01, Z(win[0] + win[2])], [X(win[1]), yTop + 0.01, Z(win[0] + win[2])], [X(win[1]), yTop + 0.01, Z(win[0])]]}
          color={toneColor(c.p, el.tone, 'accent')}
          lineWidth={3}
          transparent
          opacity={o}
        />
      )}
      {el.numbers && grey && c.lift < 0.6 && <NumberPlane values={grey} at={[top[0], top[1] + 0.04, top[2]]} cell={cell} ink={c.p.ink} paper={c.p.surface} opacity={o * (1 - c.lift / 0.6)} format={fmt} small />}
    </group>
  )
}

export function BoxesEl({ el, c }: El<'boxes'>) {
  const o = opOf(el, c)
  const base = el.at ?? [0, 0, 0]
  return (
    <group>
      {el.boxes.map((b, i) => {
        const col = toneColor(c.p, b.tone ?? el.tone, 'accent')
        const z = base[2] + 0.06
        const q: V3[] = [
          [base[0] + b.x, base[1] + b.y, z],
          [base[0] + b.x + b.w, base[1] + b.y, z],
          [base[0] + b.x + b.w, base[1] + b.y + b.h, z],
          [base[0] + b.x, base[1] + b.y + b.h, z],
          [base[0] + b.x, base[1] + b.y, z],
        ]
        return (
          <group key={i}>
            <Line points={q.map((p) => at3(p, c.lift))} color={col} lineWidth={2.4} transparent opacity={o} />
            {b.label && <FlatText text={b.label} at={at3([base[0] + b.x, base[1] + b.y + b.h + 0.14, z], c.lift)} size={0.14} color={col} align="left" opacity={o} weight={600} />}
          </group>
        )
      })}
    </group>
  )
}
