/*
  The Look (v5) — what the Appearance page stores in localStorage
  ('nexora:look') and syncs to the account (settings key 'ui_look'): one of
  the ten themes plus a few personal settings.

  sanitizeLookWith() is the one validator. It is deliberately
  self-contained (it reads nothing but its arguments) because vite.config.ts
  injects its source, together with LOOK_TABLES, into the first-paint script
  in index.html — so the page and the app can never disagree about what a
  valid look is. It also migrates every older look (v1 wallpapers, the v2–v4
  style pack) to the nearest of the ten themes.

  Keep this module dependency-light and type-strippable (node tests run it).
*/
import { CODE_FONTS, DEFAULT_SOLUTION_FONT, DEFAULT_TEXT_SIZE, HEADING_FACES, READ_FACES, SOLUTION_FONTS, TEXT_SIZES, UI_FONTS } from './fonts.ts'
import { ACCENTS, INKS } from './palettes.ts'
import { DEFAULT_STYLE, STYLES, THEMES } from './styles.ts'

export interface Look {
  v: 6
  /** Theme id (see styles.ts THEMES) — the whole design. */
  style: string
  /* Everything below the style comes from its bundle; only textSize,
     codeFont and solutionFont are personal choices on top of a theme. */
  pattern: string
  /** Palette id (see palettes.ts): the theme's own. */
  theme: string
  accent: string
  font: string
  codeFont: string
  /** Handwriting face for GATE worked solutions ('off' = the UI font). */
  solutionFont: string
  textSize: string
  cardStyle: string
  radius: string
  iconSet: string
  iconStyle: string
  iconContainer: string
  iconShape: string
  /* v6: personal choices on top of the theme ('theme' = the theme's own). */
  /** Text ink (palettes.ts INKS). */
  ink: string
  /** Interface font (fonts.ts UI_FONTS). */
  uiFont: string
  /** Heading face (fonts.ts HEADING_FACES). */
  headingFont: string
  /** Long-reading face for lessons and notes (fonts.ts READ_FACES). */
  readFont: string
  /** Corners: 'theme' | 'sharp' | 'soft' | 'round'. */
  corners: string
  /** The theme's drawings behind the page: 'theme' (on) or 'off'. */
  drawings: string
}

type Personal = 'v' | 'style' | 'accent' | 'solutionFont' | 'textSize' | 'ink' | 'uiFont' | 'headingFont' | 'readFont' | 'corners' | 'drawings'
type Bundle = Omit<Look, Personal>

export interface LookTables {
  /** The ten themes people can choose. */
  styles: string[]
  /** style id → page kit (styles without one are absent). */
  kits: Record<string, string>
  /** Each theme's full design. */
  bundles: Record<string, Bundle>
  codeFonts: string[]
  solutionFonts: string[]
  textSizes: string[]
  accents: string[]
  inks: string[]
  uiFonts: string[]
  headingFonts: string[]
  readFonts: string[]
  corners: string[]
  defaults: Look
  /** Hive's own look (Studio on Midnight), shown on /hive whatever the theme. */
  hive: Bundle & { style: string; accent: string; ink: string; uiFont: string; headingFont: string; readFont: string; corners: string; drawings: string }
  /**
   * v5 (2026): the old style pack (16 styles × 55 palettes) folded into the
   * ten themes. An accessibility palette always moves to Clear; a palette
   * chosen on the old default style moves by mood; otherwise the old style
   * decides.
   */
  v5: { styles: Record<string, string>; accessible: string[]; palettes: Record<string, string> }
  /** v1 text sizes (the only v1 setting that still maps to something). */
  legacyFontSize: Record<string, string>
}

const bundleOf = (id: string): Bundle => {
  const b = (STYLES.find((s) => s.id === id) ?? STYLES[0]).bundle
  return { pattern: b.pattern, theme: b.theme, font: b.font, codeFont: b.codeFont, cardStyle: b.cardStyle, radius: b.radius, iconSet: b.iconSet, iconStyle: b.iconStyle, iconContainer: b.iconContainer, iconShape: b.iconShape }
}

/** The personal choices, all at "the theme's own". */
const OWN = { accent: 'theme', ink: 'theme', uiFont: 'theme', headingFont: 'theme', readFont: 'theme', corners: 'theme', drawings: 'theme' }

export const DEFAULT_LOOK: Look = {
  v: 6,
  style: DEFAULT_STYLE,
  ...bundleOf(DEFAULT_STYLE),
  ...OWN,
  solutionFont: DEFAULT_SOLUTION_FONT,
  textSize: DEFAULT_TEXT_SIZE,
}

/** Hive keeps its own look (Studio on Midnight) whatever theme is on. */
export function hiveLook(look: Look): Look {
  if (!LOOK_TABLES.kits[look.style]) return look
  return { ...look, ...LOOK_TABLES.hive }
}

/** Paths that keep their pre-journal look (see hiveLook). */
export function isHivePath(pathname: string): boolean {
  return pathname === '/hive' || pathname.startsWith('/hive/')
}

export const LOOK_TABLES: LookTables = {
  styles: THEMES.map((s) => s.id),
  kits: Object.fromEntries(STYLES.filter((s) => s.kit).map((s) => [s.id, s.kit as string])),
  bundles: Object.fromEntries(THEMES.map((s) => [s.id, bundleOf(s.id)])),
  codeFonts: CODE_FONTS.map((f) => f.id),
  solutionFonts: SOLUTION_FONTS.map((f) => f.id),
  textSizes: TEXT_SIZES.map((s) => s.id),
  accents: ACCENTS.map((a) => a.id),
  inks: INKS.map((i) => i.id),
  uiFonts: UI_FONTS.map((f) => f.id),
  headingFonts: HEADING_FACES.map((f) => f.id),
  readFonts: READ_FACES.map((f) => f.id),
  corners: ['sharp', 'soft', 'round'],
  defaults: DEFAULT_LOOK,
  hive: { style: 'studio', ...bundleOf('studio'), ...OWN },
  v5: {
    styles: {
      journal: 'journal', studio: 'journal', editorial: 'journal', manuscript: 'journal',
      glass: 'sakura', washi: 'sakura',
      luxe: 'observatory', atelier: 'observatory',
      signal: 'arcade', poster: 'arcade',
      console: 'terminal', terminal: 'terminal',
      nordic: 'greenhouse',
      swiss: 'blueprint', blueprint: 'blueprint',
      canvas: 'sketchbook',
    },
    accessible: ['contrast-dark', 'contrast-light', 'colour-safe', 'tritan-safe', 'e-ink'],
    palettes: {
      sakura: 'sakura', lavender: 'sakura', 'rose-pine': 'sakura', 'rose-pine-moon': 'sakura', 'rose-pine-dawn': 'sakura', 'catppuccin-latte': 'sakura', 'catppuccin-frappe': 'sakura',
      forest: 'greenhouse', mint: 'greenhouse', everforest: 'greenhouse',
      synthwave: 'arcade', 'neon-city': 'arcade', vaporwave: 'arcade', electric: 'arcade', dracula: 'arcade', 'catppuccin-mocha': 'arcade', 'catppuccin-macchiato': 'arcade',
      phosphor: 'terminal', carbon: 'terminal', monokai: 'terminal', gruvbox: 'terminal',
      ocean: 'observatory', cobalt: 'observatory', nord: 'observatory', 'tokyo-night': 'observatory', 'tokyo-storm': 'observatory', kanagawa: 'observatory', obsidian: 'observatory', noir: 'observatory', aurora: 'observatory',
      ember: 'blockprint', saffron: 'blockprint', crimson: 'blockprint', citrus: 'blockprint',
      glacier: 'blueprint', fjord: 'greenhouse', swiss: 'blueprint', blueprint: 'blueprint', 'tokyo-day': 'blueprint', slate: 'blueprint',
      console: 'terminal', signal: 'arcade', washi: 'sakura',
    },
  },
  legacyFontSize: { normal: 'default', comfortable: 'default', large: 'large', huge: 'xl' },
}

/**
 * Validate (and migrate) a stored look. Self-contained on purpose — see the
 * file comment. Unknown values fall back to the defaults.
 */
export function sanitizeLookWith(raw: unknown, T: LookTables): Look {
  const r: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const D = T.defaults
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const own = (map: Record<string, string>, k: string) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : '')
  const ok = (v: string) => (T.styles.indexOf(v) >= 0 ? v : '')
  const before5 = typeof r.v !== 'number' || r.v < 5
  const oldStyle = str(r.style)
  const oldPalette = str(r.theme)
  // An accessibility palette from before v5 always lands on Clear.
  let style = before5 && T.v5.accessible.indexOf(oldPalette) >= 0 ? 'clear' : ok(oldStyle)
  if (!style) {
    // A palette picked on the old default style says more than the style does.
    if (!oldStyle || oldStyle === 'studio') style = ok(own(T.v5.palettes, oldPalette)) || ok(own(T.v5.styles, oldStyle))
    else style = ok(own(T.v5.styles, oldStyle)) || ok(own(T.v5.palettes, oldPalette))
    if (!style) style = D.style
  }
  const b = T.bundles[style]
  // The handwriting default ('shantell') moved to plain text in v3.
  const before3 = typeof r.v !== 'number' || r.v < 3
  const solution = before3 && r.solutionFont === 'shantell' ? '' : str(r.solutionFont)
  // v6 personal choices: a known id, else the theme's own.
  const pick = (v: unknown, list: string[]) => (list.indexOf(str(v)) >= 0 ? str(v) : 'theme')
  const uiFont = pick(r.uiFont, T.uiFonts)
  const drawings = str(r.drawings) === 'off' ? 'off' : 'theme'
  return {
    v: 6,
    style,
    pattern: drawings === 'off' ? 'none' : b.pattern,
    theme: b.theme,
    // Accents chosen before v5 belonged to the old style pack: they reset.
    accent: before5 ? 'theme' : pick(r.accent, T.accents),
    font: uiFont === 'theme' ? b.font : uiFont,
    // Before v5 the code font came with the old style: start from the theme's own.
    codeFont: (!before5 && T.codeFonts.indexOf(str(r.codeFont)) >= 0 ? str(r.codeFont) : '') || b.codeFont,
    solutionFont: (T.solutionFonts.indexOf(solution) >= 0 ? solution : '') || D.solutionFont,
    textSize: (T.textSizes.indexOf(str(r.textSize)) >= 0 ? str(r.textSize) : '') || own(T.legacyFontSize, str(r.fontSize)) || D.textSize,
    cardStyle: b.cardStyle,
    radius: b.radius,
    iconSet: b.iconSet,
    iconStyle: b.iconStyle,
    iconContainer: b.iconContainer,
    iconShape: b.iconShape,
    ink: pick(r.ink, T.inks),
    uiFont,
    headingFont: pick(r.headingFont, T.headingFonts),
    readFont: pick(r.readFont, T.readFonts),
    corners: pick(r.corners, T.corners),
    drawings,
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
    'data-style': look.style,
    'data-kit': LOOK_TABLES.kits[look.style],
    'data-pattern': look.pattern,
    'data-palette': look.theme,
    'data-mode': mode,
    'data-accent': look.accent === 'theme' ? undefined : look.accent,
    'data-font': look.font,
    'data-code-font': look.codeFont,
    'data-solution-font': look.solutionFont,
    'data-text-size': look.textSize,
    'data-card-style': look.cardStyle,
    'data-radius': look.radius,
    'data-icon-set': look.iconSet,
    'data-icon-style': look.iconStyle,
    'data-icon-container': look.iconContainer,
    'data-icon-shape': look.iconShape,
    'data-ink': look.ink === 'theme' ? undefined : look.ink,
    'data-ui-font': look.uiFont === 'theme' ? undefined : look.uiFont,
    'data-heading-font': look.headingFont === 'theme' ? undefined : look.headingFont,
    'data-read-font': look.readFont === 'theme' ? undefined : look.readFont,
    'data-corners': look.corners === 'theme' ? undefined : look.corners,
  }
}
