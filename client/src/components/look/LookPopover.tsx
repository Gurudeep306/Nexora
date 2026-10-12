import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE_BY_ID, resolveMode } from '@/theme/palettes'
import { cn } from '@/lib/utils'
import { ModeControl, RadioGroup } from './controls'
import { ThemeDot, ThemeSwatch } from './ThemeTile'

/** Shown until the user has a few recent themes of their own. */
const SUGGESTED = ['midnight', 'porcelain', 'catppuccin-mocha', 'nord', 'paper', 'tokyo-night']

/**
 * Top-bar theme control: light/dark at a click, the last few themes, and the
 * way into the Theme Centre.
 */
export function LookPopover({ className }: { className?: string }) {
  const { look, setLook, recentThemes, preferredMode, palette, mode } = useTheme()
  const ids = [...new Set([...recentThemes, ...SUGGESTED])].slice(0, 6)
  const items = ids.map((id) => PALETTE_BY_ID.get(id)!).filter(Boolean)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${palette.name}. Change theme or appearance`}
          title="Theme"
          className={cn(
            'flex size-8 cursor-pointer items-center justify-center rounded-[0.7rem] border border-border bg-bg-surface-2 transition-colors hover:border-border-strong',
            className,
          )}
        >
          <ThemeDot palette={palette} mode={mode} className="size-[18px] rounded-[6px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] max-w-[calc(100vw-16px)] p-0">
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-text-primary">Appearance</span>
            <ModeControl size="sm" showNote={false} />
          </div>
          <div>
            <span className="mb-2 block text-[12px] font-medium text-text-muted">
              {recentThemes.length ? 'Recent themes' : 'Try a theme'}
            </span>
            <RadioGroup
              label="Recent themes"
              items={items}
              value={look.theme}
              onChange={(id) => setLook({ theme: id })}
              className="grid grid-cols-3 gap-2"
              itemLabel={(p) => p.name}
              itemClassName={(_, checked) =>
                cn(
                  'flex flex-col gap-1.5 rounded-[var(--radius-control)] p-1 transition-colors',
                  checked ? 'bg-accent-brand/10' : 'hover:bg-bg-surface-3',
                )
              }
              renderItem={(p, checked) => (
                <>
                  <span className="relative block">
                    <ThemeSwatch
                      palette={p}
                      mode={resolveMode(p, preferredMode)}
                      className="aspect-[16/10] w-full rounded-[calc(var(--radius-control)-2px)] shadow-[0_0_0_1px_var(--color-border)]"
                    />
                    {checked && (
                      <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-accent-brand text-on-accent-brand">
                        <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="truncate px-0.5 text-[11px] font-medium text-text-secondary">{p.name}</span>
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
            Open Theme Centre
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  )
}
