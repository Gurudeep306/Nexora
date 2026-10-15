import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { Card, ErrorState, LoadingBlock } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { GateShell } from '@/gate/shell/GateShell'
import { GATE_ROUTES, gateApi } from '@/gate/api'
import { QuestionView, type AttemptEvent } from '@/gate/QuestionView'
import { addDays, todayISO, useQuestionProgress } from '@/gate/progress'
import { fetchQuestions } from '@/gate/tests/testsData'
import { fmtClock, fmtDuration } from '@/gate/useQuestionTimer'
import { paperLabel, qLabel, type GateList, type GateQuestion } from '@/gate/types'

/*
 * One question a day, the same for everyone (server pick; a date-seeded pick
 * from the bank when the endpoint isn't there). Streak, a countdown to the
 * next one, and a spoiler-free line to share.
 */

const LOG_KEY = 'nexora:gate-daily:v1'
type Log = Record<string, { outcome: string; timeMs: number; questionId: string }>

function readLog(): Log {
  try {
    const v = JSON.parse(localStorage.getItem(LOG_KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
function writeLog(l: Log) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(l))
  } catch {
    /* ignore */
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

async function loadDaily(): Promise<{ date: string; q: GateQuestion; solvedToday?: boolean }> {
  try {
    const d = await gateApi.daily()
    const [q] = await fetchQuestions([d.questionId])
    if (q) return { date: d.date, q, solvedToday: d.solvedToday }
  } catch {
    /* date-seeded pick below */
  }
  const date = todayISO()
  const base = { exam: 'CSE', type: 'MCQ,MSQ,NAT', answered: 'yes', minYear: 2005 }
  const head = await api.get<GateList>('/api/gate/questions', { query: { ...base, limit: 1 } })
  const offset = hash(`nexora-daily:${date}`) % Math.max(1, head.total)
  const r = await api.get<GateList>('/api/gate/questions', { query: { ...base, limit: 1, offset } })
  if (!r.questions[0]) throw new Error('No question for today.')
  return { date, q: r.questions[0] }
}

function streakFrom(log: Log) {
  let d = todayISO()
  if (!log[d]) d = addDays(d, -1)
  let n = 0
  while (log[d]) {
    n++
    d = addDays(d, -1)
  }
  return n
}

function useCountdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(0, Math.round((midnight.getTime() - now) / 1000))
}

export default function GateDailyPage() {
  const res = useApi(loadDaily, [], { cacheKey: `gate:daily:${todayISO()}` })
  const summary = useApi(() => gateApi.summary(), [], { cacheKey: 'gate:summary' })
  const [log, setLog] = useState<Log>(readLog)
  const [copied, setCopied] = useState(false)
  const left = useCountdown()

  const q = res.data?.q
  const date = res.data?.date ?? todayISO()
  const progress = useQuestionProgress(q?.id ?? '')
  const today = log[date]
  const solvedEarlier = !today && (res.data?.solvedToday || (progress.lastAt != null && todayISO(new Date(progress.lastAt)) === date && progress.outcome === 'correct'))
  const done = !!today || !!solvedEarlier
  const streak = summary.data?.summary.streak ?? { current: streakFrom(log), best: Math.max(streakFrom(log), 0), todayDone: done }
  const current = Math.max(streak.current, streakFrom(log))

  const onAttempt = (e: AttemptEvent) => {
    if (log[date]) return
    const next = { ...log, [date]: { outcome: e.outcome, timeMs: e.timeMs, questionId: e.questionId } }
    setLog(next)
    writeLog(next)
  }

  const last7 = useMemo(() => Array.from({ length: 7 }, (_, k) => addDays(todayISO(), k - 6)), [])

  const shareText = today
    ? `NexoraGuru GATE Daily · ${new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}\n${today.outcome === 'correct' ? `Solved in ${fmtDuration(today.timeMs)}` : 'Attempted — tomorrow’s mine'} · ${Math.max(1, current)}-day streak\n${typeof location !== 'undefined' ? location.origin : ''}${GATE_ROUTES.daily}`
    : ''

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: shareText })
      else {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <GateShell title="Daily challenge" subtitle="One past-year question a day — the same for everyone.">
      <div className="mx-auto grid max-w-5xl items-start gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          {res.error ? (
            <ErrorState message={res.error} onRetry={res.refetch} />
          ) : !q ? (
            <LoadingBlock rows={6} />
          ) : (
            <>
              {done && (
                <div
                  role="status"
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-[13.5px]',
                    today?.outcome === 'correct' || solvedEarlier ? 'border-state-success/40 bg-state-success/10' : 'border-border bg-bg-surface-2',
                  )}
                >
                  <Icon name={today?.outcome === 'correct' || solvedEarlier ? 'check-circle' : 'flag'} className={cn('size-5', today?.outcome === 'correct' || solvedEarlier ? 'text-state-success' : 'text-text-muted')} />
                  <span className="text-text-primary">
                    {today?.outcome === 'correct' || solvedEarlier ? 'Solved' : 'Done for today'}
                    {today && <span className="text-text-muted"> · {fmtDuration(today.timeMs)}</span>}
                  </span>
                  {today && (
                    <button type="button" onClick={share} className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-brand hover:underline">
                      <Icon name={copied ? 'check' : 'share'} className="size-3.5" /> {copied ? 'Copied' : 'Share'}
                    </button>
                  )}
                </div>
              )}
              <QuestionView key={q.id} q={q} mode="daily" keyboard reportToAssistant insights position={`${paperLabel(q)} ${qLabel(q)}`} onAttempt={onAttempt} />
            </>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-state-warning/12 text-state-warning">
                <Icon name="flame" className="size-6" />
              </span>
              <div>
                <div className="font-mono text-2xl font-semibold text-text-primary tabular-nums">{current}</div>
                <div className="text-[12px] text-text-muted">day streak{streak.best > current ? ` · best ${streak.best}` : ''}</div>
              </div>
            </div>
            <ol className="flex justify-between gap-1" aria-label="Last 7 days">
              {last7.map((d) => {
                const e = log[d] ?? (d === date && done ? { outcome: 'correct' } : null)
                return (
                  <li key={d} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full border text-[10px]',
                        e ? (e.outcome === 'correct' ? 'border-state-success bg-state-success/15 text-state-success' : 'border-border-strong bg-bg-surface-3 text-text-secondary') : 'border-dashed border-border text-text-muted',
                      )}
                      aria-label={`${d}: ${e ? (e.outcome === 'correct' ? 'solved' : 'attempted') : 'missed'}`}
                    >
                      {e ? <Icon name={e.outcome === 'correct' ? 'check' : 'x'} className="size-3.5" /> : ''}
                    </span>
                    <span className="text-[10px] text-text-muted">{new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                  </li>
                )
              })}
            </ol>
          </Card>
          <Card className="space-y-1 p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
              <Icon name="clock" className="size-3.5" /> Next question in
            </div>
            <div className="font-mono text-xl font-semibold text-text-primary tabular-nums" role="timer" aria-live="off">
              {fmtClock(left)}
            </div>
          </Card>
          <Card className="space-y-2 text-[13px] p-4 sm:p-5">
            <div className="text-[12px] font-semibold tracking-wide text-text-muted uppercase">Keep going</div>
            <Link to={GATE_ROUTES.review} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary">
              Review due questions <Icon name="brain" className="size-4" />
            </Link>
            {q && (
              <Link to={`${GATE_ROUTES.practice}?subject=${q.subject}&topic=${q.subject}/${q.topic}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary">
                More on this topic <Icon name="layers" className="size-4" />
              </Link>
            )}
            <Link to={GATE_ROUTES.tests} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary">
              Take a quick test <Icon name="timer" className="size-4" />
            </Link>
          </Card>
        </aside>
      </div>
    </GateShell>
  )
}
