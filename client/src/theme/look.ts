/*
  The Look (v2) — what the Theme Centre stores in localStorage
  ('nexora:look') and syncs to the account (settings key 'ui_look').

  sanitizeLookWith() is the one validator. It is deliberately
  self-contained (it reads nothing but its arguments) because vite.config.ts
  injects its source, together with LOOK_TABLES, into the first-paint script
  in index.html — so the page and the app can never disagree about what a
  valid look is. It also migrates the v1 look (wallpapers, glass, icon packs…)
  to the nearest v2 equivalent.

  Keep this module dependency-light and type-strippable (node tests run it).
*/
import { ICON_CONTAINERS, ICON_SETS, ICON_SHAPES, DEFAULT_ICON_CONTAINER, DEFAULT_ICON_SET, DEFAULT_ICON_SHAPE } from './iconCatalog.ts'
import { ACCENTS, DEFAULT_PALETTE, PALETTES } from './palettes.ts'
import { CODE_FONTS, DEFAULT_CODE_FONT, DEFAULT_FONT, DEFAULT_TEXT_SIZE, TEXT_SIZES, UI_FONTS } from './fonts.ts'
import { CARD_STYLES, DEFAULT_CARD_STYLE, DEFAULT_RADIUS, RADII } from './cards.ts'

export interface Look {
  v: 2
  /** Palette id (see palettes.ts). */
  theme: string
  /** 'theme' = the palette's own accent, or an accent override id. */
  accent: string
  font: string
  codeFont: string
  textSize: string
  cardStyle: string
  radius: string
  iconSet: string
  iconStyle: string
  iconContainer: string
  iconShape: string
}

export interface LookTables {
  themes: string[]
  accents: string[]
  fonts: string[]
  codeFonts: string[]
  textSizes: string[]
  cardStyles: string[]
  radii: string[]
  iconSets: Record<string, { styles: string[]; def: string }>
  iconContainers: string[]
  iconShapes: string[]
  defaults: Look
  /** v1 value → v2 value, per field. */
  legacy: Record<'wallpaper' | 'accent' | 'fontStyle' | 'fontSize' | 'cardStyle' | 'iconShape' | 'iconPack', Record<string, string>>
}

const defaultSet = ICON_SETS.find((s) => s.id === DEFAULT_ICON_SET)!

export const DEFAULT_LOOK: Look = {
  v: 2,
  theme: DEFAULT_PALETTE,
  accent: 'theme',
  font: DEFAULT_FONT,
  codeFont: DEFAULT_CODE_FONT,
  textSize: DEFAULT_TEXT_SIZE,
  cardStyle: DEFAULT_CARD_STYLE,
  radius: DEFAULT_RADIUS,
  iconSet: DEFAULT_ICON_SET,
  iconStyle: defaultSet.defaultStyle,
  iconContainer: DEFAULT_ICON_CONTAINER,
  iconShape: DEFAULT_ICON_SHAPE,
}

export const LOOK_TABLES: LookTables = {
  themes: PALETTES.map((p) => p.id),
  accents: ['theme', ...ACCENTS.map((a) => a.id)],
  fonts: UI_FONTS.map((f) => f.id),
  codeFonts: CODE_FONTS.map((f) => f.id),
  textSizes: TEXT_SIZES.map((s) => s.id),
  cardStyles: CARD_STYLES.map((c) => c.id),
  radii: RADII.map((r) => r.id),
  iconSets: Object.fromEntries(ICON_SETS.map((s) => [s.id, { styles: s.styles.map((x) => x.id), def: s.defaultStyle }])),
  iconContainers: ICON_CONTAINERS.map((c) => c.id),
  iconShapes: ICON_SHAPES.map((s) => s.id),
  defaults: DEFAULT_LOOK,
  legacy: {
    // v1 wallpapers → the theme closest in colour and mood.
    wallpaper: {
      none: 'midnight', aurora: 'midnight', lagoon: 'mint', blossom: 'sakura', ember: 'ember', dunes: 'sandstone',
      nebula: 'lavender', graphite: 'graphite',
      'ghibli-meadow': 'forest', 'your-name-dusk': 'synthwave', 'demon-slayer-wisteria': 'lavender',
      'solo-leveling-monarch': 'obsidian', 'anime-shrine': 'ember', 'cherry-blossom-night': 'sakura',
      'pikachu-volt': 'saffron', 'charizard-core': 'ember', 'cyberpunk-edgerunners': 'neon-city', 'elden-tree': 'saffron',
      'lavender-fog': 'lavender', 'pallet-dusk': 'forest', 'interstellar-gargantua': 'ember',
      'spider-verse-multiverse': 'synthwave', 'matrix-digital-rain': 'phosphor', 'arcane-hextech': 'ocean',
      'hyperspace-jump': 'cobalt', 'carina-cliffs': 'ocean', 'pillars-creation': 'ember', 'deep-space': 'obsidian',
      'lunar-orbit': 'slate', 'milky-way': 'obsidian', 'cyber-tokyo': 'neon-city', 'cyber-grid': 'electric',
      'synthwave-grid': 'synthwave', 'liquid-chrome': 'carbon', 'prism-flow': 'vaporwave', 'quantum-mesh': 'cobalt',
      'dark-geometry': 'carbon', 'alpine-mirror': 'slate', 'borealis-fjord': 'aurora', 'fuji-sakura': 'sakura',
      'deep-surf': 'ocean',
    },
    accent: {
      multicolor: 'theme', blue: 'blue', purple: 'violet', pink: 'pink', red: 'red', orange: 'orange',
      yellow: 'amber', green: 'green', graphite: 'graphite', cyan: 'teal', ice: 'teal', plasma: 'pink',
    },
    fontStyle: {
      'space-grotesk': 'space-grotesk', modern: 'space-grotesk', syne: 'sora', orbitron: 'sora', bricolage: 'bricolage',
      unbounded: 'outfit', retro: 'outfit', cyber: 'geist', cinzel: 'literata', serif: 'literata',
      handwriting: 'nunito', 'handwriting-caveat': 'nunito', 'handwriting-kalam': 'nunito',
      'handwriting-architect': 'nunito', 'handwriting-indie': 'nunito',
    },
    fontSize: { normal: 'default', comfortable: 'default', large: 'large', huge: 'xl' },
    cardStyle: { glass: 'soft', neon: 'glow', minimal: 'flat', holo: 'elevated', gradient: 'gradient' },
    iconShape: { squircle: 'squircle', circle: 'circle', pill: 'circle', hexagon: 'rounded', diamond: 'rounded', shield: 'rounded', free: 'squircle' },
    iconPack: {
      vibrant: 'gradient', anime: 'gradient', clay: 'solid', neon: 'outline', glitch: 'outline', retro: 'outline',
      emerald: 'outline', crystal: 'soft', duotone: 'soft', minimal: 'soft',
    },
  },
}

/**
 * Validate (and migrate) a stored look. Self-contained on purpose — see the
 * file comment. Unknown values fall back to the defaults.
 */
export function sanitizeLookWith(raw: unknown, T: LookTables): Look {
  const r: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const D = T.defaults
  const L = T.legacy
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  /** A current (v2) value, or '' when it isn't one. */
  const v2 = (v: unknown, allowed: string[]) => (allowed.indexOf(str(v)) >= 0 ? str(v) : '')
  /** A v1 value mapped to its v2 equivalent, or ''. */
  const v1 = (v: unknown, map: Record<string, string>, allowed: string[]) => {
    const s = str(v)
    const m = Object.prototype.hasOwnProperty.call(map, s) ? map[s] : ''
    return allowed.indexOf(m) >= 0 ? m : ''
  }
  const iconSet = v2(r.iconSet, Object.keys(T.iconSets)) || D.iconSet
  const styles = T.iconSets[iconSet]
  return {
    v: 2,
    theme: v2(r.theme, T.themes) || v1(r.wallpaper, L.wallpaper, T.themes) || D.theme,
    accent: v2(r.accent, T.accents) || v1(r.accent, L.accent, T.accents) || D.accent,
    font: v2(r.font, T.fonts) || v1(r.fontStyle, L.fontStyle, T.fonts) || D.font,
    codeFont: v2(r.codeFont, T.codeFonts) || D.codeFont,
    textSize: v2(r.textSize, T.textSizes) || v1(r.fontSize, L.fontSize, T.textSizes) || D.textSize,
    cardStyle: v2(r.cardStyle, T.cardStyles) || v1(r.cardStyle, L.cardStyle, T.cardStyles) || D.cardStyle,
    radius: v2(r.radius, T.radii) || D.radius,
    iconSet,
    iconStyle: v2(r.iconStyle, styles.styles) || styles.def,
    iconContainer:
      v2(r.iconContainer, T.iconContainers) ||
      (r.iconShape === 'free' ? 'none' : v1(r.iconPack, L.iconPack, T.iconContainers)) ||
      D.iconContainer,
    iconShape: v2(r.iconShape, T.iconShapes) || v1(r.iconShape, L.iconShape, T.iconShapes) || D.iconShape,
  }
}

export function sanitizeLook(raw: unknown): Look {
  return sanitizeLookWith(raw, LOOK_TABLES)
}

/**
 * The look as data attributes — the whole theme layer keys off these (see
 * index.css). ThemeProvider writes them on <html> (the first-paint script in
 * index.html does the same before React loads); previews spread them on
 * their own root to scope a look.
 */
export function lookAttributes(look: Look, mode: 'light' | 'dark'): Record<string, string | undefined> {
  return {
    'data-palette': look.theme,
    'data-mode': mode,
    'data-accent': look.accent === 'theme' ? undefined : look.accent,
    'data-font': look.font,
    'data-code-font': look.codeFont,
    'data-text-size': look.textSize,
    'data-card-style': look.cardStyle,
    'data-radius': look.radius,
    'data-icon-set': look.iconSet,
    'data-icon-style': look.iconStyle,
    'data-icon-container': look.iconContainer,
    'data-icon-shape': look.iconShape,
  }
}
