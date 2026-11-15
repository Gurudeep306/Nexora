/*
  Icon catalog — the shared contract between the Theme Centre (which stores
  and applies the user's choice) and the icon system (components/icon), which
  renders it.

  DOM contract: the theme layer writes the choice onto <html> as
    data-icon-set, data-icon-style, data-icon-container, data-icon-shape
  and the icon system reads those attributes (so <Icon> needs no React
  context and also works for the first paint).
*/

export type IconSetId = 'lucide' | 'phosphor' | 'tabler' | 'remix' | 'heroicons' | 'iconoir'

export interface IconStyleInfo {
  id: string
  label: string
}

export interface IconSetInfo {
  id: IconSetId
  label: string
  /** One short line for the picker. */
  description: string
  styles: IconStyleInfo[]
  defaultStyle: string
}

export const ICON_SETS: IconSetInfo[] = [
  {
    id: 'lucide',
    label: 'Lucide',
    description: 'Clean, consistent strokes',
    styles: [
      { id: 'light', label: 'Light' },
      { id: 'regular', label: 'Regular' },
      { id: 'bold', label: 'Bold' },
    ],
    defaultStyle: 'regular',
  },
  {
    id: 'phosphor',
    label: 'Phosphor',
    description: 'Flexible family with six weights',
    styles: [
      { id: 'thin', label: 'Thin' },
      { id: 'light', label: 'Light' },
      { id: 'regular', label: 'Regular' },
      { id: 'bold', label: 'Bold' },
      { id: 'fill', label: 'Fill' },
      { id: 'duotone', label: 'Duotone' },
    ],
    defaultStyle: 'duotone',
  },
  {
    id: 'tabler',
    label: 'Tabler',
    description: 'Crisp, even-weight outlines',
    styles: [
      { id: 'outline', label: 'Outline' },
    ],
    defaultStyle: 'outline',
  },
  {
    id: 'remix',
    label: 'Remix',
    description: 'Neutral, system-style glyphs',
    styles: [
      { id: 'line', label: 'Line' },
      { id: 'fill', label: 'Fill' },
    ],
    defaultStyle: 'line',
  },
  {
    id: 'heroicons',
    label: 'Heroicons',
    description: 'Hand-crafted by the Tailwind team',
    styles: [
      { id: 'outline', label: 'Outline' },
      { id: 'solid', label: 'Solid' },
    ],
    defaultStyle: 'outline',
  },
  {
    id: 'iconoir',
    label: 'Iconoir',
    description: 'Light, editorial line icons',
    styles: [
      { id: 'regular', label: 'Regular' },
    ],
    defaultStyle: 'regular',
  },
]

export const DEFAULT_ICON_SET: IconSetId = 'phosphor'

export type IconContainerId = 'quiet' | 'none' | 'soft' | 'solid' | 'outline' | 'gradient'

export const ICON_CONTAINERS: { id: IconContainerId; label: string }[] = [
  { id: 'quiet', label: 'Quiet' },
  { id: 'none', label: 'Bare' },
  { id: 'soft', label: 'Soft' },
  { id: 'solid', label: 'Solid' },
  { id: 'outline', label: 'Outline' },
  { id: 'gradient', label: 'Gradient' },
]

/** Quiet: a neutral tile and a grey glyph — colour only where it means something (success, warning, error). */
export const DEFAULT_ICON_CONTAINER: IconContainerId = 'quiet'

export type IconShapeId = 'circle' | 'squircle' | 'rounded' | 'square'

export const ICON_SHAPES: { id: IconShapeId; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' },
]

export const DEFAULT_ICON_SHAPE: IconShapeId = 'squircle'

/**
 * Semantic icon names every set must provide. The icon system may add more;
 * the Theme Centre previews only use these.
 */
export const CORE_ICON_NAMES = [
  'home', 'problems', 'learn', 'gate', 'nexus', 'analytics', 'trophy', 'settings',
  'search', 'bell', 'code', 'book', 'sparkles', 'user', 'flame', 'check',
] as const

export type CoreIconName = (typeof CORE_ICON_NAMES)[number]

export function findIconSet(id: string | null | undefined): IconSetInfo {
  return ICON_SETS.find((s) => s.id === id) ?? ICON_SETS.find((s) => s.id === DEFAULT_ICON_SET)!
}

/** A style id valid for the given set (falls back to the set's default). */
export function resolveIconStyle(set: IconSetInfo, style: string | null | undefined): string {
  return set.styles.some((s) => s.id === style) ? (style as string) : set.defaultStyle
}
