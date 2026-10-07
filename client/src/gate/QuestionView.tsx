import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Sparkles,
  ZoomIn,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { GateVisualizer } from './GateVisualizer'
import { TYPE_LABEL, paperLabel, type GateQuestion } from './types'

/** NAT answers are stored as a number or as "lo:hi" for an accepted range. */
function answerText(q: GateQuestion): string {
  const a = q.answer
  if (a === null || a === undefined) return '—'
  if (Array.isArray(a)) return a.join(', ')
  if (typeof a === 'string' && /^-?[\d.]+:-?[\d.]+$/.test(a)) return a.replace(':', ' to ')
  return String(a)
}

function checkIsCorrect(q: GateQuestion, pick: any): boolean {
  if (pick === undefined || pick === null || pick === '') return false
  if (q.type === 'MSQ') {
    const uArr = Array.isArray(pick) ? [...pick].sort() : [pick]
    let tArr: string[] = []
    if (Array.isArray(q.answer)) tArr = [...q.answer].sort()
    else if (typeof q.answer === 'string') tArr = q.answer.split(/[,;\s]+/).filter(Boolean).sort()
    return uArr.length === tArr.length && uArr.every((v, i) => v === tArr[i])
  }
  if (q.type === 'NAT') {
    const num = Number(pick)
    if (isNaN(num)) return false
    if (typeof q.answer === 'number') return Math.abs(num - q.answer) <= 0.05
    if (typeof q.answer === 'string' && q.answer.includes(':')) {
      const [lo, hi] = q.answer.split(':').map(Number)
      return num >= lo - 0.01 && num <= hi + 0.01
    }
    return Math.abs(num - Number(q.answer)) <= 0.05
  }
  return String(pick).trim().toUpperCase() === String(q.answer).trim().toUpperCase()
}

export function SubjectChip({
  subject,
  topic,
  name,
  topicName,
}: {
  subject: string
  topic: string
  name?: string
  topicName?: string
}) {
  return (
    <span className="gate-chip" title={topicName}>
      <span className="font-semibold">{name ?? subject}</span>
      {topicName && <span className="opacity-70"> · {topicName}</span>}
      <span className="sr-only">{topic}</span>
    </span>
  )
}

/**
 * One past-year question with Interactive Self-Practice Mode & Master Solution Derivation.
 */
export function QuestionView({
  q,
  subjectName,
  topicName,
  compact,
  onOpen,
}: {
  q: GateQuestion
  subjectName?: string
  topicName?: string
  compact?: boolean
  onOpen?: () => void
}) {
  const [show, setShow] = useState(false)
  const [userPick, setUserPick] = useState<any>(undefined)
  const [hasChecked, setHasChecked] = useState(false)

  const correct = q.options.find((o) => o.l === q.answer)
  const isUserCorrect = checkIsCorrect(q, userPick)

  const handlePickOption = (optLabel: string) => {
    if (show) return // already revealed
    if (q.type === 'MSQ') {
      const list: string[] = Array.isArray(userPick) ? userPick : []
      const next = list.includes(optLabel) ? list.filter((x) => x !== optLabel) : [...list, optLabel]
      setUserPick(next)
    } else {
      setUserPick(optLabel)
    }
  }

  const handleCheckPractice = () => {
    setHasChecked(true)
    setShow(true)
  }

  const [zoomFigure, setZoomFigure] = useState<string | null>(null)

  return (
    <article id={q.id} className="gate-card card scroll-mt-24 overflow-hidden p-0">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border px-4 py-2.5 sm:px-5">
        <span className="gate-paper">{paperLabel(q)}</span>
        <span className="gate-qno">
          {q.section === 'ga' ? 'GA ' : ''}Q{q.number}
        </span>
        {q.marks != null && <span className="gate-chip">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>}
        <span className="gate-chip">{TYPE_LABEL[q.type]}</span>
        <SubjectChip subject={q.subject} topic={q.topic} name={subjectName} topicName={topicName} />
        <span className="flex-1" />
        {q.needsReview && (
          <span className="gate-chip gate-chip-warn" title={q.reviewNote ?? 'Flagged for review'}>
            <AlertTriangle className="size-3" /> check
          </span>
        )}
        {onOpen ? (
          <button type="button" onClick={onOpen} className="gate-icon-link" title="Open this question">
            <Link2 className="size-3.5" />
          </button>
        ) : null}
      </header>

      <div className="px-4 py-4 sm:px-5">
        <Markdown md={q.text} className="gate-prompt" />

        {q.figures.map((f) => (
          <figure key={f.f} className="gate-figure my-3">
            <div
              onClick={() => setZoomFigure(`/gate-fig/${f.f}`)}
              className="group relative cursor-zoom-in inline-block rounded-xl"
              title="Click to view full enlarged diagram"
            >
              <img src={`/gate-fig/${f.f}`} alt={f.alt} loading="lazy" />
              <div className="absolute top-2 right-2 rounded-lg bg-black/75 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1 text-[11px] font-mono shadow">
                <ZoomIn className="size-3.5" />
                <span className="hidden sm:inline">Zoom</span>
              </div>
            </div>
            {f.alt && <figcaption className="mt-1.5 text-[12px] text-text-muted">{f.alt}</figcaption>}
          </figure>
        ))}

        {/* Options (Interactive Practice Selector) */}
        {q.options.length > 0 && (
          <ol className="mt-3 grid gap-1.5">
            {q.options.map((o) => {
              const isOfficialAns =
                show && (o.l === q.answer || (Array.isArray(q.answer) && q.answer.includes(o.l)))
              const isPicked =
                q.type === 'MSQ'
                  ? Array.isArray(userPick) && userPick.includes(o.l)
                  : userPick === o.l
              const isWrongPick = show && isPicked && !isOfficialAns

              return (
                <li
                  key={o.l}
                  onClick={() => handlePickOption(o.l)}
                  className={cn(
                    'gate-option transition-all cursor-pointer',
                    !show && isPicked && '!border-accent-brand !bg-accent-brand/10',
                    isOfficialAns && 'gate-option-right',
                    isWrongPick && '!border-red-500/50 !bg-red-500/10',
                  )}
                >
                  <span
                    className={cn(
                      'gate-option-label',
                      !show && isPicked && '!bg-accent-brand !text-white',
                      isOfficialAns && '!bg-state-success !text-white',
                      isWrongPick && '!bg-red-500 !text-white',
                    )}
                  >
                    {o.l}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Markdown md={o.t} className="!text-[14px] [&_p]:!m-0" />
                  </span>
                  {isOfficialAns && <CheckCircle2 className="size-4 shrink-0 text-state-success" />}
                  {isWrongPick && <XCircle className="size-4 shrink-0 text-red-500" />}
                </li>
              )
            })}
          </ol>
        )}

        {/* NAT Practice Numerical Input */}
        {q.type === 'NAT' && !show && (
          <div className="mt-3 flex flex-wrap items-center gap-2 max-w-sm">
            <input
              type="text"
              value={userPick ?? ''}
              onChange={(e) => setUserPick(e.target.value.replace(/[^0-9.-]/g, ''))}
              placeholder="Enter numerical answer..."
              className="flex-1 rounded-xl border border-border bg-bg-surface px-3 py-1.5 font-mono text-[13.5px] text-text-primary outline-none focus:border-accent-brand"
            />
            {userPick !== undefined && userPick !== '' && (
              <button
                type="button"
                onClick={handleCheckPractice}
                className="btn-primary !px-3 !py-1.5 !text-[12.5px] font-bold"
              >
                Verify
              </button>
            )}
          </div>
        )}

        {/* Practice verification status badge if tested */}
        {hasChecked && (
          <div
            className={cn(
              'mt-3 flex items-center gap-2 rounded-xl p-2.5 text-[13px] font-bold',
              isUserCorrect ? 'bg-state-success/15 text-state-success' : 'bg-red-500/15 text-red-400',
            )}
          >
            {isUserCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            <span>
              {isUserCorrect
                ? `Excellent! Correct answer (+${q.marks ?? 1} Mark).`
                : `Incorrect response (${q.type === 'MCQ' ? `-${((q.marks ?? 1) / 3).toFixed(2)} Mark` : '0 negative'}). Review master solution below.`}
            </span>
          </div>
        )}

        {!compact && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!show && userPick !== undefined && q.type !== 'NAT' && (
              <button
                type="button"
                onClick={handleCheckPractice}
                className="btn-primary inline-flex items-center gap-1.5 !px-3.5 !py-1.5 !text-[12.5px] font-bold shadow-sm"
              >
                <CheckCircle2 className="size-3.5" /> Check My Answer
              </button>
            )}

            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]"
            >
              {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {show ? 'Hide Solution' : 'Show Solution & Answer'}
            </button>
          </div>
        )}

        {/* ── Deep Master Solution View ── */}
        <AnimatePresence initial={false}>
          {show && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="gate-answer mt-3 rounded-2xl border border-border/80 bg-bg-surface-2/40 px-4 py-3.5 sm:px-5 space-y-3">
                {/* Answer Summary Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-text-muted uppercase">
                    <span>Official Answer:</span>
                    <span
                      className={cn('gate-chip', q.answerSource === 'official' ? 'gate-chip-ok' : 'gate-chip-soft')}
                    >
                      {q.answerSource === 'official' ? 'Official Key' : 'Nexora Master Solution'}
                    </span>
                  </div>

                  <span className="font-mono text-[16px] font-black text-emerald-400">
                    {answerText(q)}
                    {correct && <span className="ml-2 font-sans text-[13px] font-normal text-text-secondary">{correct.t.replace(/[$`]/g, '')}</span>}
                  </span>
                </div>

                {/* Step-by-Step Derivation */}
                {q.solution && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Master Step-by-Step Explanation:
                    </span>
                    <Markdown md={q.solution} className="!text-[13.5px] leading-relaxed text-text-primary" />
                  </div>
                )}

                {/* Interactive Dynamic Visualizer if applicable */}
                <GateVisualizer subject={q.subject} topic={q.topic} />

                {/* Exam Pro-Tip & Common Trap Notice */}
                <div className="rounded-xl border border-accent-brand/20 bg-accent-brand/5 p-3 text-[12.5px] text-text-secondary flex items-start gap-2.5">
                  <Sparkles className="size-4 text-accent-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-primary font-semibold">GATE Strategy Insight:</strong>{' '}
                    {q.type === 'NAT'
                      ? 'Pay close attention to rounding decimal precision specified in the question stem (e.g. 2 decimal places).'
                      : q.type === 'MSQ'
                        ? 'MSQ questions have NO negative marking and NO partial credit. Make sure to scrutinize all boundary counter-examples.'
                        : 'For MCQs, use option elimination to weed out distractors before executing complex algebra.'}
                  </div>
                </div>

                {q.reviewNote && (
                  <p className="mt-2 mb-0 flex gap-2 text-[12px] text-text-muted">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-state-warning" />
                    {q.reviewNote}
                  </p>
                )}

                {q.sourceUrl && (
                  <a
                    href={q.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-accent-brand hover:underline font-semibold"
                  >
                    Original Paper Reference <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── High-Resolution Diagram Zoom Lightbox Modal ── */}
      {zoomFigure && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setZoomFigure(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] overflow-auto rounded-2xl bg-white p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
              <span className="text-[13px] font-bold text-gray-800">
                GATE Diagram Viewer · Crisp Schematic View
              </span>
              <button
                type="button"
                onClick={() => setZoomFigure(null)}
                className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
                title="Close diagram"
              >
                <X className="size-5" />
              </button>
            </div>
            <img
              src={zoomFigure}
              alt="Enlarged GATE Schematic"
              className="max-h-[75vh] w-auto mx-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </article>
  )
}
