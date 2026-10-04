import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { TYPE_LABEL, paperLabel, type GateQuestion } from './types'

/** NAT answers are stored as a number or as "lo:hi" for an accepted range. */
function answerText(q: GateQuestion): string {
  const a = q.answer
  if (a === null || a === undefined) return '—'
  if (Array.isArray(a)) return a.join(', ')
  if (typeof a === 'string' && /^-?[\d.]+:-?[\d.]+$/.test(a)) return a.replace(':', ' to ')
  return String(a)
}

export function SubjectChip({ subject, topic, name, topicName }: { subject: string; topic: string; name?: string; topicName?: string }) {
  return (
    <span className="gate-chip" title={topicName}>
      <span className="font-semibold">{name ?? subject}</span>
      {topicName && <span className="opacity-70"> · {topicName}</span>}
      <span className="sr-only">{topic}</span>
    </span>
  )
}

/**
 * One past-year question. The answer stays hidden until you ask for it, so
 * the bank can be used for practice as well as for reference.
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
  const correct = q.options.find((o) => o.l === q.answer)

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
            <img src={`/gate-fig/${f.f}`} alt={f.alt} loading="lazy" />
            {f.alt && <figcaption className="mt-1.5 text-[12px] text-text-muted">{f.alt}</figcaption>}
          </figure>
        ))}

        {q.options.length > 0 && (
          <ol className="mt-3 grid gap-1.5">
            {q.options.map((o) => {
              const isAns =
                show && (o.l === q.answer || (Array.isArray(q.answer) && q.answer.includes(o.l)))
              return (
                <li key={o.l} className={cn('gate-option', isAns && 'gate-option-right')}>
                  <span className="gate-option-label">{o.l}</span>
                  <span className="min-w-0 flex-1">
                    <Markdown md={o.t} className="!text-[14px] [&_p]:!m-0" />
                  </span>
                  {isAns && <CheckCircle2 className="size-4 shrink-0 text-state-success" />}
                </li>
              )
            })}
          </ol>
        )}

        {!compact && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]"
            >
              {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {show ? 'Hide answer' : 'Show answer'}
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {show && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="gate-answer mt-3 rounded-xl px-4 py-3">
                <p className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.1em] text-text-muted uppercase">
                  Answer
                  <span
                    className={cn('gate-chip', q.answerSource === 'official' ? 'gate-chip-ok' : 'gate-chip-soft')}
                    title={
                      q.answerSource === 'official'
                        ? 'Printed in the official paper'
                        : 'Worked out for Nexora — not an official key'
                    }
                  >
                    {q.answerSource === 'official' ? 'official key' : 'Nexora solution'}
                  </span>
                  {q.confidence && q.confidence !== 'high' && (
                    <span className="gate-chip gate-chip-warn">{q.confidence} confidence</span>
                  )}
                </p>
                <p className="mb-0 font-mono text-[16px] font-semibold text-text-primary">
                  {answerText(q)}
                  {correct && <span className="ml-2 font-sans text-[14px] font-normal text-text-secondary">{correct.t.replace(/[$`]/g, '')}</span>}
                </p>
                {q.solution && (
                  <div className="mt-2 border-t border-border pt-2">
                    <Markdown md={q.solution} className="!text-[14px]" />
                  </div>
                )}
                {q.reviewNote && (
                  <p className="mt-2 mb-0 flex gap-2 text-[12.5px] text-text-muted">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-state-warning" />
                    {q.reviewNote}
                  </p>
                )}
                {q.sourceUrl && (
                  <a
                    href={q.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[12px] text-accent-brand"
                  >
                    Source <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  )
}
