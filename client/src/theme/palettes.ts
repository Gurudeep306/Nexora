/*
  Theme palettes — the single source of truth for every colour theme.

  Each theme offers a dark and/or a light mode. A mode is a small set of
  OKLCH tokens ('L C H'); everything else (materials, shadows, focus ring,
  selection, borders…) is derived from these in CSS, which vite.config.ts
  generates from this file (virtual:nexora-palettes.css). The same data
  feeds the first-paint script in index.html, the Theme Centre previews,
  Monaco's editor theme and tests/theme-contrast.test.js, which holds every
  theme + mode to WCAG contrast (see ./audit.ts).

  Editor classics reproduce their published (MIT / permissive) palettes;
  where a published colour misses a contrast rule as text, only its
  lightness has been nudged until it passes.

  Keep this module dependency-free and type-strippable (node runs it).
*/

export type ThemeMode = 'light' | 'dark'
export type ThemeCategory = 'signature' | 'editor' | 'vivid' | 'minimal' | 'accessible'

export interface SyntaxTokens {
  keyword: string
  string: string
  number: string
  function: string
  type: string
  comment: string
}

export interface ModeTokens {
  /** App background, surface (cards), raised surface, hover, fill. */
  bg: [string, string, string, string, string]
  /** Primary, secondary and muted text. */
  fg: [string, string, string]
  border: string
  accent: string
  /** Hover / secondary brand colour (gradients, keyword colour). */
  accent2: string
  /** Text and icons drawn on an accent fill. */
  onAccent: string
  success: string
  warning: string
  danger: string
  info: string
  syntax: SyntaxTokens
}

export interface Palette {
  id: string
  name: string
  category: ThemeCategory
  blurb: string
  /** Attribution for themes reproduced from a published palette. */
  credit?: string
  dark?: ModeTokens
  light?: ModeTokens
}

export interface AccentOverride {
  id: string
  label: string
  dark: Pick<ModeTokens, 'accent' | 'accent2' | 'onAccent'>
  light: Pick<ModeTokens, 'accent' | 'accent2' | 'onAccent'>
}

export const CATEGORIES: { id: ThemeCategory; label: string; hint: string }[] = [
  { id: 'signature', label: 'Signature', hint: 'Original NexoraGuru themes' },
  { id: 'editor', label: 'Editor classics', hint: 'Faithful takes on beloved open-source palettes' },
  { id: 'vivid', label: 'Vivid', hint: 'Neon and saturated, still readable' },
  { id: 'minimal', label: 'Minimal', hint: 'Monochrome, ink and paper' },
  { id: 'accessible', label: 'Accessible', hint: 'High contrast and colour-blind safe' },
]

export const DEFAULT_PALETTE = 'parchment'

export const PALETTES: Palette[] = [
  {
    id: 'parchment',
    name: 'Parchment',
    category: 'signature',
    blurb: 'Warm paper, ink and a clay pencil.',
    // The Field Journal palette (see docs/ui/field-journal.md). bg: canvas,
    // ivory card, soft oat (chips, hover, code), oat, fill. The manilla
    // "spread" colour is used once per page, so it lives in journal.css
    // (--ed-manilla) rather than in a slot hundreds of surfaces share.
    // accent is a deeper clay that reads as text; the clay fill of the one
    // primary button is --ed-clay (#d97757) in journal.css.
    light: {
      bg: ['0.948 0.011 95', '0.982 0.005 95', '0.925 0.013 90', '0.892 0.021 79', '0.865 0.017 88'],
      fg: ['0.191 0.002 107', '0.359 0.005 107', '0.5 0.009 99'],
      border: '0.842 0.004 91',
      accent: '0.5 0.13 39', accent2: '0.46 0.13 39', onAccent: '0.99 0.004 95',
      success: '0.52 0.11 145', warning: '0.52 0.11 75', danger: '0.52 0.16 30', info: '0.5 0.08 245',
      syntax: { keyword: '0.5 0.13 39', string: '0.48 0.11 145', number: '0.5 0.11 70', function: '0.191 0.002 107', type: '0.48 0.08 245', comment: '0.5 0.009 99' },
    },
    dark: {
      bg: ['0.214 0.004 85', '0.248 0.006 92', '0.262 0.007 88', '0.292 0.009 85', '0.32 0.01 88'],
      fg: ['0.948 0.011 95', '0.86 0.014 93', '0.712 0.013 92'],
      border: '0.365 0.007 95',
      accent: '0.69 0.127 39', accent2: '0.73 0.11 40', onAccent: '0.191 0.002 107',
      success: '0.74 0.12 145', warning: '0.8 0.12 80', danger: '0.72 0.15 30', info: '0.76 0.08 245',
      syntax: { keyword: '0.717 0.114 40', string: '0.74 0.12 145', number: '0.8 0.12 80', function: '0.948 0.011 95', type: '0.76 0.08 245', comment: '0.712 0.013 92' },
    },
  },

  /* ── The NexoraGuru themes (see styles.ts). Each has a light and a dark
     mode; every pair below passes theme/audit.ts. ── */
  {
    id: 'himalaya',
    name: 'Himalaya',
    category: 'signature',
    blurb: 'Snow peaks at dawn and prayer flags; moonlit ridges at night.',
    light: {
      bg: ['0.968 0.009 245', '0.992 0.004 245', '0.947 0.012 245', '0.924 0.016 245', '0.9 0.02 245'],
      fg: ['0.24 0.045 258', '0.38 0.045 258', '0.48 0.04 258'],
      border: '0.855 0.018 245',
      accent: '0.5 0.16 38', accent2: '0.45 0.16 38', onAccent: '0.99 0.004 60',
      success: '0.48 0.11 150', warning: '0.5 0.11 70', danger: '0.5 0.17 25', info: '0.48 0.12 255',
      syntax: { keyword: '0.5 0.16 38', string: '0.47 0.11 150', number: '0.5 0.12 70', function: '0.24 0.045 258', type: '0.47 0.13 255', comment: '0.48 0.04 258' },
    },
    dark: {
      bg: ['0.2 0.032 262', '0.235 0.036 262', '0.262 0.038 262', '0.29 0.04 262', '0.32 0.042 262'],
      fg: ['0.95 0.012 250', '0.85 0.025 250', '0.72 0.03 250'],
      border: '0.36 0.04 262',
      accent: '0.8 0.13 65', accent2: '0.85 0.11 70', onAccent: '0.22 0.04 262',
      success: '0.8 0.12 150', warning: '0.84 0.12 85', danger: '0.78 0.14 25', info: '0.8 0.09 245',
      syntax: { keyword: '0.8 0.13 65', string: '0.8 0.12 150', number: '0.84 0.12 85', function: '0.95 0.012 250', type: '0.8 0.1 245', comment: '0.72 0.03 250' },
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    category: 'signature',
    blurb: 'Northern lights over a pine ridge; an arctic morning by day.',
    light: {
      bg: ['0.965 0.012 195', '0.99 0.005 195', '0.944 0.016 195', '0.92 0.02 195', '0.895 0.024 195'],
      fg: ['0.24 0.045 225', '0.37 0.045 225', '0.47 0.04 225'],
      border: '0.85 0.022 195',
      accent: '0.48 0.1 175', accent2: '0.43 0.1 175', onAccent: '0.99 0.005 195',
      success: '0.48 0.11 145', warning: '0.5 0.11 70', danger: '0.5 0.17 25', info: '0.47 0.13 290',
      syntax: { keyword: '0.48 0.1 175', string: '0.47 0.11 145', number: '0.5 0.12 70', function: '0.24 0.045 225', type: '0.47 0.14 295', comment: '0.47 0.04 225' },
    },
    dark: {
      bg: ['0.18 0.03 245', '0.215 0.034 245', '0.242 0.036 245', '0.27 0.038 245', '0.3 0.04 245'],
      fg: ['0.95 0.02 175', '0.85 0.03 185', '0.72 0.035 200'],
      border: '0.35 0.042 245',
      accent: '0.83 0.15 160', accent2: '0.87 0.13 165', onAccent: '0.2 0.04 245',
      success: '0.82 0.14 150', warning: '0.84 0.12 85', danger: '0.78 0.14 25', info: '0.78 0.12 295',
      syntax: { keyword: '0.83 0.15 160', string: '0.82 0.12 120', number: '0.84 0.12 85', function: '0.95 0.02 175', type: '0.78 0.12 295', comment: '0.72 0.035 200' },
    },
  },
  {
    id: 'thar',
    name: 'Thar',
    category: 'signature',
    blurb: 'Golden dunes, a desert fort and indigo ink; a starry desert night.',
    light: {
      bg: ['0.955 0.024 80', '0.985 0.012 82', '0.935 0.03 80', '0.91 0.038 78', '0.885 0.044 78'],
      fg: ['0.25 0.05 275', '0.38 0.05 275', '0.48 0.045 270'],
      border: '0.85 0.035 78',
      accent: '0.46 0.17 275', accent2: '0.41 0.17 275', onAccent: '0.99 0.01 82',
      success: '0.48 0.11 150', warning: '0.5 0.11 65', danger: '0.5 0.17 28', info: '0.47 0.12 245',
      syntax: { keyword: '0.46 0.17 275', string: '0.47 0.11 150', number: '0.5 0.13 55', function: '0.25 0.05 275', type: '0.48 0.14 30', comment: '0.48 0.045 270' },
    },
    dark: {
      bg: ['0.2 0.045 278', '0.236 0.05 278', '0.262 0.052 278', '0.29 0.054 278', '0.32 0.056 278'],
      fg: ['0.95 0.02 85', '0.86 0.04 82', '0.73 0.045 80'],
      border: '0.36 0.055 278',
      accent: '0.84 0.14 82', accent2: '0.88 0.12 85', onAccent: '0.22 0.05 278',
      success: '0.8 0.12 150', warning: '0.84 0.12 70', danger: '0.78 0.14 28', info: '0.8 0.1 245',
      syntax: { keyword: '0.84 0.14 82', string: '0.8 0.12 150', number: '0.82 0.12 50', function: '0.95 0.02 85', type: '0.79 0.12 30', comment: '0.73 0.045 80' },
    },
  },
  {
    id: 'warli',
    name: 'Warli',
    category: 'signature',
    blurb: 'Folk figures on a clay wall: terracotta on rice paper, white on red ochre.',
    light: {
      bg: ['0.952 0.022 50', '0.984 0.01 55', '0.932 0.028 48', '0.908 0.034 46', '0.882 0.04 45'],
      fg: ['0.26 0.055 35', '0.39 0.055 35', '0.49 0.05 38'],
      border: '0.85 0.032 45',
      accent: '0.5 0.16 33', accent2: '0.45 0.16 33', onAccent: '0.99 0.008 60',
      success: '0.48 0.11 150', warning: '0.5 0.11 75', danger: '0.49 0.18 25', info: '0.48 0.11 250',
      syntax: { keyword: '0.5 0.16 33', string: '0.47 0.11 150', number: '0.5 0.12 75', function: '0.26 0.055 35', type: '0.48 0.11 250', comment: '0.49 0.05 38' },
    },
    dark: {
      bg: ['0.29 0.075 33', '0.325 0.078 33', '0.35 0.08 33', '0.38 0.082 33', '0.41 0.084 33'],
      fg: ['0.97 0.012 75', '0.9 0.025 70', '0.8 0.035 60'],
      border: '0.45 0.08 33',
      accent: '0.86 0.13 88', accent2: '0.9 0.11 90', onAccent: '0.27 0.07 33',
      success: '0.86 0.12 150', warning: '0.88 0.12 95', danger: '0.86 0.09 20', info: '0.86 0.07 240',
      syntax: { keyword: '0.86 0.13 88', string: '0.86 0.12 150', number: '0.88 0.1 60', function: '0.97 0.012 75', type: '0.86 0.07 240', comment: '0.8 0.035 60' },
    },
  },
  {
    id: 'reef',
    name: 'Reef',
    category: 'signature',
    blurb: 'A coral reef in a sunlit lagoon; the deep blue sea at night.',
    light: {
      bg: ['0.962 0.018 200', '0.99 0.007 200', '0.94 0.022 200', '0.916 0.027 200', '0.89 0.032 200'],
      fg: ['0.25 0.05 235', '0.38 0.05 235', '0.48 0.045 230'],
      border: '0.855 0.026 200',
      accent: '0.53 0.17 30', accent2: '0.48 0.17 30', onAccent: '0.99 0.006 200',
      success: '0.47 0.11 160', warning: '0.5 0.11 70', danger: '0.49 0.18 20', info: '0.47 0.1 235',
      syntax: { keyword: '0.53 0.17 30', string: '0.46 0.1 170', number: '0.5 0.12 70', function: '0.25 0.05 235', type: '0.47 0.11 260', comment: '0.48 0.045 230' },
    },
    dark: {
      bg: ['0.19 0.045 238', '0.225 0.05 238', '0.252 0.052 238', '0.28 0.054 238', '0.31 0.056 238'],
      fg: ['0.95 0.02 195', '0.86 0.035 200', '0.73 0.04 210'],
      border: '0.35 0.055 238',
      accent: '0.79 0.13 35', accent2: '0.84 0.11 40', onAccent: '0.2 0.045 238',
      success: '0.82 0.12 165', warning: '0.84 0.12 85', danger: '0.78 0.14 20', info: '0.8 0.09 220',
      syntax: { keyword: '0.79 0.13 35', string: '0.82 0.12 165', number: '0.84 0.12 85', function: '0.95 0.02 195', type: '0.8 0.1 260', comment: '0.73 0.04 210' },
    },
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    category: 'signature',
    blurb: 'Primary red, yellow and blue in bold shapes, on paper or on black.',
    light: {
      bg: ['0.965 0.01 90', '0.99 0.005 90', '0.94 0.012 90', '0.915 0.014 90', '0.89 0.016 90'],
      fg: ['0.19 0.005 90', '0.34 0.005 90', '0.46 0.006 90'],
      border: '0.84 0.01 90',
      accent: '0.52 0.2 28', accent2: '0.46 0.2 28', onAccent: '0.99 0.005 90',
      success: '0.48 0.12 150', warning: '0.5 0.11 75', danger: '0.5 0.2 28', info: '0.46 0.16 262',
      syntax: { keyword: '0.52 0.2 28', string: '0.47 0.12 150', number: '0.5 0.12 75', function: '0.19 0.005 90', type: '0.46 0.16 262', comment: '0.46 0.006 90' },
    },
    dark: {
      bg: ['0.17 0.004 90', '0.205 0.005 90', '0.232 0.006 90', '0.26 0.007 90', '0.29 0.008 90'],
      fg: ['0.96 0.01 90', '0.86 0.01 90', '0.73 0.01 90'],
      border: '0.345 0.008 90',
      accent: '0.88 0.17 95', accent2: '0.92 0.15 98', onAccent: '0.18 0.005 90',
      success: '0.8 0.14 150', warning: '0.88 0.15 95', danger: '0.72 0.18 28', info: '0.74 0.13 255',
      syntax: { keyword: '0.88 0.17 95', string: '0.8 0.14 150', number: '0.72 0.18 28', function: '0.96 0.01 90', type: '0.74 0.13 255', comment: '0.73 0.01 90' },
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    category: 'signature',
    blurb: 'Blush paper and plum ink by day; a lantern-lit garden at night.',
    light: {
      bg: ['0.965 0.014 10', '0.99 0.005 10', '0.945 0.02 10', '0.922 0.026 8', '0.895 0.032 8'],
      fg: ['0.27 0.06 350', '0.4 0.055 350', '0.5 0.04 350'],
      border: '0.855 0.024 10',
      accent: '0.5 0.17 355', accent2: '0.45 0.17 355', onAccent: '0.99 0.005 10',
      success: '0.48 0.11 150', warning: '0.5 0.11 65', danger: '0.5 0.17 25', info: '0.48 0.11 265',
      syntax: { keyword: '0.5 0.17 355', string: '0.47 0.11 150', number: '0.5 0.12 55', function: '0.27 0.06 350', type: '0.47 0.12 285', comment: '0.5 0.04 350' },
    },
    dark: {
      bg: ['0.205 0.03 340', '0.24 0.034 340', '0.268 0.036 340', '0.298 0.038 340', '0.33 0.04 340'],
      fg: ['0.95 0.015 350', '0.85 0.03 350', '0.72 0.04 350'],
      border: '0.37 0.04 340',
      accent: '0.8 0.12 355', accent2: '0.85 0.1 355', onAccent: '0.22 0.045 340',
      success: '0.8 0.12 150', warning: '0.83 0.12 80', danger: '0.78 0.14 25', info: '0.8 0.09 260',
      syntax: { keyword: '0.8 0.12 355', string: '0.8 0.12 150', number: '0.83 0.12 70', function: '0.95 0.015 350', type: '0.8 0.1 290', comment: '0.72 0.04 350' },
    },
  },
  {
    id: 'arcade',
    name: 'Arcade',
    category: 'signature',
    blurb: 'A cabinet in the dark; a pea-green handheld screen in the light.',
    light: {
      bg: ['0.885 0.06 122', '0.925 0.045 122', '0.862 0.068 124', '0.838 0.07 125', '0.81 0.072 126'],
      fg: ['0.24 0.07 145', '0.31 0.075 145', '0.38 0.075 145'],
      border: '0.72 0.07 130',
      accent: '0.42 0.18 25', accent2: '0.37 0.17 25', onAccent: '0.97 0.03 125',
      success: '0.36 0.1 150', warning: '0.4 0.1 70', danger: '0.42 0.18 25', info: '0.36 0.1 255',
      syntax: { keyword: '0.4 0.18 25', string: '0.34 0.1 150', number: '0.35 0.11 60', function: '0.24 0.07 145', type: '0.34 0.12 285', comment: '0.38 0.075 145' },
    },
    dark: {
      bg: ['0.175 0.045 285', '0.212 0.055 285', '0.242 0.06 285', '0.272 0.062 285', '0.31 0.064 285'],
      fg: ['0.96 0.02 95', '0.87 0.035 285', '0.74 0.05 285'],
      border: '0.37 0.065 285',
      accent: '0.87 0.16 95', accent2: '0.91 0.14 95', onAccent: '0.2 0.055 285',
      success: '0.83 0.17 145', warning: '0.85 0.15 70', danger: '0.74 0.18 18', info: '0.8 0.12 220',
      syntax: { keyword: '0.78 0.15 340', string: '0.83 0.17 145', number: '0.85 0.15 70', function: '0.87 0.16 95', type: '0.8 0.12 220', comment: '0.74 0.05 285' },
    },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    category: 'signature',
    blurb: 'White lines on blueprint blue; blue ink on drafting vellum by day.',
    light: {
      bg: ['0.958 0.013 230', '0.986 0.006 230', '0.938 0.016 230', '0.912 0.021 230', '0.885 0.026 230'],
      fg: ['0.27 0.085 258', '0.38 0.085 258', '0.49 0.07 258'],
      border: '0.84 0.034 240',
      accent: '0.5 0.16 30', accent2: '0.45 0.16 30', onAccent: '0.99 0 0',
      success: '0.47 0.11 150', warning: '0.5 0.11 70', danger: '0.5 0.16 25', info: '0.47 0.13 258',
      syntax: { keyword: '0.5 0.16 30', string: '0.46 0.11 150', number: '0.5 0.11 70', function: '0.27 0.085 258', type: '0.47 0.12 290', comment: '0.49 0.07 258' },
    },
    dark: {
      bg: ['0.33 0.105 256', '0.365 0.11 256', '0.395 0.11 256', '0.425 0.108 256', '0.455 0.105 256'],
      fg: ['0.98 0.008 240', '0.92 0.03 240', '0.84 0.05 240'],
      border: '0.53 0.095 250',
      accent: '0.9 0.13 90', accent2: '0.93 0.11 90', onAccent: '0.27 0.09 256',
      success: '0.9 0.13 150', warning: '0.92 0.12 90', danger: '0.88 0.09 30', info: '0.9 0.06 220',
      syntax: { keyword: '0.9 0.13 90', string: '0.9 0.13 150', number: '0.9 0.1 55', function: '0.98 0.008 240', type: '0.9 0.06 200', comment: '0.84 0.05 240' },
    },
  },
  {
    id: 'kerala',
    name: 'Kerala',
    category: 'signature',
    blurb: 'Backwaters, palms and paddy green; a moonlit lagoon at night.',
    light: {
      bg: ['0.962 0.018 135', '0.988 0.008 130', '0.94 0.024 135', '0.915 0.03 135', '0.89 0.035 135'],
      fg: ['0.25 0.05 160', '0.38 0.05 160', '0.48 0.045 155'],
      border: '0.85 0.032 135',
      accent: '0.47 0.12 160', accent2: '0.42 0.12 160', onAccent: '0.99 0.008 130',
      success: '0.47 0.12 145', warning: '0.5 0.11 70', danger: '0.5 0.17 28', info: '0.47 0.1 240',
      syntax: { keyword: '0.47 0.12 160', string: '0.5 0.12 70', number: '0.5 0.14 35', function: '0.25 0.05 160', type: '0.47 0.1 240', comment: '0.48 0.045 155' },
    },
    dark: {
      bg: ['0.19 0.035 175', '0.225 0.04 175', '0.252 0.042 175', '0.28 0.044 175', '0.31 0.046 175'],
      fg: ['0.95 0.02 120', '0.86 0.035 130', '0.73 0.04 140'],
      border: '0.35 0.045 175',
      accent: '0.84 0.13 95', accent2: '0.88 0.11 98', onAccent: '0.2 0.035 175',
      success: '0.82 0.13 145', warning: '0.85 0.12 80', danger: '0.78 0.14 28', info: '0.8 0.09 230',
      syntax: { keyword: '0.84 0.13 95', string: '0.82 0.13 145', number: '0.8 0.12 50', function: '0.95 0.02 120', type: '0.8 0.09 230', comment: '0.73 0.04 140' },
    },
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    category: 'signature',
    blurb: 'Deep space with a ringed planet and comets; a pale star chart by day.',
    light: {
      bg: ['0.965 0.012 285', '0.99 0.006 285', '0.944 0.016 285', '0.92 0.02 285', '0.895 0.024 285'],
      fg: ['0.23 0.05 285', '0.37 0.05 285', '0.47 0.045 285'],
      border: '0.85 0.022 285',
      accent: '0.49 0.2 295', accent2: '0.44 0.2 295', onAccent: '0.99 0.006 285',
      success: '0.48 0.11 150', warning: '0.5 0.11 70', danger: '0.5 0.18 20', info: '0.47 0.12 240',
      syntax: { keyword: '0.49 0.2 295', string: '0.47 0.11 150', number: '0.5 0.13 55', function: '0.23 0.05 285', type: '0.47 0.12 240', comment: '0.47 0.045 285' },
    },
    dark: {
      bg: ['0.16 0.035 285', '0.195 0.04 285', '0.222 0.042 285', '0.25 0.044 285', '0.28 0.046 285'],
      fg: ['0.95 0.015 285', '0.85 0.03 285', '0.72 0.04 285'],
      border: '0.345 0.048 285',
      accent: '0.8 0.13 300', accent2: '0.85 0.11 300', onAccent: '0.18 0.04 285',
      success: '0.8 0.12 150', warning: '0.84 0.12 80', danger: '0.78 0.14 20', info: '0.8 0.1 230',
      syntax: { keyword: '0.8 0.13 300', string: '0.8 0.12 150', number: '0.82 0.12 60', function: '0.95 0.015 285', type: '0.8 0.1 230', comment: '0.72 0.04 285' },
    },
  },
  {
    id: 'ghats',
    name: 'Ghats',
    category: 'signature',
    blurb: 'Saffron dusk over river steps; a river of floating lamps at night.',
    light: {
      bg: ['0.958 0.022 65', '0.986 0.01 70', '0.937 0.028 63', '0.912 0.034 62', '0.886 0.04 60'],
      fg: ['0.25 0.05 30', '0.38 0.05 30', '0.48 0.045 35'],
      border: '0.85 0.032 62',
      accent: '0.5 0.15 45', accent2: '0.45 0.15 45', onAccent: '0.99 0.008 70',
      success: '0.48 0.11 150', warning: '0.5 0.11 80', danger: '0.49 0.18 25', info: '0.47 0.11 250',
      syntax: { keyword: '0.5 0.15 45', string: '0.47 0.11 150', number: '0.5 0.14 20', function: '0.25 0.05 30', type: '0.47 0.11 250', comment: '0.48 0.045 35' },
    },
    dark: {
      bg: ['0.2 0.04 300', '0.235 0.045 300', '0.262 0.047 300', '0.29 0.049 300', '0.32 0.05 300'],
      fg: ['0.95 0.02 70', '0.86 0.035 65', '0.73 0.04 60'],
      border: '0.36 0.05 300',
      accent: '0.82 0.14 70', accent2: '0.86 0.12 75', onAccent: '0.22 0.045 300',
      success: '0.8 0.12 150', warning: '0.84 0.12 85', danger: '0.78 0.14 25', info: '0.8 0.09 245',
      syntax: { keyword: '0.82 0.14 70', string: '0.8 0.12 150', number: '0.8 0.13 40', function: '0.95 0.02 70', type: '0.8 0.09 245', comment: '0.73 0.04 60' },
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'signature',
    blurb: 'Blue-black ink with one calm cobalt accent. Kept for Hive, which keeps its own look.',
    dark: {
      bg: ['0.165 0.007 265', '0.2 0.008 265', '0.235 0.009 265', '0.27 0.009 265', '0.31 0.01 265'],
      fg: ['0.965 0.003 265', '0.8 0.003 265', '0.68 0.003 265'],
      border: '0.349 0.01 265',
      accent: '0.72 0.15 258', accent2: '0.78 0.13 258', onAccent: '0.17 0.03 258',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.17 292', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.17 258', type: '0.8 0.11 200', comment: '0.68 0.003 265' },
    },
    light: {
      bg: ['0.968 0.006 265', '0.997 0.004 265', '0.982 0.006 265', '0.95 0.006 265', '0.905 0.007 265'],
      fg: ['0.22 0.003 265', '0.42 0.003 265', '0.52 0.003 265'],
      border: '0.846 0.007 265',
      accent: '0.54 0.17 258', accent2: '0.47 0.17 258', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.17 292', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.17 258', type: '0.5 0.11 200', comment: '0.55 0.003 265' },
    },
  },
]

/**
 * Accent colours people can put on any theme (Appearance → Make it yours).
 * Tuned so every one passes the accent rules in audit.ts on all twelve themes,
 * in light and dark (tests/theme-contrast.test.js checks it).
 */
export const ACCENTS: AccentOverride[] = [
  { id: 'clay', label: 'Clay', light: { accent: '0.48 0.14 40', accent2: '0.42 0.14 40', onAccent: '1 0 0' }, dark: { accent: '0.78 0.14 40', accent2: '0.83 0.14 40', onAccent: '0.2 0.04 40' } },
  { id: 'crimson', label: 'Crimson', light: { accent: '0.49 0.17 25', accent2: '0.43 0.17 25', onAccent: '1 0 0' }, dark: { accent: '0.79 0.14 25', accent2: '0.84 0.14 25', onAccent: '0.2 0.04 25' } },
  { id: 'rose', label: 'Rose', light: { accent: '0.49 0.15 355', accent2: '0.43 0.15 355', onAccent: '1 0 0' }, dark: { accent: '0.79 0.14 355', accent2: '0.84 0.14 355', onAccent: '0.2 0.04 355' } },
  { id: 'plum', label: 'Plum', light: { accent: '0.49 0.14 330', accent2: '0.43 0.14 330', onAccent: '1 0 0' }, dark: { accent: '0.79 0.14 330', accent2: '0.84 0.14 330', onAccent: '0.2 0.04 330' } },
  { id: 'violet', label: 'Violet', light: { accent: '0.48 0.16 295', accent2: '0.42 0.16 295', onAccent: '1 0 0' }, dark: { accent: '0.78 0.14 295', accent2: '0.83 0.14 295', onAccent: '0.2 0.04 295' } },
  { id: 'indigo', label: 'Indigo', light: { accent: '0.48 0.15 270', accent2: '0.42 0.15 270', onAccent: '1 0 0' }, dark: { accent: '0.77 0.14 270', accent2: '0.82 0.14 270', onAccent: '0.2 0.04 270' } },
  { id: 'ocean', label: 'Ocean', light: { accent: '0.47 0.13 245', accent2: '0.41 0.13 245', onAccent: '1 0 0' }, dark: { accent: '0.77 0.13 245', accent2: '0.82 0.13 245', onAccent: '0.2 0.04 245' } },
  { id: 'teal', label: 'Teal', light: { accent: '0.46 0.1 195', accent2: '0.4 0.1 195', onAccent: '1 0 0' }, dark: { accent: '0.76 0.1 195', accent2: '0.81 0.1 195', onAccent: '0.2 0.04 195' } },
  { id: 'forest', label: 'Forest', light: { accent: '0.45 0.13 150', accent2: '0.39 0.13 150', onAccent: '1 0 0' }, dark: { accent: '0.76 0.13 150', accent2: '0.81 0.13 150', onAccent: '0.2 0.04 150' } },
  { id: 'amber', label: 'Amber', light: { accent: '0.48 0.13 65', accent2: '0.42 0.13 65', onAccent: '1 0 0' }, dark: { accent: '0.78 0.13 65', accent2: '0.83 0.13 65', onAccent: '0.2 0.04 65' } },
  { id: 'graphite', label: 'Graphite', light: { accent: '0.47 0.015 260', accent2: '0.41 0.015 260', onAccent: '1 0 0' }, dark: { accent: '0.77 0.015 260', accent2: '0.82 0.015 260', onAccent: '0.2 0.015 260' } },
]

export interface Ink {
  id: string
  label: string
  /** A few words on the card. */
  note: string
  /** Text, secondary text and muted text, as OKLCH. */
  light: [string, string, string]
  dark: [string, string, string]
}

/**
 * Text inks: the colour of the words, on top of any theme. Every level
 * (muted text too) keeps 4.5:1 on the page and card surfaces of all ten
 * themes (tests/theme-contrast.test.js).
 */
export const INKS: Ink[] = [
  { id: 'neutral', label: 'Graphite', note: 'Plain grey ink', light: ['0.22 0 0', '0.38 0 0', '0.46 0 0'], dark: ['0.95 0 0', '0.86 0 0', '0.77 0 0'] },
  { id: 'warm', label: 'Sepia', note: 'Warm brown ink, easy on the eyes', light: ['0.24 0.03 60', '0.38 0.03 60', '0.46 0.03 60'], dark: ['0.95 0.018 80', '0.86 0.03 75', '0.77 0.03 70'] },
  { id: 'cool', label: 'Slate', note: 'Cool blue-grey ink', light: ['0.22 0.03 250', '0.38 0.03 250', '0.45 0.03 250'], dark: ['0.95 0.018 250', '0.86 0.03 250', '0.77 0.03 250'] },
  { id: 'deep', label: 'High contrast', note: 'The darkest ink in light, the brightest in dark', light: ['0.12 0 0', '0.28 0 0', '0.4 0 0'], dark: ['0.99 0 0', '0.92 0 0', '0.84 0 0'] },
]
export const INK_BY_ID = new Map(INKS.map((i) => [i.id, i]))

export const PALETTE_BY_ID = new Map(PALETTES.map((p) => [p.id, p]))
export const ACCENT_BY_ID = new Map(ACCENTS.map((a) => [a.id, a]))

/** The modes a theme offers, dark first. */
export function paletteModes(p: Palette): ThemeMode[] {
  return [p.dark && 'dark', p.light && 'light'].filter(Boolean) as ThemeMode[]
}

/** The mode a theme actually renders in for the user's preference. */
export function resolveMode(p: Palette, preferred: ThemeMode): ThemeMode {
  return p[preferred] ? preferred : p.dark ? 'dark' : 'light'
}

/** Tokens for a theme in a mode, with an optional accent override applied. */
export function modeTokens(p: Palette, mode: ThemeMode, accent?: string): ModeTokens {
  const t = p[resolveMode(p, mode)]!
  const o = accent ? ACCENT_BY_ID.get(accent) : undefined
  return o ? { ...t, ...o[resolveMode(p, mode)] } : t
}
