import { AnimatePresence, motion } from 'motion/react'
import type { GridState, OutputState, QueueState, StackState, VarsState } from '../types'
import { cn } from '@/lib/utils'
import { fmt, roleClass } from './ArrayView'

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const

export function StackView({ s }: { s: StackState }) {
  return (
    <div className="viz-stack">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="viz-stack-well mx-auto flex min-h-[64px] w-[120px] flex-col-reverse items-stretch gap-1.5 rounded-b-2xl p-2">
        <AnimatePresence initial={false}>
          {s.items.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={spring}
              className={cn('viz-cell flex h-10 items-center justify-center rounded-lg', roleClass(s.roles?.[i]))}
            >
              <span className="viz-value">{fmt(c.v)}</span>
              {i === s.items.length - 1 && <span className="viz-top-tag">top</span>}
            </motion.div>
          ))}
        </AnimatePresence>
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

export function GridView({ s }: { s: GridState }) {
  return (
    <div className="viz-grid overflow-x-auto">
      {s.label && <p className="viz-label">{s.label}</p>}
      <table className="mx-auto border-separate border-spacing-1">
        {s.colLabels && (
          <thead>
            <tr>
              {s.rowLabels && <th />}
              {s.colLabels.map((c, i) => (
                <th key={i} className="viz-index px-1 font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {s.rows.map((row, r) => (
            <tr key={r}>
              {s.rowLabels && <th className="viz-index pr-1 font-normal">{s.rowLabels[r]}</th>}
              {row.map((v, c) => (
                <td key={c} className={cn('viz-cell viz-grid-cell rounded-md text-center', roleClass(s.roles?.[`${r},${c}`]))}>
                  <span className="viz-value">{v === null ? '' : fmt(v)}</span>
                </td>
              ))}
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className={cn('viz-var rounded-lg px-2.5 py-1.5', s.changed?.includes(k) && 'viz-var-changed')}>
            <span className="viz-var-name">{k}</span>
            <motion.span key={String(v)} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="viz-var-value block">
              {v === null ? '—' : fmt(v)}
            </motion.span>
          </div>
        ))}
      </div>
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
