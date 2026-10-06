import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './Card'
import { AnimatedNumber } from './AnimatedNumber'

const ACCENTS = {
  primary: { text: 'text-accent-brand', tile: 'from-accent-brand/10 to-accent-brand/5', ring: 'ring-accent-brand/20' },
  secondary: { text: 'text-text-primary', tile: 'from-transparent to-transparent', ring: 'ring-border/20' },
  accent: { text: 'text-accent-brand', tile: 'from-accent-brand/10 to-accent-brand/5', ring: 'ring-accent-brand/20' },
  success: { text: 'text-state-success', tile: 'from-state-success/10 to-state-success/5', ring: 'ring-state-success/20' },
  warning: { text: 'text-state-warning', tile: 'from-state-warning/10 to-state-warning/5', ring: 'ring-state-warning/20' },
  cyan: { text: 'text-state-info', tile: 'from-state-info/10 to-state-info/5', ring: 'ring-state-info/20' },
  gold: { text: 'text-state-gold', tile: 'from-state-gold/10 to-state-gold/5', ring: 'ring-state-gold/20' },
  destructive: { text: 'text-state-error', tile: 'from-state-error/10 to-state-error/5', ring: 'ring-state-error/20' },
}

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
  accent?: keyof typeof ACCENTS
  className?: string
}) {
  const a = ACCENTS[accent]
  return (
    <Card className={cn('p-4', className)}>
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-primary/60 uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 truncate font-display text-2xl sm:text-3xl leading-none font-semibold tracking-tight text-text-primary tabular-nums">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </p>
          {sub && <div className="mt-2 text-xs text-text-primary/60">{sub}</div>}
        </div>
        {icon && (
          <div
            data-icon-pod
            className={cn(
              'icon-pod flex size-10 shrink-0 items-center justify-center p-2',
              a.tile,
            )}
          >
            <span className={cn(a.text)}>{icon}</span>
          </div>
        )}
      </div>
    </Card>
  )
}