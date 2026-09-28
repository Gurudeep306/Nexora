import { Monitor, Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { useTheme, type Appearance } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

const OPTIONS: { id: Appearance; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'System', Icon: Monitor },
]

/**
 * The macOS System Settings appearance picker: three segments with the
 * selection sliding between them.
 */
export function AppearanceToggle({ className }: { className?: string }) {
  const { appearance, setAppearance } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[0.7rem] border border-border bg-bg-surface-2/70 p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const on = appearance === id
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => setAppearance(id)}
            className={cn(
              'relative flex size-7 cursor-pointer items-center justify-center rounded-[0.55rem] transition-colors duration-150',
              on ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {on && (
              <motion.span
                layoutId="appearance-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-[0.55rem] bg-bg-surface shadow-[var(--elev-1)]"
              />
            )}
            <Icon className="relative size-3.5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

/** Compact single-button variant for tight spots — cycles Light → Dark → System. */
export function AppearanceButton({ className }: { className?: string }) {
  const { appearance, resolved, cycle } = useTheme()
  const Icon = appearance === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun
  return (
    <button
      onClick={cycle}
      aria-label={`Appearance: ${appearance}. Click to change.`}
      title={`Appearance: ${appearance}`}
      className={cn(
        'flex size-9 cursor-pointer items-center justify-center rounded-[0.7rem] border border-border bg-bg-surface-2/60 text-text-secondary transition-colors hover:text-text-primary',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
