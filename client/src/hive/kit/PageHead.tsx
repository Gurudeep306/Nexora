import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Hive page header: a 26px title, one short line under it and the page's
 * single primary action on the right (secondary actions go before it).
 * Stacks on phones so the title never squeezes.
 */
export function PageHead({ title, sub, actions, className }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex flex-col items-start gap-3 sm:flex-row sm:items-end', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--hv-text-1)]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-[13.5px] text-[var(--hv-text-3)]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </header>
  )
}

/** A 10.5px uppercase label above a group of content. */
export function SectionLabel({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-2 flex items-center gap-2 px-1', className)}>
      <h2 className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--hv-text-3)]">{children}</h2>
      {action}
    </div>
  )
}
