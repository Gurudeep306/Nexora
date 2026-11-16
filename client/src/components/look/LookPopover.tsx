import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { THEMES } from '@/theme/styles'
import { cn } from '@/lib/utils'
import { ModeControl, RadioGroup } from './controls'
import { ThemeSpecimen } from './ThemeCard'
import { themeMode } from './themeLook'

/** The trigger's swatch: the theme's paper, a hairline and its accent dot. */
function ThemeDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative block overflow-hidden bg-bg-app shadow-[inset_0_0_0_1px_var(--color-border)]', className)}>
      <span className="absolute inset-y-0 right-0 w-1/2 bg-bg-surface-3" />
      <span className="absolute inset-[28%] rounded-full bg-accent-brand shadow-[0_0_0_1.5px_var(--color-bg-app)]" />
    </span>
  )
}

/**
 * Top-bar appearance control: light or dark at a click, the ten themes, and
 * the way into the full Appearance page.
 */
export function LookPopover({ className }: { className?: string }) {
  const { look, setLook, preferredMode } = useTheme()
  const current = THEMES.find((t) => t.id === look.style) ?? THEMES[0]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${current.name}. Change theme or appearance`}
          title="Theme"
          className={cn(
            'flex size-8 cursor-pointer items-center justify-center rounded-[0.7rem] border border-border bg-bg-surface-2 transition-colors hover:border-border-strong',
            className,
          )}
        >
          <ThemeDot className="size-[18px] rounded-[6px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-16px)] p-0">
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-text-primary">Appearance</span>
            <ModeControl size="sm" showNote={false} />
          </div>
          <div>
            <span className="mb-2 block text-[12px] font-medium text-text-muted">Theme · {current.name}</span>
            <RadioGroup
              label="Theme"
              items={THEMES}
              value={look.style}
              onChange={(id) => setLook({ style: id })}
              className="grid grid-cols-2 gap-2"
              itemLabel={(t) => `${t.name}: ${t.tagline}`}
              itemClassName={(_, checked) =>
                cn(
                  'flex flex-col gap-1.5 rounded-[var(--radius-control)] p-1 transition-colors',
                  checked ? 'shadow-[inset_0_0_0_1.5px_var(--color-text-primary)]' : 'hover:bg-bg-surface-3',
                )
              }
              renderItem={(t) => (
                <>
                  <ThemeSpecimen theme={t} look={look} mode={themeMode(t, preferredMode)} compact className="w-full rounded-[calc(var(--radius-control)-2px)] shadow-[0_0_0_1px_var(--color-border)]" />
                  <span className="truncate px-0.5 text-[11.5px] font-medium text-text-secondary">{t.name}</span>
                </>
              )}
            />
          </div>
        </div>
        <PopoverClose asChild>
          <Link
            to="/theme"
            className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-bg-surface-3 hover:text-text-primary"
          >
            All themes and settings
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  )
}
