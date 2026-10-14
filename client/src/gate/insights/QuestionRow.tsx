/* One compact, linkable question line used by the notebook and the home page. */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { GateQuestion } from '@/gate/types'
import { questionLink } from '@/gate/shell/links'
import { Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'
import { snippet } from './format'

export function QuestionRow({
  id,
  q,
  loading,
  subjectName,
  meta,
  right,
  className,
}: {
  id: string
  q?: GateQuestion
  loading?: boolean
  subjectName?: (id: string) => string
  /** Extra line under the preview (e.g. "Wrong · 3 days ago"). */
  meta?: ReactNode
  /** Trailing controls (outside the link). */
  right?: ReactNode
  className?: string
}) {
  return (
    <li className={cn('group flex items-start gap-3 py-3', className)}>
      <Link
        to={questionLink(id)}
        className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
      >
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-text-muted">
          {q ? (
            <>
              <span className="font-semibold text-text-secondary">
                {q.exam} {q.year}
                {q.set ? ` · Set ${q.set}` : ''} · Q{q.number}
              </span>
              <span aria-hidden="true">·</span>
              <span>{subjectName ? subjectName(q.subject) : q.subject}</span>
              <span className="rounded border border-border px-1 text-[10.5px] font-medium">{q.type}</span>
            </>
          ) : (
            <span className="font-mono">{id}</span>
          )}
        </p>
        {loading && !q ? (
          <Skeleton className="mt-1.5 h-4 w-4/5" />
        ) : (
          <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-text-primary group-hover:text-accent-brand">
            {q ? snippet(q.text) || 'Open question' : 'Open question'}
          </p>
        )}
        {meta && <div className="mt-1 text-[12px] text-text-muted">{meta}</div>}
      </Link>
      {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
    </li>
  )
}
