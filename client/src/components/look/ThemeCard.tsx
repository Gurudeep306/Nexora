/*
  A theme, shown as itself: a small page on the theme's own paper, with its
  drawn scene, its heading face, its icon set, its button shape and its colours —
  the real theme rules, scoped onto the card's root (lookAttributes), so the
  card is a true specimen in both modes.
*/
import { Icon } from '@/components/icon/Icon'
import type { IconSetId } from '@/theme/iconCatalog'
import { lookAttributes, type Look } from '@/theme/look'
import type { ThemeMode } from '@/theme/palettes'
import { themeLook, themeMode } from './themeLook'
import { DEFAULT_STYLE, type DesignStyle } from '@/theme/styles'
import { cn } from '@/lib/utils'
import { ThemeScene } from './ThemeScene'
import './theme-card.css'

const ICONS = ['learn', 'problems', 'gate', 'trophy'] as const

/**
 * The specimen: kicker, a title in the theme's display face, one line of its
 * reading face, a card with the theme's icons and its two buttons.
 */
export function ThemeSpecimen({ theme, look, mode, compact = false, className }: { theme: DesignStyle; look: Look; mode: ThemeMode; compact?: boolean; className?: string }) {
  const l = themeLook(look, theme)
  const attrs = lookAttributes(l, mode)
  return (
    <span {...attrs} aria-hidden="true" className={cn('tk-paper', compact && 'tk-compact', className)}>
      <ThemeScene scene={theme.bundle.pattern} />
      <span className="tk-body">
        <span className="tk-kicker">Chapter VII</span>
        <span className="tk-title">Shortest paths</span>
        {!compact && <span className="tk-prose">Relax the nearest vertex first, then never look back.</span>}
        <span className="tk-card">
          <span className="tk-icons">
            {ICONS.map((n) => (
              <Icon key={n} name={n} set={l.iconSet as IconSetId} style={l.iconStyle} className="tk-icon" />
            ))}
          </span>
          <span className="tk-buttons">
            <span className="tk-btn tk-btn-main">Start</span>
            {!compact && <span className="tk-btn tk-btn-alt">Notes</span>}
          </span>
        </span>
      </span>
    </span>
  )
}

/** A theme to choose: the specimen, then its name, tagline and who it suits. */
export function ThemeCard({
  theme,
  look,
  preferred,
  checked,
  onChoose,
  tabIndex,
}: {
  theme: DesignStyle
  look: Look
  preferred: ThemeMode
  checked: boolean
  onChoose: () => void
  tabIndex?: number
}) {
  const mode = themeMode(theme, preferred)
  return (
    <button type="button" role="radio" aria-checked={checked} tabIndex={tabIndex} onClick={onChoose} className="tk-choice" aria-label={`${theme.name}: ${theme.tagline}. ${theme.forWho ?? ''}`}>
      <ThemeSpecimen theme={theme} look={look} mode={mode} />
      <span className="tk-caption">
        <span className="tk-name">
          {theme.name}
          {checked && <span className="tk-inuse">In use</span>}
          {theme.id === DEFAULT_STYLE && !checked && <span className="tk-default">Default</span>}
        </span>
        <span className="tk-tagline">{theme.tagline}</span>
        <span className="tk-about">{theme.about}</span>
        {theme.forWho && <span className="tk-for">For {theme.forWho.charAt(0).toLowerCase() + theme.forWho.slice(1)}</span>}
      </span>
    </button>
  )
}
