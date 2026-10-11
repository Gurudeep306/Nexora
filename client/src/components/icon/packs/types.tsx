/*
  Shared shapes for icon packs. A pack maps every semantic IconName to a Glyph
  for each of its styles; <Icon> picks the pack/style and renders the glyph.
*/
import type { ComponentType, SVGProps } from 'react'
import type { TablerIcon } from '@tabler/icons-react'
import type { IconSetId } from '@/theme/iconCatalog'
import type { IconName } from '../names'

export interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'children'> {
  size?: number | string
}

export type Glyph = ComponentType<GlyphProps> & {
  /** Optical scale override (glyphs borrowed from another library). */
  opticalScale?: number
}

export type IconStyleMap = Record<IconName, Glyph>

export interface IconPack {
  id: IconSetId
  styles: Record<string, IconStyleMap>
}

/** Tabler draws on a 24 grid with ~3px padding — nudge it up to match the rest. */
export const TABLER_OPTICAL_SCALE = 1.08

export function named(g: ComponentType<GlyphProps>, name?: string): Glyph {
  if (name) g.displayName = name
  return g
}

/** Build one style's map from a base map, keeping every key (and its type). */
export function mapGlyphs<C extends { displayName?: string }>(
  base: Record<IconName, C>,
  wrap: (c: C, name: IconName) => ComponentType<GlyphProps>,
): IconStyleMap {
  const out = {} as IconStyleMap
  for (const name of Object.keys(base) as IconName[]) out[name] = named(wrap(base[name], name), base[name].displayName)
  return out
}

/**
 * A Tabler glyph standing in where a library has no drawing for a meaning
 * (e.g. Heroicons has no trophy-medal or keyboard). Drawn at the host set's
 * stroke so it sits naturally next to native glyphs.
 */
export function borrowTabler(C: TablerIcon, stroke?: number): Glyph {
  const g: Glyph = named((p) => <C stroke={stroke} {...(p as object)} />, C.displayName)
  g.opticalScale = TABLER_OPTICAL_SCALE
  return g
}
