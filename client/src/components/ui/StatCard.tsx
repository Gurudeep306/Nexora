import type { ReactElement, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './Card'
import { AnimatedNumber } from './AnimatedNumber'
import { IconBadge, IconFrame, type IconName, type IconTone } from '@/components/icon/Icon'

/* StatCard accent → icon badge tone. */
const ACCENTS = {
  primary: 'accent',
  secondary: 'neutral',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  cyan: 'info',
  gold: 'gold',
  destructive: 'danger',
} as const satisfies Record<string, IconTone>

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'primary',
  className,
}: {
  /** A semantic icon name (preferred) or an element. */
  icon?: IconName | ReactElement
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: keyof typeof ACCENTS
  className?: string
}) {
  const tone = ACCENTS[accent]
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
        {typeof icon === 'string' ? (
          <IconBadge name={icon} tone={tone} />
        ) : (
          icon && (
            <IconFrame tone={tone} className="[&_svg]:size-[54%]">
              {icon}
            </IconFrame>
          )
        )}
      </div>
    </Card>
  )
}