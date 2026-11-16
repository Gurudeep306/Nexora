import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { GateShell } from '../shell/GateShell'
import { GATE_ROUTES, type GateTest, type Outcome } from '../api'
import { QuestionView } from '../QuestionView'
import { fmtDuration } from '../useQuestionTimer'
import { TYPE_SHORT, type GateQuestion } from '../types'
import { createTest, savedResponses } from './testsData'

/*
 * The report after a test (Testbook-style): score, percentile, accuracy,
 * time per question against your pace, subject breakdown, and a per-question
 * review with the worked solution and community stats.
 */

const OUTCOME_STYLE: Record<string, string> = {
  correct: 'shadow-[inset_0_0_0_1px_currentColor] text-state-success',
  wrong: 'shadow-[inset_0_0_0_1px_currentColor] text-state-error',
  partial: 'shadow-[inset_0_0_0_1px_currentColor] text-state-warning',
  skipped: 'bg-bg-surface-3 text-text-muted',
  revealed: 'bg-bg-surface-3 text-text-muted',
}
const OUTCOME_LABEL: Record<string, string> = { correct: 'Correct', wrong: 'Wrong', partial: 'Partial', skipped: 'Skipped', revealed: 'Seen' }
const BAR: Record<string, string> = { correct: 'bg-state-success', wrong: 'bg-state-error', partial: 'bg-state-warning', skipped: 'bg-text-muted/40', revealed: 'bg-text-muted/40' }

export function TestResultView({ test, questions, subjectName }: { test: GateTest; questions: GateQuestion[]; subjectName: (s: string) => string }) {
  const navigate = useNavigate()
  const r = test.result!
  const responses = useMemo(() => savedResponses(test.id), [test.id])
  const [filter, setFilter] = useState<'all' | Outcome>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const items = r.items.filter((it) => byId.has(it.questionId))
  const attempted = r.correct + r.wrong
  const accuracy = attempted ? r.correct / attempted : null
  const lost = items.reduce((a, it) => a + (it.marks < 0 ? -it.marks : 0), 0)
  const avg = items.length ? items.reduce((a, it) => a + it.timeMs, 0) / items.length : 0
  const pace = (test.config.durationMin * 60_000) / Math.max(1, items.length)
  const maxT = Math.max(pace * 1.5, ...items.map((it) => it.timeMs), 1)
  const wrongIds = items.filter((it) => it.outcome !== 'correct').map((it) => it.questionId)
  const scorePct = r.maxScore ? Math.max(0, r.score / r.maxScore) : 0

  const sameAgain = async () => {
    setBusy(true)
    try {
      const t = await createTest({ ...test.config, title: test.title })
      navigate(GATE_ROUTES.test(t.id))
    } catch {
      setBusy(false)
    }
  }

  const shown = items.filter((it) => filter === 'all' || it.outcome === filter)

  return (
    <GateShell
      title={test.title}
      subtitle={`Submitted ${new Date(test.submittedAt ?? test.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${items.length} questions · ${test.config.durationMin} min`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link to={GATE_ROUTES.tests} className="btn-secondary !px-3 !py-2 !text-[13px]">
            All tests
          </Link>
          <button type="button" onClick={sameAgain} disabled={busy} className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-2 !text-[13px] disabled:opacity-60">
            <Icon name="refresh" className="size-4" /> <span className="hidden sm:inline">New test, same settings</span>
            <span className="sm:hidden">Again</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 pb-24">
        {/* ── Score ── */}
        <Card className="grid gap-5 !p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:!p-6">
          <div className="relative mx-auto size-36 sm:mx-0" role="img" aria-label={`Score ${r.score} of ${r.maxScore}`}>
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-bg-surface-3)" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-accent-brand)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${scorePct * 326.7} 326.7`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[28px] font-semibold text-text-primary tabular-nums">{r.score}</span>
              <span className="text-[12px] text-text-muted">of {r.maxScore} marks</span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Percentile', r.percentile == null ? '—' : `${Math.round(r.percentile * (r.percentile <= 1 ? 100 : 1))}`, r.percentile == null ? 'Needs other takers' : 'of takers beaten'],
              ['Accuracy', accuracy == null ? '—' : `${Math.round(accuracy * 100)}%`, `${r.correct} of ${attempted} attempted`],
              ['Correct', String(r.correct), `+${items.reduce((a, it) => a + (it.marks > 0 ? it.marks : 0), 0)} marks`],
              ['Wrong', String(r.wrong), lost ? `−${Math.round(lost * 100) / 100} marks` : 'no marks lost'],
              ['Skipped', String(r.skipped), 'not answered'],
              ['Time used', fmtDuration(r.timeMs), `${fmtDuration(avg)} per question`],
            ].map(([k, v, sub]) => (
              <div key={k} className="rounded-xl border border-border bg-bg-surface-2/50 px-3 py-2">
                <dt className="text-[11px] text-text-muted">{k}</dt>
                <dd className="font-mono text-[18px] font-semibold text-text-primary tabular-nums">{v}</dd>
                <dd className="truncate text-[11px] text-text-muted">{sub}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {wrongIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-strong bg-bg-surface px-4 py-3">
            <Icon name="target" className="size-5 text-text-secondary" />
            <p className="min-w-0 flex-1 text-[13.5px] text-text-secondary">
              <strong className="font-semibold text-text-primary">{wrongIds.length}</strong> question{wrongIds.length === 1 ? '' : 's'} to revisit ({r.wrong} wrong, {r.skipped} skipped). Wrong answers are already queued for review tomorrow.
            </p>
            <Link to={`${GATE_ROUTES.practice}?ids=${wrongIds.join(',')}`} className="btn-primary !px-4 !py-2 !text-[13px]">
              Retry wrong ones
            </Link>
          </div>
        )}

        {/* ── Time per question ── */}
        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-text-primary">Time per question</h2>
            <span className="flex items-center gap-3 text-[11.5px] text-text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-0 w-4 border-t-2 border-dashed border-accent-brand" /> pace {fmtDuration(pace)}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-0 w-4 border-t-2 border-text-muted" /> your avg {fmtDuration(avg)}
              </span>
            </span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="relative flex h-36 min-w-full items-end gap-[3px]" style={{ width: `${Math.max(100, items.length * 14)}px` }}>
              <span className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-accent-brand/70" style={{ bottom: `${(pace / maxT) * 100}%` }} aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 border-t-2 border-text-muted/60" style={{ bottom: `${(avg / maxT) * 100}%` }} aria-hidden="true" />
              {items.map((it, k) => (
                <button
                  key={it.questionId}
                  type="button"
                  onClick={() => {
                    setFilter('all')
                    setOpen(it.questionId)
                    requestAnimationFrame(() => document.getElementById(`res-${it.questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                  }}
                  title={`Q${k + 1}: ${OUTCOME_LABEL[it.outcome]} · ${fmtDuration(it.timeMs)}`}
                  aria-label={`Question ${k + 1}, ${OUTCOME_LABEL[it.outcome]}, ${fmtDuration(it.timeMs)}`}
                  className={cn('min-w-[8px] flex-1 rounded-t-[3px] opacity-85 transition-opacity hover:opacity-100', BAR[it.outcome])}
                  style={{ height: `${Math.max(3, (it.timeMs / maxT) * 100)}%` }}
                />
              ))}
            </div>
          </div>
          <p className="text-[12px] text-text-muted">
            {items.filter((it) => it.timeMs > pace * 1.5).length} question(s) took over 1.5× the pace; {items.filter((it) => it.outcome === 'wrong' && it.timeMs < pace / 3).length} wrong answer(s) were rushed.
          </p>
        </Card>

        {/* ── Subjects ── */}
        {r.bySubject.length > 0 && (
          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="text-[14px] font-semibold text-text-primary">By subject</h2>
            <ul className="space-y-3">
              {[...r.bySubject]
                .sort((a, b) => (b.attempted > 0 ? 1 : 0) - (a.attempted > 0 ? 1 : 0) || a.accuracy - b.accuracy)
                .map((s) => {
                  const acc = s.accuracy * (s.accuracy <= 1 ? 100 : 1)
                  return (
                    <li key={s.subject} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
                      <span className="truncate font-medium text-text-primary">{subjectName(s.subject)}</span>
                      <span className="font-mono text-[12px] text-text-muted tabular-nums">
                        {s.correct}/{s.attempted} · <span className="text-state-success">+{Math.round(s.marksGained * 100) / 100}</span>
                        {s.marksLost > 0 && <span className="text-state-error"> −{Math.round(s.marksLost * 100) / 100}</span>} · {fmtDuration(s.avgTimeMs)}
                      </span>
                      <span className="col-span-2 h-2 overflow-hidden rounded-full bg-bg-surface-3">
                        <span className={cn('block h-full rounded-full', acc >= 70 ? 'bg-state-success' : acc >= 40 ? 'bg-state-warning' : 'bg-state-error')} style={{ width: `${s.attempted ? Math.max(2, acc) : 0}%` }} />
                      </span>
                    </li>
                  )
                })}
            </ul>
          </Card>
        )}

        {/* ── Per question ── */}
        <section className="space-y-3" aria-labelledby="pq-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="pq-h" className="text-[14px] font-semibold text-text-primary">
              Question by question
            </h2>
            <div className="flex gap-1 rounded-xl border border-border bg-bg-surface p-0.5" role="radiogroup" aria-label="Show">
              {(['all', 'wrong', 'skipped', 'correct'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={filter === k}
                  onClick={() => setFilter(k)}
                  className={cn('h-8 rounded-[10px] px-2.5 text-[12.5px] capitalize', filter === k ? 'bg-bg-surface-3 font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary')}
                >
                  {k} <span className="font-mono text-[11px] opacity-70">{k === 'all' ? items.length : items.filter((it) => it.outcome === k).length}</span>
                </button>
              ))}
            </div>
          </div>
          <ol className="space-y-2">
            {shown.map((it) => {
              const q = byId.get(it.questionId)!
              const n = items.indexOf(it) + 1
              const isOpen = open === it.questionId
              const resp = responses[it.questionId]
              return (
                <li key={it.questionId} id={`res-${it.questionId}`} className="scroll-mt-24">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : it.questionId)}
                    aria-expanded={isOpen}
                    className="card flex w-full items-center gap-3 !px-3 !py-2.5 text-left hover:border-border-hover sm:!px-4"
                  >
                    <span className="w-7 font-mono text-[12.5px] font-semibold text-text-secondary">Q{n}</span>
                    <span className={cn('inline-flex h-6 items-center rounded-md px-2 text-[11.5px] font-semibold', OUTCOME_STYLE[it.outcome])}>{OUTCOME_LABEL[it.outcome]}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-muted">
                      {subjectName(q.subject)} · {TYPE_SHORT[q.type]} · {q.exam} {q.year}
                    </span>
                    <span className={cn('font-mono text-[12.5px] tabular-nums', it.marks > 0 ? 'text-state-success' : it.marks < 0 ? 'text-state-error' : 'text-text-muted')}>
                      {it.marks > 0 ? '+' : ''}
                      {it.marks}
                    </span>
                    <span className="hidden w-14 text-right font-mono text-[12px] text-text-muted tabular-nums sm:inline">{fmtDuration(it.timeMs)}</span>
                    <ChevronDown className={cn('size-4 shrink-0 text-text-muted transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="mt-2">
                      <QuestionView q={q} subjectName={subjectName(q.subject)} mode="test" initialPick={resp ?? ''} insights position={`Q${n} · ${fmtDuration(it.timeMs)}`} />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </GateShell>
  )
}
