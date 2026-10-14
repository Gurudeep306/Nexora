import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { GATE_ROUTES } from '../api'
import { fmtDuration } from '../useQuestionTimer'
import { sessionStats, type SessionEvent } from './session'


/*
 * This sitting's practice: every Check / Reveal since the page opened (kept
 * for the tab's lifetime), shown as a small bar and a summary sheet.
 */

export function SessionSummary({ events, onReset, className }: { events: SessionEvent[]; onReset: () => void; className?: string }) {
  const [open, setOpen] = useState(false)
  const s = sessionStats(events)
  if (!s.list.length) return null

  return (
    <>
      <div className={cn('pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 flex justify-center px-4', className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto inline-flex h-10 items-center gap-3 rounded-full border border-border bg-bg-surface/95 px-4 text-[12.5px] text-text-secondary shadow-lg backdrop-blur hover:border-border-hover hover:text-text-primary"
          aria-label="Open session summary"
        >
          <Icon name="activity" className="size-4 text-accent-brand" />
          <span className="tabular-nums">
            <strong className="font-semibold text-text-primary">{s.answered}</strong> answered
          </span>
          {s.accuracy != null && <span className="tabular-nums">{Math.round(s.accuracy * 100)}%</span>}
          <span className="hidden font-mono tabular-nums sm:inline">{fmtDuration(s.timeMs)}</span>
          <span className="font-medium text-accent-brand">Summary</span>
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="This session" description="Every question you checked or revealed since you sat down." size="md">
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Answered', String(s.answered)],
              ['Accuracy', s.accuracy == null ? '—' : `${Math.round(s.accuracy * 100)}%`],
              ['Time', fmtDuration(s.timeMs)],
              ['Per question', fmtDuration(s.avgMs)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-bg-surface-2/60 px-3 py-2">
                <dt className="text-[11px] text-text-muted">{k}</dt>
                <dd className="font-mono text-[17px] font-semibold text-text-primary tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <ol className="max-h-64 space-y-1 overflow-y-auto">
            {s.list.map((e, i) => (
              <li key={e.questionId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-bg-surface-2">
                <span className="w-5 font-mono text-[11.5px] text-text-muted">{i + 1}</span>
                <span
                  className={cn(
                    'inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-semibold',
                    e.outcome === 'correct' ? 'bg-state-success/12 text-state-success' : e.outcome === 'wrong' ? 'bg-state-error/12 text-state-error' : 'bg-bg-surface-3 text-text-muted',
                  )}
                >
                  {e.outcome === 'correct' ? 'Correct' : e.outcome === 'wrong' ? 'Wrong' : 'Seen'}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-text-secondary">{e.label ?? e.questionId}</span>
                <span className="font-mono text-[11.5px] text-text-muted tabular-nums">{fmtDuration(e.timeMs)}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onReset()
                setOpen(false)
              }}
              className="btn-secondary !px-3.5 !py-2 !text-[13px]"
            >
              Start a new session
            </button>
            {s.wrongIds.length > 0 && (
              <Link to={`${GATE_ROUTES.practice}?ids=${s.wrongIds.slice(0, 100).join(',')}`} onClick={() => setOpen(false)} className="btn-primary !px-3.5 !py-2 !text-[13px]">
                Retry {s.wrongIds.length} missed
              </Link>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
