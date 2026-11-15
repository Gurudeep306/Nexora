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
    <span role="img" className={cn('inline-flex items-center gap-0.5', className)} aria-label={level ? `Difficulty ${level} of 5: ${DIFFICULTY_LABEL[level]}` : 'Difficulty not rated yet'}>
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

  const shares = opts.map((o) => {
    const share = s?.optionShare?.[o.l] ?? 0
    return { o, pct: Math.round(share * (share <= 1 ? 100 : 1)), key: isKeyOption(q, o.l) }
  })
  const top = [...shares].sort((x, y) => y.pct - x.pct)[0]

  return (
    <section className={cn('border-t border-[var(--ed-line)] pt-5', className)} aria-label="Community stats">
      <div className="mb-4 flex items-baseline gap-3">
        <h3 className="ed-label ed-muted m-0">From everyone</h3>
        {s && s.users > 0 && <span className="ed-mono ed-muted ml-auto text-[12px]">{s.users.toLocaleString()} solver{s.users === 1 ? '' : 's'}</span>}
      </div>

      {res.loading && !s ? (
        <div className="grid grid-cols-3 gap-6" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-surface-3/60" />
          ))}
        </div>
      ) : !enough ? (
        <p className="ed-body-sm ed-ink-2 m-0">No one else has answered this yet. Yours will be among the first.</p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-3 gap-6">
            <div>
              <dt className="ed-caption ed-muted">Accuracy</dt>
              <dd className="ed-serif m-0 mt-1 text-[1.5rem] leading-none text-text-primary tabular-nums">{s.accuracy == null ? '—' : `${Math.round(s.accuracy * (s.accuracy <= 1 ? 100 : 1))}%`}</dd>
            </div>
            <div>
              <dt className="ed-caption ed-muted">Average time</dt>
              <dd className="m-0 mt-1">
                <span className="ed-serif text-[1.5rem] leading-none text-text-primary tabular-nums">{fmtDuration(s.avgTimeMs)}</span>
                {myTimeMs != null && s.avgTimeMs != null && revealed && <span className="ed-mono ed-muted ml-2 text-[11px]">you {fmtDuration(myTimeMs)}</span>}
              </dd>
            </div>
            <div>
              <dt className="ed-caption ed-muted">Difficulty</dt>
              <dd className="m-0 mt-2 flex items-center gap-2 text-[13px] text-text-secondary">
                <DifficultyPips level={s.difficulty} />
                <span>{s.difficulty ? DIFFICULTY_LABEL[s.difficulty] : '—'}</span>
              </dd>
            </div>
          </dl>

          {opts.length > 0 && Object.keys(s.optionShare ?? {}).length > 0 && (
            <div className="mt-6">
              {revealed ? (
                <>
                  {top && top.pct > 0 && (
                    <p className="ed-body-sm m-0 mb-3">
                      {top.pct}% of students chose {top.o.l}
                      {top.key ? ', the right answer.' : '.'}
                    </p>
                  )}
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {shares.map(({ o, pct, key }) => (
                      <li key={o.l} className="flex items-center gap-3">
                        <span className={cn('ed-mono w-8 shrink-0 text-[12px]', key ? 'text-state-success' : 'ed-ink-2')}>
                          {o.l.length <= 2 ? o.l : o.l.slice(0, 1)}
                          {key && <span className="sr-only"> (correct)</span>}
                        </span>
                        <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--ed-oat)]">
                          <span className={cn('absolute inset-y-0 left-0 rounded-full', key ? 'bg-state-success' : 'bg-[var(--ed-ink-2)]')} style={{ width: `${pct}%` }} />
                        </span>
                        <span className="ed-mono ed-muted w-10 shrink-0 text-right text-[12px] tabular-nums">{pct}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="ed-caption ed-muted m-0">How others answered shows once you check.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
