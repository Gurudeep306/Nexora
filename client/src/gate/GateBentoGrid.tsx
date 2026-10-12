import { Bookmark, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OutcomeDot } from './QuestionView'
import { snippet } from './answers'
import { useGateProgress } from './progress'
import { TYPE_LABEL, TYPE_SHORT, paperLabel, qLabel, type GateQuestion } from './types'

/**
 * List view: a scannable index of the current page. Each row opens the
 * question in practice mode.
 */
export function GateBentoGrid({
  questions,
  subjectName,
  topicName,
  onOpen,
  offset,
  loading,
}: {
  questions: GateQuestion[]
  subjectName: (s: string) => string
  topicName: (s: string, t: string) => string | undefined
  onOpen: (index: number) => void
  offset: number
  loading?: boolean
}) {
  const progress = useGateProgress()
  return (
    <ol className={cn('card divide-y divide-border overflow-hidden !p-0 transition-opacity', loading && 'opacity-60')}>
      {questions.map((q, k) => {
        const p = progress[q.id]
        const topic = topicName(q.subject, q.topic)
        return (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onOpen(k)}
              className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-surface-2 sm:px-5"
            >
              <span className="mt-0.5 w-9 shrink-0 text-right font-mono text-[12px] tabular-nums text-text-muted">{offset + k + 1}</span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
                  <span className="font-mono font-semibold text-text-primary">{qLabel(q)}</span>
                  <span className="text-text-muted">{paperLabel(q)}</span>
                  <span className="rounded border border-border bg-bg-surface-2 px-1 text-[10.5px] font-semibold text-text-secondary" title={TYPE_LABEL[q.type]}>
                    {TYPE_SHORT[q.type]}
                  </span>
                  {q.marks != null && <span className="text-[11.5px] text-text-muted">{q.marks}M</span>}
                  {q.figures?.length > 0 && <ImageIcon className="size-3.5 text-text-muted" aria-label="Has figure" />}
                </span>
                <span className="line-clamp-2 block text-[13.5px] leading-snug text-text-primary">{snippet(q.text, 220)}</span>
                <span className="block truncate text-[12px] text-text-muted">
                  {subjectName(q.subject)}
                  {topic ? ` · ${topic}` : ''}
                </span>
              </span>
              <span className="mt-0.5 flex shrink-0 items-center gap-2">
                {p?.bookmarked && <Bookmark className="size-3.5 fill-current text-state-warning" aria-label="Bookmarked" />}
                <OutcomeDot outcome={p?.outcome} />
                <ChevronRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
