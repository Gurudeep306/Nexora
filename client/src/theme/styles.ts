/*
  Design styles — a whole design language in one choice, not just a colour.

  A style is two things:
    1. A bundle: the palette, typefaces, corners, card treatment and page
       pattern it was designed with. Choosing a style in the Theme Centre
       applies the bundle; every part can still be fine-tuned afterwards.
    2. Its own rules in styles.css, keyed by [data-style="id"]: heading face
       and weight, rules and borders, label treatment — the parts a palette
       can't express.

  Page patterns are a separate look field (data-pattern) so any style can
  wear any pattern.

  Keep this module dependency-free and type-strippable (node reads it).
*/

export interface StyleBundle {
  theme: string
  font: string
  codeFont: string
  radius: string
  cardStyle: string
  pattern: string
  iconContainer?: string
}

export interface DesignStyle {
  id: string
  name: string
  /** A few words, shown under the name. */
  tagline: string
  /** One sentence on what makes it different. */
  about: string
  bundle: StyleBundle
  /** Extra font the style's CSS uses for headings (loaded with the style). */
  displayFont?: string
}

export const STYLES: DesignStyle[] = [
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Precise and quiet',
    about: 'Hairline edges, neutral ink and nothing in the way. The NexoraGuru default.',
    bundle: { theme: 'midnight', font: 'geist', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'soft', pattern: 'none' },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    tagline: 'Set like a journal',
    about: 'Serif headlines, warm newsprint and thin rules in place of boxes.',
    bundle: { theme: 'newsprint', font: 'instrument', codeFont: 'plex-mono', radius: 'sharp', cardStyle: 'ruled', pattern: 'grain' },
    displayFont: 'newsreader',
  },
  {
    id: 'swiss',
    name: 'Swiss',
    tagline: 'Grid, type, signal red',
    about: 'The International Style: a visible column grid, heavy tight grotesk and square corners.',
    bundle: { theme: 'swiss', font: 'inter-tight', codeFont: 'geist-mono', radius: 'sharp', cardStyle: 'outline', pattern: 'columns' },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    tagline: 'Drawn on the drafting table',
    about: 'Engineering grid paper, monospaced labels and crisp construction lines.',
    bundle: { theme: 'blueprint', font: 'plex', codeFont: 'plex-mono', radius: 'sharp', cardStyle: 'outline', pattern: 'blueprint' },
  },
  {
    id: 'atelier',
    name: 'Atelier',
    tagline: 'Soft, deep, tactile',
    about: 'Generous corners, layered shadows and a fine film grain on near-black.',
    bundle: { theme: 'obsidian', font: 'manrope', codeFont: 'geist-mono', radius: 'round', cardStyle: 'elevated', pattern: 'grain' },
  },
  {
    id: 'canvas',
    name: 'Canvas',
    tagline: 'A design tool’s board',
    about: 'Cards float over a dotted canvas, like frames on a design board.',
    bundle: { theme: 'graphite', font: 'figtree', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'elevated', pattern: 'dots' },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    tagline: 'Everything in monospace',
    about: 'One monospaced face for the whole interface, square edges and faint scan lines.',
    bundle: { theme: 'carbon', font: 'geist', codeFont: 'jetbrains', radius: 'sharp', cardStyle: 'outline', pattern: 'lines' },
  },
  {
    id: 'manuscript',
    name: 'Manuscript',
    tagline: 'A reading room',
    about: 'Serif throughout on sepia paper — made for long study sessions.',
    bundle: { theme: 'sepia', font: 'newsreader', codeFont: 'plex-mono', radius: 'sharp', cardStyle: 'flat', pattern: 'grain' },
  },
  {
    id: 'poster',
    name: 'Poster',
    tagline: 'Bold ink, hard shadows',
    about: 'Thick ink outlines and offset shadows on bright paper — loud, but ordered.',
    bundle: { theme: 'porcelain', font: 'space-grotesk', codeFont: 'jetbrains', radius: 'sharp', cardStyle: 'ink', pattern: 'none' },
  },
]

export const DEFAULT_STYLE = 'studio'
export const STYLE_BY_ID = new Map(STYLES.map((s) => [s.id, s]))

export const PATTERNS = [
  { id: 'none', label: 'None', hint: 'A plain page.' },
  { id: 'dots', label: 'Dots', hint: 'A fine dot grid.' },
  { id: 'grid', label: 'Grid', hint: 'Square graph paper.' },
  { id: 'blueprint', label: 'Blueprint', hint: 'Major and minor drafting lines.' },
  { id: 'columns', label: 'Columns', hint: 'A twelve-column layout grid.' },
  { id: 'lines', label: 'Scan lines', hint: 'Faint horizontal lines.' },
  { id: 'grain', label: 'Grain', hint: 'Paper or film grain.' },
] as const

export type PatternId = (typeof PATTERNS)[number]['id']
export const DEFAULT_PATTERN: PatternId = 'none'
