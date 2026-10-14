import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, EmptyState, ErrorState, Kbd, LoadingBlock } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useAuth } from '@/context/AuthContext'
import { GateShell } from '@/gate/shell/GateShell'
import { GATE_ROUTES, gateApi } from '@/gate/api'
import { QuestionView, type AttemptEvent } from '@/gate/QuestionView'
import { ensureGateSync, gateReady, getProgress, localDueIds, localForecast } from '@/gate/progress'
import { fetchQuestions } from '@/gate/tests/testsData'
import { Forecast } from '@/gate/practice/Forecast'
import { fmtDuration } from '@/gate/useQuestionTimer'
import type { GateQuestion } from '@/gate/types'

/*
 * Spaced repetition (Anki-style): the questions due today, one at a time.
 * Check → rate how sure you were (when right) → Enter for the next card.
 * The queue is frozen when the session starts so rescheduled cards don't
 * jump around mid-session.
 */

const SESSION = 20

interface Queue {
  ids: string[]
  dueCount: number
  upcoming: Record<string, number>
}

async function loadQueue(): Promise<Queue> {
  await gateReady()
  try {
    const r = await gateApi.reviewQueue(SESSION)
    return { ids: r.due ?? [], dueCount: r.dueCount ?? r.due?.length ?? 0, upcoming: r.upcoming ?? localForecast() }
  } catch {
    const ids = localDueIds()
    return { ids: ids.slice(0, SESSION), dueCount: ids.length, upcoming: localForecast() }
  }
}

export default function GateReviewPage() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<Queue | null>(null)
  const [questions, setQuestions] = useState<GateQuestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const [results, setResults] = useState<Record<string, AttemptEvent & { conf?: number }>>({})
  const [round, setRound] = useState(0)

  useEffect(() => ensureGateSync(user?.username), [user?.username])

  const username = user?.username
  useEffect(() => {
    if (!username) return
    let live = true
    loadQueue()
      .then(async (q) => {
        if (!live) return
        setQueue(q)
        const qs = q.ids.length ? await fetchQuestions(q.ids) : []
        if (live) setQuestions(qs)
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load your review queue.'))
    return () => {
      live = false
    }
  }, [round, username])

  const q = questions?.[i]
  const done = questions != null && questions.length > 0 && i >= questions.length
  const answeredCount = Object.keys(results).length
  const correct = Object.values(results).filter((r) => r.outcome === 'correct').length
  const next = () => setI((n) => n + 1)
  const restart = () => {
    setQueue(null)
    setQuestions(null)
    setError(null)
    setI(0)
    setResults({})
    setRound((r) => r + 1)
  }
  const forecast = useMemo(() => (done ? localForecast(getProgress()) : (queue?.upcoming ?? {})), [done, queue])

  const subtitle = queue ? (queue.dueCount ? `${queue.dueCount} due today · spaced repetition keeps what you’ve learned` : 'Spaced repetition keeps what you’ve learned') : 'Spaced repetition'

  return (
    <GateShell
      title="Review"
      subtitle={subtitle}
      actions={
        <Link to={`${GATE_ROUTES.practice}?status=due`} className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 !text-[13px]">
          <Icon name="list" className="size-4" /> <span className="hidden sm:inline">Browse due</span>
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4 pb-24">
        {error ? (
          <ErrorState message={error} onRetry={restart} />
        ) : !queue || (queue.ids.length > 0 && !questions) ? (
          <LoadingBlock rows={5} />
        ) : !questions?.length ? (
          <Card className="space-y-6 p-4 sm:p-5">
            <EmptyState
              icon="check-circle"
              title="All caught up"
              description="Nothing is due right now. Questions you get wrong come back tomorrow; ones you get right return at growing intervals."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link to={`${GATE_ROUTES.practice}?status=unseen`} className="btn-primary !px-4 !py-2 !text-[13px]">
                    Practise new questions
                  </Link>
                  <Link to={GATE_ROUTES.daily} className="btn-secondary !px-4 !py-2 !text-[13px]">
                    Today’s challenge
                  </Link>
                </div>
              }
            />
            <Forecast upcoming={queue.upcoming} className="border-t border-border pt-4" />
          </Card>
        ) : done ? (
          <Card className="space-y-5 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-state-success/12 text-state-success">
                <Icon name="check-circle" className="size-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-text-primary">Session complete</h2>
                <p className="text-[13px] text-text-muted">The schedule has been updated for every card.</p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2">
              {[
                ['Reviewed', String(answeredCount)],
                ['Recalled', answeredCount ? `${Math.round((correct / answeredCount) * 100)}%` : '—'],
                ['Time', fmtDuration(Object.values(results).reduce((a, r) => a + r.timeMs, 0))],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border bg-bg-surface-2/60 px-3 py-2">
                  <dt className="text-[11px] text-text-muted">{k}</dt>
                  <dd className="font-mono text-[18px] font-semibold text-text-primary tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Forecast upcoming={forecast} />
            <div className="flex flex-wrap justify-end gap-2">
              <Link to={GATE_ROUTES.practice} className="btn-secondary !px-4 !py-2 !text-[13px]">
                Back to practice
              </Link>
              {queue.dueCount > questions.length && (
                <button type="button" onClick={restart} className="btn-primary !px-4 !py-2 !text-[13px]">
                  Review {Math.min(SESSION, queue.dueCount - questions.length)} more
                </button>
              )}
            </div>
          </Card>
        ) : (
          q && (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i} aria-label="Session progress">
                  <div className="h-full rounded-full bg-accent-brand transition-[width] duration-300" style={{ width: `${(i / questions.length) * 100}%` }} />
                </div>
                <span className="font-mono text-[12px] text-text-muted tabular-nums">
                  {i + 1}/{questions.length}
                </span>
                <span className="hidden items-center gap-1 text-[12px] text-text-muted sm:inline-flex">
                  <span className="size-2 rounded-full bg-state-success" /> {correct}
                  <span className="ml-1.5 size-2 rounded-full bg-state-error" /> {answeredCount - correct}
                </span>
              </div>

              <QuestionView
                key={q.id}
                q={q}
                mode="review"
                keyboard
                reportToAssistant
                position={`${i + 1} of ${questions.length}`}
                onAttempt={(e) => setResults((r) => ({ ...r, [e.questionId]: e }))}
                onRated={(c) => setResults((r) => (r[q.id] ? { ...r, [q.id]: { ...r[q.id], conf: c } } : r))}
                onNext={next}
              />

              <div className="flex items-center justify-between gap-3">
                <p className="hidden items-center gap-1.5 text-[12px] text-text-muted md:flex">
                  <Kbd>Enter</Kbd> check, then next · <Kbd>1</Kbd>–<Kbd>3</Kbd> how sure · <Kbd>S</Kbd> solution
                </p>
                <button
                  type="button"
                  onClick={next}
                  className={cn('ml-auto inline-flex items-center gap-1 !px-4 !py-2 !text-[13px]', results[q.id] ? 'btn-primary' : 'btn-secondary')}
                >
                  {results[q.id] ? 'Next' : 'Skip'} <ChevronRight className="size-4" />
                </button>
              </div>
            </>
          )
        )}
      </div>
    </GateShell>
  )
}
