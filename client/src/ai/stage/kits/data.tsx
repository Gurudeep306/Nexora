/*
  Stage kit: data. Tiles (a matrix or an image as raised cells), bars (a
  3D histogram, e.g. attention weights) and tensors (blocks of cells, shape
  depth × rows × columns, like the blocks in Bycroft's LLM visualisation).
  In 2D, bars become tiles and a tensor becomes its front matrix.
*/
import { useLayoutEffect, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { CellGrid, Label } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import { Mat } from '../../three/studio'
import type { StageElement, StageTone } from '../spec'
import { at3, fmt, toneColor, type ElCtx } from './shared'

/** Tiles and bars: one grid of values; bars stand tall in 3D. */
export function GridEl({ el, c }: { el: Extract<StageElement, { type: 'tiles' | 'bars' }>; c: ElCtx }) {
  const o = (el.opacity ?? 1) * c.dim(el.id)
  const tone = (t: StageTone) => toneColor(c.p, el.tone, t)

      const isBars = el.type === 'bars'
      const base = el.at ?? [0, 0, 0]
      const cell = el.cell ?? 0.36
      const h = (el.height ?? (isBars ? 1.6 : 0.3)) * Math.max(0.04, c.lift)
      const R = el.values.length
      const Cn = el.values[0].length
      const max = Math.max(1e-9, ...el.values.flat().map(Math.abs))
      const hl = new Set((el.type === 'tiles' ? el.highlight : undefined)?.map(([i, j]) => `${i},${j}`))
      const showNums = (el.numbers ?? R * Cn <= 64) && R * Cn <= 144
      const origin = at3(base, c.lift)
      return (
        <group>
          <CellGrid
            grid={el.values}
            at={origin}
            cell={cell}
            height={h}
            low={mix(c.p.surface, c.p.ink, 0.07)}
            high={tone(isBars ? 'warning' : 'ink2')}
            highlight={(i, j) => hl.has(`${i},${j}`)}
            hiColor={c.p.accent}
            opacity={o}
            onTip={(e, i, j) => c.tip(e, e ? (el.type === 'tiles' ? el.tips?.[i]?.[j] : undefined) ?? `${el.tip ? `${el.tip} ` : ''}[${i}, ${j}] = ${fmt(el.values[i][j])}` : undefined)}
          />
          {showNums &&
            el.values.flatMap((row, i) =>
              row.map((v, j) => (
                <Label key={`${i}-${j}`} at={[origin[0] + (j - (Cn - 1) / 2) * cell, origin[1] + 0.02 + (Math.abs(v) / max) * h + 0.03, origin[2] + (i - (R - 1) / 2) * cell]} muted opacity={o}>
                  {fmt(v)}
                </Label>
              )),
            )}
        </group>
      )
    
}

/** A tensor as a block of cells (like the blocks in Bycroft's LLM visualisation): shape [depth, rows, columns]. */
export function TensorEl({ el, c }: { el: Extract<StageElement, { type: 'tensor' }>; c: ElCtx }) {
  const ref = useRef<InstancedMesh>(null)
  const [D, R, Cn] = el.shape
  const n = D * R * Cn
  const cell = el.cell ?? 0.28
  const [bx, by, bz] = el.at ?? [0, 0, 0]
  const max = el.values ? Math.max(1e-9, ...el.values.map(Math.abs)) : 1
  useLayoutEffect(() => {
    const base = [bx, by, bz]
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const col = new Color()
    const lo = new Color(mix(c.p.surface, c.p.ink, 0.12))
    const hi = new Color(toneColor(c.p, el.tone, 'ink2'))
    let k = 0
    for (let d = 0; d < D; d++)
      for (let r = 0; r < R; r++)
        for (let q = 0; q < Cn; q++) {
          // Columns along x, rows along y, depth up (z), flattened in 2D onto the front matrix.
          const pos = at3([base[0] + (q - (Cn - 1) / 2) * cell, base[1] + (r - (R - 1) / 2) * cell, base[2] + (d + 0.5) * cell], c.lift)
          o.position.set(pos[0], pos[1], pos[2])
          o.scale.set(cell * 0.86, cell * 0.86 * Math.max(0.08, c.lift), cell * 0.86)
          o.updateMatrix()
          m.setMatrixAt(k, o.matrix)
          const v = el.values ? Math.abs(el.values[k]) / max : 0.45
          m.setColorAt(k, col.copy(lo).lerp(hi, v))
          k++
        }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [D, R, Cn, cell, bx, by, bz, el.values, el.tone, c.p, c.lift, max])
  const base: V3 = [bx, by, bz]
  const o = (el.opacity ?? 1) * c.dim(el.id)
  const names = el.names ?? ['', '', '']
  return (
    <group>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, n]}
        key={n}
        onPointerMove={(e) => {
          if (e.instanceId == null) return
          const d = Math.floor(e.instanceId / (R * Cn))
          const r = Math.floor((e.instanceId % (R * Cn)) / Cn)
          const q = e.instanceId % Cn
          c.tip(e, `${el.tip ? `${el.tip}\n` : ''}[${d}, ${r}, ${q}]${el.values ? ` = ${fmt(el.values[e.instanceId])}` : ''}`)
        }}
        onPointerOut={() => c.tip(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <Mat roughness={0.65} transparent={o < 1} opacity={o} />
      </instancedMesh>
      {names[2] && <Label at={at3([base[0], base[1] - (R / 2 + 0.7) * cell, base[2]], c.lift)} muted opacity={o}>{`${names[2]} = ${Cn}`}</Label>}
      {names[1] && <Label at={at3([base[0] - (Cn / 2 + 1.1) * cell, base[1], base[2]], c.lift)} muted opacity={o}>{`${names[1]} = ${R}`}</Label>}
      {names[0] && c.lift > 0.3 && <Label at={at3([base[0] + (Cn / 2 + 1) * cell, base[1] - (R / 2) * cell, base[2] + (D / 2) * cell], c.lift)} muted opacity={o * c.lift}>{`${names[0]} = ${D}`}</Label>}
    </group>
  )
}
