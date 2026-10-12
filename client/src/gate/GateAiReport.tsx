import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, ChevronDown, Minus, RotateCcw, Sparkles, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { LoadingBlock } from '@/components/ui'
import { QuestionView } from './QuestionView'
import type { GateDetail, GateQuestion } from './types'

export interface ExamEvaluation {
  paperId: string
  paperTitle: string
  totalScore: number
  maxMarks: number
  positiveMarks: number
  negativeMarks: number
  accuracy: number
  attemptedCount: number
  unattemptedCount: number
  correctCount: number
  incorrectCount: number
  sectionStats: {
    ga: { score: number; max: number; correct: number; incorrect: number; unattempted: number }
    subject: { score: number; max: number; correct: number; incorrect: number; unattempted: number }
  }
  subjectStats: Record<string, { score: number; max: number; correct: number; incorrect: number; unattempted: number; accuracy: number }>
  predictedAir: string
  percentile: number
  evaluationDetails: Array<{
    id: string
    number: string
    section: string
    subject: string
    topic: string
    type: string
    marks: number
    userAnswer: unknown
    officialAnswer: unknown
    isAttempted: boolean
    isCorrect: boolean
    marksAwarded: number
    timeSpentSeconds: number
  }>
}

export interface AiDiagnostic {
  speedAccuracyProfile: string
  negativeRisk: string
  negativePenaltyRatio: string
  strengths: Array<{ subject: string; score: number; max: number; accuracy: number }>
  vulnerabilities: Array<{ subject: string; score: number; max: number; accuracy: number }>
  recommendations: string[]
  executiveSummary: string
  /** Optional AI-written debrief (agent task 'gate_narrative'); absent when AI is off. */
  narrative?: string
}

type Filter = 'all' | 'incorrect' | 'unattempted' | 'correct'

const fmt = (v: unknown) => (v == null || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : String(v))
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * The mock's score report and review. Answers and solutions are loaded per
 * question when a row is opened (the paper itself was served without them).
 */
export function GateAiReport({
  evalResult,
  aiAnalysis,
  questionsMap,
  onRetake,
  onBackToBank,
}: {
  evalResult: ExamEvaluation
  aiAnalysis?: AiDiagnostic | null
  questionsMap: Map<string, GateQuestion>
  onRetake: () => void
  onBackToBank: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const details = evalResult.evaluationDetails
  const indexOf = useMemo(() => new Map(details.map((d, i) => [d.id, i + 1])), [details])

  const shown = details.filter((d) =>
    filter === 'incorrect' ? d.isAttempted && !d.isCorrect : filter === 'unattempted' ? !d.isAttempted : filter === 'correct' ? d.isCorrect : true,
  )
  const pct = evalResult.maxMarks ? Math.max(0, Math.min(100, (evalResult.totalScore / evalResult.maxMarks) * 100)) : 0

  const stat = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <div className="card !p-4">
      <div className="text-[11.5px] font-medium tracking-wide text-text-muted uppercase">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-text-primary tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-text-muted">{sub}</div>}
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-28">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium tracking-wide text-text-muted uppercase">Mock result</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">{evalResult.paperTitle}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRetake} className="btn-secondary inline-flex items-center gap-1.5 !px-3.5 !py-2 !text-[13px]">
            <RotateCcw className="size-4" /> Retake
          </button>
          <button type="button" onClick={onBackToBank} className="btn-primary inline-flex items-center gap-1.5 !px-3.5 !py-2 !text-[13px]">
            <BookOpen className="size-4" /> All papers
          </button>
        </div>
      </header>

      {/* Score */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card !p-4 sm:col-span-2 lg:col-span-1">
          <div className="text-[11.5px] font-medium tracking-wide text-text-muted uppercase">Score</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-semibold text-text-primary tabular-nums">{evalResult.totalScore}</span>
            <span className="text-[14px] text-text-muted">/ {evalResult.maxMarks}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-surface-3">
            <div className="h-full rounded-full bg-accent-brand" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-[12px] text-text-muted" title="A rough band from past cut-offs, not an official prediction">
            Rough rank band: <span className="text-text-secondary">{evalResult.predictedAir}</span>
          </div>
        </div>
        {stat('Accuracy', `${evalResult.accuracy}%`, `${evalResult.correctCount} correct · ${evalResult.incorrectCount} wrong`)}
        {stat('Attempted', `${evalResult.attemptedCount}/${details.length}`, `GA ${evalResult.sectionStats.ga.score}/${evalResult.sectionStats.ga.max} · Technical ${evalResult.sectionStats.subject.score}/${evalResult.sectionStats.subject.max}`)}
        {stat('Negative marks', evalResult.negativeMarks ? `−${evalResult.negativeMarks}` : '0', aiAnalysis?.negativeRisk)}
      </section>

      {/* Diagnostic */}
      {aiAnalysis && (
        <section className="card space-y-4 !p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              <Sparkles className="size-4 text-accent-brand" /> What to work on
            </h2>
            <span className="rounded-full border border-border bg-bg-surface-2 px-2.5 py-0.5 text-[12px] text-text-secondary">{aiAnalysis.speedAccuracyProfile}</span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-text-secondary">{aiAnalysis.executiveSummary}</p>
          {aiAnalysis.narrative && (
            <div className="border-t border-border pt-3">
              <AiMarkdown text={aiAnalysis.narrative} />
            </div>
          )}
          <ol className="grid gap-2 md:grid-cols-3">
            {aiAnalysis.recommendations.map((r, i) => (
              <li key={i} className="rounded-xl border border-border bg-bg-surface-2 p-3 text-[13px] leading-snug text-text-secondary">
                <span className="mb-1 block font-mono text-[11px] text-text-muted">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Subjects */}
      <section className="card !p-0">
        <h2 className="border-b border-border px-5 py-3 text-[15px] font-semibold text-text-primary">By subject</h2>
        <div className="divide-y divide-border">
          {Object.entries(evalResult.subjectStats)
            .sort((a, b) => b[1].max - a[1].max)
            .map(([subj, d]) => {
              const share = d.max ? Math.max(0, d.score / d.max) : 0
              const tone = share >= 0.6 ? 'bg-state-success' : share >= 0.3 ? 'bg-state-warning' : 'bg-state-error'
              return (
                <div key={subj} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 px-5 py-2.5 text-[13px] sm:grid-cols-[8rem_1fr_9rem]">
                  <span className="truncate font-medium text-text-primary uppercase">{subj}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-bg-surface-3">
                    <span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.min(100, share * 100)}%` }} />
                  </span>
                  <span className="text-right font-mono text-[12px] text-text-muted tabular-nums">
                    {d.score}/{d.max} · {d.accuracy}%
                  </span>
                </div>
              )
            })}
        </div>
      </section>

      {/* Review */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-text-primary">Review answers</h2>
          <div className="flex rounded-xl border border-border bg-bg-surface p-0.5 text-[12.5px]" role="tablist">
            {(
              [
                ['all', `All ${details.length}`],
                ['incorrect', `Wrong ${evalResult.incorrectCount}`],
                ['unattempted', `Skipped ${evalResult.unattemptedCount}`],
                ['correct', `Correct ${evalResult.correctCount}`],
              ] as Array<[Filter, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={cn('rounded-[10px] px-2.5 py-1.5', filter === id ? 'bg-bg-surface-3 font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ol className="card divide-y divide-border overflow-hidden !p-0">
          {shown.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-text-muted">Nothing here.</li>}
          {shown.map((d) => {
            const q = questionsMap.get(d.id)
            const open = openId === d.id
            return (
              <li key={d.id}>
                <button
                  type="button"
                  data-review-row
                  onClick={() => setOpenId(open ? null : d.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-surface-2 sm:px-5"
                >
                  {d.isCorrect ? (
                    <CheckCircle2 className="size-4.5 shrink-0 text-state-success" aria-label="Correct" />
                  ) : d.isAttempted ? (
                    <XCircle className="size-4.5 shrink-0 text-state-error" aria-label="Wrong" />
                  ) : (
                    <Minus className="size-4.5 shrink-0 text-text-muted" aria-label="Skipped" />
                  )}
                  <span className="w-10 shrink-0 font-mono text-[13px] font-semibold text-text-primary">Q{indexOf.get(d.id)}</span>
                  <span className="hidden w-24 shrink-0 truncate text-[12px] text-text-muted uppercase sm:block">
                    {d.type} · {d.subject}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-text-secondary">
                    You {fmt(d.userAnswer)} · Key {fmt(d.officialAnswer)}
                  </span>
                  <span className="hidden font-mono text-[11.5px] text-text-muted sm:inline">{mmss(d.timeSpentSeconds)}</span>
                  <span
                    className={cn(
                      'w-12 shrink-0 text-right font-mono text-[12.5px] font-semibold',
                      d.marksAwarded > 0 ? 'text-state-success' : d.marksAwarded < 0 ? 'text-state-error' : 'text-text-muted',
                    )}
                  >
                    {d.marksAwarded > 0 ? `+${d.marksAwarded}` : d.marksAwarded}
                  </span>
                  <ChevronDown className={cn('size-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')} />
                </button>
                {open && q && <ReviewQuestion q={q} pick={d.userAnswer} position={`Question ${indexOf.get(d.id)}`} />}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

/** One question after the exam: the full record (key + solution) is fetched now. */
function ReviewQuestion({ q, pick, position }: { q: GateQuestion; pick: unknown; position: string }) {
  const [full, setFull] = useState<GateQuestion | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    api
      .get<GateDetail>(`/api/gate/questions/${encodeURIComponent(q.id)}`)
      .then((r) => live && setFull(r.question))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load the question'))
    return () => {
      live = false
    }
  }, [q.id])

  const initialPick = Array.isArray(pick) ? pick.map(String) : pick == null ? '' : String(pick)
  return (
    <div className="border-t border-border bg-bg-surface-2/50 p-3 sm:p-4">
      {error ? <p className="text-[13px] text-state-error">{error}</p> : !full ? <LoadingBlock rows={3} /> : <QuestionView q={full} initialPick={initialPick} position={position} />}
    </div>
  )
}
