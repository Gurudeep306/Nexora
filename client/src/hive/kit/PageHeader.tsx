import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The one page header: title, one-line sub, meta line, actions right-aligned
 * on desktop and wrapped below on phones. Every Hive page uses this so the
 * top of every screen reads the same. `titleClassName` / `subClassName` keep
 * a page's existing display size and sub style when they differ from the
 * standard 22px / 13px.
 */
export function PageHeader({
  title,
  sub,
  meta,
  actions,
  className,
  titleClassName,
  subClassName,
}: {
  title: ReactNode
  sub?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
  titleClassName?: string
  subClassName?: string
}) {
  return (
    <div className={cn('flex flex-col items-start gap-3 sm:flex-row sm:items-end', className)}>
      <div className="min-w-0 flex-1">
        <h1 className={cn('text-[22px] font-semibold tracking-[-0.015em] text-[var(--hv-text-1)]', titleClassName)}>{title}</h1>
        {sub && <p className={cn('mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--hv-text-3)]', subClassName)}>{sub}</p>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap gap-1.5">{actions}</div>}
    </div>
  )
}
