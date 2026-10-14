import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { gateApi, type QuestionStats } from '../api'
import { isKeyOption, tfOptions } from '../answers'
import { fmtDuration } from '../useQuestionTimer'
import type { GateQuestion } from '../types'

export const DIFFICULTY_LABEL = ['', 'Easy', 'Moderate', 'Medium', 'Hard', 'Very hard']

/** Five pips: filled up to `level`. */
export function DifficultyPips({ level, className }: { level: number | null | undefined; className?: string }) {
  const n = level ?? 0
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={level ? `Difficulty ${level} of 5: ${DIFFICULTY_LABEL[level]}` : 'Difficulty not rated yet'}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-1.5 rounded-[2px]',
            i <= n ? (n >= 4 ? 'bg-state-error' : n === 3 ? 'bg-state-warning' : 'bg-state-success') : 'bg-bg-surface-3',
          )}
        />
      ))}
    </span>
  )
}

/** Community numbers for one question (LeetCode-style acceptance + Testbook-style time). */
export function useQuestionStats(id: string) {
  return useApi<{ ok: true; stats: QuestionStats }>(() => gateApi.questionStats(id), [id], { cacheKey: `gate:qstats:${id}` })
}

export function QuestionStatsPanel({ q, revealed, myTimeMs, className }: { q: GateQuestion; revealed: boolean; myTimeMs?: number; className?: string }) {
  const res = useQuestionStats(q.id)
  const s = res.data?.stats
  const opts = tfOptions(q)
  const enough = s && s.attempts > 0

  return (
    <section className={cn('rounded-xl border border-border bg-bg-surface-2/50 p-3 sm:p-3.5', className)} aria-label="Community stats">
      <div className="mb-2.5 flex items-center gap-2">
        <Users className="size-3.5 text-text-muted" />
        <h3 className="text-[12px] font-semibold tracking-wide text-text-muted uppercase">Community</h3>
        {s && s.users > 0 && <span className="ml-auto font-mono text-[11.5px] text-text-muted">{s.users.toLocaleString()} solver{s.users === 1 ? '' : 's'}</span>}
      </div>

      {res.loading && !s ? (
        <div className="grid grid-cols-3 gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-bg-surface-3/60" />
          ))}
        </div>
      ) : !enough ? (
        <p className="text-[12.5px] text-text-muted">No community attempts yet — yours will be among the first.</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-bg-surface px-2.5 py-1.5">
              <dt className="text-[10.5px] text-text-muted">Accuracy</dt>
              <dd className="font-mono text-[15px] font-semibold text-text-primary tabular-nums">{s.accuracy == null ? '—' : `${Math.round(s.accuracy * (s.accuracy <= 1 ? 100 : 1))}%`}</dd>
            </div>
            <div className="rounded-lg bg-bg-surface px-2.5 py-1.5">
              <dt className="text-[10.5px] text-text-muted">Avg time</dt>
              <dd className="font-mono text-[15px] font-semibold text-text-primary tabular-nums">
                {fmtDuration(s.avgTimeMs)}
                {myTimeMs != null && s.avgTimeMs != null && revealed && (
                  <span className={cn('ml-1 text-[10.5px] font-normal', myTimeMs <= s.avgTimeMs ? 'text-state-success' : 'text-state-warning')}>
                    you {fmtDuration(myTimeMs)}
                  </span>
                )}
              </dd>
            </div>
            <div className="rounded-lg bg-bg-surface px-2.5 py-1.5">
              <dt className="text-[10.5px] text-text-muted">Difficulty</dt>
              <dd className="flex h-[22px] items-center gap-1.5 text-[12px] text-text-secondary">
                <DifficultyPips level={s.difficulty} />
                <span className="hidden sm:inline">{s.difficulty ? DIFFICULTY_LABEL[s.difficulty] : '—'}</span>
              </dd>
            </div>
          </dl>

          {opts.length > 0 && Object.keys(s.optionShare ?? {}).length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] text-text-muted">{revealed ? 'How others answered' : 'Answer distribution hidden until you check'}</div>
              {revealed ? (
                opts.map((o) => {
                  const share = s.optionShare[o.l] ?? 0
                  const pct = Math.round(share * (share <= 1 ? 100 : 1))
                  const key = isKeyOption(q, o.l)
                  return (
                    <div key={o.l} className="flex items-center gap-2 text-[12px]">
                      <span className={cn('w-9 shrink-0 font-mono font-semibold', key ? 'text-state-success' : 'text-text-secondary')}>{o.l.length <= 2 ? o.l : o.l.slice(0, 1)}</span>
                      <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-surface-3">
                        <span className={cn('absolute inset-y-0 left-0 rounded-full', key ? 'bg-state-success' : 'bg-text-muted/50')} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-9 shrink-0 text-right font-mono text-text-muted tabular-nums">{pct}%</span>
                    </div>
                  )
                })
              ) : (
                <div className="h-2 rounded-full bg-bg-surface-3" />
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
