import { motion } from 'motion/react'
import type { ArrayState, Role } from '../types'
import { cn } from '@/lib/utils'

const CELL = 52
const GAP = 6
const PITCH = CELL + GAP

const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const

/**
 * An array as a row of boxes: value inside, index under, optional memory
 * address over. Values keep their identity, so a swap or a shift is seen as
 * the numbers physically moving. Pointers (i, j, lo, hi…) ride under the
 * row; ranges (a window, the sorted part) are drawn as a tinted band.
 */
export function ArrayView({ s }: { s: ArrayState }) {
  const slots = Math.max(s.cells.length, s.capacity ?? 0)
  const width = slots * PITCH - GAP
  const pointers = Object.entries(s.pointers ?? {})
  // Pointers that share an index stack vertically.
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
  // Vertical layout: [address row] [range labels] [bars] cells [pointers]
  const padTop = (s.address ? 18 : 0) + ((s.ranges ?? []).some((r) => r.label) ? 22 : 0)
  const cellsTop = padTop + (s.bars ? 98 : 0)

  return (
    <div className="viz-array">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="relative mx-auto" style={{ width, paddingTop: padTop, paddingBottom: pointers.length ? 30 + maxLane * 22 : 4 }}>
        {/* bars mode: a small bar chart above the cells */}
        {s.bars && (
          <div className="relative mb-2" style={{ height: 90 }}>
            {s.cells.map((c, i) => (
              <motion.div
                key={c.id}
                initial={false}
                animate={{ left: i * PITCH + 8, height: 6 + (Math.abs(typeof c.v === 'number' ? c.v : 0) / maxAbs) * 82 }}
                transition={spring}
                className={cn('viz-bar absolute bottom-0 rounded-t-md', roleClass(s.roles?.[i]))}
                style={{ width: CELL - 16 }}
              />
            ))}
          </div>
        )}

        {/* ranges */}
        {(s.ranges ?? []).map((r, k) => (
          <motion.div
            key={`${k}-${r.label ?? ''}`}
            className={cn('viz-range absolute rounded-[12px]', `viz-range-${r.role}`)}
            initial={false}
            animate={{ left: r.from * PITCH - 4, width: Math.max(0, (r.to - r.from + 1) * PITCH - GAP + 8) }}
            transition={spring}
            style={{ top: cellsTop - 4, height: CELL + 8 }}
          >
            {r.label && <span className="viz-range-label">{r.label}</span>}
          </motion.div>
        ))}

        <div className="relative" style={{ height: CELL + 18 }}>
          {/* empty capacity slots */}
          {Array.from({ length: slots }, (_, i) => (
            <div key={`slot${i}`} className="viz-slot absolute rounded-[10px]" style={{ left: i * PITCH, width: CELL, height: CELL }}>
              {s.address && (
                <span className="viz-addr">0x{(s.address.base + i * s.address.size).toString(16)}</span>
              )}
              <span className="viz-index">{i}</span>
            </div>
          ))}
          {s.cells.map((c, i) =>
            c.v === null || c.v === undefined ? null : (
              <motion.div
                key={c.id}
                initial={{ scale: 0.6, opacity: 0, left: i * PITCH }}
                animate={{ scale: 1, opacity: 1, left: i * PITCH }}
                transition={spring}
                className={cn('viz-cell absolute flex items-center justify-center rounded-[10px]', roleClass(s.roles?.[i]))}
                style={{ width: CELL, height: CELL, top: 0 }}
              >
                <span className="viz-value">{fmt(c.v)}</span>
              </motion.div>
            ),
          )}
        </div>

        {/* pointers */}
        {pointers.map(([name, idx]) => (
          <motion.div
            key={name}
            className="viz-pointer absolute flex flex-col items-center"
            initial={false}
            animate={{ left: idx * PITCH + CELL / 2, top: cellsTop + CELL + 22 + ptrLane[name] * 22 }}
            transition={spring}
          >
            <span className="viz-pointer-arrow" />
            <span className="viz-pointer-name">{name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function roleClass(r?: Role) {
  return r ? `viz-role-${r}` : ''
}

export function fmt(v: unknown) {
  if (v === true) return 'T'
  if (v === false) return 'F'
  if (typeof v === 'number' && !Number.isInteger(v)) return v.toFixed(2)
  return String(v)
}
