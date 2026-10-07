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
  Bookmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { GateVisualizer } from './GateVisualizer'
import { HandwrittenSolution } from './HandwrittenSolution'
import { ReconstructedDiagram } from './ReconstructedDiagram'
import { TYPE_LABEL, paperLabel, type GateQuestion } from './types'

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
  topic?: string
  name?: string
  topicName?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg bg-bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary border border-border/70"
      title={topicName || topic}
    >
      <span className="font-bold text-accent-brand">{name ?? subject.toUpperCase()}</span>
      {topicName && <span className="opacity-70"> · {topicName}</span>}
    </span>
  )
}

export function QuestionView({
  q,
  subjectName,
  topicName,
  compact,
  onOpen,
  initialShowSolution = false,
}: {
  q: GateQuestion
  subjectName?: string
  topicName?: string
  compact?: boolean
  onOpen?: () => void
  initialShowSolution?: boolean
}) {
  const [showSolution, setShowSolution] = useState(initialShowSolution)
  const [userPick, setUserPick] = useState<any>(undefined)
  const [hasChecked, setHasChecked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  const isUserCorrect = checkIsCorrect(q, userPick)

  const handlePickOption = (optLabel: string) => {
    if (showSolution) return
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
    setShowSolution(true)
  }

  return (
    <article id={q.id} className="relative overflow-hidden rounded-3xl border border-border/80 bg-bg-surface p-0 shadow-lg transition-all hover:border-border hover:shadow-xl">
      {/* ── Card Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/70 bg-bg-surface-2/40 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="rounded-lg bg-accent-brand/15 px-2.5 py-1 font-bold text-accent-brand border border-accent-brand/20">
            {paperLabel(q)}
          </span>
          <span className="font-mono font-bold text-text-primary text-[13px]">
            {q.section === 'ga' ? 'GA ' : ''}Q{q.number}
          </span>
          {q.marks != null && (
            <span className="rounded-lg bg-bg-surface-2 px-2 py-0.5 font-semibold text-text-secondary border border-border/60">
              {q.marks} Mark{q.marks === 1 ? '' : 's'}
            </span>
          )}
          <span className="rounded-lg bg-bg-surface-2 px-2 py-0.5 font-medium text-text-muted border border-border/60">
            {TYPE_LABEL[q.type]}
          </span>
          <SubjectChip subject={q.subject} topic={q.topic} name={subjectName} topicName={topicName} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setBookmarked((b) => !b)}
            className={cn(
              'rounded-xl p-1.5 transition-colors cursor-pointer',
              bookmarked ? 'bg-amber-500/20 text-amber-400' : 'text-text-muted hover:bg-bg-surface-2 hover:text-text-primary',
            )}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark question'}
          >
            <Bookmark className={cn('size-4', bookmarked && 'fill-current')} />
          </button>

          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="rounded-xl p-1.5 text-text-muted hover:bg-bg-surface-2 hover:text-text-primary transition-colors cursor-pointer"
              title="Open full question link"
            >
              <Link2 className="size-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── Question Body ── */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Question Text */}
        <div className="text-[14.5px] sm:text-[15px] leading-relaxed text-text-primary font-normal">
          <Markdown md={q.text} />
        </div>

        {/* Reconstructed Diagrams or Scanned Figures */}
        {q.figures && q.figures.length > 0 && (
          <ReconstructedDiagram
            questionId={q.id}
            figures={q.figures}
            subject={q.subject}
            topic={q.topic}
          />
        )}

        {/* Options (Interactive Practice Selector) */}
        {q.options && q.options.length > 0 && (
          <ol className="grid gap-2 pt-1">
            {q.options.map((o) => {
              const isOfficialAns =
                showSolution &&
                (o.l === q.answer || (Array.isArray(q.answer) && q.answer.includes(o.l)))
              const isPicked =
                q.type === 'MSQ'
                  ? Array.isArray(userPick) && userPick.includes(o.l)
                  : userPick === o.l
              const isWrongPick = showSolution && isPicked && !isOfficialAns

              return (
                <li
                  key={o.l}
                  onClick={() => handlePickOption(o.l)}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-150 cursor-pointer',
                    !showSolution && !isPicked && 'border-border/70 bg-bg-surface-2/30 hover:border-accent-brand/50 hover:bg-bg-surface-2/70',
                    !showSolution && isPicked && 'border-accent-brand bg-accent-brand/10 shadow-sm ring-1 ring-accent-brand/30',
                    isOfficialAns && 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30',
                    isWrongPick && 'border-red-500 bg-red-500/10 ring-1 ring-red-500/30',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-xl font-mono text-[13px] font-bold transition-all',
                      !showSolution && !isPicked && 'bg-bg-surface-2 text-text-muted group-hover:text-text-primary',
                      !showSolution && isPicked && 'bg-accent-brand text-white shadow-sm',
                      isOfficialAns && 'bg-emerald-600 text-white shadow-sm',
                      isWrongPick && 'bg-red-500 text-white shadow-sm',
                    )}
                  >
                    {o.l}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] text-text-primary">
                    <Markdown md={o.t} className="[&_p]:!m-0" />
                  </span>
                  {isOfficialAns && <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />}
                  {isWrongPick && <XCircle className="size-5 shrink-0 text-red-500" />}
                </li>
              )
            })}
          </ol>
        )}

        {/* NAT Practice Input */}
        {q.type === 'NAT' && !showSolution && (
          <div className="flex flex-wrap items-center gap-2 max-w-sm pt-2">
            <input
              type="text"
              value={userPick ?? ''}
              onChange={(e) => setUserPick(e.target.value.replace(/[^0-9.-]/g, ''))}
              placeholder="Enter numerical answer..."
              className="flex-1 rounded-xl border border-border/80 bg-bg-surface-2 px-3.5 py-2 font-mono text-[14px] text-text-primary outline-none focus:border-accent-brand focus:ring-1 focus:ring-accent-brand"
            />
            {userPick !== undefined && userPick !== '' && (
              <button
                type="button"
                onClick={handleCheckPractice}
                className="btn-primary !px-4 !py-2 !text-[13px] font-bold cursor-pointer"
              >
                Verify
              </button>
            )}
          </div>
        )}

        {/* Interactive Response Banner */}
        {hasChecked && (
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-2xl p-3 text-[13px] font-bold shadow-sm',
              isUserCorrect ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30',
            )}
          >
            {isUserCorrect ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            <span>
              {isUserCorrect
                ? `Excellent! Correct answer (+${q.marks ?? 1} Marks). Master derivation below.`
                : `Incorrect answer (${q.type === 'MCQ' ? `-${((q.marks ?? 1) / 3).toFixed(2)} Mark` : '0 negative'}). Review full derivation below.`}
            </span>
          </div>
        )}

        {/* Practice Actions Bar */}
        {!compact && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {!showSolution && userPick !== undefined && q.type !== 'NAT' && (
                <button
                  type="button"
                  onClick={handleCheckPractice}
                  className="btn-primary inline-flex items-center gap-1.5 !px-4 !py-2 !text-[13px] font-bold shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="size-4" /> Check My Answer
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSolution((s) => !s)}
                className="btn-secondary inline-flex items-center gap-1.5 !px-3.5 !py-2 !text-[13px] font-semibold cursor-pointer"
              >
                {showSolution ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span>{showSolution ? 'Hide Solution' : '✍️ View Step-by-Step Solution & Tricks'}</span>
              </button>
            </div>

            {q.sourceUrl && (
              <a
                href={q.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-accent-brand hover:underline font-semibold"
              >
                Official PDF Reference <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}

        {/* ── Deep Handwritten Master Solution View ── */}
        <AnimatePresence initial={false}>
          {showSolution && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {/* Interactive Dynamic Visualizer if applicable (immediate animated visual solution) */}
              <GateVisualizer q={q} subject={q.subject} topic={q.topic} />

              {/* Handwritten Solution Notebook */}
              <HandwrittenSolution
                q={q}
                subjectName={subjectName}
                topicName={topicName}
              />

              {q.reviewNote && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[12px] text-amber-300 border border-amber-500/20">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>{q.reviewNote}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  )
}
