import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './Card'

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'primary',
  className,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: 'primary' | 'accent' | 'cyan' | 'success' | 'warning' | 'gold'
  className?: string
}) {
  const accents = {
    primary: 'text-primary-bright',
    accent: 'text-accent',
    cyan: 'text-cyan',
    success: 'text-success',
    warning: 'text-warning',
    gold: 'text-gold',
  }

  return (
    <Card interactive className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">{label}</p>
          <p className={cn('mt-1 font-display text-2xl tabular-nums', accents[accent])}>{value}</p>
          {sub && <div className="mt-1 text-xs text-foreground-dim">{sub}</div>}
        </div>
        {icon && (
          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 [&_svg]:size-5', accents[accent])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
