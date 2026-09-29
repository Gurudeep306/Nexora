import { AnimatePresence, motion } from 'motion/react'
import type { GridState, MeterState, OutputState, QueueState, StackState, VarsState } from '../types'
import { cn } from '@/lib/utils'
import { fmt, roleClass } from './format'

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const

/**
 * A stack grows upward from its base. Used for the call stack too, where each
 * item is one call ("sum(3)") and the top is the call running now.
 */
export function StackView({ s }: { s: StackState }) {
  return (
    <div className="viz-stack">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="viz-stack-well mx-auto flex min-h-[64px] w-fit min-w-[132px] flex-col-reverse items-stretch gap-1.5 rounded-b-2xl p-2">
        <AnimatePresence initial={false}>
          {s.items.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ y: -40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: 0.9 }}
              transition={spring}
              className={cn('viz-cell relative flex h-10 items-center justify-center rounded-lg px-3', roleClass(s.roles?.[i]))}
            >
              <motion.span key={String(c.v)} initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }} className="viz-value whitespace-nowrap">
                {fmt(c.v)}
              </motion.span>
              {i === s.items.length - 1 && <span className="viz-top-tag">top</span>}
            </motion.div>
          ))}
        </AnimatePresence>
        {s.items.length === 0 && <span className="py-2 text-center text-[11px] text-text-muted">empty</span>}
      </div>
    </div>
  )
}

export function QueueView({ s }: { s: QueueState }) {
  return (
    <div className="viz-queue">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="viz-queue-well mx-auto flex min-h-[64px] w-fit min-w-[160px] items-center gap-1.5 rounded-2xl p-2">
        <span className="viz-queue-end">front</span>
        <AnimatePresence initial={false} mode="popLayout">
          {s.items.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={spring}
              className={cn('viz-cell flex size-11 items-center justify-center rounded-lg', roleClass(s.roles?.[i]))}
            >
              <span className="viz-value">{fmt(c.v)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <span className="viz-queue-end">rear</span>
      </div>
    </div>
  )
}

/** A table of cells — a matrix, a DP table, or the (i, j) pairs a loop visits. */
export function GridView({ s }: { s: GridState }) {
  const cols = Math.max(0, ...s.rows.map((r) => r.length))
  const dense = cols > 9
  return (
    <div className="viz-grid overflow-x-auto">
      {s.label && <p className="viz-label">{s.label}</p>}
      <table className={cn('mx-auto border-separate', dense ? 'border-spacing-[3px]' : 'border-spacing-1')}>
        {s.colLabels && (
          <thead>
            <tr>
              {s.rowLabels && <th />}
              {s.colLabels.map((c, i) => (
                <th key={i} className="viz-grid-head px-1">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {s.rows.map((row, r) => (
            <tr key={r}>
              {s.rowLabels && <th className="viz-grid-head pr-1.5 text-right">{s.rowLabels[r]}</th>}
              {row.map((v, c) => {
                const role = s.roles?.[`${r},${c}`]
                return (
                  <td key={c} className={cn('viz-cell viz-grid-cell rounded-md text-center', dense && 'viz-grid-dense', roleClass(role), role === 'active' && 'viz-pulse')}>
                    <motion.span key={String(v)} initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="viz-value inline-block">
                      {v === null ? '' : fmt(v)}
                    </motion.span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function VarsView({ s }: { s: VarsState }) {
  const entries = Object.entries(s.vars)
  if (!entries.length) return null
  return (
    <div className="viz-vars">
      <p className="viz-label">Variables</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5">
        {entries.map(([k, v]) => {
          const changed = s.changed?.includes(k)
          const was = s.prev && k in s.prev ? s.prev[k] : undefined
          return (
            <div key={k} className={cn('viz-var relative overflow-hidden rounded-lg px-2.5 py-1.5', changed && 'viz-var-changed')}>
              <span className="viz-var-name">{k}</span>
              <motion.span key={String(v)} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="viz-var-value block truncate">
                {v === null ? '—' : fmt(v)}
              </motion.span>
              {changed && was !== undefined && (
                <span className="viz-var-was" title="Value before this step">
                  was {was === null ? '—' : fmt(was)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** A running count drawn as a bar against reference marks (n, n log n, n²…). */
export function MeterView({ s }: { s: MeterState }) {
  const marks = s.marks ?? []
  const max = Math.max(1, s.value, ...marks.map((m) => m.value))
  const pct = (x: number) => `${(x / max) * 100}%`
  return (
    <div className="viz-meter mx-auto w-full max-w-[560px]">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="viz-label !mb-0 !text-left">{s.label ?? 'Count'}</p>
        <motion.span key={s.value} initial={{ scale: 1.25, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="viz-meter-value">
          {s.value.toLocaleString()}
        </motion.span>
      </div>
      <div className="viz-meter-track relative h-4 rounded-full">
        <motion.div className={cn('viz-meter-fill absolute inset-y-0 left-0 rounded-full', roleClass(s.role))} initial={false} animate={{ width: pct(s.value) }} transition={spring} />
        {marks.map((m) => (
          <span key={m.label} className="viz-meter-mark absolute top-[-3px] bottom-[-3px] w-px" style={{ left: pct(m.value) }} />
        ))}
      </div>
      {marks.length > 0 && (
        <div className="relative mt-1 h-8">
          {marks.map((m, k) => (
            <span
              key={m.label}
              className={cn(
                'viz-meter-mark-label absolute whitespace-nowrap',
                m.value / max > 0.8 ? '-translate-x-full' : m.value / max < 0.12 ? '' : '-translate-x-1/2',
                s.value >= m.value && 'viz-meter-mark-passed',
              )}
              style={{ left: pct(m.value), top: k % 2 ? 14 : 0 }}
            >
              {m.label} = {m.value.toLocaleString()}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function OutputView({ s }: { s: OutputState }) {
  return (
    <div className="viz-output">
      <p className="viz-label">{s.label ?? 'Output'}</p>
      <pre className="viz-console rounded-lg px-3 py-2">
        {s.lines.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
            {l}
          </motion.div>
        ))}
      </pre>
    </div>
  )
}
