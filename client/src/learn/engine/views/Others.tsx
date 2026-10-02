import { AnimatePresence, motion } from 'motion/react'
import type { GridState, MeterState, OutputState, QueueState, StackState, VarsState } from '../types'
import { cn } from '@/lib/utils'
import { fmt, roleClass } from './format'
import { useStage } from './stage'

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

/**
 * A table of cells — a matrix, a DP table, or the (i, j) pairs a loop visits.
 * Cells are laid out on a fixed pitch so dependency arrows ("dp[i][j] comes
 * from dp[i-1][j-1]") can be drawn between them.
 */
export function GridView({ s }: { s: GridState }) {
  const { width: stageW } = useStage()
  const cols = Math.max(0, ...s.rows.map((r) => r.length))
  const longest = Math.max(1, ...s.rows.flat().map((v) => (v === null ? 0 : fmt(v).length)))
  const rowLab = s.rowLabels ? Math.max(18, ...s.rowLabels.map((l) => l.length * 7 + 8)) : 0
  const colLab = s.colLabels ? 18 : 0
  const GAP = cols > 9 ? 3 : 4
  const want = Math.max(cols > 9 ? 28 : 38, longest * 8 + 12)
  const CW = Math.max(22, Math.min(want, Math.floor((stageW - 16 - rowLab) / Math.max(1, cols)) - GAP))
  const CH = CW < 30 ? 28 : 34
  const W = rowLab + cols * (CW + GAP)
  const Ht = colLab + s.rows.length * (CH + GAP)
  const cx = (c: number) => rowLab + c * (CW + GAP) + CW / 2
  const cy = (r: number) => colLab + r * (CH + GAP) + CH / 2
  const arrows = s.arrows ?? []
  return (
    <div className="viz-grid overflow-x-auto">
      {s.label && <p className="viz-label">{s.label}</p>}
      <div className="relative mx-auto" style={{ width: W, height: Ht }}>
        {s.colLabels?.map((c, i) => (
          <span key={i} className="viz-grid-head absolute text-center" style={{ left: cx(i) - CW / 2, width: CW, top: 0 }}>
            {c}
          </span>
        ))}
        {s.rowLabels?.map((l, r) => (
          <span key={r} className="viz-grid-head absolute pr-1.5 text-right" style={{ left: 0, width: rowLab, top: cy(r) - 8 }}>
            {l}
          </span>
        ))}
        {s.rows.map((row, r) =>
          row.map((v, c) => {
            const role = s.roles?.[`${r},${c}`]
            return (
              <div
                key={`${r},${c}`}
                className={cn('viz-cell viz-grid-cell absolute flex items-center justify-center rounded-md !p-0', cols > 9 && 'viz-grid-dense', roleClass(role), role === 'active' && 'viz-pulse')}
                style={{ left: cx(c) - CW / 2, top: cy(r) - CH / 2, width: CW, height: CH, minWidth: 0 }}
              >
                <motion.span key={String(v)} initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="viz-value inline-block">
                  {v === null ? '' : fmt(v)}
                </motion.span>
              </div>
            )
          }),
        )}
        {arrows.length > 0 && (
          <svg className="pointer-events-none absolute inset-0 overflow-visible" width={W} height={Ht} aria-hidden="true">
            <defs>
              <marker id={`ga-${s.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="viz-garrow-head" />
              </marker>
            </defs>
            {arrows.map((a, k) => {
              const x1 = cx(a.from[1])
              const y1 = cy(a.from[0])
              const x2 = cx(a.to[1])
              const y2 = cy(a.to[0])
              const dx = x2 - x1
              const dy = y2 - y1
              const len = Math.hypot(dx, dy) || 1
              const sx = x1 + (dx / len) * Math.min(CW, CH) * 0.32
              const sy = y1 + (dy / len) * Math.min(CW, CH) * 0.32
              const ex = x2 - (dx / len) * Math.min(CW, CH) * 0.42
              const ey = y2 - (dy / len) * Math.min(CW, CH) * 0.42
              const bend = len > CW * 1.6 ? 0.18 : 0
              const qx = (sx + ex) / 2 - dy * bend
              const qy = (sy + ey) / 2 + dx * bend
              return (
                <g key={`${k}-${a.from}-${a.to}`} className={cn('viz-garrow', a.role ? roleClass(a.role) : 'viz-role-write')}>
                  <motion.path
                    d={`M ${sx} ${sy} Q ${qx} ${qy} ${ex} ${ey}`}
                    fill="none"
                    markerEnd={`url(#ga-${s.id})`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                  {a.label && (
                    <text x={qx} y={qy - 4} textAnchor="middle" className="viz-arrow-label">
                      {a.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}
      </div>
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
