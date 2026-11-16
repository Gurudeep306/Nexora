import { useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Modal } from '@/components/ui'
import { Icon, type IconName } from '@/components/icon/Icon'
import { cn, formatCompact, formatNumber } from '@/lib/utils'
import type { SiteRole } from '@/lib/site'
import { delta } from './format'

/* Building blocks shared by the admin panel sections (styles: site/brand.css). */

export function Panel({
  title,
  description,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  icon?: IconName
  actions?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
}) {
  const hasBody = children !== undefined && children !== null
  return (
    <section className={cn('nx-panel', className)}>
      {(title || actions) && (
        <header className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5', hasBody && 'border-b border-[color:var(--nx-hair)]')}>
          <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
            {icon && (
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--nx-b1)_10%,transparent)] text-[var(--nx-b1)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--nx-b1)_22%,transparent)]">
                <Icon name={icon} className="size-3.5" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h2>}
              {description && <p className="mt-0.5 text-[12.5px] leading-snug text-text-secondary">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
        </header>
      )}
      {hasBody && <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>}
    </section>
  )
}

/** An accessible on/off switch with the brand gradient when on. */
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
      data-size={size}
      onClick={() => onChange(!checked)}
      className="nx-switch"
    >
      <span />
    </button>
  )
}

const ROLE_TONE: Record<string, string | undefined> = { owner: 'gold', admin: 'brand', moderator: 'teal', teacher: 'success' }
export function RolePill({ role, className }: { role: SiteRole | string; className?: string }) {
  return (
    <span className={cn('nx-chip capitalize', className)} data-tone={ROLE_TONE[role]}>
      {role === 'owner' && <Icon name="crown" />}
      {(role === 'admin' || role === 'moderator') && <Icon name="shield" />}
      {role}
    </span>
  )
}

export function Chip({ tone, icon, children, className }: { tone?: string; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn('nx-chip', className)} data-tone={tone}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('nx-skel', className)} />
}

export function Empty({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-bg-surface-2 text-text-muted shadow-[inset_0_0_0_1px_var(--nx-hair-strong)]">
        <Icon name={icon} className="size-5" />
      </span>
      <p className="mt-4 text-sm font-semibold text-text-primary">{title}</p>
      {children && <p className="mt-1 max-w-xs text-[13px] text-text-secondary">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Failed({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Empty icon="warning" title="Couldn't load this" action={onRetry && <button type="button" className="nx-btn" data-size="sm" onClick={onRetry}><Icon name="refresh" /> Try again</button>}>
      {message}
    </Empty>
  )
}

/** The last 7 days against the 7 before, in words. */
export function Delta({ value, suffix = 'on the week before' }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="desk-delta">none the week before</span>
  if (value === 0) return <span className="desk-delta">same as the week before</span>
  const up = value > 0
  return (
    <span className="desk-delta" data-trend={up ? 'up' : 'down'}>
      <span className="desk-delta-n">{`${up ? '↑' : '↓'} ${Math.abs(value)}%`}</span> {suffix}
    </span>
  )
}

/** Chart ink: every line is the text colour; the latest point is the theme's clay. */
export const INK = 'var(--color-text-primary)'
export const NIB = 'var(--ed-clay, var(--color-accent-brand))'

/** A front-page figure: label, a serif number, the week's change and a 30-day sparkline. */
export function Kpi({
  label,
  value,
  hint,
  series,
  days,
  unit,
}: {
  label: string
  value: number | null | undefined
  /** Kept for callers; the figure has no icon tile. */
  icon?: IconName
  hint?: ReactNode
  series?: number[]
  days?: string[]
  /** Kept for callers; every line is ink. */
  tone?: string
  unit?: string
}) {
  return (
    <div className="desk-figure">
      <p className="ed-label desk-figure-label">{label}</p>
      <p className="desk-figure-n">{value == null ? '—' : formatCompact(value)}</p>
      <div className="desk-figure-note">{series ? <Delta value={delta(series)} /> : hint ? <span>{hint}</span> : null}</div>
      {series && days ? <Spark series={series} days={days} unit={unit ?? label.toLowerCase()} /> : null}
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
  const d = p?.payload?.d ? new Date(`${p.payload.d}T00:00:00`) : null
  return (
    <div className="pop-surface !rounded-lg px-2.5 py-1.5 text-xs">
      <p className="text-text-muted">{d ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}</p>
      <p className="nx-num font-semibold text-text-primary">
        {formatNumber(Number(p?.value ?? 0))} <span className="font-normal text-text-secondary">{unit}</span>
      </p>
    </div>
  )
}

/** The last point of a series, drawn as a clay nib (other points draw nothing). */
function lastDot(len: number, r: number) {
  return function LastDot(props: { cx?: number; cy?: number; index?: number }) {
    if (props.index !== len - 1 || props.cx == null || props.cy == null) return <g />
    return <circle cx={props.cx} cy={props.cy} r={r} fill={NIB} stroke="var(--color-bg-surface)" strokeWidth={1.5} />
  }
}

/** 30-day sparkline: one ink line, the latest day in clay, a hover tooltip. */
export function Spark({ series, days, unit }: { series: number[]; days: string[]; color?: string; unit: string }) {
  const data = series.map((v, i) => ({ v, d: days[i] }))
  return (
    <div className="desk-spark" role="img" aria-label={`${unit}, last 30 days: ${series[series.length - 1] ?? 0} on the latest day`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 3, left: 2 }}>
          <XAxis dataKey="d" hide />
          <RTooltip content={<TrendTip unit={unit} />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} />
          <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.25} dot={lastDot(data.length, 2.75)} isAnimationActive={false} activeDot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--color-bg-surface)', fill: INK }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** A full chart: one ink line over 30 days, hairline grid, mono axis numbers, the latest day in clay. */
export function TrendChart({ series, days, unit, height = 200 }: { series: number[]; days: string[]; color?: string; unit: string; height?: number }) {
  const data = series.map((v, i) => ({ v, d: days[i] }))
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const tick = { fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }
  return (
    <div style={{ height }} role="img" aria-label={`${unit} per day, last 30 days`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeWidth={0.75} />
          <XAxis dataKey="d" tickFormatter={fmt} interval={6} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={tick} dy={6} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tick={tick} tickFormatter={(v: number) => formatCompact(v)} />
          <RTooltip content={<TrendTip unit={unit} />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} />
          <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.5} dot={lastDot(data.length, 3.5)} isAnimationActive={false} activeDot={{ r: 3.5, strokeWidth: 1.5, stroke: 'var(--color-bg-surface)', fill: INK }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Right-hand sheet (full width on phones). */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <div className="fixed inset-0 z-1000">
              <Dialog.Overlay asChild forceMount>
                <motion.div className="absolute inset-0 bg-bg-app/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className="absolute inset-y-0 right-0 flex w-full max-w-[600px] flex-col overflow-hidden bg-bg-surface sm:border-l sm:border-[color:var(--color-border-strong)]"
                  initial={{ x: 48, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 48, opacity: 0, transition: { duration: 0.16 } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                >
                  <Dialog.Title className="sr-only">{title}</Dialog.Title>
                  <Dialog.Close
                    aria-label="Close"
                    className="absolute top-3 right-3 z-20 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-bg-surface/70 text-text-secondary backdrop-blur-md transition-colors hover:text-text-primary"
                  >
                    <X className="size-4" />
                  </Dialog.Close>
                  <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

/** Confirmation dialog in the panel's style; `typeToConfirm` adds a typed safety check. */
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  danger,
  typeToConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<unknown> | void
  title: string
  children?: ReactNode
  confirmLabel?: string
  danger?: boolean
  typeToConfirm?: string
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const close = () => {
    setTyped('')
    onClose()
  }
  const ok = !typeToConfirm || typed === typeToConfirm
  return (
    <Modal open={open} onClose={close} title={title} size="sm">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ok) return
          setBusy(true)
          try {
            await onConfirm()
            close()
          } finally {
            setBusy(false)
          }
        }}
      >
        {children && <div className="text-[13.5px] leading-relaxed text-text-secondary">{children}</div>}
        {typeToConfirm && (
          <label className="block">
            <span className="mb-1.5 block text-xs text-text-secondary">
              Type <span className="font-mono font-semibold text-text-primary">{typeToConfirm}</span> to confirm
            </span>
            <input className="nx-input font-mono" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" spellCheck={false} />
          </label>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="nx-btn" onClick={close}>
            Cancel
          </button>
          {danger ? (
            <button type="submit" className="nx-btn" data-tone="danger-solid" disabled={!ok || busy}>
              {busy ? 'Working…' : confirmLabel}
            </button>
          ) : (
            <button type="submit" className="nx-cta" disabled={!ok || busy}>
              {busy ? 'Working…' : confirmLabel}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

/** Compact pager: "1–25 of 140" with previous / next and page numbers. */
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = page * pageSize + 1
  const to = Math.min(total, from + pageSize - 1)
  const nums = Array.from(new Set([0, page - 1, page, page + 1, pages - 1].filter((p) => p >= 0 && p < pages))).sort((a, b) => a - b)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[color:var(--nx-hair)] px-4 py-2.5">
      <p className="nx-num text-xs text-text-muted">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className="nx-btn" data-size="sm" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page">
          ←
        </button>
        {nums.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && p - nums[i - 1] > 1 && <span className="px-0.5 text-xs text-text-muted">…</span>}
            <button
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'nx-num hidden h-[1.875rem] min-w-[1.875rem] cursor-pointer rounded-lg px-1.5 text-[12.5px] font-medium transition-colors sm:inline-block',
                p === page ? 'bg-[color-mix(in_oklab,var(--nx-b1)_14%,transparent)] text-[var(--nx-b1)]' : 'text-text-secondary hover:bg-bg-surface-2',
              )}
            >
              {p + 1}
            </button>
          </span>
        ))}
        <button type="button" className="nx-btn" data-size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Next page">
          →
        </button>
      </div>
    </div>
  )
}
