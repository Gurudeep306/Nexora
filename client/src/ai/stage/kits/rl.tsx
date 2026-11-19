/*
  Stage kit: reinforcement learning. A grid world: walls, rewards, a value per
  cell (a heat map in 2D, heights in 3D, the numbers when they fit), the
  policy as arrows, the agent gliding from cell to cell and its trail.
*/
import { Line } from '@react-three/drei'
import { FlatText, NumberPlane, Quads } from '../../three/prims'
import type { V3 } from '../../three/coords'
import { mix } from '../../three/theme3d'
import { Mat } from '../../three/studio'
import type { StageElement } from '../spec'
import { at3, fmt, opOf, toneColor, type ElCtx } from './shared'
import { Pixels } from './vision'

const ARROW = ['', '↑', '→', '↓', '←']

export function GridworldEl({ el, c }: { el: Extract<StageElement, { type: 'gridworld' }>; c: ElCtx }) {
  const R = el.rows
  const C = el.cols
  const cell = el.cell ?? 0.7
  const o = opOf(el, c)
  const base = el.at ?? [0, 0, 0]
  // Cell (row, col) centre in maths coordinates; row 0 is the top.
  const cx = (j: number) => base[0] + (j - (C - 1) / 2) * cell
  const cy = (i: number) => base[1] - (i - (R - 1) / 2) * cell
  const walls = new Set((el.walls ?? []).map(([i, j]) => `${i},${j}`))
  const vmax = Math.max(1e-9, ...(el.values?.flat() ?? [0]).map(Math.abs))
  const colors: string[] = []
  const heights: number[] = []
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++) {
      const v = el.values?.[i]?.[j] ?? 0
      const wall = walls.has(`${i},${j}`)
      colors.push(wall ? mix(c.p.surface, c.p.ink, 0.55) : el.values ? mix(c.p.surface, v >= 0 ? c.p.success : c.p.error, Math.min(0.75, (Math.abs(v) / vmax) * 0.75)) : mix(c.p.surface, c.p.ink, 0.05))
      heights.push(wall ? 0.45 * Math.max(0.05, c.lift) : 0.02 + (Math.abs(v) / vmax) * 1.1 * c.lift)
    }
  const origin = at3([base[0], base[1], base[2]], c.lift)
  const grid: V3[][] = []
  for (let i = 0; i <= R; i++) grid.push([at3([cx(0) - cell / 2, cy(i) + cell / 2, base[2] + 0.002], c.lift), at3([cx(C - 1) + cell / 2, cy(i) + cell / 2, base[2] + 0.002], c.lift)])
  for (let j = 0; j <= C; j++) grid.push([at3([cx(j) - cell / 2, cy(0) + cell / 2, base[2] + 0.002], c.lift), at3([cx(j) - cell / 2, cy(R - 1) - cell / 2, base[2] + 0.002], c.lift)])
  const top = (i: number, j: number) => heights[i * C + j] + 0.012
  // A point on top of cell content: floor position, raised by h in the scene.
  const up = (x: number, y: number, h: number): V3 => {
    const q = at3([x, y, base[2]], c.lift)
    return [q[0], q[1] + h, q[2]]
  }
  const ag = el.agent
  const tip = (e: Parameters<typeof c.tip>[0], i: number, j: number) =>
    c.tip(e, e && i >= 0 ? `cell (${i}, ${j})${walls.has(`${i},${j}`) ? ' — wall' : ''}${el.values ? `\nvalue ${fmt(el.values[i][j])}` : ''}${el.policy?.[i]?.[j] ? `\naction ${ARROW[el.policy[i][j]]}` : ''}` : undefined)
  return (
    <group>
      <Pixels colors={colors} heights={heights} R={R} C={C} cell={cell} origin={origin} opacity={o} onTip={tip} />
      {grid.map((q, k) => (
        <Line key={k} points={q} color={toneColor(c.p, 'hair')} lineWidth={0.8} transparent opacity={o} />
      ))}
      {el.values && c.lift < 0.6 && !el.policy && <NumberPlane values={el.values} at={[origin[0], origin[1] + 0.05, origin[2]]} cell={cell} ink={c.p.ink} paper={c.p.surface} opacity={o * (1 - c.lift / 0.6)} format={fmt} small />}
      {el.policy?.flatMap((row, i) =>
        row.map((a, j) =>
          a && !walls.has(`${i},${j}`) ? <FlatText key={`p${i}-${j}`} text={ARROW[a]} at={up(cx(j), cy(i), top(i, j))} size={cell * 0.42} color={toneColor(c.p, 'ink')} opacity={o} weight={700} /> : null,
        ),
      )}
      {el.rewards?.map(([i, j, r], k) => (
        <group key={`r${k}`}>
          <Quads
            quads={[[up(cx(j) - cell * 0.42, cy(i) - cell * 0.42, top(i, j)), up(cx(j) + cell * 0.42, cy(i) - cell * 0.42, top(i, j)), up(cx(j) + cell * 0.42, cy(i) + cell * 0.42, top(i, j)), up(cx(j) - cell * 0.42, cy(i) + cell * 0.42, top(i, j))]]}
            colors={[mix(c.p.surface, r >= 0 ? c.p.success : c.p.error, 0.45)]}
            opacity={o}
          />
          <FlatText text={`${r > 0 ? '+' : ''}${fmt(r)}`} at={up(cx(j), cy(i), top(i, j) + 0.005)} size={cell * 0.3} color={toneColor(c.p, 'ink')} opacity={o} weight={700} />
        </group>
      ))}
      {el.trail && el.trail.length > 1 && <Line points={el.trail.map(([i, j]) => up(cx(j), cy(i), top(i, j) + 0.02))} color={toneColor(c.p, 'accent')} lineWidth={2.2} transparent opacity={0.8 * o} />}
      {ag && (
        <mesh position={up(cx(ag[1]), cy(ag[0]), cell * 0.24 + 0.03 + (el.values ? (Math.abs(el.values[Math.round(ag[0])]?.[Math.round(ag[1])] ?? 0) / vmax) * 1.1 * c.lift : 0))}>
          <sphereGeometry args={[cell * 0.24, 28, 28]} />
          <Mat color={toneColor(c.p, 'accent')} />
        </mesh>
      )}
    </group>
  )
}
