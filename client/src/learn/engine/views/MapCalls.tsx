import { AnimatePresence, motion } from 'motion/react'
import type { CallsState, MapState } from '../types'
import { cn } from '@/lib/utils'
import { fmt, roleClass } from './format'

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const

/**
 * A map / dictionary as a two-column ledger: keys on the left, values on the
 * right. An entry keeps its row while its value changes, so an update
 * flashes in place; a new key slides in; a deleted one fades out.
 */
export function MapView({ s }: { s: MapState }) {
  const more = s.total != null && s.total > s.entries.length ? s.total - s.entries.length : 0
  return (
    <div className="viz-map mx-auto w-full max-w-[420px]">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="viz-map-table overflow-hidden rounded-xl" role="table" aria-label={s.label ?? 'Map'}>
        <div className="viz-map-head grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" role="row">
          <span role="columnheader">key</span>
          <span role="columnheader">value</span>
        </div>
        <AnimatePresence initial={false}>
          {s.entries.map((e) => (
            <motion.div
              key={e.id}
              layout
              role="row"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={spring}
              className={cn('viz-map-row grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]', roleClass(s.roles?.[e.id]))}
            >
              <span role="cell" className="viz-map-key truncate">
                {fmt(e.k)}
              </span>
              <span role="cell" className="viz-map-val truncate">
                <motion.span key={String(e.v)} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
                  {e.v === null ? '—' : fmt(e.v)}
                </motion.span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {s.entries.length === 0 && <div className="viz-map-empty">empty</div>}
        {more > 0 && <div className="viz-map-empty">and {more} more</div>}
      </div>
    </div>
  )
}

/**
 * The call stack: one card per active call, the newest on top. A call that
 * is returning shows its value; a new call drops in from above.
 */
export function CallsView({ s }: { s: CallsState }) {
  const frames = [...s.frames].reverse()
  return (
    <div className="viz-calls">
      <p className="viz-label">{s.label ?? 'Call stack'}</p>
      <ol className="viz-calls-list m-0 flex list-none flex-col gap-1.5 p-0">
        <AnimatePresence initial={false}>
          {frames.map((f, i) => (
            <motion.li
              key={f.id}
              layout
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={spring}
              className={cn('viz-call rounded-lg px-2.5 py-1.5', i === 0 && 'viz-call-top')}
            >
              <span className="viz-call-name">
                {f.name}
                <span className="viz-call-args">({f.args ?? ''})</span>
              </span>
              {f.ret !== undefined ? (
                <span className="viz-call-ret">returns {f.ret}</span>
              ) : (
                f.line != null && <span className="viz-call-line">line {f.line}</span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  )
}
