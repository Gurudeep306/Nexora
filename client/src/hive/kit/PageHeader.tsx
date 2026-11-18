import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** The part of Hive a path belongs to, for the small label above a title. */
export function hiveArea(pathname: string): string {
  const m = /^\/hive\/([^/]+)/.exec(pathname)?.[1] ?? ''
  if (['copilot', 'chat', 'projects', 'p', 'pipelines'].includes(m)) return 'Work'
  if (['machines', 'drive'].includes(m)) return 'Resources'
  if (['models', 'keys', 'extensions'].includes(m)) return 'AI setup'
  if (m === 'spend') return 'Spend'
  if (m === 'settings') return 'You'
  return 'Hive'
}

/**
 * The one page header, a masthead like the site's: the area in small
 * capitals, the title in the display face, one plain line under it, and the
 * page's single primary action on the right (secondary actions before it).
 * A hairline closes it. Stacks on phones so the title never squeezes.
 * `titleClassName` / `subClassName` are kept for older callers; sizes come
 * from the header itself so every page reads the same.
 */
export function PageHeader({
  title,
  sub,
  meta,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode
  sub?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  /** The small label above the title; defaults to the part of Hive. */
  eyebrow?: ReactNode
  className?: string
  titleClassName?: string
  subClassName?: string
}) {
  const { pathname } = useLocation()
  return (
    <header className={cn('flex flex-col items-start gap-4 border-b border-[var(--hv-border)] pb-5 sm:flex-row sm:items-end', className)}>
      <div className="min-w-0 flex-1">
        <div className="hv-eyebrow">{eyebrow ?? hiveArea(pathname)}</div>
        <h1 className="hv-title mt-2.5 mb-0">{title}</h1>
        {sub && <p className="hv-lead mt-2 mb-0 max-w-2xl">{sub}</p>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
