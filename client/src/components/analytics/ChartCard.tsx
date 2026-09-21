import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

/** Card shell for every analytics chart — consistent header + body. */
export function ChartCard({
  icon,
  title,
  subtitle,
  children,
  className,
  label,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  label?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {subtitle && <p className="text-[11px] text-foreground-faint">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={label ?? title}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

interface RechartsTooltipProps {
  active?: boolean
  payload?: { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }[]
  label?: string | number
}

/** Shared neon tooltip for all recharts charts. */
export function ChartTooltip({ active, payload, label }: RechartsTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-glow bg-surface px-3 py-2 text-xs glow-box">
      {label != null && label !== '' && (
        <p className="font-display tracking-wider text-foreground">{String(label)}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="mt-0.5 flex items-center gap-1.5 font-mono tabular-nums">
          <span className="size-2 rounded-full" style={{ background: p.color ?? 'var(--color-primary-bright)' }} />
          <span className="text-foreground-dim">{p.name}:</span>
          <span className="text-foreground">{String(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
