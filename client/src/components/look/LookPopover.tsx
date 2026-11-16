import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { lookAttributes } from '@/theme/look'
import { THEMES } from '@/theme/styles'
import { ACCENTS } from '@/theme/palettes'
import { cn } from '@/lib/utils'
import { loadUiFont } from '@/theme/fontLoaders'
import { ModeControl, RadioGroup } from './controls'
import { themeLook, themeMode } from './themeLook'
import './look-popover.css'

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
 * The top-bar theme menu — a swatch book. It opens with an ink wipe from the
 * button, and the ten themes fan out as strips: each one a swatch of the
 * theme's own paper, ink, heading face and accent, then its name. Under them,
 * the accent colours, and the way into everything on the Appearance page.
 */
export function LookPopover({ className }: { className?: string }) {
  const { look, setLook, preferredMode, mode } = useTheme()
  const current = THEMES.find((t) => t.id === look.style) ?? THEMES[0]

  return (
    <Popover
      onOpenChange={(open) => {
        // Each swatch sets its "Aa" in the theme's own heading face.
        if (open) for (const t of THEMES) if (t.displayFont) void loadUiFont(t.displayFont)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${current.name}. Change theme or appearance`}
          title="Theme"
          className={cn(
            'lp-trigger flex size-8 cursor-pointer items-center justify-center rounded-[0.7rem] border border-border bg-bg-surface-2 transition-colors hover:border-border-strong',
            className,
          )}
        >
          <ThemeDot className="size-[18px] rounded-[6px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} aria-label="Theme and appearance" className="lp-sheet w-[340px] max-w-[calc(100vw-16px)] p-0">
        <div className="lp-head">
          <p className="lp-kicker m-0">Theme</p>
          <ModeControl size="sm" showNote={false} />
        </div>

        <RadioGroup
          label="Theme"
          items={THEMES}
          value={look.style}
          onChange={(id) => setLook({ style: id })}
          className="lp-book"
          itemLabel={(t) => `${t.name}: ${t.tagline}`}
          itemClassName={(_, checked) => cn('lp-strip', checked && 'is-on')}
          renderItem={(t, checked) => {
            const i = THEMES.indexOf(t)
            const attrs = lookAttributes(themeLook(look, t), themeMode(t, preferredMode))
            return (
              <span className="lp-strip-in" style={{ ['--i' as string]: i }}>
                {/* The swatch: this theme's paper, ink, heading face and accent. */}
                <span {...attrs} aria-hidden="true" className="lp-swatch">
                  <span className="lp-swatch-aa">Aa</span>
                  <span className="lp-swatch-dot" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="lp-name block truncate">{t.name}</span>
                  <span className="lp-tag block truncate">{t.tagline}</span>
                </span>
                <span className="lp-check" aria-hidden="true">
                  {checked && <Check className="size-3.5" strokeWidth={2.5} />}
                </span>
              </span>
            )
          }}
        />

        <div className="lp-accents">
          <p className="lp-kicker m-0">Accent</p>
          <RadioGroup
            label="Accent colour"
            items={[{ id: 'theme', label: `${current.name}'s own` }, ...ACCENTS]}
            value={look.accent}
            onChange={(id) => setLook({ accent: id })}
            orientation="horizontal"
            className="lp-accent-row"
            itemLabel={(a) => a.label}
            itemClassName={(_, checked) => cn('lp-accent', checked && 'is-on')}
            renderItem={(a) => (
              <span
                aria-hidden="true"
                className={cn('lp-accent-dot', a.id === 'theme' && 'is-own')}
                // The theme's own accent comes from its palette; the others are overrides.
                data-palette={a.id === 'theme' ? look.theme : undefined}
                data-accent={a.id === 'theme' ? undefined : a.id}
                data-mode={mode}
              />
            )}
          />
        </div>

        <PopoverClose asChild>
          <Link to="/theme" className="lp-more">
            <span>
              <span className="block">Make it yours</span>
              <span className="lp-tag block">Fonts, text colour, corners and the Dock</span>
            </span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  )
}
