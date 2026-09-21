import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  glow = true,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className={cn('font-display text-2xl tracking-wide text-foreground md:text-3xl', glow && 'glow-text')}>
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-foreground-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
