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
  The ten NexoraGuru themes. Each is a whole design: its own palette (light
  and dark), typefaces, corners, a drawn page pattern and an icon set. They
  all dress the same page kit, so every feature works in every theme; their
  differences live in theme/themes.css under [data-style='…'].
*/
export const STYLES: DesignStyle[] = [
  {
    id: 'journal',
    name: 'Field Journal',
    tagline: 'Warm paper, set like a journal',
    about: 'Parchment and ivory, an editorial serif, hairlines instead of shadows and one clay action per screen. The NexoraGuru house style.',
    forWho: 'Readers who like it calm',
    bundle: { theme: 'parchment', font: 'geist', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'flat', pattern: 'none', iconSet: 'phosphor', iconStyle: 'regular', iconContainer: 'quiet', iconShape: 'squircle' },
    displayFont: 'newsreader',
    kit: 'journal',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    tagline: 'Blossom letters',
    about: 'Blush paper, plum ink and petals drifting in the margins, with a soft rounded serif. At night it turns into a garden lit by paper lanterns.',
    forWho: 'Soft colours and gentle shapes',
    bundle: { theme: 'sakura', font: 'nunito', codeFont: 'victor', radius: 'round', cardStyle: 'flat', pattern: 'petals', iconSet: 'phosphor', iconStyle: 'duotone', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'fraunces',
    kit: 'journal',
  },
  {
    id: 'arcade',
    name: 'Arcade',
    tagline: 'Insert coin',
    about: 'Pixel headlines, square corners and a sky of pixel stars. Dark is an arcade cabinet; light is a pea-green handheld screen.',
    forWho: 'Gamers and night owls',
    bundle: { theme: 'arcade', font: 'space-grotesk', codeFont: 'jetbrains', radius: 'sharp', cardStyle: 'flat', pattern: 'pixels', iconSet: 'tabler', iconStyle: 'outline', iconContainer: 'quiet', iconShape: 'square' },
    displayFont: 'pixelify',
    kit: 'journal',
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    tagline: 'Ferns and terracotta',
    about: 'Sage paper, forest-green ink and terracotta, with fern fronds drawn in the corners and a friendly round serif.',
    forWho: 'Nature lovers',
    bundle: { theme: 'greenhouse', font: 'figtree', codeFont: 'source-code', radius: 'round', cardStyle: 'flat', pattern: 'ferns', iconSet: 'phosphor', iconStyle: 'light', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'young-serif',
    readFont: 'literata',
    kit: 'journal',
  },
  {
    id: 'observatory',
    name: 'Observatory',
    tagline: 'Charts of the night sky',
    about: 'Navy night and brass instruments, constellations and orbit rings behind the page and an engraved serif. By day it is a printed star atlas.',
    forWho: 'Stargazers and dreamers',
    bundle: { theme: 'observatory', font: 'hanken', codeFont: 'plex-mono', radius: 'rounded', cardStyle: 'flat', pattern: 'stars', iconSet: 'iconoir', iconStyle: 'regular', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'cormorant',
    readFont: 'literata',
    kit: 'journal',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    tagline: 'From the drafting table',
    about: 'Drafting grid, compass arcs and corner ticks, monospaced labels and square corners. Dark is a blueprint sheet; light is blue ink on vellum.',
    forWho: 'Builders and engineers',
    bundle: { theme: 'blueprint', font: 'inter-tight', codeFont: 'martian', radius: 'sharp', cardStyle: 'flat', pattern: 'drafting', iconSet: 'tabler', iconStyle: 'outline', iconContainer: 'quiet', iconShape: 'square' },
    displayFont: 'martian',
    kit: 'journal',
  },
  {
    id: 'sketchbook',
    name: 'Sketchbook',
    tagline: 'Pencil and doodles',
    about: 'Dot-grid paper, hand-drawn edges and pencil doodles of arrays, trees and arrows, with handwritten headings. At night it is chalk on a green board.',
    forWho: 'Doodlers and creative minds',
    bundle: { theme: 'sketchbook', font: 'lexend', codeFont: 'commit', radius: 'rounded', cardStyle: 'flat', pattern: 'doodles', iconSet: 'lucide', iconStyle: 'regular', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'kalam',
    kit: 'journal',
  },
  {
    id: 'blockprint',
    name: 'Block Print',
    tagline: 'Indigo, madder and marigold',
    about: 'Hand block-printed cotton from Jaipur: indigo ink, madder red and marigold, buta and rosette motifs and a bold display serif that also sets Hindi.',
    forWho: 'Colour, craft and culture',
    bundle: { theme: 'blockprint', font: 'onest', codeFont: 'fira', radius: 'rounded', cardStyle: 'flat', pattern: 'blocks', iconSet: 'remix', iconStyle: 'line', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'rozha',
    kit: 'journal',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    tagline: 'Green phosphor',
    about: 'Everything in monospace, phosphor-green text and faint scan lines. By day it prints on green-bar paper like an old line printer.',
    forWho: 'Coders who live in the shell',
    bundle: { theme: 'terminal', font: 'geist', codeFont: 'jetbrains', radius: 'sharp', cardStyle: 'flat', pattern: 'scanlines', iconSet: 'lucide', iconStyle: 'light', iconContainer: 'quiet', iconShape: 'square' },
    kit: 'journal',
  },
  {
    id: 'clear',
    name: 'Clear',
    tagline: 'High contrast, easy to read',
    about: 'Black and white with one strong accent, the Atkinson Hyperlegible typeface made for low vision, firm borders and underlined links.',
    forWho: 'Low vision, bright rooms, tired eyes',
    bundle: { theme: 'clear', font: 'atkinson', codeFont: 'source-code', radius: 'rounded', cardStyle: 'flat', pattern: 'none', iconSet: 'heroicons', iconStyle: 'outline', iconContainer: 'quiet', iconShape: 'circle' },
    displayFont: 'atkinson',
    kit: 'journal',
  },
  {
    // Hive's own look: never offered, never stored (see look.ts hiveLook).
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

export const DEFAULT_STYLE = 'journal'
export const STYLE_BY_ID = new Map(STYLES.map((s) => [s.id, s]))

/** True when a style dresses the editorial page kit (see DesignStyle.kit). */
export function isJournalKit(styleId: string | undefined): boolean {
  return !!styleId && STYLE_BY_ID.get(styleId)?.kit === 'journal'
}

export const PATTERNS = [
  { id: 'none', label: 'None', hint: 'A plain page.' },
  { id: 'petals', label: 'Petals', hint: 'Cherry blossom petals drifting down the margins.' },
  { id: 'pixels', label: 'Pixel sky', hint: 'Pixel stars, coins and hearts.' },
  { id: 'ferns', label: 'Ferns', hint: 'Fern fronds and leaves drawn in line.' },
  { id: 'stars', label: 'Star chart', hint: 'Constellations and orbit rings.' },
  { id: 'drafting', label: 'Drafting', hint: 'A drafting grid with compass arcs.' },
  { id: 'doodles', label: 'Doodles', hint: 'Pencil doodles on dot-grid paper.' },
  { id: 'blocks', label: 'Block print', hint: 'Buta and rosette motifs, printed by hand.' },
  { id: 'scanlines', label: 'Scan lines', hint: 'Faint scan lines, or green-bar paper by day.' },
] as const

/** Heading faces only styles use (loaded on demand; see fontLoaders.ts). */
export const DISPLAY_FACES: Record<string, string> = {
  cormorant: "'Cormorant Garamond Variable', ui-serif, Georgia, serif",
  fraunces: "'Fraunces Variable', ui-serif, Georgia, serif",
  pixelify: "'Pixelify Sans Variable', ui-monospace, monospace",
  'young-serif': "'Young Serif', ui-serif, Georgia, serif",
  rozha: "'Rozha One', ui-serif, Georgia, serif",
  kalam: "'Kalam', 'Comic Neue', ui-rounded, cursive",
  martian: "'Martian Mono Variable', ui-monospace, monospace",
}

export type PatternId = (typeof PATTERNS)[number]['id']
export const DEFAULT_PATTERN: PatternId = 'none'
