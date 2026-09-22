import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './Card'
import { AnimatedNumber } from './AnimatedNumber'

const ACCENTS = {
  primary: { text: 'text-primary-bright', tile: 'from-primary/25 to-primary/5 border-primary/25', line: 'via-primary' },
  accent: { text: 'text-accent', tile: 'from-accent/25 to-accent/5 border-accent/25', line: 'via-accent' },
  cyan: { text: 'text-cyan', tile: 'from-cyan/20 to-cyan/5 border-cyan/25', line: 'via-cyan' },
  success: { text: 'text-success', tile: 'from-success/20 to-success/5 border-success/25', line: 'via-success' },
  warning: { text: 'text-warning', tile: 'from-warning/20 to-warning/5 border-warning/25', line: 'via-warning' },
  gold: { text: 'text-gold', tile: 'from-gold/20 to-gold/5 border-gold/25', line: 'via-gold' },
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
    <Card interactive className={cn('p-4', className)}>
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-60', a.line)}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.08em] text-foreground-faint uppercase">{label}</p>
          <p className="mt-1.5 truncate font-display text-[21px] sm:text-[26px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </p>
          {sub && <div className="mt-2 text-xs text-foreground-dim">{sub}</div>}
        </div>
        {icon && (
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-b shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] [&_svg]:size-[18px]',
              a.tile,
              a.text,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
