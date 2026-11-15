import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE_BY_ID, resolveMode } from '@/theme/palettes'
import { cn } from '@/lib/utils'
import { ModeControl, RadioGroup } from './controls'
import { ThemeDot } from './ThemeTile'
import { StyleSpecimen, styleLook } from './StylesSection'
import { STYLES } from '@/theme/styles'

/**
 * Top-bar appearance control: light/dark at a click, the design styles, and
 * the way into the full Appearance page.
 */
export function LookPopover({ className }: { className?: string }) {
  const { look, setLook, preferredMode, palette, mode } = useTheme()

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
            <span className="mb-2 block text-[12px] font-medium text-text-muted">Style</span>
            <RadioGroup
              label="Design style"
              items={STYLES}
              value={look.style}
              onChange={(id) => {
                const st = STYLES.find((x) => x.id === id)
                if (st) setLook(styleLook(look, st))
              }}
              className="grid grid-cols-3 gap-2"
              itemLabel={(st) => `${st.name}: ${st.tagline}`}
              itemClassName={(_, checked) =>
                cn(
                  'flex flex-col gap-1.5 rounded-[var(--radius-control)] p-1 transition-colors',
                  checked ? 'shadow-[inset_0_0_0_1.5px_var(--color-text-primary)]' : 'hover:bg-bg-surface-3',
                )
              }
              renderItem={(st) => {
                const l = styleLook(look, st)
                return (
                  <>
                    <StyleSpecimen
                      look={l}
                      mode={resolveMode(PALETTE_BY_ID.get(l.theme)!, preferredMode)}
                      className="aspect-[16/11] w-full rounded-[calc(var(--radius-control)-2px)] shadow-[0_0_0_1px_var(--color-border)] [&>span]:scale-[0.62] [&>span]:origin-top-left [&>span]:w-[161%] [&>span]:h-[161%]"
                    />
                    <span className="truncate px-0.5 text-[11px] font-medium text-text-secondary">{st.name}</span>
                  </>
                )
              }}
            />
          </div>
        </div>
        <PopoverClose asChild>
          <Link
            to="/theme"
            className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-bg-surface-3 hover:text-text-primary"
          >
            All appearance settings
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  )
}
