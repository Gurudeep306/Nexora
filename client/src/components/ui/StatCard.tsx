import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './Card'
import { AnimatedNumber } from './AnimatedNumber'

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
  const ACCENTS = {
    primary: { text: 'text-primary', tile: 'from-primary/10 to-primary/5', ring: 'ring-primary/20' },
    secondary: { text: 'text-foreground', tile: 'from-transparent to-transparent', ring: 'ring-border/20' },
    accent: { text: 'text-accent', tile: 'from-accent/10 to-accent/5', ring: 'ring-accent/20' },
    success: { text: 'text-success', tile: 'from-success/10 to-success/5', ring: 'ring-success/20' },
    warning: { text: 'text-warning', tile: 'from-warning/10 to-warning/5', ring: 'ring-warning/20' },
    destructive: { text: 'text-error', tile: 'from-error/10 to-error/5', ring: 'ring-error/20' },
  }

  const a = ACCENTS[accent]
  return (
    <Card className={cn('p-4', className)}>
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 truncate font-display text-2xl sm:text-3xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </p>
          {sub && <div className="mt-2 text-xs text-foreground/60">{sub}</div>}
        </div>
        {icon && (
          <div className={cn(
            'flex items-center justify-center rounded-lg border border-border/20 p-2',
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