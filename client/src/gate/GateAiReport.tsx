import { useState } from 'react'
import {
  Trophy,
  Target,
  Brain,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { GateVisualizer } from './GateVisualizer'
import type { GateQuestion } from './types'

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
    userAnswer: any
    officialAnswer: any
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
}

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
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'unattempted' | 'correct'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredDetails = evalResult.evaluationDetails.filter((d) => {
    if (filterMode === 'incorrect') return d.isAttempted && !d.isCorrect
    if (filterMode === 'unattempted') return !d.isAttempted
    if (filterMode === 'correct') return d.isCorrect
    return true
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6 font-sans text-text-primary">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="rounded-lg bg-accent-brand/15 px-2.5 py-1 text-[11px] font-bold text-accent-brand uppercase tracking-wider">
            Official GATE CBT Performance Report
          </span>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            {evalResult.paperTitle}
          </h1>
          <p className="mt-1 text-[13px] text-text-muted">
            Evaluation computed in compliance with official GATE negative marking & section guidelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="btn-secondary inline-flex items-center gap-2 !px-3.5 !py-2 !text-[13px] font-bold"
          >
            <RotateCcw className="size-4" /> Retake Exam
          </button>
          <button
            type="button"
            onClick={onBackToBank}
            className="btn-primary inline-flex items-center gap-2 !px-4 !py-2 !text-[13px] font-bold"
          >
            <BookOpen className="size-4" /> Browse Question Bank
          </button>
        </div>
      </div>

      {/* ── Grand Scorecard Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Main Score & AIR */}
        <div className="card relative overflow-hidden border-accent-brand/40 bg-gradient-to-br from-accent-brand/15 to-transparent p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-text-muted">Total Score</span>
            <Trophy className="size-5 text-accent-brand" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-text-primary font-mono">{evalResult.totalScore}</span>
            <span className="text-[14px] text-text-muted">/ {evalResult.maxMarks}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50 text-[11.5px]">
            <span className="font-bold text-accent-brand">Predicted AIR:</span>
            <span className="font-mono font-semibold text-text-primary">{evalResult.predictedAir}</span>
          </div>
        </div>

        {/* Percentile & Accuracy */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-text-muted">Accuracy & Rank</span>
            <Target className="size-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-emerald-500 font-mono">{evalResult.accuracy}%</span>
            <span className="text-[13px] text-text-muted font-mono">{evalResult.percentile}th %ile</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[11.5px] text-text-muted">
            <span>{evalResult.correctCount} Correct</span>
            <span className="text-red-400">{evalResult.incorrectCount} Incorrect</span>
          </div>
        </div>

        {/* Sectional Breakdown */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-text-muted">Sections</span>
            <TrendingUp className="size-5 text-blue-400" />
          </div>
          <div className="mt-2 space-y-1.5 font-mono text-[13px]">
            <div className="flex justify-between items-center">
              <span className="text-text-muted font-sans text-[12px]">General Aptitude:</span>
              <span className="font-bold text-text-primary">{evalResult.sectionStats.ga.score} / {evalResult.sectionStats.ga.max}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted font-sans text-[12px]">Core Subject:</span>
              <span className="font-bold text-text-primary">{evalResult.sectionStats.subject.score} / {evalResult.sectionStats.subject.max}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 text-[11.5px] text-text-muted">
            {evalResult.attemptedCount} of {evalResult.evaluationDetails.length} Questions Attempted
          </div>
        </div>

        {/* Penalty & Risk */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-text-muted">Negative Penalty</span>
            <AlertTriangle className="size-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-amber-500 font-mono">-{evalResult.negativeMarks}</span>
            <span className="text-[12px] text-text-muted">marks lost</span>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 text-[11.5px] text-text-muted truncate">
            {aiAnalysis?.negativeRisk ?? 'Evaluation verified'}
          </div>
        </div>
      </div>

      {/* ── AI Cognitive Diagnostic Report ── */}
      {aiAnalysis && (
        <div className="card border-accent-brand/30 bg-bg-surface-2/30 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-accent-brand/20 p-2 text-accent-brand">
              <Brain className="size-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
                Nexora AI Attempt Diagnostic Engine
                <Sparkles className="size-4 text-accent-brand" />
              </h2>
              <p className="text-[12px] text-text-muted">
                Cognitive pattern assessment based on question timings, error modalities, and topic mastery.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <span className="text-[12px] font-bold uppercase tracking-wider text-text-muted">
                Test-Taker Persona:
              </span>
              <span className="rounded-lg bg-accent-brand/15 px-2.5 py-0.5 text-[12px] font-bold text-accent-brand">
                {aiAnalysis.speedAccuracyProfile}
              </span>
            </div>
            <p className="mt-2.5 text-[13.5px] text-text-secondary leading-relaxed">
              {aiAnalysis.executiveSummary}
            </p>
          </div>

          {/* Actionable 3-Point Improvement Roadmap */}
          <div className="space-y-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-text-muted">
              Personalized +15 Mark Elevation Roadmap:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiAnalysis.recommendations.map((rec, i) => (
                <div key={i} className="rounded-xl border border-border bg-bg-surface p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-accent-brand font-bold text-[12px]">
                    <span className="flex size-5 items-center justify-center rounded-full bg-accent-brand/15 text-[11px]">
                      {i + 1}
                    </span>
                    Action Item {i + 1}
                  </div>
                  <p className="text-[12.5px] text-text-secondary leading-snug">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Subject Breakdown Heatmap ── */}
      <div className="card p-5 space-y-3">
        <h3 className="text-[14px] font-bold uppercase tracking-wider text-text-muted">
          Subject Mastery & Accuracy Matrix
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(evalResult.subjectStats).map(([subj, data]) => {
            const isStrong = data.accuracy >= 70 && data.score >= data.max * 0.5
            const isWeak = data.accuracy < 40 || data.score <= data.max * 0.25
            return (
              <div key={subj} className="rounded-xl border border-border bg-bg-surface-2/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-[12.5px] text-text-primary tracking-wide">
                    {subj}
                  </span>
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-[11px] font-bold',
                      isStrong
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : isWeak
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-amber-500/15 text-amber-400',
                    )}
                  >
                    {isStrong ? 'Stronghold' : isWeak ? 'Needs Work' : 'Borderline'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline font-mono text-[12px]">
                  <span className="text-text-muted">Score: {data.score} / {data.max}</span>
                  <span className="font-bold text-text-primary">{data.accuracy}% Acc</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="h-2 w-full rounded-full bg-bg-surface overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, (data.score / (data.max || 1)) * 100))}%` }}
                    className={cn(
                      'h-full rounded-full transition-all',
                      isStrong ? 'bg-emerald-500' : isWeak ? 'bg-red-500' : 'bg-amber-500',
                    )}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Question-by-Question Review Section ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Detailed Question Solutions & Derivations</h3>
            <p className="text-[12.5px] text-text-muted">
              Inspect your answers against official keys with step-by-step master derivations and animated models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-bg-surface-2 p-1 border border-border text-[12px] font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={cn('rounded-lg px-2.5 py-1 transition-colors', filterMode === 'all' && 'bg-bg-surface text-accent-brand shadow-sm')}
            >
              All ({evalResult.evaluationDetails.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('incorrect')}
              className={cn('rounded-lg px-2.5 py-1 text-red-400 transition-colors', filterMode === 'incorrect' && 'bg-bg-surface font-bold shadow-sm')}
            >
              Incorrect ({evalResult.incorrectCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unattempted')}
              className={cn('rounded-lg px-2.5 py-1 text-text-muted transition-colors', filterMode === 'unattempted' && 'bg-bg-surface text-text-primary shadow-sm')}
            >
              Skipped ({evalResult.unattemptedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('correct')}
              className={cn('rounded-lg px-2.5 py-1 text-emerald-400 transition-colors', filterMode === 'correct' && 'bg-bg-surface font-bold shadow-sm')}
            >
              Correct ({evalResult.correctCount})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filteredDetails.map((d) => {
            const q = questionsMap.get(d.id)
            if (!q) return null
            const isExpanded = expandedId === d.id

            return (
              <div
                key={d.id}
                className={cn(
                  'rounded-xl border transition-all overflow-hidden bg-bg-surface',
                  d.isCorrect
                    ? 'border-emerald-500/30'
                    : d.isAttempted
                      ? 'border-red-500/30'
                      : 'border-border',
                )}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-bg-surface-2/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {d.isCorrect ? (
                      <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    ) : d.isAttempted ? (
                      <XCircle className="size-5 text-red-500 shrink-0" />
                    ) : (
                      <div className="size-5 rounded-full border border-border bg-bg-surface-2 flex items-center justify-center text-[10px] text-text-muted">
                        —
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] text-text-primary">
                          {q.section === 'ga' ? 'GA ' : ''}Q{q.number}
                        </span>
                        <span className="rounded bg-bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono text-text-muted">
                          {q.type} · {q.marks}M
                        </span>
                        <span className="rounded bg-accent-brand/10 px-1.5 py-0.5 text-[11px] font-semibold text-accent-brand uppercase">
                          {q.subject}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[12.5px] font-mono">
                    <span className="text-text-muted">
                      Your: <strong className={d.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{String(d.userAnswer ?? 'None')}</strong>
                    </span>
                    <span className="text-text-muted">
                      Key: <strong className="text-text-primary">{String(d.officialAnswer)}</strong>
                    </span>
                    <span
                      className={cn(
                        'rounded-lg px-2 py-0.5 font-bold',
                        d.marksAwarded > 0
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : d.marksAwarded < 0
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-bg-surface-2 text-text-muted',
                      )}
                    >
                      {d.marksAwarded > 0 ? `+${d.marksAwarded}` : d.marksAwarded} M
                    </span>
                    {isExpanded ? <ChevronUp className="size-4 text-text-muted" /> : <ChevronDown className="size-4 text-text-muted" />}
                  </div>
                </div>

                {/* Expanded Question Statement & Deep Solution */}
                {isExpanded && (
                  <div className="border-t border-border p-4 sm:p-5 space-y-4 bg-bg-surface-2/20">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Problem Statement:</span>
                      <Markdown md={q.text} className="mt-1 !text-[14px]" />
                    </div>

                    {q.figures.map((f) => (
                      <figure key={f.f} className="my-2 max-w-md">
                        <img src={`/gate-fig/${f.f}`} alt={f.alt} className="rounded-lg border border-border" />
                      </figure>
                    ))}

                    {q.options.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border/50">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Options:</span>
                        <div className="grid gap-1">
                          {q.options.map((opt) => {
                            const isOfficial = opt.l === q.answer || (Array.isArray(q.answer) && q.answer.includes(opt.l))
                            const isUserChoice = opt.l === d.userAnswer || (Array.isArray(d.userAnswer) && d.userAnswer.includes(opt.l))
                            return (
                              <div
                                key={opt.l}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg p-2 text-[13px] border',
                                  isOfficial
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                    : isUserChoice
                                      ? 'bg-red-500/15 border-red-500/40 text-red-300'
                                      : 'bg-bg-surface border-border text-text-secondary',
                                )}
                              >
                                <span className="font-bold font-mono">({opt.l})</span>
                                <span className="flex-1">{opt.t}</span>
                                {isOfficial && <span className="text-[11px] font-bold uppercase">Official Key</span>}
                                {isUserChoice && !isOfficial && <span className="text-[11px] font-bold text-red-400">Your Pick</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Master Solution */}
                    <div className="rounded-xl border border-border bg-bg-surface p-4 space-y-3">
                      <div className="flex items-center gap-2 border-b border-border pb-2">
                        <BookOpen className="size-4 text-accent-brand" />
                        <h4 className="text-[13px] font-bold text-text-primary">Master Step-by-Step Solution</h4>
                      </div>

                      {q.solution ? (
                        <Markdown md={q.solution} className="!text-[13.5px] leading-relaxed" />
                      ) : (
                        <p className="text-[13px] text-text-muted">Comprehensive derivation logged in official GATE repository.</p>
                      )}

                      {/* Interactive Engineering Visualizer if applicable */}
                      <GateVisualizer subject={q.subject} topic={q.topic} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
