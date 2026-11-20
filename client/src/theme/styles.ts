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
  iconSet: string
  iconStyle: string
  iconContainer: string
  iconShape: string
}

export interface DesignStyle {
  id: string
  name: string
  /** A few words, shown under the name. */
  tagline: string
  /** One sentence on what makes it different. */
  about: string
  /** Who it is made for, in a few words (shown on the theme card). */
  forWho?: string
  bundle: StyleBundle
  /** Extra font the style's CSS uses for headings (loaded with the style). */
  displayFont?: string
  /** Extra font the style's CSS uses for long reading (lessons, notes). */
  readFont?: string
  /**
   * The page kit the style dresses. 'journal' = the editorial kit (ed-*
   * classes and data-ui hooks in styles.css under [data-kit='journal']); every
   * NexoraGuru theme builds on it and adds its own type, shapes and drawings.
   */
  kit?: 'journal'
  /** Internal styles (Hive's own look) are never offered or stored. */
  hidden?: boolean
}

/*
  The twelve NexoraGuru themes. Each is a whole design: its own palette (light
  and dark), typefaces, corners, an icon set and a drawn scene behind the page
  (components/look/ThemeScene.tsx): mountains, a reef, a desert fort, folk
  figures. They all dress the same page kit, so every feature works in every
  theme; their differences live in theme/themes.css under [data-style='…'].
*/
export const STYLES: DesignStyle[] = [
  {
    id: 'himalaya',
    name: 'Himalaya',
    tagline: 'Snow peaks and prayer flags',
    about: 'Layered snow peaks at dawn, prayer flags in the wind and drifting clouds, with an elegant serif. At night the ridges turn moonlit under the stars.',
    forWho: 'Everyone: the NexoraGuru default',
    bundle: { theme: 'himalaya', font: 'hanken', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'flat', pattern: 'himalaya', iconSet: 'phosphor', iconStyle: 'regular', iconContainer: 'quiet', iconShape: 'squircle' },
    displayFont: 'cormorant',
    readFont: 'literata',
    kit: 'journal',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    tagline: 'Northern lights',
    about: 'Ribbons of green and violet light ripple over a snowy pine ridge and a lit cabin, with a wide futuristic heading face. By day it is a pale arctic morning.',
    forWho: 'Night owls who like it magical',
    bundle: { theme: 'aurora', font: 'sora', codeFont: 'geist-mono', radius: 'round', cardStyle: 'flat', pattern: 'aurora', iconSet: 'phosphor', iconStyle: 'light', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'unbounded',
    kit: 'journal',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    tagline: 'Blossom letters',
    about: 'A blossoming branch, falling petals, a pagoda and a snow-capped volcano on blush paper, with a soft rounded serif. At night the garden is lit by the moon.',
    forWho: 'Soft colours and gentle shapes',
    bundle: { theme: 'sakura', font: 'nunito', codeFont: 'victor', radius: 'round', cardStyle: 'flat', pattern: 'sakura', iconSet: 'phosphor', iconStyle: 'duotone', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'fraunces',
    kit: 'journal',
  },
  {
    id: 'thar',
    name: 'Thar',
    tagline: 'Dunes, a fort and a caravan',
    about: 'Golden dunes, a sandstone fort on the ridge and a camel caravan walking past, set in a bold Devanagari-ready serif with indigo ink. At night the desert sky fills with stars.',
    forWho: 'Warm colours and Indian heritage',
    bundle: { theme: 'thar', font: 'onest', codeFont: 'fira', radius: 'rounded', cardStyle: 'flat', pattern: 'thar', iconSet: 'remix', iconStyle: 'line', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'rozha',
    readFont: 'literata',
    kit: 'journal',
  },
  {
    id: 'warli',
    name: 'Warli',
    tagline: 'Folk art on a clay wall',
    about: 'Warli painting from Maharashtra: stick figures dancing the tarpa circle, huts, trees and a sun, in terracotta on rice paper. At night it is white paint on a red-ochre wall.',
    forWho: 'Craft, culture and calm colour',
    bundle: { theme: 'warli', font: 'figtree', codeFont: 'source-code', radius: 'rounded', cardStyle: 'flat', pattern: 'warli', iconSet: 'phosphor', iconStyle: 'regular', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'young-serif',
    kit: 'journal',
  },
  {
    id: 'reef',
    name: 'Reef',
    tagline: 'A sunlit coral lagoon',
    about: 'Light rays through turquoise water, swaying kelp, coral and fish swimming past, with a lively grotesque. At night it sinks into the deep blue sea.',
    forWho: 'Ocean lovers and calm focus',
    bundle: { theme: 'reef', font: 'figtree', codeFont: 'jetbrains', radius: 'round', cardStyle: 'flat', pattern: 'reef', iconSet: 'phosphor', iconStyle: 'duotone', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'bricolage',
    kit: 'journal',
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    tagline: 'Circles, squares and primaries',
    about: 'A poster from the 1920s design school: bold geometric shapes in red, yellow and blue, a heavy geometric face and square corners. On black at night.',
    forWho: 'Bold looks and clean lines',
    bundle: { theme: 'bauhaus', font: 'outfit', codeFont: 'jetbrains', radius: 'sharp', cardStyle: 'flat', pattern: 'bauhaus', iconSet: 'tabler', iconStyle: 'outline', iconContainer: 'quiet', iconShape: 'square' },
    displayFont: 'outfit',
    kit: 'journal',
  },
  {
    id: 'arcade',
    name: 'Arcade',
    tagline: 'Insert coin',
    about: 'Pixel headlines, square corners and a pixel city with flickering windows under a sky of pixel stars. Dark is an arcade cabinet; light is a pea-green handheld screen.',
    forWho: 'Gamers and night owls',
    bundle: { theme: 'arcade', font: 'space-grotesk', codeFont: 'jetbrains', radius: 'sharp', cardStyle: 'flat', pattern: 'arcade', iconSet: 'tabler', iconStyle: 'outline', iconContainer: 'quiet', iconShape: 'square' },
    displayFont: 'pixelify',
    kit: 'journal',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    tagline: 'From the drafting table',
    about: 'A drafting grid with a suspension bridge drawn to scale, dimension lines and a turning gear, monospaced labels and square corners. Dark is a blueprint sheet; light is blue ink on vellum.',
    forWho: 'Builders and engineers',
    bundle: { theme: 'blueprint', font: 'inter-tight', codeFont: 'martian', radius: 'sharp', cardStyle: 'flat', pattern: 'blueprint', iconSet: 'tabler', iconStyle: 'outline', iconContainer: 'quiet', iconShape: 'square' },
    displayFont: 'martian',
    kit: 'journal',
  },
  {
    id: 'kerala',
    name: 'Kerala',
    tagline: 'Backwaters and coconut palms',
    about: 'A houseboat drifting on still backwaters, coconut palms leaning over the bank and paddy fields beyond, set in a newspaper serif. At night the lagoon is lit by the moon.',
    forWho: 'Calm greens and slow mornings',
    bundle: { theme: 'kerala', font: 'manrope', codeFont: 'source-code', radius: 'round', cardStyle: 'flat', pattern: 'kerala', iconSet: 'phosphor', iconStyle: 'regular', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'newsreader',
    readFont: 'newsreader',
    kit: 'journal',
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    tagline: 'Planets, orbits and comets',
    about: 'A ringed planet, moons on their orbits, a comet and shooting stars across deep space, with a technical grotesque. By day it is a pale star chart with the same planets.',
    forWho: 'Space fans and big thinkers',
    bundle: { theme: 'cosmos', font: 'space-grotesk', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'flat', pattern: 'cosmos', iconSet: 'tabler', iconStyle: 'outline', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'space-grotesk',
    kit: 'journal',
  },
  {
    id: 'ghats',
    name: 'Ghats',
    tagline: 'River steps at dusk',
    about: 'Temple spires and stone steps by a wide river, boats and floating diyas carried by the current, in a warm serif. Saffron dusk by day, a river of lamps at night.',
    forWho: 'Warm evenings and quiet focus',
    bundle: { theme: 'ghats', font: 'plex', codeFont: 'plex-mono', radius: 'rounded', cardStyle: 'flat', pattern: 'ghats', iconSet: 'remix', iconStyle: 'line', iconContainer: 'quiet', iconShape: 'squircle' },
    displayFont: 'fraunces',
    readFont: 'literata',
    kit: 'journal',
  },
  {
    // Hive's old look (before 2026-11): never offered, never stored. Kept so old saved looks still read.
    id: 'studio',
    name: 'Studio',
    tagline: 'Precise and quiet',
    about: 'Hairline edges, neutral ink and nothing in the way.',
    bundle: { theme: 'midnight', font: 'geist', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'soft', pattern: 'none', iconSet: 'phosphor', iconStyle: 'regular', iconContainer: 'quiet', iconShape: 'squircle' },
    hidden: true,
  },
]

/** The themes people can choose (Hive's internal look excluded). */
export const THEMES = STYLES.filter((s) => !s.hidden)

export const DEFAULT_STYLE = 'himalaya'
export const STYLE_BY_ID = new Map(STYLES.map((s) => [s.id, s]))

/** True when a style dresses the editorial page kit (see DesignStyle.kit). */
export function isJournalKit(styleId: string | undefined): boolean {
  return !!styleId && STYLE_BY_ID.get(styleId)?.kit === 'journal'
}

export const PATTERNS = [
  { id: 'none', label: 'None', hint: 'A plain page.' },
  { id: 'himalaya', label: 'Snow peaks', hint: 'Snow peaks, prayer flags and drifting clouds.' },
  { id: 'aurora', label: 'Northern lights', hint: 'Aurora ribbons over a pine ridge.' },
  { id: 'sakura', label: 'Blossom garden', hint: 'A blossoming branch, falling petals and a pagoda.' },
  { id: 'thar', label: 'Desert fort', hint: 'Dunes, a fort and a camel caravan.' },
  { id: 'warli', label: 'Warli', hint: 'Folk figures dancing in a circle.' },
  { id: 'reef', label: 'Coral reef', hint: 'Light rays, kelp, coral and fish.' },
  { id: 'bauhaus', label: 'Bauhaus', hint: 'Bold circles, arcs and bars.' },
  { id: 'arcade', label: 'Pixel city', hint: 'A pixel skyline under pixel stars.' },
  { id: 'blueprint', label: 'Drawing', hint: 'A bridge drawn to scale and a gear.' },
  { id: 'kerala', label: 'Backwaters', hint: 'A houseboat, palms and paddy fields.' },
  { id: 'cosmos', label: 'Planets', hint: 'A ringed planet, orbits and comets.' },
  { id: 'ghats', label: 'River steps', hint: 'Temple spires, boats and floating diyas.' },
] as const

/** Heading faces only styles use (loaded on demand; see fontLoaders.ts). */
export const DISPLAY_FACES: Record<string, string> = {
  cormorant: "'Cormorant Garamond Variable', ui-serif, Georgia, serif",
  unbounded: "'Unbounded Variable', ui-sans-serif, system-ui, sans-serif",
  outfit: "'Outfit Variable', ui-sans-serif, system-ui, sans-serif",
  newsreader: "'Newsreader Variable', ui-serif, Georgia, serif",
  'space-grotesk': "'Space Grotesk Variable', ui-sans-serif, system-ui, sans-serif",
  fraunces: "'Fraunces Variable', ui-serif, Georgia, serif",
  pixelify: "'Pixelify Sans Variable', ui-monospace, monospace",
  'young-serif': "'Young Serif', ui-serif, Georgia, serif",
  rozha: "'Rozha One', ui-serif, Georgia, serif",
  kalam: "'Kalam', 'Comic Neue', ui-rounded, cursive",
  martian: "'Martian Mono Variable', ui-monospace, monospace",
  bricolage: "'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif",
  literata: "'Literata Variable', ui-serif, Georgia, serif",
}

export type PatternId = (typeof PATTERNS)[number]['id']
export const DEFAULT_PATTERN: PatternId = 'none'
