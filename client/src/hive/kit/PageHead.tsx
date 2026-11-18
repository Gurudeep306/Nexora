import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from './PageHeader'

/** The Hive page header (kept as an alias of PageHeader for older pages). */
export function PageHead({ title, sub, actions, className }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; className?: string }) {
  return <PageHeader title={title} sub={sub} actions={actions} className={className} />
}

/** A small spaced-capitals label above a group of content. */
export function SectionLabel({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-2 flex items-center gap-2', className)}>
      <h2 className="hv-eyebrow m-0 flex-1">{children}</h2>
      {action}
    </div>
  )
}
