import { AnimatePresence, motion } from 'motion/react'
import type { ArrayState, Arrow } from '../types'
import { cn } from '@/lib/utils'
import { fmt, roleClass } from './format'
import { ptrHue, useStage } from './stage'

const GAP = 6
const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const

/** Cells shrink (down to 30px) so the whole array fits the stage on a phone. */
function cellSize(slots: number, width: number) {
  const fit = Math.floor((width - 24 + GAP) / Math.max(1, slots)) - GAP
  return Math.max(30, Math.min(52, fit))
}

function arcHeight(a: Arrow) {
  return Math.min(46, 18 + Math.abs(a.to - a.from) * 7)
}

/**
 * An array as a row of boxes: value inside, index under, optional memory
 * address over. Values keep their identity, so a swap or a shift is seen as
 * the numbers physically moving — a value that jumps over others hops in an
 * arc instead of sliding through them. Pointers (i, j, lo, hi…) ride under
 * the row, each in its own colour; ranges (a window, the sorted part) are a
 * tinted band; arrows show where a value is copied or what is combined.
 */
export function ArrayView({ s }: { s: ArrayState }) {
  const { width: stageW, prev, tick } = useStage()
  const slots = Math.max(s.cells.length, s.capacity ?? 0, 1)
  const CELL = cellSize(slots, stageW)
  const PITCH = CELL + GAP
  const width = slots * PITCH - GAP
  const small = CELL < 44

  const pointers = Object.entries(s.pointers ?? {})
  const lanes = new Map<number, number>()
  const ptrLane: Record<string, number> = {}
  for (const [name, idx] of pointers) {
    const lane = lanes.get(idx) ?? 0
    ptrLane[name] = lane
    lanes.set(idx, lane + 1)
  }
  const maxLane = Math.max(0, ...Object.values(ptrLane))

  const nums = s.cells.map((c) => (typeof c.v === 'number' ? c.v : 0))
  const maxAbs = Math.max(1, ...nums.map((n) => Math.abs(n)))

  // Where each cell was one frame ago, to decide which moves hop.
  const before = prev.get(s.id)
  const oldIndex = new Map<string, number>()
  if (before?.kind === 'array') before.cells.forEach((c, i) => oldIndex.set(c.id, i))

  const arrows = (s.arrows ?? []).filter((a) => a.from !== a.to)
  const arcTop = arrows.length ? Math.max(...arrows.map(arcHeight)) + (arrows.some((a) => a.label) ? 16 : 4) : 0
  const labelRow = (s.ranges ?? []).some((r) => r.label) ? 22 : 0
  const padTop = (s.address ? 18 : 0) + Math.max(labelRow, arcTop)
  const barsH = s.bars ? 98 : 0
  const cellsTop = padTop + barsH

  return (
    <div className="viz-array" style={{ ['--viz-fs' as string]: small ? '12.5px' : '15px' }}>
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="relative mx-auto" style={{ width, paddingTop: padTop, paddingBottom: pointers.length ? 30 + maxLane * 22 : 4 }}>
        {s.bars && (
          <div className="relative mb-2" style={{ height: 90 }}>
            {s.cells.map((c, i) =>
              c.v === null ? null : (
                <motion.div
                  key={c.id}
                  initial={false}
                  animate={{ left: i * PITCH + CELL * 0.16, height: 6 + (Math.abs(typeof c.v === 'number' ? c.v : 0) / maxAbs) * 82 }}
                  transition={spring}
                  className={cn('viz-bar absolute bottom-0 rounded-t-md', roleClass(s.roles?.[i]))}
                  style={{ width: CELL * 0.68 }}
                />
              ),
            )}
          </div>
        )}

        {(s.ranges ?? []).map((r, k) => (
          <motion.div
            key={`${k}-${r.label ?? ''}-${r.role}`}
            className={cn('viz-range absolute rounded-[12px]', `viz-range-${r.role}`)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: r.from * PITCH - 4, width: Math.max(0, (r.to - r.from + 1) * PITCH - GAP + 8) }}
            transition={spring}
            style={{ top: cellsTop - 4, height: CELL + 8 }}
          >
            {r.label && <span className="viz-range-label">{r.label}</span>}
          </motion.div>
        ))}

        {arrows.length > 0 && (
          <svg className="viz-arrows pointer-events-none absolute left-0" width={width} height={arcTop + 2} style={{ top: cellsTop - arcTop - 2, overflow: 'visible' }} aria-hidden="true">
            {arrows.map((a, k) => {
              const x1 = a.from * PITCH + CELL / 2 + (a.to > a.from ? 4 : -4)
              const x2 = a.to * PITCH + CELL / 2 + (a.to > a.from ? -4 : 4)
              const y = arcTop + 2
              const h = arcHeight(a)
              const mx = (x1 + x2) / 2
              return (
                <g key={`${tick}-${k}`} className={cn('viz-arrow', a.role ? `viz-role-${a.role}` : 'viz-role-write')}>
                  <motion.path
                    d={`M ${x1} ${y} C ${x1} ${y - h}, ${x2} ${y - h}, ${x2} ${y}`}
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                  <motion.path d={`M ${x2 - 5} ${y - 9} L ${x2 + 5} ${y - 9} L ${x2} ${y - 1} z`} className="viz-arrow-head" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} />
                  {a.label && (
                    <motion.text x={mx} y={y - h * 0.75 - 6} textAnchor="middle" className="viz-arrow-label" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      {a.label}
                    </motion.text>
                  )}
                </g>
              )
            })}
          </svg>
        )}

        <div className="relative" style={{ height: CELL + 18 }}>
          {Array.from({ length: slots }, (_, i) => (
            <div key={`slot${i}`} className="viz-slot absolute rounded-[10px]" style={{ left: i * PITCH, width: CELL, height: CELL }}>
              {s.address && <span className="viz-addr">0x{(s.address.base + i * s.address.size).toString(16)}</span>}
              <span className="viz-index">{i}</span>
            </div>
          ))}
          <AnimatePresence initial={false}>
            {s.cells.map((c, i) => {
              if (c.v === null || c.v === undefined) return null
              const from = oldIndex.get(c.id)
              const d = from == null ? 0 : i - from
              const role = s.roles?.[i]
              const hop = d !== 0 && (Math.abs(d) >= 2 || role === 'swap')
              const h = Math.min(CELL * 0.75, 14 + Math.abs(d) * 5) + (tick % 2) * 0.01
              return (
                <motion.div
                  key={c.id}
                  initial={{ scale: 0.5, opacity: 0, left: i * PITCH, y: -18 }}
                  animate={{ scale: 1, opacity: 1, left: i * PITCH, y: hop ? [0, d > 0 ? -h : h, 0] : 0 }}
                  exit={{ scale: 0.5, opacity: 0, y: 26, transition: { duration: 0.25 } }}
                  transition={{ ...spring, y: hop ? { duration: 0.5, times: [0, 0.45, 1], ease: 'easeInOut' } : spring }}
                  className={cn('viz-cell absolute flex items-center justify-center rounded-[10px]', roleClass(role))}
                  style={{ width: CELL, height: CELL, top: 0, zIndex: hop ? 3 : undefined }}
                >
                  <motion.span key={String(c.v)} className="viz-value" initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                    {fmt(c.v)}
                  </motion.span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {pointers.map(([name, idx]) => (
          <motion.div
            key={name}
            className="viz-pointer absolute flex flex-col items-center"
            initial={false}
            animate={{ left: idx * PITCH + CELL / 2, top: cellsTop + CELL + 22 + ptrLane[name] * 22 }}
            transition={spring}
            style={{ ['--ph' as string]: ptrHue(name) }}
          >
            <span className="viz-pointer-arrow" />
            <span className="viz-pointer-name">{name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
