import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, FileText, LayoutGrid, Maximize, Minimize, Send, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { useAgentPageContext } from '@/context/AgentContext'
import { useAuth } from '@/context/AuthContext'
import { ConfirmDialog, Modal } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { GateCalculator } from '../GateCalculator'
import { ReconstructedDiagram } from '../ReconstructedDiagram'
import type { GateQuestion } from '../types'

/*
 * The TCS iON-style CBT console shared by the official mock (/gate/cbt/:paper)
 * and custom tests (/gate/tests/:id): instructions first, then a question pane
 * with a section bar, a palette with the five official statuses, Save & Next /
 * Mark for Review & Next / Clear Response, an on-screen calculator and a
 * countdown that submits at zero.
 *
 * As in the real exam a response counts only once it is saved; moving away
 * without saving discards the change. Grading is the caller's job (onSubmit).
 */

import { STATUS_LABEL, cbtOptions, clearCbtSaved, formatHms, hasValue, loadSaved, type CbtResponse, type CbtSection, type QuestionStatus, type Saved } from './cbtCore'

export type { CbtResponse, CbtSection, QuestionStatus } from './cbtCore'

/* ── Palette status chip (shape + colour, like TCS iON) ─────────────────── */

const SHAPE: Record<QuestionStatus, string> = {
  answered: '[clip-path:polygon(0_0,100%_0,100%_68%,50%_100%,0_68%)]',
  'not-answered': '[clip-path:polygon(50%_0,100%_32%,100%_100%,0_100%,0_32%)]',
  'marked-for-review': 'rounded-full',
  'answered-marked': 'rounded-full',
  'not-visited': 'rounded-md',
}
const FILL: Record<QuestionStatus, string> = {
  answered: 'bg-state-success text-bg-app',
  'not-answered': 'bg-state-error text-bg-app',
  'marked-for-review': 'bg-state-info text-bg-app',
  'answered-marked': 'bg-state-info text-bg-app',
  'not-visited': 'bg-bg-surface-3 text-text-secondary border border-border',
}
export function StatusChip({ status, children, className }: { status: QuestionStatus; children: ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center font-mono text-[12px] font-semibold tabular-nums', SHAPE[status], FILL[status], className)}>
      {children}
      {status === 'answered-marked' && <span className="absolute right-0 bottom-0 size-2 rounded-full bg-state-success ring-2 ring-bg-surface" aria-hidden="true" />}
    </span>
  )
}

/* ── The console ─────────────────────────────────────────────────────────── */

export interface CbtConsoleProps {
  title: string
  questions: GateQuestion[]
  sections: CbtSection[]
  /** Which section a question belongs to (ids from `sections`). */
  sectionOf: (q: GateQuestion) => string
  durationMinutes: number
  totalMarks: number
  /** localStorage key that keeps the attempt across reloads. */
  storageKey: string
  /** GATE's −1/3 on wrong MCQs (default on). */
  negativeMarking?: boolean
  onExit: () => void
  exitLabel?: string
  /** Grade the attempt; throw to show the error with a retry. */
  onSubmit: (responses: Record<string, CbtResponse>, timeSpent: Record<string, number>) => Promise<void>
  /** Extra lines at the top of the instructions. */
  intro?: ReactNode
}

export function CbtConsole({
  title,
  questions,
  sections,
  sectionOf,
  durationMinutes,
  totalMarks,
  storageKey,
  negativeMarking = true,
  onExit,
  exitLabel = 'Back',
  onSubmit,
  intro,
}: CbtConsoleProps) {
  const { user } = useAuth()
  const [phase, setPhase] = useState<'instructions' | 'exam' | 'done'>('instructions')
  const [agreed, setAgreed] = useState(false)
  const [resume, setResume] = useState<Saved | null>(() => loadSaved(storageKey))

  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, CbtResponse>>({})
  const [draft, setDraft] = useState<CbtResponse | undefined>(undefined)
  const [statusMap, setStatusMap] = useState<Record<string, QuestionStatus>>({})
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60)
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({})

  const [showCalc, setShowCalc] = useState(false)
  const [showPaper, setShowPaper] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [showExit, setShowExit] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentQIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      /* not allowed here */
    }
  }

  const currentQuestion = questions[currentIndex]
  useEffect(() => {
    currentQIdRef.current = currentQuestion?.id ?? null
  }, [currentQuestion])
  const running = phase === 'exam'

  const begin = (from: Saved | null) => {
    const initial: Record<string, QuestionStatus> = {}
    questions.forEach((q, idx) => (initial[q.id] = idx === 0 ? 'not-answered' : 'not-visited'))
    if (from) {
      const at = Math.min(from.currentIndex, questions.length - 1)
      setResponses(from.responses)
      setStatusMap({ ...initial, ...from.statusMap })
      setTimeRemaining(from.timeRemaining)
      setTimeSpent(from.timeSpent)
      setCurrentIndex(at)
      setDraft(from.responses[questions[at]?.id])
    } else {
      setResponses({})
      setStatusMap(initial)
      setTimeSpent({})
      setCurrentIndex(0)
      setDraft(undefined)
      setTimeRemaining(durationMinutes * 60)
    }
    setPhase('exam')
  }

  // Timer (pure updater; auto-submit is a separate effect).
  const timeUp = timeRemaining <= 0
  useEffect(() => {
    if (!running || timeUp) return
    const t = setInterval(() => {
      setTimeRemaining((p) => Math.max(0, p - 1))
      const id = currentQIdRef.current
      if (id) setTimeSpent((ts) => ({ ...ts, [id]: (ts[id] || 0) + 1 }))
    }, 1000)
    return () => clearInterval(t)
  }, [running, timeUp])

  // Keep the attempt across an accidental reload.
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => {
      try {
        const s: Saved = { v: 1, responses, statusMap, timeRemaining, timeSpent, currentIndex }
        localStorage.setItem(storageKey, JSON.stringify(s))
      } catch {
        /* ignore */
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [running, responses, statusMap, timeRemaining, timeSpent, currentIndex, storageKey])

  // Warn before closing the tab mid-exam.
  useEffect(() => {
    if (!running) return
    const onBefore = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [running])

  useAgentPageContext({
    examActive: true,
    title,
    gateQuestionId: running ? currentQuestion?.id : undefined,
    gateQuestionText:
      running && currentQuestion
        ? [`Q${currentIndex + 1} (${currentQuestion.type})`, currentQuestion.text, ...currentQuestion.options.map((o) => `(${o.l}) ${o.t}`)].join('\n').slice(0, 3000)
        : undefined,
  })

  /* ── Navigation & responses ── */

  const visit = (index: number, saved: Record<string, CbtResponse>) => {
    const target = questions[index]
    setCurrentIndex(index)
    setDraft(saved[target.id]) // unsaved changes are discarded, as in TCS iON
    setStatusMap((prev) => (prev[target.id] === 'not-visited' || !prev[target.id] ? { ...prev, [target.id]: 'not-answered' } : prev))
    scrollRef.current?.scrollTo({ top: 0 })
  }
  const jumpToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return
    visit(index, responses)
    setPaletteOpen(false)
  }

  const commit = (mark: boolean) => {
    if (!currentQuestion) return
    const id = currentQuestion.id
    const has = hasValue(draft)
    const next = { ...responses }
    if (has) next[id] = draft as CbtResponse
    else delete next[id]
    setResponses(next)
    setStatusMap((prev) => ({ ...prev, [id]: mark ? (has ? 'answered-marked' : 'marked-for-review') : has ? 'answered' : 'not-answered' }))
    if (currentIndex < questions.length - 1) visit(currentIndex + 1, next)
  }

  const clearResponse = () => {
    if (!currentQuestion) return
    const id = currentQuestion.id
    setDraft(undefined)
    setResponses((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setStatusMap((prev) => ({ ...prev, [id]: 'not-answered' }))
  }

  const selectOption = (l: string) => {
    if (!currentQuestion) return
    if (currentQuestion.type === 'MSQ') {
      const cur = Array.isArray(draft) ? draft : []
      setDraft(cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l])
    } else setDraft(l)
  }

  /* ── Submit ── */

  const handleSubmitExam = async () => {
    setShowSubmit(false)
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(responses, timeSpent)
      clearCbtSaved(storageKey)
      setResume(null)
      setPhase('done')
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not evaluate the attempt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitRef = useRef(handleSubmitExam)
  useEffect(() => {
    submitRef.current = handleSubmitExam
  })
  const autoSubmittedRef = useRef(false)
  useEffect(() => {
    if (!timeUp || !running || isSubmitting || autoSubmittedRef.current) return
    autoSubmittedRef.current = true
    void submitRef.current()
  }, [timeUp, running, isSubmitting])

  /* ── Counts ── */
  const countsFor = (qs: GateQuestion[]) => {
    const c: Record<QuestionStatus, number> = { answered: 0, 'not-answered': 0, 'not-visited': 0, 'marked-for-review': 0, 'answered-marked': 0 }
    qs.forEach((q) => c[statusMap[q.id] || 'not-visited']++)
    return c
  }
  const counts = countsFor(questions)
  const bySection = useMemo(() => {
    const m = new Map<string, GateQuestion[]>()
    for (const q of questions) {
      const s = sectionOf(q)
      m.set(s, [...(m.get(s) ?? []), q])
    }
    return m
  }, [questions, sectionOf])
  const activeSectionId = currentQuestion ? sectionOf(currentQuestion) : sections[0]?.id

  /* ── Render ── */

  if (phase === 'done') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status">
        <div className="size-8 animate-spin rounded-full border-2 border-accent-brand border-t-transparent" />
        <p className="text-[14px] text-text-muted">Preparing your report…</p>
      </div>
    )
  }

  const candidate = (user && (typeof user.display_name === 'string' ? user.display_name : user.username)) || 'Candidate'

  if (phase === 'instructions') {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col bg-bg-app text-text-primary">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg-surface px-4 sm:px-6">
          <button type="button" onClick={onExit} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-surface-2 hover:text-text-primary" aria-label={exitLabel}>
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="min-w-0 truncate text-[15px] font-semibold">{title}</h1>
          <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-text-secondary">
            <span className="flex size-7 items-center justify-center rounded-full bg-bg-surface-3">
              <User className="size-4" />
            </span>
            <span className="hidden sm:inline">{candidate}</span>
          </span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
            <div>
              <h2 className="font-display text-xl font-semibold">General instructions</h2>
              <p className="mt-1 text-[13.5px] text-text-muted">Please read the instructions carefully.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['Duration', `${durationMinutes} min`],
                ['Questions', String(questions.length)],
                ['Marks', String(totalMarks)],
              ].map(([k, v]) => (
                <div key={k} className="card !p-3">
                  <div className="text-[11.5px] tracking-wide text-text-muted uppercase">{k}</div>
                  <div className="mt-0.5 font-mono text-lg font-semibold">{v}</div>
                </div>
              ))}
            </div>
            {intro}
            <InstructionsBody durationMinutes={durationMinutes} totalQuestions={questions.length} totalMarks={totalMarks} sections={sections} negativeMarking={negativeMarking} />
            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-bg-surface p-3 text-[13.5px]">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-accent-brand)]" />
              <span>I have read and understood the instructions. I agree that the answer key and solutions are shown only after I submit.</span>
            </label>
            <div className="flex flex-wrap items-center justify-end gap-2 pb-10">
              {resume && (
                <button type="button" disabled={!agreed} onClick={() => begin(resume)} className="btn-secondary !px-4 !py-2 disabled:opacity-50">
                  Resume attempt ({formatHms(resume.timeRemaining)} left)
                </button>
              )}
              <button
                type="button"
                disabled={!agreed}
                onClick={() => {
                  clearCbtSaved(storageKey)
                  setResume(null)
                  begin(null)
                }}
                className="btn-primary !px-5 !py-2 disabled:opacity-50"
              >
                {resume ? 'Start over' : 'I am ready to begin'}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  const opts = currentQuestion ? cbtOptions(currentQuestion) : []
  const isUrgent = timeRemaining < Math.min(10 * 60, durationMinutes * 6)
  const qNo = currentIndex + 1
  const secLabel = (id: string | undefined) => sections.find((s) => s.id === id)?.title ?? 'Questions'
  const negFor = (q: GateQuestion) => (negativeMarking && q.type === 'MCQ' ? `−${((q.marks ?? 1) / 3).toFixed(2)}` : '−0')

  const palette = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-bg-surface-3 text-text-secondary">
          <User className="size-4" />
        </span>
        <span className="min-w-0 truncate text-[13px] font-medium">{candidate}</span>
        <button type="button" onClick={() => setPaletteOpen(false)} className="ml-auto rounded-lg p-1 text-text-muted hover:text-text-primary lg:hidden" aria-label="Close palette">
          <X className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-2 border-b border-border p-3 text-[11.5px] text-text-secondary">
        {(['answered', 'not-answered', 'not-visited', 'marked-for-review', 'answered-marked'] as QuestionStatus[]).map((s) => (
          <div key={s} className={cn('flex items-center gap-2', s === 'answered-marked' && 'col-span-2')}>
            <StatusChip status={s} className="h-6 w-7 shrink-0 text-[11px]">
              {counts[s]}
            </StatusChip>
            <span>{STATUS_LABEL[s]}</span>
          </div>
        ))}
        <p className="col-span-2 text-[11px] text-text-muted">Answered &amp; marked for review questions are evaluated.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 text-[12px] font-semibold text-text-primary">{secLabel(activeSectionId)}</div>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => {
            if (sectionOf(q) !== activeSectionId) return null
            const s = statusMap[q.id] || 'not-visited'
            const cur = idx === currentIndex
            return (
              <button key={q.id} type="button" onClick={() => jumpToQuestion(idx)} aria-label={`Question ${idx + 1}: ${STATUS_LABEL[s]}`} aria-current={cur ? 'true' : undefined} className="relative flex flex-col items-center">
                <StatusChip status={s} className="h-9 w-full">
                  {idx + 1}
                </StatusChip>
                <span className={cn('mt-0.5 h-0.5 w-5 rounded-full', cur ? 'bg-accent-brand' : 'bg-transparent')} />
              </button>
            )
          })}
        </div>
      </div>
      <div className="border-t border-border p-3 lg:pr-16">
        <button type="button" onClick={() => setShowSubmit(true)} className="btn-primary inline-flex w-full items-center justify-center gap-2 !py-2.5">
          <Send className="size-4" /> Submit
        </button>
      </div>
    </div>
  )

  const toolBtn = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-2.5 text-[12.5px] text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-bg-app text-text-primary">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg-surface px-2 sm:px-4">
        <button type="button" onClick={() => setShowExit(true)} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-surface-2 hover:text-text-primary" aria-label="Leave" title="Leave">
          <Icon name="logout" className="size-4.5 -scale-x-100" />
        </button>
        <h1 className="hidden min-w-0 truncate text-[14px] font-semibold md:block">{title}</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => setShowCalc((s) => !s)} className={toolBtn} aria-pressed={showCalc} title="Calculator">
            <Icon name="calculator" className="size-4" />
            <span className="hidden sm:inline">Calculator</span>
          </button>
          <button type="button" onClick={() => setShowPaper(true)} className={toolBtn} title="Question paper">
            <FileText className="size-4" />
            <span className="hidden sm:inline">Question paper</span>
          </button>
          <button type="button" onClick={() => setShowInstructions(true)} className={toolBtn} title="Instructions">
            <Icon name="help" className="size-4" />
            <span className="hidden xl:inline">Instructions</span>
          </button>
          <button type="button" onClick={toggleFullscreen} className={cn(toolBtn, 'hidden sm:inline-flex')} title={isFullscreen ? 'Exit full screen' : 'Full screen'}>
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
          <div
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[13.5px] font-semibold tabular-nums',
              isUrgent ? 'border-state-error/60 bg-state-error/10 text-state-error' : 'border-border bg-bg-surface-2 text-text-primary',
            )}
            role="timer"
            aria-label={`Time left ${formatHms(timeRemaining)}`}
          >
            <Icon name="clock" className="size-4" />
            <span className="hidden text-[11.5px] font-normal text-text-muted sm:inline">Time left</span>
            {formatHms(timeRemaining)}
          </div>
          <button type="button" onClick={() => setPaletteOpen(true)} className={cn(toolBtn, 'lg:hidden')} aria-label="Question palette">
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </header>

      {/* Sections */}
      <nav className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-bg-surface px-2 sm:px-4" aria-label="Sections">
        {sections.map((sec) => {
          const qs = bySection.get(sec.id) ?? []
          const done = qs.filter((q) => ['answered', 'answered-marked'].includes(statusMap[q.id])).length
          const active = activeSectionId === sec.id
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                const first = questions.findIndex((q) => sectionOf(q) === sec.id)
                if (first !== -1) jumpToQuestion(first)
              }}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors',
                active ? 'bg-accent-brand/12 font-semibold text-accent-brand' : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary',
              )}
            >
              {sec.title}
              <span className="font-mono text-[11.5px] text-text-muted">
                {done}/{sec.count}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="flex min-h-0 flex-1">
        {/* Question pane */}
        <main className="flex min-w-0 flex-1 flex-col">
          {currentQuestion && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-6">
                <span className="text-[14px] font-semibold">Question {qNo}</span>
                <span className="flex items-center gap-3 text-[12px] text-text-muted">
                  <span>{currentQuestion.type === 'MSQ' ? 'Multiple select' : currentQuestion.type === 'NAT' ? 'Numerical answer' : currentQuestion.type === 'MCQ' ? 'Multiple choice' : currentQuestion.type}</span>
                  <span>
                    Marks <span className="font-mono text-state-success">+{currentQuestion.marks ?? 1}</span> <span className="font-mono text-state-error">{negFor(currentQuestion)}</span>
                  </span>
                </span>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6">
                  <div className="text-[15px] leading-relaxed">
                    <Markdown md={currentQuestion.text} />
                  </div>
                  {currentQuestion.figures?.length > 0 && <ReconstructedDiagram figures={currentQuestion.figures} />}

                  {currentQuestion.type === 'NAT' ? (
                    <NatPad key={currentQuestion.id} value={typeof draft === 'string' ? draft : ''} onChange={(v) => setDraft(v)} />
                  ) : opts.length > 0 ? (
                    <div className="space-y-2" role={currentQuestion.type === 'MSQ' ? 'group' : 'radiogroup'} aria-label="Options">
                      {opts.map((o) => {
                        const sel = currentQuestion.type === 'MSQ' ? Array.isArray(draft) && draft.includes(o.l) : draft === o.l
                        return (
                          <button
                            key={o.l}
                            type="button"
                            data-opt={o.l}
                            role={currentQuestion.type === 'MSQ' ? 'checkbox' : 'radio'}
                            aria-checked={sel}
                            onClick={() => selectOption(o.l)}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                              sel ? 'border-accent-brand bg-accent-brand/10' : 'border-border bg-bg-surface hover:bg-bg-surface-2',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-px flex size-5 shrink-0 items-center justify-center border-2',
                                currentQuestion.type === 'MSQ' ? 'rounded' : 'rounded-full',
                                sel ? 'border-accent-brand bg-accent-brand' : 'border-border-strong',
                              )}
                              aria-hidden="true"
                            >
                              {sel && <span className={cn('bg-on-accent-brand', currentQuestion.type === 'MSQ' ? 'size-2 rounded-[2px]' : 'size-2 rounded-full')} />}
                            </span>
                            <span className="w-5 shrink-0 font-mono text-[13px] font-semibold text-text-secondary">{o.l.length === 1 ? `${o.l}.` : ''}</span>
                            <span className="min-w-0 flex-1 text-[14.5px]">
                              <Markdown md={o.t} className="[&_p]:!m-0" />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <label className="block max-w-xl space-y-1.5">
                      <span className="text-[12px] text-text-muted">Your answer (compared loosely with the key)</span>
                      <textarea
                        value={typeof draft === 'string' ? draft : ''}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-border-input bg-bg-field px-3 py-2 text-[14px] text-text-primary outline-none focus:border-accent-brand"
                      />
                    </label>
                  )}
                </div>
              </div>

              <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-bg-surface px-3 py-2 sm:px-6">
                <button type="button" onClick={() => commit(true)} className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-2 !text-[13px]">
                  <Icon name="bookmark" className="size-3.5" />
                  <span className="sm:hidden">Review</span>
                  <span className="hidden sm:inline">Mark for review &amp; next</span>
                </button>
                <button type="button" onClick={clearResponse} className="btn-secondary !px-3 !py-2 !text-[13px]">
                  Clear <span className="hidden sm:inline">response</span>
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button type="button" onClick={() => jumpToQuestion(currentIndex - 1)} disabled={currentIndex === 0} className="btn-secondary !px-2.5 !py-2 disabled:opacity-40" aria-label="Previous question">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button type="button" onClick={() => commit(false)} className="btn-primary inline-flex items-center gap-1 !px-4 !py-2 !text-[13px]">
                    Save &amp; next <ChevronRight className="size-4" />
                  </button>
                </div>
              </footer>
            </>
          )}
        </main>

        {/* Palette: side column on wide screens, drawer on small ones */}
        <aside className="hidden w-72 shrink-0 border-l border-border bg-bg-surface lg:block xl:w-80">{palette}</aside>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-label="Question palette">
          <button type="button" className="absolute inset-0 bg-bg-app/60 backdrop-blur-[2px]" onClick={() => setPaletteOpen(false)} aria-label="Close palette" />
          <div className="absolute inset-y-0 right-0 w-[min(88vw,340px)] border-l border-border bg-bg-surface shadow-2xl">{palette}</div>
        </div>
      )}

      <GateCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />

      <Modal open={showPaper} onClose={() => setShowPaper(false)} title="Question paper" description={title} size="xl">
        <div className="space-y-6">
          {questions.map((q, i) => (
            <section key={q.id} className="space-y-2 border-b border-border pb-5 last:border-0">
              <div className="flex items-center justify-between text-[12.5px]">
                <button
                  type="button"
                  className="font-semibold text-accent-brand hover:underline"
                  onClick={() => {
                    setShowPaper(false)
                    jumpToQuestion(i)
                  }}
                >
                  Question {i + 1}
                </button>
                <span className="text-text-muted">
                  {secLabel(sectionOf(q))} · {q.type} · {q.marks ?? 1} mark{q.marks === 1 ? '' : 's'}
                </span>
              </div>
              <Markdown md={q.text} className="text-[14px]" />
              {q.figures?.length > 0 && <ReconstructedDiagram figures={q.figures} compact className="my-2" />}
              {cbtOptions(q).length > 0 && (
                <ol className="space-y-1">
                  {cbtOptions(q).map((o) => (
                    <li key={o.l} className="flex gap-2 text-[13.5px] text-text-secondary">
                      <span className="shrink-0 font-mono font-semibold">({o.l})</span>
                      <Markdown md={o.t} className="min-w-0 flex-1 [&_p]:!m-0" />
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </Modal>

      <Modal open={showInstructions} onClose={() => setShowInstructions(false)} title="Instructions" size="lg">
        <InstructionsBody durationMinutes={durationMinutes} totalQuestions={questions.length} totalMarks={totalMarks} sections={sections} negativeMarking={negativeMarking} />
      </Modal>

      <Modal open={showSubmit} onClose={() => setShowSubmit(false)} title="Submit the exam?" description="Once submitted you can’t change your responses." size="md">
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] text-text-muted">
                  <th className="py-1.5 pr-2 font-medium">Section</th>
                  <th className="px-1 py-1.5 text-center font-medium">Answered</th>
                  <th className="px-1 py-1.5 text-center font-medium">Not answered</th>
                  <th className="px-1 py-1.5 text-center font-medium">Review</th>
                  <th className="px-1 py-1.5 text-center font-medium">Not visited</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {sections.map((sec) => {
                  const c = countsFor(bySection.get(sec.id) ?? [])
                  return (
                    <tr key={sec.id} className="border-t border-border">
                      <td className="py-2 pr-2 font-sans">{sec.title}</td>
                      <td className="text-center text-state-success">{c.answered + c['answered-marked']}</td>
                      <td className="text-center text-state-error">{c['not-answered']}</td>
                      <td className="text-center text-state-info">{c['marked-for-review'] + c['answered-marked']}</td>
                      <td className="text-center text-text-muted">{c['not-visited']}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {hasValue(draft) && currentQuestion && !hasValue(responses[currentQuestion.id]) && (
            <p className="rounded-lg border border-state-warning/40 bg-state-warning/10 px-3 py-2 text-[12.5px] text-text-primary">The response on question {qNo} isn’t saved yet and won’t be evaluated.</p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowSubmit(false)} className="btn-secondary !px-4 !py-2 !text-[13px]">
              Keep working
            </button>
            <button type="button" onClick={handleSubmitExam} disabled={isSubmitting} className="btn-primary !px-4 !py-2 !text-[13px]">
              {isSubmitting ? 'Evaluating…' : 'Yes, submit'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showExit}
        onClose={() => setShowExit(false)}
        onConfirm={() => {
          setShowExit(false)
          onExit()
        }}
        title="Leave the exam?"
        message="Your attempt is kept on this device — you can resume it later."
        confirmLabel="Leave"
      />

      {(isSubmitting || submitError) && (
        <div className="fixed inset-x-0 bottom-4 z-[130] mx-auto w-fit max-w-[92vw] rounded-xl border border-border bg-bg-surface px-4 py-2.5 text-[13px] shadow-xl" role="status">
          {isSubmitting ? (
            'Evaluating your responses…'
          ) : (
            <span className="flex items-center gap-3">
              <span className="text-state-error">{submitError}</span>
              <button type="button" className="font-semibold text-accent-brand" onClick={handleSubmitExam}>
                Retry
              </button>
            </span>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function InstructionsBody({
  durationMinutes,
  totalQuestions,
  totalMarks,
  sections,
  negativeMarking,
}: {
  durationMinutes: number
  totalQuestions: number
  totalMarks: number
  sections: CbtSection[]
  negativeMarking: boolean
}) {
  return (
    <div className="space-y-4 text-[13.5px] leading-relaxed text-text-secondary">
      <section>
        <h3 className="mb-1.5 text-[14px] font-semibold text-text-primary">The paper</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {durationMinutes} minutes, {totalQuestions} questions, {totalMarks} marks. The clock at the top right counts down; the exam is submitted automatically at zero.
          </li>
          {sections.map((s) => (
            <li key={s.id}>
              {s.title}: {s.count} questions, {s.marks} marks.
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-1.5 text-[14px] font-semibold text-text-primary">Answering</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-text-primary">Save &amp; next</strong> saves the response and opens the next question. A response that isn’t saved is discarded when you move to another question.
          </li>
          <li>
            <strong className="text-text-primary">Mark for review &amp; next</strong> saves the response and flags the question. Answered questions that are marked for review are evaluated.
          </li>
          <li>
            <strong className="text-text-primary">Clear response</strong> removes the saved answer. Numerical answers are typed with the on-screen keypad or the keyboard.
          </li>
        </ul>
      </section>
      <section>
        <h3 className="mb-1.5 text-[14px] font-semibold text-text-primary">Question palette</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['not-visited', 'not-answered', 'answered', 'marked-for-review', 'answered-marked'] as QuestionStatus[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <StatusChip status={s} className="h-7 w-8 shrink-0">
                {i + 1}
              </StatusChip>
              <span>{STATUS_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-1.5 text-[14px] font-semibold text-text-primary">Marking</h3>
        <ul className="list-disc space-y-1 pl-5">
          {negativeMarking ? (
            <li>MCQ: a wrong answer costs 1/3 of the question’s marks (−0.33 for 1 mark, −0.67 for 2 marks).</li>
          ) : (
            <li>MCQ: no negative marking in this test.</li>
          )}
          <li>MSQ: all correct options and no wrong ones for credit; no partial or negative marks.</li>
          <li>NAT: no negative marks; answers within the key’s range are correct.</li>
        </ul>
      </section>
    </div>
  )
}

export function NatPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => {
    if (k === '⌫') onChange(value.slice(0, -1))
    else if (k === 'Clear') onChange('')
    else if (k === '-') onChange(value.startsWith('-') ? value.slice(1) : `-${value}`)
    else if (k === '.' && value.includes('.')) return
    else onChange(value + k)
  }
  return (
    <div className="max-w-xs space-y-2">
      <label className="block text-[12px] text-text-muted" htmlFor="nat-input">
        Your answer
      </label>
      <input
        id="nat-input"
        value={value}
        inputMode="decimal"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.-]/g, ''))}
        className="w-full rounded-xl border border-border-input bg-bg-field px-3 py-2 font-mono text-[16px] text-text-primary outline-none focus:border-accent-brand"
      />
      <div className="grid grid-cols-4 gap-1.5 font-mono text-[14px]">
        {['7', '8', '9', '⌫', '4', '5', '6', '-', '1', '2', '3', 'Clear', '0', '.'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === '⌫' ? 'Backspace' : k === '-' ? 'Toggle sign' : k}
            className={cn(
              'h-10 rounded-lg border border-border transition-colors',
              k === 'Clear' ? 'col-span-1 text-[12px] text-text-secondary hover:bg-bg-surface-3' : 'bg-bg-surface hover:bg-bg-surface-2',
              k === '0' && 'col-span-2',
            )}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
