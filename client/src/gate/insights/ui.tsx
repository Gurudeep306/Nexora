/* Building blocks shared by the GATE insight pages. Semantic tokens only. */
import { useId, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, Skeleton } from '@/components/ui'
import { Icon, IconBadge, type IconName, type IconTone } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { MASTERY, type MasteryLevel } from './format'

/* ── Panel: a titled card ───────────────────────────────────────────────── */

export function Panel({
  title,
  icon,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: ReactNode
  icon?: IconName
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  const hid = useId()
  return (
    <Card className={cn('flex min-w-0 flex-col', className)} aria-labelledby={hid} role="region" id={id}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
        <div className="min-w-0">
          <h2 id={hid} className="flex items-center gap-2 text-[14.5px] font-semibold text-text-primary">
            {icon && <Icon name={icon} className="size-4 text-accent-brand" />}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-text-muted">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      <div className={cn('min-w-0 flex-1 px-4 pb-4 sm:px-5', bodyClassName)}>{children}</div>
    </Card>
  )
}

export function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-md text-[12.5px] font-medium text-accent-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"
    >
      {children}
      <Icon name="external" className="size-3" />
    </Link>
  )
}

/* ── KPI tile ───────────────────────────────────────────────────────────── */

export function Kpi({
  label,
  value,
  sub,
  icon,
  tone = 'accent',
  loading,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: IconName
  tone?: IconTone
  loading?: boolean
}) {
  return (
    <Card className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wider text-text-muted uppercase">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p className="mt-1 truncate font-display text-[26px] leading-none font-semibold tracking-tight text-text-primary tabular-nums">{value}</p>
        )}
        {sub && <div className="mt-1.5 truncate text-[12px] text-text-muted">{sub}</div>}
      </div>
      <IconBadge name={icon} tone={tone} box="sm" />
    </Card>
  )
}

/* ── Rings ──────────────────────────────────────────────────────────────── */

export function Ring({
  value,
  size = 64,
  stroke = 6,
  label,
  children,
  className,
}: {
  /** 0..1 */
  value: number
  size?: number
  stroke?: number
  label: string
  children?: ReactNode
  className?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        {v > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent-brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

/* ── Mastery ────────────────────────────────────────────────────────────── */

const MASTERY_FILL = ['bg-bg-surface-3', 'bg-accent-brand/25', 'bg-accent-brand/50', 'bg-accent-brand/75', 'bg-accent-brand']

export function MasterySwatch({ level, className }: { level: MasteryLevel; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-3 shrink-0 rounded-[4px]', MASTERY_FILL[level], level === 0 && 'border border-border', className)}
    />
  )
}

export function MasteryLabel({ level }: { level: MasteryLevel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap text-text-secondary">
      <MasterySwatch level={level} />
      {MASTERY[level]!.label}
    </span>
  )
}

export function MasteryLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)} aria-label="Mastery levels">
      {MASTERY.map((m) => (
        <li key={m.level} title={m.hint}>
          <MasteryLabel level={m.level} />
        </li>
      ))}
    </ul>
  )
}

/** Stacked bar of topic counts per mastery level. */
export function MasteryBar({ counts, className }: { counts: number[]; className?: string }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  return (
    <div
      className={cn('flex h-2 w-full gap-[2px] overflow-hidden rounded-full', className)}
      role="img"
      aria-label={MASTERY.map((m, i) => `${counts[i] ?? 0} ${m.label}`).join(', ')}
    >
      {counts.map((n, i) =>
        n ? <span key={i} className={cn('h-full first:rounded-l-full last:rounded-r-full', MASTERY_FILL[i])} style={{ width: `${(n / total) * 100}%` }} /> : null,
      )}
    </div>
  )
}

/* ── Segmented control ──────────────────────────────────────────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: ReactNode }[]
  label: string
  className?: string
}) {
  const uid = useId()
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const i = options.findIndex((o) => o.id === value)
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length]!
    onChange(next.id)
    requestAnimationFrame(() => document.getElementById(`${uid}-${next.id}`)?.focus())
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className={cn('inline-flex h-8 items-center rounded-lg border border-border bg-bg-surface-2 p-0.5', className)}>
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            id={`${uid}-${o.id}`}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.id)}
            className={cn(
              'h-full cursor-pointer rounded-md px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand',
              on ? 'bg-bg-surface-4 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Empty / error hints ────────────────────────────────────────────────── */

export function EmptyHint({
  icon = 'sparkles',
  title,
  children,
  action,
  className,
}: {
  icon?: IconName
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center', className)}>
      <IconBadge name={icon} box="sm" tone="neutral" />
      <p className="text-[13.5px] font-semibold text-text-primary">{title}</p>
      {children && <p className="max-w-sm text-[12.5px] text-text-muted">{children}</p>}
      {action}
    </div>
  )
}

export function LinkButton({
  to,
  children,
  variant = 'secondary',
  icon,
  className,
}: {
  to: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: IconName
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand',
        variant === 'primary' && 'bg-accent-brand text-on-accent-brand hover:brightness-110',
        variant === 'secondary' && 'border border-border bg-bg-surface-2 text-text-primary hover:bg-bg-surface-3',
        variant === 'ghost' && 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary',
        className,
      )}
    >
      {icon && <Icon name={icon} className="size-3.5" />}
      {children}
    </Link>
  )
}

/** "Backend not live yet" note shown instead of an error wall. */
export function OfflineNote({ what }: { what: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-[12.5px] text-text-muted" role="status">
      <Icon name="info" className="size-3.5 shrink-0 text-accent-brand" />
      {what} will appear here once you start practising.
    </p>
  )
}
