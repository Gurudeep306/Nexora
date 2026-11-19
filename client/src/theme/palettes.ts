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
    id: 'greenhouse',
    name: 'Greenhouse',
    category: 'signature',
    blurb: 'Sage paper, forest ink and a terracotta pot.',
    light: {
      bg: ['0.955 0.013 120', '0.985 0.006 110', '0.935 0.018 125', '0.91 0.024 128', '0.88 0.03 128'],
      fg: ['0.25 0.035 150', '0.38 0.04 150', '0.49 0.035 150'],
      border: '0.845 0.024 128',
      accent: '0.51 0.13 45', accent2: '0.46 0.13 45', onAccent: '0.99 0.005 100',
      success: '0.48 0.12 150', warning: '0.5 0.11 80', danger: '0.5 0.17 25', info: '0.48 0.09 235',
      syntax: { keyword: '0.51 0.13 45', string: '0.47 0.12 150', number: '0.5 0.11 80', function: '0.25 0.035 150', type: '0.47 0.09 235', comment: '0.49 0.035 150' },
    },
    dark: {
      bg: ['0.21 0.022 155', '0.245 0.026 155', '0.275 0.029 155', '0.302 0.031 155', '0.332 0.032 155'],
      fg: ['0.94 0.02 110', '0.85 0.03 120', '0.72 0.035 130'],
      border: '0.375 0.032 155',
      accent: '0.76 0.12 50', accent2: '0.81 0.1 55', onAccent: '0.22 0.03 150',
      success: '0.8 0.13 145', warning: '0.83 0.12 85', danger: '0.76 0.14 25', info: '0.8 0.08 230',
      syntax: { keyword: '0.76 0.12 50', string: '0.8 0.13 145', number: '0.83 0.12 85', function: '0.94 0.02 110', type: '0.8 0.08 230', comment: '0.72 0.035 130' },
    },
  },
  {
    id: 'observatory',
    name: 'Observatory',
    category: 'signature',
    blurb: 'Night-sky navy and brass; a printed star atlas by day.',
    light: {
      bg: ['0.952 0.018 85', '0.982 0.01 85', '0.93 0.022 85', '0.905 0.026 85', '0.875 0.028 85'],
      fg: ['0.25 0.06 262', '0.37 0.06 262', '0.49 0.05 262'],
      border: '0.85 0.022 85',
      accent: '0.48 0.1 70', accent2: '0.43 0.1 70', onAccent: '0.99 0.01 85',
      success: '0.48 0.11 150', warning: '0.5 0.11 65', danger: '0.5 0.16 25', info: '0.47 0.11 255',
      syntax: { keyword: '0.47 0.1 70', string: '0.47 0.11 150', number: '0.49 0.12 40', function: '0.25 0.06 262', type: '0.47 0.11 255', comment: '0.49 0.05 262' },
    },
    dark: {
      bg: ['0.18 0.038 262', '0.215 0.043 262', '0.245 0.047 262', '0.275 0.048 262', '0.31 0.048 262'],
      fg: ['0.95 0.02 85', '0.86 0.03 250', '0.73 0.035 250'],
      border: '0.36 0.048 262',
      accent: '0.81 0.11 80', accent2: '0.86 0.09 85', onAccent: '0.2 0.045 262',
      success: '0.8 0.13 150', warning: '0.84 0.12 80', danger: '0.76 0.15 25', info: '0.8 0.1 240',
      syntax: { keyword: '0.81 0.11 80', string: '0.8 0.13 150', number: '0.82 0.13 45', function: '0.95 0.02 85', type: '0.8 0.1 240', comment: '0.73 0.035 250' },
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
    id: 'sketchbook',
    name: 'Sketchbook',
    category: 'signature',
    blurb: 'Pencil on dot-grid paper; chalk on a green board at night.',
    light: {
      bg: ['0.972 0.005 90', '0.993 0.002 90', '0.952 0.007 90', '0.928 0.01 90', '0.9 0.012 90'],
      fg: ['0.27 0.006 260', '0.39 0.007 260', '0.5 0.007 260'],
      border: '0.845 0.008 260',
      accent: '0.47 0.17 265', accent2: '0.42 0.17 265', onAccent: '0.99 0 0',
      success: '0.47 0.12 150', warning: '0.5 0.11 65', danger: '0.5 0.17 25', info: '0.47 0.13 245',
      syntax: { keyword: '0.47 0.17 265', string: '0.46 0.12 150', number: '0.5 0.12 50', function: '0.27 0.006 260', type: '0.47 0.14 310', comment: '0.5 0.007 260' },
    },
    dark: {
      bg: ['0.265 0.025 165', '0.295 0.027 165', '0.323 0.028 165', '0.35 0.028 165', '0.38 0.028 165'],
      fg: ['0.96 0.01 100', '0.89 0.015 120', '0.79 0.02 140'],
      border: '0.44 0.03 165',
      accent: '0.9 0.12 95', accent2: '0.93 0.1 95', onAccent: '0.265 0.025 165',
      success: '0.88 0.12 150', warning: '0.9 0.12 80', danger: '0.85 0.11 25', info: '0.88 0.07 230',
      syntax: { keyword: '0.9 0.12 95', string: '0.88 0.12 150', number: '0.88 0.1 55', function: '0.96 0.01 100', type: '0.88 0.07 230', comment: '0.79 0.02 140' },
    },
  },
  {
    id: 'blockprint',
    name: 'Block Print',
    category: 'signature',
    blurb: 'Indigo and madder on unbleached cotton; marigold on an indigo night.',
    light: {
      bg: ['0.962 0.013 85', '0.985 0.006 85', '0.94 0.017 85', '0.915 0.022 80', '0.89 0.027 80'],
      fg: ['0.27 0.08 272', '0.38 0.08 272', '0.49 0.065 272'],
      border: '0.845 0.024 80',
      accent: '0.49 0.16 28', accent2: '0.44 0.16 28', onAccent: '0.99 0.005 85',
      success: '0.47 0.11 150', warning: '0.5 0.11 70', danger: '0.49 0.17 25', info: '0.47 0.12 265',
      syntax: { keyword: '0.49 0.16 28', string: '0.46 0.11 150', number: '0.5 0.11 70', function: '0.27 0.08 272', type: '0.47 0.12 265', comment: '0.49 0.065 272' },
    },
    dark: {
      bg: ['0.225 0.06 272', '0.258 0.066 272', '0.288 0.07 272', '0.318 0.07 272', '0.35 0.07 272'],
      fg: ['0.95 0.02 85', '0.87 0.03 85', '0.75 0.045 272'],
      border: '0.395 0.07 272',
      accent: '0.83 0.15 75', accent2: '0.87 0.13 75', onAccent: '0.225 0.06 272',
      success: '0.82 0.13 150', warning: '0.85 0.13 85', danger: '0.77 0.15 28', info: '0.82 0.09 240',
      syntax: { keyword: '0.83 0.15 75', string: '0.82 0.13 150', number: '0.8 0.13 45', function: '0.95 0.02 85', type: '0.82 0.09 240', comment: '0.75 0.045 272' },
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    category: 'signature',
    blurb: 'Green phosphor on black; green-bar printer paper by day.',
    light: {
      bg: ['0.975 0.008 140', '0.99 0.003 140', '0.942 0.03 145', '0.92 0.035 145', '0.89 0.04 145'],
      fg: ['0.22 0.015 150', '0.34 0.025 150', '0.46 0.035 150'],
      border: '0.85 0.025 145',
      accent: '0.44 0.12 150', accent2: '0.39 0.12 150', onAccent: '0.99 0 0',
      success: '0.44 0.12 150', warning: '0.48 0.11 70', danger: '0.48 0.17 25', info: '0.45 0.11 245',
      syntax: { keyword: '0.44 0.12 150', string: '0.46 0.11 80', number: '0.47 0.12 50', function: '0.22 0.015 150', type: '0.45 0.11 245', comment: '0.46 0.035 150' },
    },
    dark: {
      bg: ['0.165 0.012 150', '0.195 0.016 150', '0.225 0.02 150', '0.255 0.022 150', '0.285 0.024 150'],
      fg: ['0.88 0.17 145', '0.81 0.14 145', '0.7 0.1 145'],
      border: '0.34 0.045 150',
      accent: '0.83 0.15 75', accent2: '0.87 0.13 75', onAccent: '0.165 0.012 150',
      success: '0.86 0.18 145', warning: '0.85 0.15 85', danger: '0.74 0.17 25', info: '0.8 0.1 210',
      syntax: { keyword: '0.83 0.15 75', string: '0.86 0.15 145', number: '0.82 0.13 50', function: '0.88 0.17 145', type: '0.8 0.1 210', comment: '0.7 0.1 145' },
    },
  },
  {
    id: 'clear',
    name: 'Clear',
    category: 'accessible',
    blurb: 'High contrast and a typeface made for low vision. Nothing in the way.',
    light: {
      bg: ['1 0 0', '1 0 0', '0.962 0 0', '0.93 0 0', '0.9 0 0'],
      fg: ['0.15 0 0', '0.27 0 0', '0.38 0 0'],
      border: '0.5 0 0',
      accent: '0.42 0.2 265', accent2: '0.36 0.2 265', onAccent: '1 0 0',
      success: '0.42 0.13 150', warning: '0.44 0.12 60', danger: '0.44 0.19 28', info: '0.42 0.15 255',
      syntax: { keyword: '0.42 0.2 265', string: '0.42 0.13 150', number: '0.44 0.13 45', function: '0.15 0 0', type: '0.42 0.17 305', comment: '0.38 0 0' },
    },
    dark: {
      bg: ['0.13 0 0', '0.165 0 0', '0.205 0 0', '0.24 0 0', '0.28 0 0'],
      fg: ['1 0 0', '0.92 0 0', '0.82 0 0'],
      border: '0.62 0 0',
      accent: '0.91 0.17 100', accent2: '0.94 0.14 100', onAccent: '0.13 0 0',
      success: '0.86 0.17 150', warning: '0.89 0.15 80', danger: '0.8 0.15 25', info: '0.84 0.11 240',
      syntax: { keyword: '0.91 0.17 100', string: '0.86 0.17 150', number: '0.86 0.13 55', function: '1 0 0', type: '0.84 0.11 240', comment: '0.82 0 0' },
    },
  },
  {
    id: 'monsoon',
    name: 'Monsoon',
    category: 'signature',
    blurb: 'Rain on slate: misty grey-green paper by day, a storm-blue night with peacock teal.',
    light: {
      bg: ['0.955 0.012 205', '0.985 0.005 205', '0.932 0.015 205', '0.905 0.02 205', '0.878 0.024 205'],
      fg: ['0.24 0.03 230', '0.37 0.03 225', '0.48 0.03 220'],
      border: '0.84 0.02 210',
      accent: '0.47 0.1 200', accent2: '0.41 0.1 200', onAccent: '0.99 0 0',
      success: '0.47 0.11 150', warning: '0.5 0.11 70', danger: '0.5 0.16 25', info: '0.47 0.12 250',
      syntax: { keyword: '0.47 0.1 200', string: '0.46 0.11 150', number: '0.5 0.11 70', function: '0.24 0.03 230', type: '0.47 0.12 290', comment: '0.48 0.03 220' },
    },
    dark: {
      bg: ['0.235 0.025 235', '0.27 0.028 235', '0.295 0.03 235', '0.325 0.032 235', '0.355 0.033 235'],
      fg: ['0.95 0.012 210', '0.87 0.02 210', '0.76 0.025 210'],
      border: '0.4 0.03 230',
      accent: '0.8 0.11 190', accent2: '0.85 0.1 190', onAccent: '0.235 0.025 235',
      success: '0.82 0.13 150', warning: '0.85 0.12 80', danger: '0.75 0.14 25', info: '0.8 0.09 245',
      syntax: { keyword: '0.8 0.11 190', string: '0.82 0.13 150', number: '0.85 0.12 80', function: '0.95 0.012 210', type: '0.8 0.09 290', comment: '0.76 0.025 210' },
    },
  },
  {
    id: 'kintsugi',
    name: 'Kintsugi',
    category: 'signature',
    blurb: 'Washi paper with bronze-gold ink by day; black lacquer mended with gold at night.',
    light: {
      bg: ['0.962 0.01 80', '0.988 0.005 85', '0.94 0.012 78', '0.913 0.017 75', '0.885 0.02 75'],
      fg: ['0.2 0.01 60', '0.35 0.012 60', '0.47 0.014 60'],
      border: '0.85 0.012 75',
      accent: '0.48 0.1 75', accent2: '0.43 0.1 75', onAccent: '0.99 0 0',
      success: '0.47 0.1 150', warning: '0.5 0.11 60', danger: '0.5 0.16 28', info: '0.47 0.1 250',
      syntax: { keyword: '0.5 0.15 28', string: '0.46 0.1 150', number: '0.48 0.1 75', function: '0.2 0.01 60', type: '0.47 0.1 250', comment: '0.47 0.014 60' },
    },
    dark: {
      bg: ['0.18 0.004 60', '0.215 0.006 60', '0.235 0.007 60', '0.265 0.009 60', '0.295 0.01 60'],
      fg: ['0.94 0.012 85', '0.85 0.015 80', '0.73 0.018 78'],
      border: '0.355 0.012 70',
      accent: '0.82 0.12 85', accent2: '0.86 0.11 85', onAccent: '0.2 0.01 60',
      success: '0.78 0.12 150', warning: '0.84 0.12 75', danger: '0.72 0.15 28', info: '0.78 0.08 245',
      syntax: { keyword: '0.74 0.14 28', string: '0.78 0.12 150', number: '0.84 0.12 85', function: '0.94 0.012 85', type: '0.78 0.08 245', comment: '0.73 0.018 78' },
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
