/* Shared list lines: a test result row and an attempt-outcome dot. */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { GATE_ROUTES, type GateTest } from '@/gate/api'
import { pct, timeAgo } from './format'

export function OutcomeDot({ outcome }: { outcome: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 rounded-full',
        outcome === 'correct' ? 'bg-state-success' : outcome === 'wrong' ? 'bg-state-error' : outcome === 'partial' ? 'bg-state-warning' : 'bg-text-muted',
      )}
    />
  )
}

export function TestLine({ t }: { t: GateTest }) {
  const r = t.result
  const p = r && r.maxScore ? Math.round((r.score / r.maxScore) * 100) : null
  return (
    <Link
      to={GATE_ROUTES.test(t.id)}
      className="group flex items-center gap-3 rounded-md py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-text-primary group-hover:underline group-hover:underline-offset-2">{t.title}</span>
        <span className="block truncate text-[12px] text-text-muted">
          {t.questionIds.length} Qs · {t.config.durationMin} min · {timeAgo(t.submittedAt ?? t.createdAt)}
        </span>
      </span>
      {r ? (
        <span className="shrink-0 text-right tabular-nums">
          <span className="block text-[13.5px] font-semibold text-text-primary">
            {r.score.toFixed(r.score % 1 ? 2 : 0)}
            <span className="font-normal text-text-muted">/{r.maxScore}</span>
          </span>
          <span className={cn('block text-[11.5px]', p != null && p >= 60 ? 'text-state-success' : p != null && p < 35 ? 'text-state-error' : 'text-text-muted')}>
            {p}%{r.percentile != null ? ` · P${Math.round(pct(r.percentile))}` : ''}
          </span>
        </span>
      ) : (
        <span className="shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-state-warning shadow-[inset_0_0_0_1px_currentColor]">Resume</span>
      )}
    </Link>
  )
}

