import { sanitizeLook, type Look } from '@/theme/look'
import { PALETTE_BY_ID, resolveMode, type ThemeMode } from '@/theme/palettes'
import type { DesignStyle } from '@/theme/styles'

/** The look a theme gives, keeping this person's own settings (text size, code font, handwriting). */
export function themeLook(look: Look, t: DesignStyle): Look {
  return sanitizeLook({ ...look, v: 5, style: t.id })
}

/** The mode a theme shows in for someone who prefers `preferred`. */
export function themeMode(t: DesignStyle, preferred: ThemeMode): ThemeMode {
  const p = PALETTE_BY_ID.get(t.bundle.theme)
  return p ? resolveMode(p, preferred) : preferred
}
