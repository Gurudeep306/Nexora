import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, XCircle, ExternalLink, Eye, EyeOff, Link2, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentPageContext } from '@/context/AgentContext'
import { Markdown } from '@/learn/md'
import { ReconstructedDiagram } from './ReconstructedDiagram'
import { TYPE_LABEL, TYPE_SHORT, paperLabel, qLabel, type GateQuestion } from './types'
import { fmtInterval, recordAttempt, releaseAttempt, scheduleLocal, setConfidence, toggleBookmark, useQuestionProgress, type Outcome } from './progress'
import { checkIsCorrect, formatKey, hasOptions, isKeyOption, isSelfCheck, tfOptions, type Pick } from './answers'
import { solutionToText, useGateSolution } from './solution/useGateSolution'
import { fmtClock, useQuestionTimer } from './useQuestionTimer'
import type { AttemptMode } from './api'
import { BookmarkButton } from './practice/BookmarkButton'
import { NoteEditor, type NoteEditorHandle } from './practice/NoteEditor'
import { QuestionStatsPanel } from './practice/QuestionStatsPanel'
import { SimilarStrip } from './practice/SimilarStrip'

const GateSolution = lazy(() => import('./solution/GateSolution'))

/* ── Small pieces ───────────────────────────────────────────────────────── */

export function SubjectChip({ subject, topic, name, topicName }: { subject: string; topic?: string; name?: string; topicName?: string }) {
  return (
    <span className="min-w-0 text-[12px] leading-snug text-text-muted" title={topicName || topic}>
      <span className="font-medium text-text-secondary">{name ?? subject.toUpperCase()}</span>
      {topicName && <> · {topicName}</>}
    </span>
  )
}

export function OutcomeDot({ outcome, className }: { outcome?: Outcome; className?: string }) {
  if (!outcome || outcome === 'skipped') return null
  return (
    <span
      role="img"
      aria-label={outcome === 'correct' ? 'Solved' : outcome === 'wrong' ? 'Attempted, incorrect' : 'Answer seen'}
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        outcome === 'correct' && 'bg-state-success',
        outcome === 'wrong' && 'bg-state-error',
        (outcome === 'revealed' || outcome === 'partial') && 'bg-text-muted',
        className,
      )}
    />
  )
}

/* ── The question card ──────────────────────────────────────────────────── */

export interface AttemptEvent {
  questionId: string
  outcome: Outcome
  timeMs: number
}

const CONFIDENCE: Array<{ c: 1 | 2 | 3; label: string; hint: string }> = [
  { c: 1, label: 'Guessed', hint: 'See it again soon' },
  { c: 2, label: 'Unsure', hint: 'Normal interval' },
  { c: 3, label: 'Confident', hint: 'Push it further out' },
]

export function QuestionView({
  q,
  subjectName,
  topicName,
  compact,
  onOpen,
  initialShowSolution = false,
  reportToAssistant = false,
  keyboard = false,
  initialPick,
  position,
  mode = 'practice',
  insights = false,
  onAttempt,
  onRated,
  onNext,
}: {
  q: GateQuestion
  subjectName?: string
  topicName?: string
  compact?: boolean
  onOpen?: () => void
  initialShowSolution?: boolean
  /** This is the question in focus: tell the floating assistant about it. */
  reportToAssistant?: boolean
  /** Number keys pick options, Enter checks, S solution, B bookmark, N note, 1–3 / C confidence. */
  keyboard?: boolean
  /** Review mode (after a mock): start with this response already checked. */
  initialPick?: Pick
  /** "12 of 65" — shown in the header when given. */
  position?: string
  /** How attempts made here are recorded. */
  mode?: AttemptMode
  /** Notes, community stats and similar questions around the card. */
  insights?: boolean
  /** Fired once per Check / Reveal / self-grade. */
  onAttempt?: (e: AttemptEvent) => void
  /** Fired when a confidence rating is given. */
  onRated?: (c: 1 | 2 | 3) => void
  /** Enter after answering moves on (review / daily flows). */
  onNext?: () => void
}) {
  const review = initialPick !== undefined
  const [showSolution, setShowSolution] = useState(initialShowSolution)
  const [userPick, setUserPick] = useState<Pick>(initialPick)
  const [hasChecked, setHasChecked] = useState(review)
  const [selfGrade, setSelfGrade] = useState<boolean | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [conf, setConf] = useState<1 | 2 | 3 | null>(null)
  const [myTime, setMyTime] = useState<number | null>(null)
  const progress = useQuestionProgress(q.id)
  const [reviewBefore] = useState(() => progress.review)
  const note = useRef<NoteEditorHandle>(null)

  const isUserCorrect = checkIsCorrect(q, userPick)
  const revealed = hasChecked || showSolution
  const options = tfOptions(q)
  const selfCheck = isSelfCheck(q)
  const hasPick = userPick !== undefined && userPick !== '' && !(Array.isArray(userPick) && userPick.length === 0)
  const answered = hasChecked || showSolution
  const timer = useQuestionTimer(!review && !answered && !compact)

  // Fetched only once the solution is revealed (never ships with the list).
  const solution = useGateSolution(q.id, showSolution)
  useAgentPageContext(
    reportToAssistant
      ? {
          gateQuestionId: q.id,
          title: `${paperLabel(q)} Q${q.number}`,
          gateAnswered: answered,
          gateQuestionText: [
            `${paperLabel(q)} Q${q.number} · ${TYPE_LABEL[q.type]}${q.marks != null ? ` · ${q.marks} marks` : ''} · ${subjectName ?? q.subject}${topicName ? ` / ${topicName}` : ''}`,
            q.text,
            ...q.options.map((o) => `(${o.l}) ${o.t}`),
            userPick !== undefined ? `Student's pick: ${Array.isArray(userPick) ? userPick.join(', ') : String(userPick)}` : '',
          ]
            .filter(Boolean)
            .join('\n')
            .slice(0, 3000),
          // Only what the student has already revealed on screen.
          visibleText: answered
            ? `Answer shown on screen: ${JSON.stringify(q.answer)}${showSolution ? `\nSolution shown:\n${solutionToText(solution.data)}` : ''}`.slice(0, 6000)
            : undefined,
        }
      : null,
  )

  const record = (o: Outcome, response: Pick | null, extra: { revealed?: boolean } = {}) => {
    const timeMs = Math.round(timer.read())
    setMyTime(timeMs)
    setOutcome(o)
    recordAttempt({ questionId: q.id, response: response ?? null, timeMs, mode, outcome: o, ...extra }, { hold: o === 'correct' })
    onAttempt?.({ questionId: q.id, outcome: o, timeMs })
  }

  // Leaving the question: send a held attempt; an ungraded self-check counts as seen.
  const pending = useRef({ selfOpen: false, recorded: false, mode })
  useEffect(() => {
    pending.current = { selfOpen: hasChecked && selfCheck && !review, recorded: outcome !== null, mode }
  })
  useEffect(
    () => () => {
      releaseAttempt(q.id)
      const p = pending.current
      if (p.selfOpen && !p.recorded) recordAttempt({ questionId: q.id, response: null, timeMs: 0, mode: p.mode, outcome: 'revealed', revealed: true })
    },
    [q.id],
  )

  const handlePickOption = (optLabel: string) => {
    if (revealed) return
    if (q.type === 'MSQ') {
      const list: string[] = Array.isArray(userPick) ? userPick : []
      setUserPick(list.includes(optLabel) ? list.filter((x) => x !== optLabel) : [...list, optLabel])
    } else {
      setUserPick(optLabel)
    }
  }

  const handleCheckPractice = () => {
    if (revealed) return
    if (selfCheck) {
      setHasChecked(true)
      setMyTime(Math.round(timer.read()))
      return
    }
    if (!hasPick) return
    setHasChecked(true)
    if (!review) record(isUserCorrect ? 'correct' : 'wrong', userPick)
  }

  const toggleSolution = () => {
    if (!showSolution && !hasChecked && !review && outcome === null) record('revealed', null, { revealed: true })
    setShowSolution((s) => !s)
  }

  const grade = (ok: boolean) => {
    if (selfGrade !== null) return
    setSelfGrade(ok)
    record(ok ? 'correct' : 'wrong', typeof userPick === 'string' ? userPick : null)
  }

  const rate = (c: 1 | 2 | 3) => {
    if (outcome !== 'correct') return
    setConf(c)
    setConfidence(q.id, c)
    onRated?.(c)
  }

  // Keyboard: 1–9 / A–D pick, Enter checks, S solution, B bookmark, N note, C / 1–3 confidence.
  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('[role="dialog"]'))) return
      const k = e.key
      if (outcome === 'correct' && /^[1-3]$/.test(k)) {
        e.preventDefault()
        rate(Number(k) as 1 | 2 | 3)
        return
      }
      const idx = !revealed && /^[1-9]$/.test(k) ? Number(k) - 1 : !revealed && /^[a-d]$/i.test(k) && options.length > 0 && !e.shiftKey ? k.toUpperCase().charCodeAt(0) - 65 : -1
      if (idx >= 0 && options[idx]) {
        e.preventDefault()
        handlePickOption(options[idx].l)
      } else if (k === 'Enter' && !(t && t.closest('button, a'))) {
        e.preventDefault()
        if (!answered) handleCheckPractice()
        else onNext?.()
      } else if (k === 's' || k === 'S') {
        e.preventDefault()
        toggleSolution()
      } else if (k === 'b' || k === 'B') {
        e.preventDefault()
        toggleBookmark(q.id)
      } else if ((k === 'n' || k === 'N') && insights) {
        e.preventDefault()
        note.current?.focus()
      } else if ((k === 'c' || k === 'C') && outcome === 'correct') {
        e.preventDefault()
        rate(conf === null ? 2 : (((conf % 3) + 1) as 1 | 2 | 3))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const negative = q.type === 'MCQ' && q.marks ? `−${(q.marks / 3).toFixed(2)}` : '0'
  const showTimer = !review && !compact
  const clock = fmtClock(answered && myTime != null ? myTime / 1000 : timer.seconds)

  return (
    <div className="space-y-4">
      <article id={q.id} className="card relative overflow-clip !p-0">
        {/* ── Card header ── */}
        <header className="flex flex-col gap-1.5 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-[15px] font-semibold text-text-primary">{qLabel(q)}</h2>
            <span className="min-w-0 truncate text-[12.5px] text-text-muted">{paperLabel(q)}</span>
            {position && <span className="hidden text-[12px] text-text-muted sm:inline">· {position}</span>}
            <span className="ml-auto flex shrink-0 items-center gap-1">
              {showTimer && (
                <span
                  className={cn(
                    'mr-1 inline-flex h-6 min-w-[3.75rem] items-center justify-center gap-1 rounded-md border px-1.5 font-mono text-[11.5px] tabular-nums',
                    answered ? 'border-border bg-bg-surface-2 text-text-secondary' : 'border-transparent text-text-muted',
                  )}
                  title={answered ? 'Time you took' : 'Time on this question (pauses when you switch tabs)'}
                  role="timer"
                  aria-label={`Time on question ${clock}`}
                >
                  <Timer className="size-3" aria-hidden="true" />
                  {clock}
                </span>
              )}
              <OutcomeDot outcome={progress.outcome} className="mr-1" />
              <BookmarkButton questionId={q.id} />
              {onOpen && (
                <button
                  type="button"
                  onClick={onOpen}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
                  title="Open in practice"
                  aria-label="Open in practice"
                >
                  <Link2 className="size-4" />
                </button>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-md border border-border bg-bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary" title={TYPE_LABEL[q.type]}>
              {TYPE_SHORT[q.type]}
            </span>
            {q.marks != null && (
              <span className="rounded-md border border-border bg-bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                {q.marks} mark{q.marks === 1 ? '' : 's'}
              </span>
            )}
            <SubjectChip subject={q.subject} topic={q.topic} name={subjectName} topicName={topicName} />
            {progress.attempts > 0 && !compact && (
              <span className="ml-auto text-[11.5px] text-text-muted tabular-nums">
                {progress.correct}/{progress.attempts} correct so far
              </span>
            )}
          </div>
        </header>

        {/* ── Question body ── */}
        <div className="space-y-4 p-4 sm:p-6">
          <div className="gate-q-text text-[15px] leading-relaxed text-text-primary sm:text-[15.5px]">
            <Markdown md={q.text} />
          </div>

          {q.figures && q.figures.length > 0 && <ReconstructedDiagram questionId={q.id} figures={q.figures} subject={q.subject} topic={q.topic} />}

          {/* Options */}
          {options.length > 0 && (
            <div role={q.type === 'MSQ' ? 'group' : 'radiogroup'} aria-label="Options" className="grid gap-2">
              {q.type === 'MSQ' && !revealed && <p className="text-[12px] text-text-muted">Select all that apply.</p>}
              {options.map((o, i) => {
                const isKey = revealed && isKeyOption(q, o.l)
                const isPicked = q.type === 'MSQ' ? Array.isArray(userPick) && userPick.includes(o.l) : userPick === o.l
                const isWrongPick = revealed && isPicked && !isKey
                return (
                  <button
                    key={o.l}
                    type="button"
                    data-opt={o.l}
                    role={q.type === 'MSQ' ? 'checkbox' : 'radio'}
                    aria-checked={isPicked}
                    disabled={revealed && !isPicked && !isKey}
                    onClick={() => handlePickOption(o.l)}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-default sm:px-3.5 sm:py-3',
                      !revealed && !isPicked && 'border-border bg-bg-surface hover:border-border-hover hover:bg-bg-surface-2',
                      !revealed && isPicked && 'border-accent-brand bg-accent-brand/10',
                      revealed && !isKey && !isWrongPick && 'border-border bg-bg-surface opacity-70',
                      isKey && 'border-state-success bg-state-success/10',
                      isWrongPick && 'border-state-error bg-state-error/10',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-px flex size-6 shrink-0 items-center justify-center border font-mono text-[12px] font-semibold transition-colors',
                        q.type === 'MSQ' ? 'rounded-md' : 'rounded-full',
                        !revealed && !isPicked && 'border-border-strong text-text-secondary group-hover:text-text-primary',
                        !revealed && isPicked && 'border-accent-brand bg-accent-brand text-on-accent-brand',
                        revealed && !isKey && !isWrongPick && 'border-border text-text-muted',
                        isKey && 'border-state-success bg-state-success text-bg-app',
                        isWrongPick && 'border-state-error bg-state-error text-bg-app',
                      )}
                      aria-hidden="true"
                    >
                      {o.l.length === 1 ? o.l : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5 text-[14.5px] text-text-primary">
                      <Markdown md={o.t} className="[&_p]:!m-0" />
                    </span>
                    {isKey && <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-state-success" aria-label="Correct option" />}
                    {isWrongPick && <XCircle className="mt-0.5 size-5 shrink-0 text-state-error" aria-label="Your pick" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Numerical answer */}
          {q.type === 'NAT' && (
            <form
              className="flex max-w-sm items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                handleCheckPractice()
              }}
            >
              <label className="sr-only" htmlFor={`nat-${q.id}`}>
                Your numerical answer
              </label>
              <input
                id={`nat-${q.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={typeof userPick === 'string' ? userPick : ''}
                disabled={revealed}
                onChange={(e) => setUserPick(e.target.value.replace(/[^0-9.eE+-]/g, ''))}
                placeholder="Your answer"
                className={cn(
                  'min-w-0 flex-1 rounded-xl border bg-bg-field px-3.5 py-2 font-mono text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent-brand focus:ring-2 focus:ring-accent-brand/25 disabled:opacity-90',
                  hasChecked ? (isUserCorrect ? 'border-state-success' : 'border-state-error') : 'border-border-input',
                )}
              />
            </form>
          )}

          {/* Feedback */}
          {hasChecked && !selfCheck && (
            <div
              role="status"
              className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3.5 py-2.5 text-[13.5px]',
                isUserCorrect ? 'border-state-success/40 bg-state-success/10' : !hasPick ? 'border-border bg-bg-surface-2' : 'border-state-error/40 bg-state-error/10',
              )}
            >
              <span className={cn('inline-flex items-center gap-1.5 font-semibold', isUserCorrect ? 'text-state-success' : !hasPick ? 'text-text-secondary' : 'text-state-error')}>
                {isUserCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {review && !hasPick ? 'Not attempted' : isUserCorrect ? 'Correct' : 'Incorrect'}
              </span>
              <span className="text-text-secondary">
                {isUserCorrect ? `+${q.marks ?? 1}` : hasPick ? negative : '0'} marks
                {!isUserCorrect && (
                  <>
                    {' '}
                    · Answer: <strong className="font-mono text-text-primary">{formatKey(q)}</strong>
                  </>
                )}
              </span>
            </div>
          )}

          {hasChecked && selfCheck && (
            <div className="space-y-2 rounded-xl border border-border bg-bg-surface-2 px-3.5 py-3 text-[13.5px]" role="status">
              <div className="text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Answer key</div>
              <div className="text-text-primary">
                <Markdown md={formatKey(q)} className="[&_p]:!m-0" />
              </div>
              {!review && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[12.5px] text-text-secondary">
                  <span>Did you get it?</span>
                  <button
                    type="button"
                    disabled={selfGrade !== null}
                    onClick={() => grade(true)}
                    className={cn('rounded-lg border px-2.5 py-1 disabled:cursor-default', selfGrade === true ? 'border-state-success bg-state-success/10 text-state-success' : 'border-border hover:bg-bg-surface-3')}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={selfGrade !== null}
                    onClick={() => grade(false)}
                    className={cn('rounded-lg border px-2.5 py-1 disabled:cursor-default', selfGrade === false ? 'border-state-error bg-state-error/10 text-state-error' : 'border-border hover:bg-bg-surface-3')}
                  >
                    Not quite
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Confidence (feeds spaced repetition) */}
          {outcome === 'correct' && !review && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-surface-2/60 px-3 py-2" role="group" aria-label="How sure were you?">
              <span className="mr-1 text-[12.5px] text-text-secondary">How sure were you?</span>
              {CONFIDENCE.map(({ c, label, hint }) => {
                const days = scheduleLocal(reviewBefore, 'correct', c).intervalDays
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => rate(c)}
                    aria-pressed={conf === c}
                    title={`${hint} — next review in ${days} day${days === 1 ? '' : 's'} (key ${c})`}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] transition-colors',
                      conf === c ? 'border-accent-brand bg-accent-brand/10 font-semibold text-accent-brand' : 'border-border bg-bg-surface text-text-secondary hover:border-border-hover hover:text-text-primary',
                    )}
                  >
                    <span className="hidden font-mono text-[10.5px] text-text-muted sm:inline">{c}</span>
                    {label}
                    <span className="font-mono text-[10.5px] text-text-muted">{fmtInterval(days)}</span>
                  </button>
                )
              })}
            </div>
          )}
          {(outcome === 'wrong' || outcome === 'revealed') && !review && mode !== 'test' && <p className="text-[12px] text-text-muted">Queued for review tomorrow.</p>}

          {/* Actions */}
          {!compact && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!hasChecked && (
                <button
                  type="button"
                  onClick={handleCheckPractice}
                  disabled={!selfCheck && !hasPick}
                  className="btn-primary inline-flex items-center gap-1.5 !px-4 !py-2 !text-[13.5px] disabled:cursor-not-allowed disabled:opacity-50"
                  title={selfCheck ? 'Show the answer key' : 'Check your answer (Enter)'}
                >
                  <CheckCircle2 className="size-4" /> {selfCheck ? 'Show answer' : 'Check answer'}
                </button>
              )}
              <button type="button" onClick={toggleSolution} aria-expanded={showSolution} className="btn-secondary inline-flex items-center gap-1.5 !px-3.5 !py-2 !text-[13.5px]" title="Solution (S)">
                {showSolution ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {showSolution ? 'Hide solution' : 'Solution'}
              </button>
              {q.sourceUrl && (
                <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-text-muted hover:text-accent-brand">
                  Source <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {/* ── Worked solution (src/gate/solution) ── */}
          <AnimatePresence initial={false}>
            {showSolution && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                <Suspense fallback={<div className="mt-4 h-40 animate-pulse rounded-2xl bg-bg-surface-2" />}>
                  <GateSolution q={q} state={solution} />
                </Suspense>

                {q.reviewNote && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-state-warning/30 bg-state-warning/10 p-3 text-[12.5px] text-text-secondary">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-state-warning" />
                    <span>{q.reviewNote}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {insights && <NoteEditor key={q.id} ref={note} questionId={q.id} className="!mt-5" />}
        </div>
      </article>

      {insights && (
        <>
          <QuestionStatsPanel q={q} revealed={answered && hasOptions(q)} myTimeMs={myTime ?? undefined} />
          {answered && <SimilarStrip q={q} />}
        </>
      )}
    </div>
  )
}
