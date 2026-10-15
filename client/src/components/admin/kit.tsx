import { useId, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis } from 'recharts'
import { Icon, type IconName } from '@/components/icon/Icon'
import { cn, formatCompact, formatNumber } from '@/lib/utils'
import type { SiteRole } from '@/lib/site'

/* Small building blocks shared by the admin panel sections. */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-text-primary">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

/** An accessible on/off switch. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-6 w-11' : 'h-5 w-9',
        checked ? 'border-accent-brand bg-accent-brand' : 'border-border-strong bg-bg-surface-3',
      )}
    >
      <span
        className={cn(
          'absolute rounded-full bg-white shadow-sm transition-transform duration-200',
          size === 'md' ? 'left-0.5 size-[18px]' : 'left-0.5 size-[14px]',
          checked && (size === 'md' ? 'translate-x-5' : 'translate-x-4'),
        )}
      />
    </button>
  )
}

const ROLE_STYLE: Record<string, string> = {
  owner: 'border-state-gold/30 bg-state-gold/12 text-state-gold',
  admin: 'border-accent-brand/25 bg-accent-brand/10 text-accent-brand',
  moderator: 'border-state-info/25 bg-state-info/10 text-state-info',
  member: 'border-border bg-bg-surface-2 text-text-secondary',
  teacher: 'border-state-success/25 bg-state-success/10 text-state-success',
}
export function RolePill({ role, className }: { role: SiteRole | string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', ROLE_STYLE[role] ?? ROLE_STYLE.member, className)}>
      {role === 'owner' && <Icon name="crown" className="size-3" />}
      {(role === 'admin' || role === 'moderator') && <Icon name="shield" className="size-3" />}
      {role}
    </span>
  )
}

/** A KPI tile with an optional 30-day trend underneath. */
export function Kpi({
  label,
  value,
  icon,
  hint,
  series,
  days,
  tone = 'accent',
  unit,
}: {
  label: string
  value: number | null | undefined
  icon: IconName
  hint?: ReactNode
  series?: number[]
  days?: string[]
  tone?: 'accent' | 'info' | 'success' | 'warning' | 'danger'
  unit?: string
}) {
  const color = {
    accent: 'var(--color-accent-brand)',
    info: 'var(--color-state-info)',
    success: 'var(--color-state-success)',
    warning: 'var(--color-state-warning)',
    danger: 'var(--color-state-error)',
  }[tone]
  return (
    <div className="card flex min-w-0 flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold tracking-wider text-text-secondary uppercase">{label}</p>
        <Icon name={icon} className="size-4 shrink-0 text-text-muted" />
      </div>
      <p className="mt-2 font-display text-[28px] leading-none font-semibold tracking-tight text-text-primary tabular-nums">
        {value == null ? '—' : formatCompact(value)}
      </p>
      {hint && <p className="mt-1.5 text-xs text-text-secondary">{hint}</p>}
      {series && days && <Trend series={series} days={days} color={color} unit={unit ?? label.toLowerCase()} />}
    </div>
  )
}

interface TipProps {
  active?: boolean
  payload?: { value?: number; payload?: { d?: string } }[]
}
function TrendTip({ active, payload, unit }: TipProps & { unit: string }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="pop-surface !rounded-lg px-2.5 py-1.5 text-xs">
      <p className="text-text-secondary">{p?.payload?.d}</p>
      <p className="font-medium text-text-primary tabular-nums">
        {formatNumber(Number(p?.value ?? 0))} {unit}
      </p>
    </div>
  )
}

/** 30-day single-series trend (area), with a hover tooltip. */
export function Trend({ series, days, color, unit, height = 44 }: { series: number[]; days: string[]; color: string; unit: string; height?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const data = series.map((v, i) => ({ v, d: days[i] }))
  return (
    <div className="-mx-1 mt-3" style={{ height }} role="img" aria-label={`${unit}, last 30 days`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.28} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="d" hide />
          <RTooltip content={<TrendTip unit={unit} />} cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g${id})`} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-bg-surface)' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Right-hand sheet (full width on phones). */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <div className="fixed inset-0 z-1000">
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="absolute inset-0 bg-bg-app/55 backdrop-blur-[2px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.aside
                  className="pop-surface absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col !rounded-none border-l border-border"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 40, opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                    <Dialog.Title className="min-w-0 text-[15px] font-semibold text-text-primary">{title}</Dialog.Title>
                    <Dialog.Close aria-label="Close" className="cursor-pointer rounded-md p-1.5 text-text-secondary hover:bg-border/20 hover:text-text-primary">
                      <X className="size-4" />
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">User details and admin actions</Dialog.Description>
                  <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                </motion.aside>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
