import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import './gate-question.css'
import { Kbd } from '@/components/ui'
import { OutcomeDot, QuestionView, type AttemptEvent } from './QuestionView'
import { useGateProgress } from './progress'
import { snippet } from './answers'
import { TYPE_SHORT, paperLabel, qLabel, type GateQuestion } from './types'

interface Props {
  questions: GateQuestion[]
  subjectName: (s: string) => string
  topicName: (s: string, t: string) => string | undefined
  /** Index of the open question within this page. */
  index: number
  onIndex: (i: number) => void
  page: number
  total: number
  pageSize: number
  /** Move to another page; `at` = 'first' | 'last' question on it. */
  onPageChange: (p: number, at?: 'first' | 'last') => void
  loading?: boolean
  /** Focus mode: just the card, no queue. */
  focus?: boolean
  onAttempt?: (e: AttemptEvent) => void
}

/**
 * Practice: one question at a time. A queue of the current page sits beside
 * the card on wide screens (above it as a strip on phones); ← / → move
 * through the whole result set, crossing page boundaries.
 */
export function GateFocusDeck({ questions, subjectName, topicName, index, onIndex, page, total, pageSize, onPageChange, loading, focus, onAttempt }: Props) {
  const progress = useGateProgress()
  const i = Math.min(Math.max(0, index), Math.max(0, questions.length - 1))
  const q = questions[i]
  const globalIndex = (page - 1) * pageSize + i + 1
  const hasPrev = globalIndex > 1
  const hasNext = globalIndex < total
  const cardTop = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const go = (delta: 1 | -1) => {
    const n = i + delta
    if (n >= 0 && n < questions.length) onIndex(n)
    else if (delta > 0 && hasNext) onPageChange(page + 1, 'first')
    else if (delta < 0 && hasPrev) onPageChange(page - 1, 'last')
  }

  // ← / → (and J / K) step through questions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('[role="dialog"]'))) return
      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Keep the current chip in view in the phone strip, and the card's top
  // visible after moving on.
  useEffect(() => {
    const chip = stripRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)
    chip?.scrollIntoView({ block: 'nearest', inline: 'center' })
    const top = cardTop.current?.getBoundingClientRect().top ?? 0
    if (top < 0) cardTop.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [i, q?.id])

  if (!q) return null

  // One bar above the question: previous, where you are (with a hairline
  // filled to it), next. The verdict's "Next question" covers the bottom.
  const nav = (
    <div className="gq-nav">
      <button type="button" onClick={() => go(-1)} disabled={!hasPrev} className="gq-nav-btn" aria-label="Previous question">
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <span className="gq-nav-mid">
        <span className="gq-nav-pos">
          {globalIndex.toLocaleString()} <span>of {total.toLocaleString()}</span>
        </span>
        <span className="gq-nav-line" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (globalIndex / Math.max(1, total)) * 100)}%` }} />
        </span>
      </span>
      <button type="button" onClick={() => go(1)} disabled={!hasNext} className="gq-nav-btn is-next" aria-label="Next question">
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  )

  return (
    <div className={cn('grid items-start gap-5', focus ? 'mx-auto max-w-3xl' : 'lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] xl:gap-10')}>
      {/* Queue (wide screens) */}
      <aside className={cn('gq-queue sticky top-20 hidden max-h-[calc(100vh-7rem)] flex-col overflow-hidden', !focus && 'lg:flex')} aria-label="Questions on this page">
        <div className="gq-queue-head">
          <span className="ed-label ed-muted">This page</span>
          <span className="font-mono text-[11.5px] text-text-muted">
            {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()}
          </span>
        </div>
        <ol className={cn('gq-queue-list', loading && 'opacity-60')}>
          {questions.map((x, k) => {
            const p = progress[x.id]
            const active = k === i
            return (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => onIndex(k)}
                  aria-current={active ? 'true' : undefined}
                  className={cn('gq-queue-item', active && 'is-on')}
                >
                  <span className="flex items-center gap-1.5 text-[12px]">
                    <span className="font-mono font-semibold text-text-primary">{qLabel(x)}</span>
                    <span className="truncate text-text-muted">
                      {x.exam} {x.year}
                      {x.set ? `·${x.set}` : ''}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {x.figures?.length > 0 && <ImageIcon className="size-3 text-text-muted" aria-label="Has figure" />}
                      {p?.bookmarked && <Bookmark className="size-3 fill-current text-state-warning" aria-label="Bookmarked" />}
                      <OutcomeDot outcome={p?.outcome} />
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[12px] leading-snug text-text-secondary">{snippet(x.text, 110)}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <div className="gq-queue-foot">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md px-2 py-1 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary disabled:opacity-40">
            ← Previous page
          </button>
          <button type="button" disabled={page * pageSize >= total} onClick={() => onPageChange(page + 1)} className="rounded-md px-2 py-1 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary disabled:opacity-40">
            Next page →
          </button>
        </div>
      </aside>

      <div className="min-w-0 space-y-3" ref={cardTop}>
        {/* Strip (phones and tablets) */}
        <div ref={stripRef} className={cn('-mx-1 flex gap-1 overflow-x-auto px-1 pb-1', focus ? 'hidden' : 'lg:hidden')} aria-label="Questions on this page">
          {questions.map((x, k) => {
            const o = progress[x.id]?.outcome
            return (
              <button
                key={x.id}
                type="button"
                data-i={k}
                onClick={() => onIndex(k)}
                aria-current={k === i ? 'true' : undefined}
                className={cn(
                  'relative flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border px-1.5 font-mono text-[12px] transition-colors',
                  k === i ? 'border-accent-brand bg-accent-brand text-on-accent-brand' : 'border-border bg-bg-surface text-text-secondary',
                )}
              >
                <span className="sr-only">Question </span>
                {(page - 1) * pageSize + k + 1}
                {o && k !== i && <OutcomeDot outcome={o} className="absolute -top-0.5 -right-0.5 ring-2 ring-bg-app" />}
              </button>
            )
          })}
        </div>

        {nav}

        <div className={cn('gq-card transition-opacity', loading && 'opacity-60')}>
          <QuestionView
            key={q.id}
            q={q}
            subjectName={subjectName(q.subject)}
            topicName={topicName(q.subject, q.topic)}
            reportToAssistant
            keyboard
            insights
            mode="practice"
            position={`${globalIndex.toLocaleString()} of ${total.toLocaleString()}`}
            onAttempt={onAttempt}
            onNext={hasNext ? () => go(1) : undefined}
          />
        </div>


        <p className="gq-keys hidden flex-wrap items-center justify-center gap-1.5 text-[12px] text-text-muted md:flex">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd> move · <Kbd>1</Kbd>–<Kbd>4</Kbd> pick · <Kbd>Enter</Kbd> check · <Kbd>S</Kbd> solution · <Kbd>B</Kbd> bookmark · <Kbd>N</Kbd> note · <Kbd>C</Kbd> confidence · <Kbd>F</Kbd> focus
        </p>
        <span className="sr-only" aria-live="polite">
          {qLabel(q)}, {paperLabel(q)}, {TYPE_SHORT[q.type]}
        </span>
      </div>
    </div>
  )
}
