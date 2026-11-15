import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * The foot of a lesson: a hairline, "Next: …" as a large serif link, a row of
 * progress dots (one per lesson, read ones filled) and the way back.
 */
export function EndOfLesson({
  next,
  prev,
  dots,
  label = 'Lessons',
  children,
}: {
  /** Where to go next; `onGo` runs first (to mark the page read). */
  next: { to: string; title: string; kicker?: string; onGo?: () => void } | null
  prev: { to: string; title: string } | null
  /** One per lesson in the set: done, current or neither. */
  dots: { done: boolean; current: boolean; title: string; to: string }[]
  label?: string
  children?: ReactNode
}) {
  return (
    <footer className="nr-end">
      {children}
      {next && (
        <Link to={next.to} onClick={next.onGo} className="nr-end-next" rel="next">
          <span className="nr-end-kicker">{next.kicker ?? 'Next'}</span>
          <span className="nr-end-title">
            {next.title} <span aria-hidden="true">→</span>
          </span>
        </Link>
      )}
      {dots.length > 1 && (
        <nav className="nr-end-dots" aria-label={`${label}: your progress`}>
          {dots.map((d, i) => (
            <Link
              key={d.to}
              to={d.to}
              title={d.title}
              aria-label={`${i + 1}. ${d.title}${d.done ? ' (read)' : ''}`}
              aria-current={d.current ? 'page' : undefined}
              className={cn('nr-end-dot', d.done && 'is-done', d.current && 'is-current')}
            />
          ))}
        </nav>
      )}
      {prev && (
        <Link to={prev.to} className="nr-end-prev" rel="prev">
          ← {prev.title}
        </Link>
      )}
    </footer>
  )
}
