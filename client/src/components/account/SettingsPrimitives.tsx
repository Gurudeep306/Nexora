import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3.5 py-2.5 transition-colors duration-200 hover:border-border-glow',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-foreground-faint">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          className="peer size-4 cursor-pointer accent-[var(--color-primary)]"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
    </label>
  )
}

export function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4" aria-label={title}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary-bright [&_svg]:size-4">{icon}</span>}
        <h2 className="font-display text-sm tracking-wider text-foreground uppercase">{title}</h2>
      </div>
      {description && <p className="-mt-2 text-xs text-foreground-dim">{description}</p>}
      {children}
    </section>
  )
}
