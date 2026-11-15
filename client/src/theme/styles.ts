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
    id: 'journal',
    name: 'Field Journal',
    tagline: 'Warm paper, set like a journal',
    about: 'Parchment and ivory, an editorial serif, hairlines instead of shadows and one clay action per screen. The NexoraGuru house style.',
    bundle: { theme: 'parchment', font: 'geist', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'flat', pattern: 'none' },
    displayFont: 'newsreader',
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Precise and quiet',
    about: 'Hairline edges, neutral ink and nothing in the way.',
    bundle: { theme: 'midnight', font: 'geist', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'soft', pattern: 'none' },
  },
  {
    id: 'glass',
    name: 'Liquid Glass',
    tagline: 'Frosted, light, layered',
    about: 'Translucent frosted panels over a soft wash of colour, with pill-shaped controls.',
    bundle: { theme: 'glacier', font: 'jakarta', codeFont: 'geist-mono', radius: 'round', cardStyle: 'glass', pattern: 'wash' },
  },
  {
    id: 'luxe',
    name: 'Noir & Gold',
    tagline: 'Quiet luxury',
    about: 'Espresso black, a high-contrast Garamond and gold hairlines. Spaced capitals on every button.',
    bundle: { theme: 'noir', font: 'hanken', codeFont: 'plex-mono', radius: 'sharp', cardStyle: 'outline', pattern: 'grain' },
    displayFont: 'cormorant',
  },
  {
    id: 'washi',
    name: 'Washi',
    tagline: 'Paper, ink and a seal',
    about: 'Japanese minimalism: mincho headings, washi paper, sumi ink and one vermilion seal colour.',
    bundle: { theme: 'washi', font: 'instrument', codeFont: 'plex-mono', radius: 'sharp', cardStyle: 'ruled', pattern: 'grain' },
    displayFont: 'mincho',
  },
  {
    id: 'signal',
    name: 'Signal',
    tagline: 'Dot matrix, black and red',
    about: 'Dot-matrix headlines, a dot grid, round outlined controls and a single red signal.',
    bundle: { theme: 'signal', font: 'geist', codeFont: 'geist-mono', radius: 'round', cardStyle: 'outline', pattern: 'dots' },
    displayFont: 'doto',
  },
  {
    id: 'console',
    name: 'Console',
    tagline: 'Built like an instrument',
    about: 'Warm hardware grey, safety orange, key-cap buttons and small monospaced labels.',
    bundle: { theme: 'console', font: 'inter-tight', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'inset', pattern: 'grid' },
  },
  {
    id: 'nordic',
    name: 'Nordic',
    tagline: 'Soft daylight',
    about: 'Airy Scandinavian calm: pale slate, sea-green, rounded forms and soft, low shadows.',
    bundle: { theme: 'fjord', font: 'figtree', codeFont: 'geist-mono', radius: 'round', cardStyle: 'elevated', pattern: 'none' },
    displayFont: 'fraunces',
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

export const DEFAULT_STYLE = 'journal'
export const STYLE_BY_ID = new Map(STYLES.map((s) => [s.id, s]))

export const PATTERNS = [
  { id: 'none', label: 'None', hint: 'A plain page.' },
  { id: 'dots', label: 'Dots', hint: 'A fine dot grid.' },
  { id: 'grid', label: 'Grid', hint: 'Square graph paper.' },
  { id: 'blueprint', label: 'Blueprint', hint: 'Major and minor drafting lines.' },
  { id: 'columns', label: 'Columns', hint: 'A twelve-column layout grid.' },
  { id: 'lines', label: 'Scan lines', hint: 'Faint horizontal lines.' },
  { id: 'grain', label: 'Grain', hint: 'Paper or film grain.' },
  { id: 'wash', label: 'Wash', hint: 'A soft wash of the accent colour from the top.' },
] as const

/** Heading faces only styles use (loaded on demand; see fontLoaders.ts). */
export const DISPLAY_FACES: Record<string, string> = {
  cormorant: "'Cormorant Garamond Variable', ui-serif, Georgia, serif",
  mincho: "'Shippori Mincho', ui-serif, 'Hiragino Mincho ProN', Georgia, serif",
  doto: "'Doto Variable', ui-monospace, monospace",
  fraunces: "'Fraunces Variable', ui-serif, Georgia, serif",
}

export type PatternId = (typeof PATTERNS)[number]['id']
export const DEFAULT_PATTERN: PatternId = 'none'
