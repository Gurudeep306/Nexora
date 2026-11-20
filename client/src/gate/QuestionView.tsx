import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { prefetchOn } from '@/components/hand/api'
import { liveApi } from '@/live/api'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Link2, PenLine, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AddToContest } from '@/components/contests/hosted/Pickers'
import { cn } from '@/lib/utils'
import { useAgentPageContext } from '@/context/AgentContext'
import { Markdown } from '@/learn/md'
import { AnswerField, CheckButton, Masthead, NextQuestion, OptionList, OptionRow, QuestionActions, QuestionCard, QuestionHint, QuestionText, SolutionBlock, TextAction, Verdict, type OptionState } from '@/components/question/Question'
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
const HandSolutions = lazy(() => import('@/components/hand/HandSolutions').then((m) => ({ default: m.HandSolutions })))
const ExplainVideos = lazy(() => import('@/explain/ExplainVideos').then((m) => ({ default: m.ExplainVideos })))
const MembersHandwriting = lazy(() => import('@/components/hand/HandSolutions').then((m) => ({ default: m.MembersHandwriting })))

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
  const [handSignal, setHandSignal] = useState(0)
  const [userPick, setUserPick] = useState<Pick>(initialPick)
  const [hasChecked, setHasChecked] = useState(review)
  const [selfGrade, setSelfGrade] = useState<boolean | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [conf, setConf] = useState<1 | 2 | 3 | null>(null)
  const [myTime, setMyTime] = useState<number | null>(null)
  const progress = useQuestionProgress(q.id)
  const { user } = useAuth()
  const [toContest, setToContest] = useState(false)
  // A past-paper question with a checked answer can go into a contest you host.
  const contestable = !!user && mode === 'practice' && ['MCQ', 'MSQ', 'NAT'].includes(q.type) && q.answer != null && q.answer !== ''
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
    // The reasoning opens by itself on a wrong answer; it stays folded on a right one.
    if (!isUserCorrect) setShowSolution(true)
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
  const keyText = formatKey(q)
  const practiceHref = `/gate/practice?subject=${encodeURIComponent(q.subject)}`
  const nextDays = outcome ? scheduleLocal(reviewBefore, outcome === 'correct' ? 'correct' : 'wrong', conf ?? 2).intervalDays : null

  const stateOf = (l: string, isPicked: boolean): OptionState => {
    if (!revealed) return 'idle'
    const isKey = isKeyOption(q, l)
    if (isKey && isPicked) return 'right'
    if (isKey) return q.type === 'MSQ' && hasChecked ? 'missed' : 'right'
    if (isPicked) return 'wrong'
    return 'dim'
  }

  return (
    <div className="space-y-4">
      <QuestionCard
        id={q.id}
        masthead={
          <Masthead
            parts={[
              <span key="p">{paperLabel(q)}</span>,
              <strong key="q">{qLabel(q)}</strong>,
              q.marks != null ? `${q.marks} mark${q.marks === 1 ? '' : 's'}` : null,
              <abbr key="t" title={TYPE_LABEL[q.type]} className="no-underline">
                {TYPE_SHORT[q.type]}
              </abbr>,
              <span key="s">
                <Link to={practiceHref}>{subjectName ?? q.subject.toUpperCase()}</Link>
                {topicName && q.topic && (
                  <>
                    {' / '}
                    <Link to={`${practiceHref}&topic=${encodeURIComponent(q.topic)}`}>{topicName}</Link>
                  </>
                )}
              </span>,
              position ? <span key="pos">{position}</span> : null,
            ]}
          />
        }
        aside={
          <>
            <OutcomeDot outcome={progress.outcome} className="mr-1" />
            <BookmarkButton questionId={q.id} />
            {contestable && (
              <button type="button" onClick={() => setToContest(true)} className="ed-icon-btn" title="Add to a contest" aria-label="Add to a contest">
                <Trophy className="size-4" />
              </button>
            )}
            {contestable && toContest && <AddToContest open onClose={() => setToContest(false)} kind="gate" refId={q.id} title={`${paperLabel(q)}, ${qLabel(q)}`} />}
            {onOpen && (
              <button type="button" onClick={onOpen} className="ed-icon-btn" title="Open in practice" aria-label="Open in practice">
                <Link2 className="size-4" />
              </button>
            )}
          </>
        }
      >
        <h2 className="sr-only">
          {paperLabel(q)}, {qLabel(q)}
        </h2>
        <QuestionText className="gate-q-text">
          <Markdown md={q.text} />
        </QuestionText>

        {q.figures && q.figures.length > 0 && <ReconstructedDiagram questionId={q.id} figures={q.figures} subject={q.subject} topic={q.topic} />}

        {/* Options */}
        {options.length > 0 && (
          <div className="grid gap-2">
            {q.type === 'MSQ' && !revealed && <QuestionHint>Select every option that is true.</QuestionHint>}
            <OptionList multi={q.type === 'MSQ'}>
              {options.map((o, i) => {
                const isPicked = q.type === 'MSQ' ? Array.isArray(userPick) && userPick.includes(o.l) : userPick === o.l
                const st = stateOf(o.l, isPicked)
                return (
                  <OptionRow
                    key={o.l}
                    data-opt={o.l}
                    letter={o.l.length === 1 ? o.l : i + 1}
                    multi={q.type === 'MSQ'}
                    selected={isPicked}
                    state={st}
                    word={st === 'right' && !hasPick ? 'Answer' : undefined}
                    disabled={revealed}
                    onClick={() => handlePickOption(o.l)}
                  >
                    <Markdown md={o.t} className="[&_p]:!m-0" />
                  </OptionRow>
                )
              })}
            </OptionList>
          </div>
        )}

        {/* Numerical answer */}
        {q.type === 'NAT' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCheckPractice()
            }}
          >
            <AnswerField
              id={`nat-${q.id}`}
              label="Your numerical answer"
              type="text"
              inputMode="decimal"
              value={typeof userPick === 'string' ? userPick : ''}
              disabled={revealed}
              onChange={(e) => setUserPick(e.target.value.replace(/[^0-9.eE+-]/g, ''))}
              placeholder="0.00"
              state={hasChecked ? (isUserCorrect ? 'right' : 'wrong') : 'idle'}
              hint={!revealed ? 'Digits only; ranges in the key are accepted.' : undefined}
            />
          </form>
        )}

        {/* Verdict: what you chose, whether it's right, and the answer */}
        {hasChecked && !selfCheck && (
          <Verdict
            tone={isUserCorrect ? 'right' : !hasPick ? 'neutral' : 'wrong'}
            focus={!review}
            detail={
              <span className="ed-mono text-[12px]">
                {isUserCorrect ? `+${q.marks ?? 1}` : hasPick ? negative : '0'} marks
              </span>
            }
          >
            {review && !hasPick ? (
              <>Not attempted. The answer is {keyText}.</>
            ) : isUserCorrect ? (
              'Correct.'
            ) : (
              <>Not quite. The answer is {keyText}.</>
            )}
          </Verdict>
        )}

        {hasChecked && selfCheck && (
          <div className="qc-verdict" data-tone="neutral" role="status">
            <p className="ed-label ed-muted m-0">Answer key</p>
            <div className="qc-text mt-2">
              <Markdown md={keyText} className="[&_p]:!m-0" />
            </div>
            {!review && (
              <p className="ed-ui-sm ed-ink-2 mt-3 mb-0 flex flex-wrap items-center gap-x-4 gap-y-1">
                Did you get it?
                <TextAction disabled={selfGrade !== null} aria-pressed={selfGrade === true} onClick={() => grade(true)} className={cn(selfGrade === true && 'font-semibold')}>
                  Yes
                </TextAction>
                <TextAction disabled={selfGrade !== null} aria-pressed={selfGrade === false} onClick={() => grade(false)} className={cn(selfGrade === false && 'font-semibold')}>
                  Not quite
                </TextAction>
              </p>
            )}
          </div>
        )}

        {/* Confidence (feeds spaced repetition) */}
        {outcome === 'correct' && !review && (
          <div className="ed-ui-sm ed-ink-2 flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label="How sure were you?">
            <span>How sure were you?</span>
            {CONFIDENCE.map(({ c, label, hint }) => {
              const days = scheduleLocal(reviewBefore, 'correct', c).intervalDays
              return (
                <TextAction
                  key={c}
                  onClick={() => rate(c)}
                  aria-pressed={conf === c}
                  title={`${hint}: next review in ${days} day${days === 1 ? '' : 's'} (key ${c})`}
                  className={cn(conf === c && 'font-semibold !text-[var(--ed-ink)] !decoration-current')}
                >
                  {label} <span className="ed-mono ed-muted text-[11px] no-underline">{fmtInterval(days)}</span>
                </TextAction>
              )
            })}
          </div>
        )}

        {/* Actions */}
        {!compact && (
          <QuestionActions
            timer={
              showTimer ? (
                <span role="timer" aria-label={`Time on question ${clock}`} title={answered ? 'Time you took' : 'Time on this question (pauses when you switch tabs)'}>
                  {clock}
                </span>
              ) : undefined
            }
          >
            {!hasChecked && (
              <CheckButton onClick={handleCheckPractice} disabled={!selfCheck && !hasPick} title={selfCheck ? 'Show the answer key' : 'Check your answer (Enter)'}>
                {selfCheck ? 'Show answer' : 'Check'}
              </CheckButton>
            )}
            {!answered && onNext && <TextAction onClick={onNext}>Skip</TextAction>}
            {!hasChecked && (
              <TextAction onClick={toggleSolution} aria-expanded={showSolution} title="Solution (S)">
                {showSolution ? 'Hide solution' : 'Show solution'}
              </TextAction>
            )}
            {insights && mode !== 'test' && (
              <TextAction onClick={() => setHandSignal((n) => n + 1)} {...prefetchOn('gate', q.id)} title="Write your solution on a tablet, or photograph your paper">
                <span className="inline-flex items-center gap-1.5">
                  <PenLine className="size-3.5" aria-hidden="true" /> Write by hand
                </span>
              </TextAction>
            )}
            {insights && mode !== 'test' && <SolveTogether id={q.id} />}
            {q.sourceUrl && (
              <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="qc-text-action inline-flex items-center gap-1">
                Source <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
          </QuestionActions>
        )}

        {/* ── Worked solution: open on a wrong answer, folded on a right one ── */}
        {(showSolution || hasChecked) && (
          <SolutionBlock open={showSolution} onToggle={() => toggleSolution()} credit={`${paperLabel(q)}, ${qLabel(q)}. Answer key from the official paper.`}>
            <AnimatePresence initial={false}>
              {showSolution && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                  <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-bg-surface-2" />}>
                    <GateSolution q={q} state={solution} />
                  </Suspense>
                  {insights && mode !== 'test' && (
                    <Suspense fallback={null}>
                      <MembersHandwriting kind="gate" target={q.id} onAddMine={() => setHandSignal((n) => n + 1)} />
                    </Suspense>
                  )}
                  {q.reviewNote && (
                    <p className="ed-ui-sm ed-ink-2 mt-4 mb-0 flex items-start gap-2 border-l-2 border-state-warning pl-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-state-warning" aria-hidden="true" />
                      <span>{q.reviewNote}</span>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </SolutionBlock>
        )}

        {answered && onNext && (
          <NextQuestion
            onClick={onNext}
            note={
              (outcome === 'wrong' || outcome === 'revealed') && !review && mode !== 'test'
                ? 'Back in your review queue tomorrow'
                : nextDays != null && !review && mode !== 'test'
                  ? `Back in ${fmtInterval(nextDays)}`
                  : undefined
            }
          />
        )}
        {answered && !onNext && (outcome === 'wrong' || outcome === 'revealed') && !review && mode !== 'test' && (
          <p className="qc-hint">Queued for review tomorrow.</p>
        )}

        {insights && <NoteEditor key={q.id} ref={note} questionId={q.id} className="!mt-2" />}
      </QuestionCard>

      {insights && mode !== 'test' && (
        <Suspense fallback={null}>
          <HandSolutions kind="gate" target={q.id} revealed={answered} openSignal={handSignal} />
          <ExplainVideos kind="gate" target={q.id} about={`GATE ${q.year} · Q${q.number ?? ''}`} revealed={answered} />
        </Suspense>
      )}

      {insights && (
        <>
          <QuestionStatsPanel q={q} revealed={answered && hasOptions(q)} myTimeMs={myTime ?? undefined} />
          {answered && <SimilarStrip q={q} />}
        </>
      )}
    </div>
  )
}

/** Open a Live room about this question and go to it (the room shows the question's name). */
function SolveTogether({ id }: { id: string }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <TextAction
      disabled={busy}
      title="Open a live room about this question: talk, share screens, write on a whiteboard"
      onClick={async () => {
        setBusy(true)
        try {
          const room = await liveApi.create({ mode: 'video', visibility: 'link', about: { kind: 'gate', target: id } })
          navigate(`/live/${room.code}`)
        } catch {
          setBusy(false)
        }
      }}
    >
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5" aria-hidden="true" /> {busy ? 'Opening…' : 'Solve together'}
      </span>
    </TextAction>
  )
}
