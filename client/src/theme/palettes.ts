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

export const DEFAULT_PALETTE = 'midnight'

export const PALETTES: Palette[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'signature',
    blurb: 'Blue-black ink with one calm cobalt accent — the NexoraGuru default.',
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
  {
    id: 'graphite',
    name: 'Graphite',
    category: 'signature',
    blurb: 'True neutral greys and a quiet steel-blue accent.',
    dark: {
      bg: ['0.165 0 0', '0.2 0 0', '0.235 0 0', '0.27 0 0', '0.31 0 0'],
      fg: ['0.965 0 0', '0.8 0 0', '0.68 0 0'],
      border: '0.349 0 0',
      accent: '0.72 0.07 245', accent2: '0.74 0.06 215', onAccent: '0.17 0.03 245',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.1 215', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.1 245', type: '0.8 0.11 200', comment: '0.68 0 0' },
    },
    light: {
      bg: ['0.968 0 0', '0.997 0 0', '0.982 0 0', '0.95 0 0', '0.905 0 0'],
      fg: ['0.22 0 0', '0.42 0 0', '0.55 0 0'],
      border: '0.846 0 0',
      accent: '0.537 0.07 245', accent2: '0.52 0.06 215', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.1 215', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.1 245', type: '0.5 0.11 200', comment: '0.55 0 0' },
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'signature',
    blurb: 'Near-black for OLED screens, lit by violet.',
    dark: {
      bg: ['0.12 0.009 285', '0.155 0.01 285', '0.19 0.011 285', '0.225 0.012 285', '0.265 0.012 285'],
      fg: ['0.965 0.004 285', '0.8 0.004 285', '0.68 0.004 285'],
      border: '0.328 0.012 285',
      accent: '0.72 0.17 295', accent2: '0.74 0.16 320', onAccent: '0.17 0.03 295',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.16 320', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.17 295', type: '0.8 0.11 200', comment: '0.68 0.004 285' },
    },
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    category: 'signature',
    blurb: 'Cool, bright white with deep ultramarine.',
    light: {
      bg: ['0.972 0.01 250', '1 0 250', '0.982 0.008 250', '0.952 0.01 250', '0.905 0.011 250'],
      fg: ['0.22 0.005 250', '0.42 0.005 250', '0.55 0.005 250'],
      border: '0.849 0.011 250',
      accent: '0.54 0.2 264', accent2: '0.52 0.18 290', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.18 290', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.2 264', type: '0.5 0.11 200', comment: '0.55 0.005 250' },
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    category: 'signature',
    blurb: 'Warm cream stock and dark ink, with a red-pencil accent.',
    light: {
      bg: ['0.955 0.018 85', '0.985 0.011 85', '0.968 0.015 85', '0.935 0.018 85', '0.89 0.02 85'],
      fg: ['0.22 0.02 60', '0.42 0.02 60', '0.55 0.02 60'],
      border: '0.837 0.02 85',
      accent: '0.54 0.15 28', accent2: '0.52 0.14 10', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.14 10', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.15 28', type: '0.5 0.11 200', comment: '0.55 0.02 60' },
    },
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    category: 'signature',
    blurb: 'Sun-baked beige and terracotta.',
    dark: {
      bg: ['0.165 0.02 65', '0.2 0.022 65', '0.235 0.024 65', '0.27 0.025 65', '0.31 0.026 65'],
      fg: ['0.965 0.009 65', '0.8 0.009 65', '0.68 0.009 65'],
      border: '0.349 0.026 65',
      accent: '0.72 0.13 42', accent2: '0.74 0.12 20', onAccent: '0.17 0.03 42',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.12 20', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.13 42', type: '0.8 0.11 200', comment: '0.68 0.009 65' },
    },
    light: {
      bg: ['0.968 0.018 65', '0.997 0.011 65', '0.982 0.015 65', '0.95 0.018 65', '0.905 0.02 65'],
      fg: ['0.22 0.009 65', '0.42 0.009 65', '0.55 0.009 65'],
      border: '0.846 0.02 65',
      accent: '0.54 0.13 42', accent2: '0.52 0.12 20', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.12 20', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.13 42', type: '0.5 0.11 200', comment: '0.55 0.009 65' },
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    category: 'signature',
    blurb: 'Polar teal with a violet glow.',
    dark: {
      bg: ['0.165 0.018 210', '0.2 0.02 210', '0.235 0.022 210', '0.27 0.023 210', '0.31 0.024 210'],
      fg: ['0.965 0.008 210', '0.8 0.008 210', '0.68 0.008 210'],
      border: '0.346 0.024 210',
      accent: '0.72 0.12 178', accent2: '0.74 0.15 300', onAccent: '0.17 0.03 178',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.15 300', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.12 178', type: '0.8 0.11 200', comment: '0.68 0.008 210' },
    },
    light: {
      bg: ['0.968 0.016 210', '0.997 0.01 210', '0.982 0.014 210', '0.95 0.016 210', '0.905 0.018 210'],
      fg: ['0.22 0.008 210', '0.42 0.008 210', '0.55 0.008 210'],
      border: '0.843 0.018 210',
      accent: '0.528 0.12 178', accent2: '0.52 0.15 300', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.15 300', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.12 178', type: '0.5 0.11 200', comment: '0.55 0.008 210' },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'signature',
    blurb: 'Deep navy water and bright cyan.',
    dark: {
      bg: ['0.165 0.032 240', '0.2 0.035 240', '0.235 0.039 240', '0.27 0.04 240', '0.31 0.042 240'],
      fg: ['0.965 0.014 240', '0.8 0.014 240', '0.68 0.014 240'],
      border: '0.346 0.042 240',
      accent: '0.72 0.13 222', accent2: '0.74 0.11 195', onAccent: '0.17 0.03 222',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.11 195', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.13 222', type: '0.8 0.11 200', comment: '0.68 0.014 240' },
    },
    light: {
      bg: ['0.968 0.028 240', '0.997 0.018 240', '0.982 0.025 240', '0.95 0.028 240', '0.905 0.032 240'],
      fg: ['0.22 0.014 240', '0.42 0.014 240', '0.55 0.014 240'],
      border: '0.846 0.032 240',
      accent: '0.534 0.13 222', accent2: '0.52 0.11 195', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.11 195', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.13 222', type: '0.5 0.11 200', comment: '0.55 0.014 240' },
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'signature',
    blurb: 'Moss, pine and fern greens.',
    dark: {
      bg: ['0.165 0.02 150', '0.2 0.022 150', '0.235 0.024 150', '0.27 0.025 150', '0.31 0.026 150'],
      fg: ['0.965 0.009 150', '0.8 0.009 150', '0.68 0.009 150'],
      border: '0.346 0.026 150',
      accent: '0.72 0.14 148', accent2: '0.74 0.12 118', onAccent: '0.17 0.03 148',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.12 118', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.14 148', type: '0.8 0.11 200', comment: '0.68 0.009 150' },
    },
    light: {
      bg: ['0.968 0.018 150', '0.997 0.011 150', '0.982 0.015 150', '0.95 0.018 150', '0.905 0.02 150'],
      fg: ['0.22 0.009 150', '0.42 0.009 150', '0.55 0.009 150'],
      border: '0.843 0.02 150',
      accent: '0.528 0.14 148', accent2: '0.52 0.12 118', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.12 118', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.14 148', type: '0.5 0.11 200', comment: '0.55 0.009 150' },
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    category: 'signature',
    blurb: 'Charcoal warmed by glowing orange.',
    dark: {
      bg: ['0.165 0.016 45', '0.2 0.018 45', '0.235 0.02 45', '0.27 0.021 45', '0.31 0.022 45'],
      fg: ['0.965 0.007 45', '0.8 0.007 45', '0.68 0.007 45'],
      border: '0.349 0.022 45',
      accent: '0.72 0.16 50', accent2: '0.74 0.17 28', onAccent: '0.17 0.03 50',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.17 28', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.16 50', type: '0.8 0.11 200', comment: '0.68 0.007 45' },
    },
    light: {
      bg: ['0.968 0.014 45', '0.997 0.009 45', '0.982 0.013 45', '0.95 0.014 45', '0.905 0.016 45'],
      fg: ['0.22 0.007 45', '0.42 0.007 45', '0.55 0.007 45'],
      border: '0.846 0.016 45',
      accent: '0.54 0.16 50', accent2: '0.52 0.17 28', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.17 28', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.16 50', type: '0.5 0.11 200', comment: '0.55 0.007 45' },
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    category: 'signature',
    blurb: 'Soft blossom pinks on a plum night.',
    dark: {
      bg: ['0.165 0.018 350', '0.2 0.02 350', '0.235 0.022 350', '0.27 0.023 350', '0.31 0.024 350'],
      fg: ['0.965 0.008 350', '0.8 0.008 350', '0.68 0.008 350'],
      border: '0.349 0.024 350',
      accent: '0.72 0.15 355', accent2: '0.74 0.14 320', onAccent: '0.17 0.03 355',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.14 320', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.15 355', type: '0.8 0.11 200', comment: '0.68 0.008 350' },
    },
    light: {
      bg: ['0.968 0.016 350', '0.997 0.01 350', '0.982 0.014 350', '0.95 0.016 350', '0.905 0.018 350'],
      fg: ['0.22 0.008 350', '0.42 0.008 350', '0.55 0.008 350'],
      border: '0.849 0.018 350',
      accent: '0.54 0.15 355', accent2: '0.52 0.14 320', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.14 320', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.15 355', type: '0.5 0.11 200', comment: '0.55 0.008 350' },
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    category: 'signature',
    blurb: 'Muted lilac with a soft violet accent.',
    dark: {
      bg: ['0.165 0.023 295', '0.2 0.025 295', '0.235 0.028 295', '0.27 0.029 295', '0.31 0.03 295'],
      fg: ['0.965 0.01 295', '0.8 0.01 295', '0.68 0.01 295'],
      border: '0.349 0.03 295',
      accent: '0.72 0.15 295', accent2: '0.74 0.14 268', onAccent: '0.17 0.03 295',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.14 268', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.15 295', type: '0.8 0.11 200', comment: '0.68 0.01 295' },
    },
    light: {
      bg: ['0.968 0.02 295', '0.997 0.013 295', '0.982 0.017 295', '0.95 0.02 295', '0.905 0.023 295'],
      fg: ['0.22 0.01 295', '0.42 0.01 295', '0.55 0.01 295'],
      border: '0.849 0.023 295',
      accent: '0.54 0.15 295', accent2: '0.52 0.14 268', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.14 268', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.15 295', type: '0.5 0.11 200', comment: '0.55 0.01 295' },
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    category: 'signature',
    blurb: 'Fresh, cool mint and sea-glass.',
    dark: {
      bg: ['0.165 0.018 170', '0.2 0.02 170', '0.235 0.022 170', '0.27 0.023 170', '0.31 0.024 170'],
      fg: ['0.965 0.008 170', '0.8 0.008 170', '0.68 0.008 170'],
      border: '0.346 0.024 170',
      accent: '0.72 0.12 166', accent2: '0.74 0.1 196', onAccent: '0.17 0.03 166',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.1 196', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.12 166', type: '0.8 0.11 200', comment: '0.68 0.008 170' },
    },
    light: {
      bg: ['0.968 0.016 170', '0.997 0.01 170', '0.982 0.014 170', '0.95 0.016 170', '0.905 0.018 170'],
      fg: ['0.22 0.008 170', '0.42 0.008 170', '0.55 0.008 170'],
      border: '0.843 0.018 170',
      accent: '0.528 0.12 166', accent2: '0.52 0.1 196', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.1 196', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.12 166', type: '0.5 0.11 200', comment: '0.55 0.008 170' },
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    category: 'signature',
    blurb: 'Saturated blue surfaces with a crisp sky accent.',
    dark: {
      bg: ['0.165 0.041 258', '0.2 0.045 258', '0.235 0.05 258', '0.27 0.052 258', '0.31 0.054 258'],
      fg: ['0.965 0.015 258', '0.8 0.015 258', '0.68 0.015 258'],
      border: '0.349 0.054 258',
      accent: '0.72 0.16 250', accent2: '0.74 0.12 222', onAccent: '0.17 0.03 250',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.12 222', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.16 250', type: '0.8 0.11 200', comment: '0.68 0.015 258' },
    },
    light: {
      bg: ['0.968 0.036 258', '0.997 0.023 258', '0.982 0.032 258', '0.95 0.036 258', '0.905 0.041 258'],
      fg: ['0.22 0.015 258', '0.42 0.015 258', '0.55 0.015 258'],
      border: '0.846 0.041 258',
      accent: '0.54 0.16 250', accent2: '0.52 0.12 222', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.12 222', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.16 250', type: '0.5 0.11 200', comment: '0.55 0.015 258' },
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    category: 'signature',
    blurb: 'Dark velvet and a confident red.',
    dark: {
      bg: ['0.165 0.018 15', '0.2 0.02 15', '0.235 0.022 15', '0.27 0.023 15', '0.31 0.024 15'],
      fg: ['0.965 0.008 15', '0.8 0.008 15', '0.68 0.008 15'],
      border: '0.349 0.024 15',
      accent: '0.72 0.18 22', accent2: '0.74 0.16 0', onAccent: '0.17 0.03 22',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.16 0', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.18 22', type: '0.8 0.11 200', comment: '0.68 0.008 15' },
    },
    light: {
      bg: ['0.968 0.016 15', '0.997 0.01 15', '0.982 0.014 15', '0.95 0.016 15', '0.905 0.018 15'],
      fg: ['0.22 0.008 15', '0.42 0.008 15', '0.55 0.008 15'],
      border: '0.849 0.018 15',
      accent: '0.54 0.18 22', accent2: '0.52 0.16 0', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.16 0', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.18 22', type: '0.5 0.11 200', comment: '0.55 0.008 15' },
    },
  },
  {
    id: 'saffron',
    name: 'Saffron',
    category: 'signature',
    blurb: 'Golden spice on warm umber.',
    dark: {
      bg: ['0.165 0.02 75', '0.2 0.022 75', '0.235 0.024 75', '0.27 0.025 75', '0.31 0.026 75'],
      fg: ['0.965 0.009 75', '0.8 0.009 75', '0.68 0.009 75'],
      border: '0.349 0.026 75',
      accent: '0.72 0.15 78', accent2: '0.74 0.15 55', onAccent: '0.17 0.03 78',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.15 55', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.15 78', type: '0.8 0.11 200', comment: '0.68 0.009 75' },
    },
    light: {
      bg: ['0.968 0.018 75', '0.997 0.011 75', '0.982 0.015 75', '0.95 0.018 75', '0.905 0.02 75'],
      fg: ['0.22 0.009 75', '0.42 0.009 75', '0.55 0.009 75'],
      border: '0.846 0.02 75',
      accent: '0.54 0.15 78', accent2: '0.52 0.15 55', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.15 55', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.15 78', type: '0.5 0.11 200', comment: '0.55 0.009 75' },
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    category: 'signature',
    blurb: 'Blue-grey stone, understated and focused.',
    dark: {
      bg: ['0.165 0.014 240', '0.2 0.016 240', '0.235 0.018 240', '0.27 0.018 240', '0.31 0.019 240'],
      fg: ['0.965 0.006 240', '0.8 0.006 240', '0.68 0.006 240'],
      border: '0.349 0.019 240',
      accent: '0.72 0.09 232', accent2: '0.74 0.08 200', onAccent: '0.17 0.03 232',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.1 200', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.1 232', type: '0.8 0.11 200', comment: '0.68 0.006 240' },
    },
    light: {
      bg: ['0.968 0.013 240', '0.997 0.008 240', '0.982 0.011 240', '0.95 0.013 240', '0.905 0.014 240'],
      fg: ['0.22 0.006 240', '0.42 0.006 240', '0.55 0.006 240'],
      border: '0.846 0.014 240',
      accent: '0.537 0.09 232', accent2: '0.52 0.08 200', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.1 200', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.1 232', type: '0.5 0.11 200', comment: '0.55 0.006 240' },
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    category: 'vivid',
    blurb: 'Hot pink and laser cyan on a purple dusk.',
    dark: {
      bg: ['0.15 0.05 300', '0.19 0.055 300', '0.225 0.061 300', '0.26 0.063 300', '0.3 0.066 300'],
      fg: ['0.965 0.015 300', '0.8 0.015 300', '0.68 0.015 300'],
      border: '0.345 0.066 300',
      accent: '0.72 0.2 350', accent2: '0.74 0.14 205', onAccent: '0.17 0.03 350',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.14 205', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.2 350', type: '0.8 0.11 200', comment: '0.68 0.015 300' },
    },
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    category: 'vivid',
    blurb: 'Electric yellow and cyan signs on wet asphalt.',
    dark: {
      bg: ['0.165 0.027 255', '0.2 0.03 255', '0.235 0.033 255', '0.27 0.034 255', '0.31 0.036 255'],
      fg: ['0.965 0.012 255', '0.8 0.012 255', '0.68 0.012 255'],
      border: '0.349 0.036 255',
      accent: '0.72 0.19 102', accent2: '0.74 0.14 195', onAccent: '0.17 0.03 102',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.14 195', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.19 102', type: '0.8 0.11 200', comment: '0.68 0.012 255' },
    },
  },
  {
    id: 'phosphor',
    name: 'Phosphor',
    category: 'vivid',
    blurb: 'Green-phosphor terminal glow.',
    dark: {
      bg: ['0.13 0.027 155', '0.165 0.03 155', '0.2 0.033 155', '0.235 0.034 155', '0.275 0.036 155'],
      fg: ['0.965 0.09 150', '0.8 0.09 150', '0.68 0.09 150'],
      border: '0.329 0.036 155',
      accent: '0.72 0.2 145', accent2: '0.74 0.14 175', onAccent: '0.17 0.03 145',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.14 175', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.2 145', type: '0.8 0.11 200', comment: '0.68 0.09 150' },
    },
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    category: 'vivid',
    blurb: 'Pastel lilac with aqua and bubble-gum.',
    dark: {
      bg: ['0.165 0.036 315', '0.2 0.04 315', '0.235 0.044 315', '0.27 0.046 315', '0.31 0.048 315'],
      fg: ['0.965 0.015 315', '0.8 0.015 315', '0.68 0.015 315'],
      border: '0.352 0.048 315',
      accent: '0.72 0.13 198', accent2: '0.74 0.15 340', onAccent: '0.17 0.03 198',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.15 340', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.13 198', type: '0.8 0.11 200', comment: '0.68 0.015 315' },
    },
    light: {
      bg: ['0.968 0.032 315', '0.997 0.02 315', '0.982 0.028 315', '0.95 0.032 315', '0.905 0.036 315'],
      fg: ['0.22 0.015 315', '0.42 0.015 315', '0.55 0.015 315'],
      border: '0.849 0.036 315',
      accent: '0.528 0.13 198', accent2: '0.52 0.15 340', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.15 340', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.13 198', type: '0.5 0.11 200', comment: '0.55 0.015 315' },
    },
  },
  {
    id: 'electric',
    name: 'Electric',
    category: 'vivid',
    blurb: 'Pitch black and a high-voltage blue.',
    dark: {
      bg: ['0.12 0.014 265', '0.16 0.015 265', '0.195 0.017 265', '0.23 0.017 265', '0.27 0.018 265'],
      fg: ['0.965 0.006 265', '0.8 0.006 265', '0.68 0.006 265'],
      border: '0.33 0.018 265',
      accent: '0.72 0.19 252', accent2: '0.74 0.2 292', onAccent: '0.17 0.03 252',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.2 292', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.19 252', type: '0.8 0.11 200', comment: '0.68 0.006 265' },
    },
  },
  {
    id: 'citrus',
    name: 'Citrus',
    category: 'vivid',
    blurb: 'Zesty lime with a tangerine twist.',
    dark: {
      bg: ['0.165 0.018 115', '0.2 0.02 115', '0.235 0.022 115', '0.27 0.023 115', '0.31 0.024 115'],
      fg: ['0.965 0.008 115', '0.8 0.008 115', '0.68 0.008 115'],
      border: '0.346 0.024 115',
      accent: '0.72 0.19 132', accent2: '0.74 0.17 60', onAccent: '0.17 0.03 132',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.17 60', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.19 132', type: '0.8 0.11 200', comment: '0.68 0.008 115' },
    },
    light: {
      bg: ['0.968 0.016 115', '0.997 0.01 115', '0.982 0.014 115', '0.95 0.016 115', '0.905 0.018 115'],
      fg: ['0.22 0.008 115', '0.42 0.008 115', '0.55 0.008 115'],
      border: '0.846 0.018 115',
      accent: '0.528 0.19 132', accent2: '0.52 0.17 60', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.17 60', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.19 132', type: '0.5 0.11 200', comment: '0.55 0.008 115' },
    },
  },
  {
    id: 'mono',
    name: 'Mono',
    category: 'minimal',
    blurb: 'Pure greyscale. Nothing but content.',
    dark: {
      bg: ['0.165 0 0', '0.2 0 0', '0.235 0 0', '0.27 0 0', '0.31 0 0'],
      fg: ['0.965 0 0', '0.8 0 0', '0.68 0 0'],
      border: '0.349 0 0',
      accent: '0.9 0 0', accent2: '0.82 0 0', onAccent: '0.17 0 0',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.06 300', string: '0.8 0.065 145', number: '0.8 0.07 55', function: '0.8 0.06 250', type: '0.8 0.055 200', comment: '0.68 0 0' },
    },
    light: {
      bg: ['0.968 0 0', '0.997 0 0', '0.982 0 0', '0.95 0 0', '0.905 0 0'],
      fg: ['0.22 0 0', '0.42 0 0', '0.55 0 0'],
      border: '0.846 0 0',
      accent: '0.27 0 0', accent2: '0.36 0 0', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.06 300', string: '0.5 0.065 145', number: '0.5 0.07 55', function: '0.5 0.06 250', type: '0.5 0.055 200', comment: '0.55 0 0' },
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    category: 'minimal',
    blurb: 'Maximum-white paper, black ink, a fountain-pen blue.',
    dark: {
      bg: ['0.13 0.004 260', '0.165 0.004 260', '0.2 0.004 260', '0.235 0.005 260', '0.275 0.005 260'],
      fg: ['0.965 0.002 260', '0.8 0.002 260', '0.68 0.002 260'],
      border: '0.332 0.005 260',
      accent: '0.72 0.13 262', accent2: '0.74 0.09 262', onAccent: '0.17 0.03 262',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.1 262', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.13 262', type: '0.8 0.11 200', comment: '0.68 0.002 260' },
    },
    light: {
      bg: ['0.985 0.003 260', '1 0 260', '0.985 0.003 260', '0.955 0.003 260', '0.9 0.004 260'],
      fg: ['0.22 0.002 260', '0.42 0.002 260', '0.55 0.002 260'],
      border: '0.849 0.004 260',
      accent: '0.54 0.13 262', accent2: '0.52 0.09 262', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.1 262', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.13 262', type: '0.5 0.11 200', comment: '0.55 0.002 260' },
    },
  },
  {
    id: 'e-ink',
    name: 'E-Ink',
    category: 'minimal',
    blurb: 'Soft grey reading panel, like an e-reader.',
    light: {
      bg: ['0.915 0.005 95', '0.94 0.003 95', '0.925 0.004 95', '0.895 0.005 95', '0.84 0.005 95'],
      fg: ['0.22 0.002 95', '0.42 0.002 95', '0.55 0.002 95'],
      border: '0.795 0.005 95',
      accent: '0.27 0 0', accent2: '0.36 0 0', onAccent: '1 0 0',
      success: '0.488 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.497 0.12 235',
      syntax: { keyword: '0.5 0.06 300', string: '0.5 0.065 145', number: '0.5 0.07 55', function: '0.5 0.06 250', type: '0.5 0.055 200', comment: '0.55 0.002 95' },
    },
  },
  {
    id: 'carbon',
    name: 'Carbon',
    category: 'minimal',
    blurb: 'Flat charcoal with a single signal-blue.',
    dark: {
      bg: ['0.165 0 0', '0.2 0 0', '0.235 0 0', '0.27 0 0', '0.31 0 0'],
      fg: ['0.965 0 0', '0.8 0 0', '0.68 0 0'],
      border: '0.349 0 0',
      accent: '0.72 0.14 255', accent2: '0.74 0.1 235', onAccent: '0.17 0.03 255',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.1 235', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.14 255', type: '0.8 0.11 200', comment: '0.68 0 0' },
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    category: 'minimal',
    blurb: 'Brown-toned and gentle on the eyes for long reading.',
    dark: {
      bg: ['0.165 0.032 70', '0.2 0.035 70', '0.235 0.039 70', '0.27 0.04 70', '0.31 0.042 70'],
      fg: ['0.965 0.035 55', '0.8 0.035 55', '0.68 0.035 55'],
      border: '0.349 0.042 70',
      accent: '0.72 0.1 45', accent2: '0.74 0.09 25', onAccent: '0.17 0.03 45',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.1 25', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.1 45', type: '0.8 0.11 200', comment: '0.68 0.035 55' },
    },
    light: {
      bg: ['0.968 0.028 70', '0.997 0.018 70', '0.982 0.025 70', '0.95 0.028 70', '0.905 0.032 70'],
      fg: ['0.22 0.035 55', '0.42 0.035 55', '0.55 0.035 55'],
      border: '0.846 0.032 70',
      accent: '0.54 0.1 45', accent2: '0.52 0.09 25', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.1 25', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.1 45', type: '0.5 0.11 200', comment: '0.55 0.035 55' },
    },
  },
  {
    id: 'contrast-dark',
    name: 'High Contrast Dark',
    category: 'accessible',
    blurb: 'Pure black, pure white and a yellow focus — AAA text.',
    dark: {
      bg: ['0 0 0', '0.14 0 0', '0.19 0 0', '0.24 0 0', '0.62 0 0'],
      fg: ['1 0 0', '0.93 0 0', '0.84 0 0'],
      border: '0.65 0 0',
      accent: '0.72 0.17 98', accent2: '0.74 0.15 85', onAccent: '0 0 0',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.15 85', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.17 98', type: '0.8 0.11 200', comment: '0.84 0 0' },
    },
  },
  {
    id: 'contrast-light',
    name: 'High Contrast Light',
    category: 'accessible',
    blurb: 'Pure white, pure black and a deep-blue focus — AAA text.',
    light: {
      bg: ['1 0 0', '1 0 0', '0.965 0 0', '0.93 0 0', '0.45 0 0'],
      fg: ['0 0 0', '0.25 0 0', '0.38 0 0'],
      border: '0.849 0 0',
      accent: '0.54 0.2 262', accent2: '0.52 0.2 290', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.2 290', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.2 262', type: '0.5 0.11 200', comment: '0.38 0 0' },
    },
  },
  {
    id: 'colour-safe',
    name: 'Colour-safe',
    category: 'accessible',
    blurb: 'Okabe–Ito status colours that stay distinct with red–green colour blindness.',
    dark: {
      bg: ['0.165 0.009 250', '0.2 0.01 250', '0.235 0.011 250', '0.27 0.012 250', '0.31 0.012 250'],
      fg: ['0.965 0.004 250', '0.8 0.004 250', '0.68 0.004 250'],
      border: '0.349 0.012 250',
      accent: '0.72 0.14 245', accent2: '0.74 0.1 215', onAccent: '0.17 0.03 245',
      success: '0.78 0.14 245', warning: '0.78 0.15 80', danger: '0.78 0.17 45', info: '0.78 0.1 225',
      syntax: { keyword: '0.8 0.1 215', string: '0.8 0.13 150', number: '0.8 0.14 55', function: '0.8 0.14 245', type: '0.8 0.11 200', comment: '0.68 0.004 250' },
    },
    light: {
      bg: ['0.968 0.008 250', '0.997 0.005 250', '0.982 0.007 250', '0.95 0.008 250', '0.905 0.009 250'],
      fg: ['0.22 0.004 250', '0.42 0.004 250', '0.55 0.004 250'],
      border: '0.846 0.009 250',
      accent: '0.537 0.14 245', accent2: '0.52 0.1 215', onAccent: '1 0 0',
      success: '0.5 0.14 245', warning: '0.5 0.15 80', danger: '0.5 0.17 45', info: '0.5 0.1 225',
      syntax: { keyword: '0.5 0.1 215', string: '0.5 0.13 150', number: '0.5 0.14 55', function: '0.5 0.14 245', type: '0.5 0.11 200', comment: '0.55 0.004 250' },
    },
  },
  {
    id: 'tritan-safe',
    name: 'Tritan-safe',
    category: 'accessible',
    blurb: 'Red–teal status colours that stay distinct with blue–yellow colour blindness.',
    dark: {
      bg: ['0.165 0.005 0', '0.2 0.006 0', '0.235 0.007 0', '0.27 0.007 0', '0.31 0.007 0'],
      fg: ['0.965 0.002 0', '0.8 0.002 0', '0.68 0.002 0'],
      border: '0.349 0.007 0',
      accent: '0.72 0.16 20', accent2: '0.74 0.14 350', onAccent: '0.17 0.03 20',
      success: '0.78 0.11 185', warning: '0.78 0.16 345', danger: '0.78 0.19 25', info: '0.78 0 0',
      syntax: { keyword: '0.8 0.14 350', string: '0.8 0.13 145', number: '0.8 0.14 55', function: '0.8 0.16 20', type: '0.8 0.11 200', comment: '0.68 0.002 0' },
    },
    light: {
      bg: ['0.968 0.005 0', '0.997 0.003 0', '0.982 0.004 0', '0.95 0.005 0', '0.905 0.005 0'],
      fg: ['0.22 0.002 0', '0.42 0.002 0', '0.55 0.002 0'],
      border: '0.846 0.005 0',
      accent: '0.54 0.16 20', accent2: '0.52 0.14 350', onAccent: '1 0 0',
      success: '0.5 0.11 185', warning: '0.5 0.16 345', danger: '0.5 0.19 25', info: '0.5 0 0',
      syntax: { keyword: '0.5 0.14 350', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.5 0.16 20', type: '0.5 0.11 200', comment: '0.55 0.002 0' },
    },
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    category: 'editor',
    blurb: 'Soothing pastel — the light flavour.',
    credit: 'Catppuccin (MIT)',
    light: {
      bg: ['0.933 0.009 264.5', '0.958 0.006 264.5', '0.933 0.009 264.5', '0.906 0.012 264.5', '0.857 0.014 268.5'],
      fg: ['0.435 0.043 279.3', '0.492 0.038 279.3', '0.547 0.034 279.1'],
      border: '0.808 0.017 271.2',
      accent: '0.546 0.25 297', accent2: '0.559 0.226 262.1', onAccent: '1 0 0',
      success: '0.502 0.177 140.4', warning: '0.522 0.149 67.8', danger: '0.544 0.216 19.8', info: '0.507 0.107 212.9',
      syntax: { keyword: '0.546 0.25 297', string: '0.502 0.177 140.4', number: '0.533 0.204 42.4', function: '0.529 0.226 262.1', type: '0.522 0.149 67.8', comment: '0.601 0.03 278.7' },
    },
  },
  {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappé',
    category: 'editor',
    blurb: 'Soothing pastel — muted, low-glare dusk.',
    credit: 'Catppuccin (MIT)',
    dark: {
      bg: ['0.297 0.029 276.2', '0.329 0.032 274.8', '0.395 0.034 275.9', '0.46 0.037 273', '0.521 0.039 274'],
      fg: ['0.862 0.053 273.3', '0.808 0.051 272.7', '0.697 0.046 273.8'],
      border: '0.46 0.037 273',
      accent: '0.783 0.111 311.7', accent2: '0.742 0.104 265.7', onAccent: '0.272 0.026 275.1',
      success: '0.812 0.107 133.4', warning: '0.844 0.08 83.5', danger: '0.717 0.124 19.4', info: '0.78 0.073 227.9',
      syntax: { keyword: '0.783 0.111 311.7', string: '0.812 0.107 133.4', number: '0.782 0.111 47.7', function: '0.775 0.104 265.7', type: '0.844 0.08 83.5', comment: '0.697 0.046 273.8' },
    },
  },
  {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    category: 'editor',
    blurb: 'Soothing pastel — medium contrast, gentle.',
    credit: 'Catppuccin (MIT)',
    dark: {
      bg: ['0.249 0.03 278.4', '0.279 0.035 276.9', '0.354 0.037 276', '0.426 0.039 276.9', '0.494 0.039 275.7'],
      fg: ['0.871 0.048 273.7', '0.812 0.046 274.3', '0.69 0.043 274.5'],
      border: '0.426 0.039 276.9',
      accent: '0.772 0.126 303.9', accent2: '0.75 0.11 263.8', onAccent: '0.219 0.025 280.7',
      success: '0.835 0.108 138.2', warning: '0.879 0.074 84.8', danger: '0.737 0.125 11.2', info: '0.785 0.085 228.4',
      syntax: { keyword: '0.772 0.126 303.9', string: '0.835 0.108 138.2', number: '0.799 0.106 49.6', function: '0.75 0.11 263.8', type: '0.879 0.074 84.8', comment: '0.69 0.043 274.5' },
    },
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    category: 'editor',
    blurb: 'Soothing pastel — the darkest, richest flavour.',
    credit: 'Catppuccin (MIT)',
    dark: {
      bg: ['0.216 0.025 284.1', '0.243 0.03 283.9', '0.324 0.032 282', '0.404 0.032 280.2', '0.477 0.034 278.6'],
      fg: ['0.879 0.043 272.3', '0.817 0.04 272.9', '0.687 0.037 274.7'],
      border: '0.404 0.032 280.2',
      accent: '0.787 0.119 304.8', accent2: '0.766 0.111 259.9', onAccent: '0.183 0.02 284.2',
      success: '0.858 0.109 142.7', warning: '0.919 0.07 86.5', danger: '0.756 0.13 2.8', info: '0.791 0.096 228.7',
      syntax: { keyword: '0.787 0.119 304.8', string: '0.858 0.109 142.7', number: '0.824 0.101 52.6', function: '0.766 0.111 259.9', type: '0.919 0.07 86.5', comment: '0.687 0.037 274.7' },
    },
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    category: 'editor',
    blurb: 'All natural pine, faux fur and a bit of soho vibes.',
    credit: 'Rosé Pine (MIT)',
    dark: {
      bg: ['0.213 0.025 291.1', '0.241 0.032 289.1', '0.271 0.042 289.2', '0.372 0.036 291.1', '0.44 0.039 290.4'],
      fg: ['0.909 0.03 290', '0.654 0.044 291.2', '0.55 0.044 291.4'],
      border: '0.387 0.036 291.1',
      accent: '0.776 0.095 305', accent2: '0.836 0.054 21.1', onAccent: '0.213 0.025 291.1',
      success: '0.822 0.054 209.6', warning: '0.843 0.11 74.6', danger: '0.698 0.156 4.2', info: '0.776 0.095 305',
      syntax: { keyword: '0.639 0.079 227.7', string: '0.843 0.11 74.6', number: '0.836 0.054 21.1', function: '0.836 0.054 21.1', type: '0.822 0.054 209.6', comment: '0.55 0.044 291.4' },
    },
  },
  {
    id: 'rose-pine-moon',
    name: 'Rosé Pine Moon',
    category: 'editor',
    blurb: 'Rosé Pine under moonlight — a little lighter.',
    credit: 'Rosé Pine (MIT)',
    dark: {
      bg: ['0.26 0.039 287.7', '0.288 0.043 289.1', '0.346 0.05 289.8', '0.389 0.042 289.8', '0.454 0.045 291'],
      fg: ['0.909 0.03 290', '0.717 0.044 291.2', '0.616 0.044 291.4'],
      border: '0.407 0.042 289.8',
      accent: '0.776 0.095 305', accent2: '0.765 0.097 21.9', onAccent: '0.26 0.039 287.7',
      success: '0.822 0.054 209.6', warning: '0.843 0.11 74.6', danger: '0.698 0.156 4.2', info: '0.776 0.095 305',
      syntax: { keyword: '0.71 0.093 228', string: '0.843 0.11 74.6', number: '0.765 0.097 21.9', function: '0.765 0.097 21.9', type: '0.822 0.054 209.6', comment: '0.616 0.044 291.4' },
    },
  },
  {
    id: 'rose-pine-dawn',
    name: 'Rosé Pine Dawn',
    category: 'editor',
    blurb: 'Rosé Pine at sunrise — warm parchment.',
    credit: 'Rosé Pine (MIT)',
    light: {
      bg: ['0.939 0.015 64.3', '0.987 0.011 76.6', '0.97 0.011 71.9', '0.95 0.01 58.2', '0.892 0.006 31.1'],
      fg: ['0.46 0.063 289.6', '0.523 0.046 291', '0.616 0.027 298.4'],
      border: '0.826 0.006 31.1',
      accent: '0.491 0.077 228', accent2: '0.575 0.107 2.7', onAccent: '1 0 0',
      success: '0.491 0.077 228', warning: '0.524 0.146 69.7', danger: '0.533 0.107 2.7', info: '0.527 0.074 305.7',
      syntax: { keyword: '0.491 0.077 228', string: '0.548 0.146 69.7', number: '0.555 0.106 23', function: '0.555 0.106 23', type: '0.536 0.066 210.1', comment: '0.64 0.027 298.4' },
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    category: 'editor',
    blurb: 'An arctic, north-bluish palette.',
    credit: 'Nord by Arctic Ice Studio (MIT)',
    dark: {
      bg: ['0.324 0.023 264.2', '0.379 0.029 266.5', '0.416 0.032 264.1', '0.452 0.035 264.1', '0.513 0.031 264.3'],
      fg: ['0.951 0.007 260.7', '0.899 0.016 262.7', '0.746 0.022 261.8'],
      border: '0.488 0.035 264.1',
      accent: '0.793 0.062 217.5', accent2: '0.697 0.059 248.7', onAccent: '0.324 0.023 264.2',
      success: '0.768 0.075 131.1', warning: '0.855 0.089 84.1', danger: '0.771 0.121 15.3', info: '0.775 0.062 217.5',
      syntax: { keyword: '0.799 0.059 248.7', string: '0.792 0.075 131.1', number: '0.806 0.062 332.7', function: '0.793 0.062 217.5', type: '0.793 0.048 194.5', comment: '0.69 0.044 264.1' },
    },
    light: {
      bg: ['0.933 0.01 261.8', '0.951 0.007 260.7', '0.933 0.01 261.8', '0.899 0.016 262.7', '0.85 0.018 261.3'],
      fg: ['0.324 0.023 264.2', '0.379 0.029 266.5', '0.452 0.035 264.1'],
      border: '0.805 0.018 261.3',
      accent: '0.516 0.077 254', accent2: '0.562 0.059 248.7', onAccent: '1 0 0',
      success: '0.51 0.075 131.1', warning: '0.525 0.096 38.2', danger: '0.531 0.121 15.3', info: '0.516 0.077 254',
      syntax: { keyword: '0.516 0.077 254', string: '0.51 0.075 131.1', number: '0.524 0.062 332.7', function: '0.511 0.062 217.5', type: '0.511 0.048 194.5', comment: '0.452 0.035 264.1' },
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    category: 'editor',
    blurb: 'Retro groove: warm, earthy and high-character.',
    credit: 'Gruvbox by Pavel Pertsev (MIT)',
    dark: {
      bg: ['0.241 0.005 219.7', '0.277 0 0', '0.311 0.003 48.6', '0.344 0.007 48.5', '0.411 0.012 51.9'],
      fg: ['0.894 0.057 89.2', '0.756 0.041 82.3', '0.69 0.035 76.3'],
      border: '0.411 0.012 51.9',
      accent: '0.832 0.159 83', accent2: '0.731 0.182 51.7', onAccent: '0.241 0.005 219.7',
      success: '0.765 0.158 110.8', warning: '0.832 0.159 83', danger: '0.678 0.218 30.4', info: '0.693 0.042 169.8',
      syntax: { keyword: '0.705 0.218 30.4', string: '0.765 0.158 110.8', number: '0.705 0.098 2.2', function: '0.756 0.108 137.7', type: '0.832 0.159 83', comment: '0.619 0.029 67.3' },
    },
    light: {
      bg: ['0.922 0.055 92.5', '0.956 0.055 96.2', '0.922 0.055 92.5', '0.894 0.057 89.2', '0.825 0.051 85.1'],
      fg: ['0.344 0.007 48.5', '0.411 0.012 51.9', '0.55 0.023 62.6'],
      border: '0.81 0.051 85.1',
      accent: '0.513 0.162 39.3', accent2: '0.437 0.179 28.3', onAccent: '1 0 0',
      success: '0.504 0.112 106.5', warning: '0.513 0.128 70.7', danger: '0.437 0.179 28.3', info: '0.471 0.082 215.8',
      syntax: { keyword: '0.437 0.179 28.3', string: '0.504 0.112 106.5', number: '0.489 0.124 344.3', function: '0.498 0.082 155.4', type: '0.513 0.128 70.7', comment: '0.604 0.029 67.3' },
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    category: 'editor',
    blurb: 'Downtown Tokyo lights at night.',
    credit: 'Tokyo Night by enkia (MIT)',
    dark: {
      bg: ['0.204 0.016 284.9', '0.226 0.021 280.5', '0.261 0.034 274.2', '0.306 0.037 273.2', '0.387 0.054 273.9'],
      fg: ['0.846 0.061 274.8', '0.767 0.054 275.5', '0.589 0.062 276.6'],
      border: '0.363 0.037 273.2',
      accent: '0.719 0.132 264.2', accent2: '0.751 0.134 299.5', onAccent: '0.204 0.016 284.9',
      success: '0.795 0.139 130.1', warning: '0.784 0.106 75.4', danger: '0.723 0.159 10.3', info: '0.82 0.105 235.7',
      syntax: { keyword: '0.751 0.134 299.5', string: '0.795 0.139 130.1', number: '0.787 0.137 50.6', function: '0.719 0.132 264.2', type: '0.754 0.124 213.2', comment: '0.544 0.068 274.4' },
    },
  },
  {
    id: 'tokyo-storm',
    name: 'Tokyo Storm',
    category: 'editor',
    blurb: 'Tokyo Night under storm clouds — softer blue-grey.',
    credit: 'Tokyo Night by enkia (MIT)',
    dark: {
      bg: ['0.261 0.034 274.2', '0.282 0.036 274.7', '0.306 0.037 273.2', '0.332 0.045 275', '0.387 0.054 273.9'],
      fg: ['0.846 0.061 274.8', '0.767 0.054 275.5', '0.589 0.062 276.6'],
      border: '0.406 0.054 273.9',
      accent: '0.719 0.132 264.2', accent2: '0.751 0.134 299.5', onAccent: '0.261 0.034 274.2',
      success: '0.795 0.139 130.1', warning: '0.784 0.106 75.4', danger: '0.723 0.159 10.3', info: '0.82 0.105 235.7',
      syntax: { keyword: '0.751 0.134 299.5', string: '0.795 0.139 130.1', number: '0.787 0.137 50.6', function: '0.719 0.132 264.2', type: '0.754 0.124 213.2', comment: '0.58 0.068 274.4' },
    },
  },
  {
    id: 'tokyo-day',
    name: 'Tokyo Day',
    category: 'editor',
    blurb: 'Tokyo Night by daylight.',
    credit: 'Tokyo Night by enkia (MIT)',
    light: {
      bg: ['0.873 0.02 270.2', '0.913 0.007 277.2', '0.935 0.005 286.3', '0.877 0.007 277.2', '0.835 0.025 275.8'],
      fg: ['0.431 0.156 264.1', '0.475 0.098 271.3', '0.568 0.062 275.9'],
      border: '0.76 0.025 275.8',
      accent: '0.477 0.18 257.5', accent2: '0.589 0.225 299.5', onAccent: '1 0 0',
      success: '0.465 0.093 130.3', warning: '0.475 0.075 75.2', danger: '0.496 0.233 11.6', info: '0.466 0.103 230.5',
      syntax: { keyword: '0.544 0.225 299.5', string: '0.51 0.093 130.3', number: '0.526 0.138 56.1', function: '0.522 0.18 257.5', type: '0.511 0.103 230.5', comment: '0.616 0.062 275.9' },
    },
  },
  {
    id: 'kanagawa',
    name: 'Kanagawa',
    category: 'editor',
    blurb: 'Inspired by Hokusai’s Great Wave — ink, foam and sakura.',
    credit: 'Kanagawa by rebelot (MIT)',
    dark: {
      bg: ['0.203 0.014 285.1', '0.243 0.017 285.1', '0.291 0.024 284.8', '0.34 0.028 284.8', '0.456 0.041 284.7'],
      fg: ['0.876 0.039 99.1', '0.803 0.061 99.2', '0.565 0.012 101'],
      border: '0.376 0.028 284.8',
      accent: '0.694 0.095 263.7', accent2: '0.638 0.087 301.7', onAccent: '0.203 0.014 285.1',
      success: '0.748 0.112 128.4', warning: '0.833 0.09 81.6', danger: '0.671 0.154 15.3', info: '0.741 0.064 225.7',
      syntax: { keyword: '0.671 0.087 301.7', string: '0.748 0.112 128.4', number: '0.69 0.108 359.6', function: '0.694 0.095 263.7', type: '0.696 0.051 181.3', comment: '0.565 0.012 101' },
    },
    light: {
      bg: ['0.893 0.06 99.1', '0.936 0.063 101.6', '0.887 0.077 98', '0.874 0.087 98.5', '0.846 0.058 99.8'],
      fg: ['0.402 0.068 282.9', '0.452 0.026 285.3', '0.537 0.02 96.3'],
      border: '0.792 0.058 99.8',
      accent: '0.485 0.086 261.5', accent2: '0.463 0.09 301.4', onAccent: '1 0 0',
      success: '0.481 0.089 128.3', warning: '0.485 0.07 102.4', danger: '0.508 0.171 16.5', info: '0.484 0.072 223.2',
      syntax: { keyword: '0.463 0.09 301.4', string: '0.478 0.089 128.3', number: '0.498 0.118 359.8', function: '0.485 0.086 261.5', type: '0.48 0.04 182.7', comment: '0.577 0.013 101.6' },
    },
  },
  {
    id: 'everforest',
    name: 'Everforest',
    category: 'editor',
    blurb: 'A green, comfortable forest palette.',
    credit: 'Everforest by sainnhe (MIT)',
    dark: {
      bg: ['0.28 0.012 232.9', '0.324 0.015 240.4', '0.36 0.017 227.1', '0.394 0.017 227', '0.455 0.015 236.9'],
      fg: ['0.83 0.041 86.1', '0.732 0.019 153.4', '0.647 0.02 155.6'],
      border: '0.437 0.017 231.6',
      accent: '0.773 0.091 125.8', accent2: '0.754 0.091 151.4', onAccent: '0.28 0.012 232.9',
      success: '0.773 0.091 125.8', warning: '0.808 0.086 83.7', danger: '0.712 0.128 19.6', info: '0.749 0.063 185.5',
      syntax: { keyword: '0.751 0.128 19.6', string: '0.773 0.091 125.8', number: '0.75 0.082 349.2', function: '0.749 0.063 185.5', type: '0.808 0.086 83.7', comment: '0.647 0.02 155.6' },
    },
    light: {
      bg: ['0.952 0.031 98.9', '0.974 0.026 90.1', '0.937 0.031 98.9', '0.91 0.03 98.5', '0.892 0.028 98.1'],
      fg: ['0.461 0.021 232.9', '0.518 0.023 232.4', '0.613 0.029 143.5'],
      border: '0.806 0.028 98.1',
      accent: '0.514 0.156 118.2', accent2: '0.548 0.121 163.9', onAccent: '1 0 0',
      success: '0.523 0.156 118.2', warning: '0.534 0.155 80.3', danger: '0.554 0.2 25.2', info: '0.526 0.112 236.3',
      syntax: { keyword: '0.542 0.2 25.2', string: '0.514 0.156 118.2', number: '0.543 0.174 341', function: '0.514 0.112 236.3', type: '0.522 0.155 80.3', comment: '0.611 0.024 141.2' },
    },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    category: 'editor',
    blurb: 'Precision colours with fixed relationships across light and dark.',
    credit: 'Solarized by Ethan Schoonover (MIT)',
    dark: {
      bg: ['0.23 0.042 222', '0.267 0.049 219.8', '0.309 0.052 219.7', '0.335 0.055 219.7', '0.385 0.055 216.9'],
      fg: ['0.755 0.016 196.8', '0.684 0.02 205.3', '0.583 0.029 221.9'],
      border: '0.39 0.058 217.8',
      accent: '0.681 0.139 244.9', accent2: '0.654 0.126 279.1', onAccent: '0.267 0.049 219.8',
      success: '0.644 0.151 118.6', warning: '0.654 0.134 85.7', danger: '0.673 0.206 27.1', info: '0.644 0.102 187.4',
      syntax: { keyword: '0.677 0.151 118.6', string: '0.674 0.102 187.4', number: '0.712 0.202 355.9', function: '0.681 0.139 244.9', type: '0.687 0.134 85.7', comment: '0.583 0.028 219.1' },
    },
    light: {
      bg: ['0.931 0.026 92.4', '0.974 0.026 90.1', '0.952 0.026 92.4', '0.931 0.026 92.4', '0.876 0.029 91.7'],
      fg: ['0.46 0.028 219.1', '0.511 0.029 221.9', '0.609 0.02 205.3'],
      border: '0.813 0.029 91.7',
      accent: '0.513 0.139 244.9', accent2: '0.57 0.126 279.1', onAccent: '1 0 0',
      success: '0.509 0.151 118.6', warning: '0.516 0.134 85.7', danger: '0.538 0.206 27.1', info: '0.503 0.102 187.4',
      syntax: { keyword: '0.524 0.151 118.6', string: '0.518 0.102 187.4', number: '0.556 0.202 355.9', function: '0.528 0.139 244.9', type: '0.531 0.134 85.7', comment: '0.623 0.016 196.8' },
    },
  },
  {
    id: 'ayu',
    name: 'Ayu',
    category: 'editor',
    blurb: 'Bright, warm accents on deep blue-black or soft white.',
    credit: 'Ayu by dempfi (MIT)',
    dark: {
      bg: ['0.163 0.014 264.1', '0.173 0.015 266.7', '0.205 0.021 267.6', '0.239 0.021 264.1', '0.308 0.032 261.8'],
      fg: ['0.798 0.01 93.6', '0.718 0.012 95.2', '0.554 0.022 262.9'],
      border: '0.334 0.022 265.7',
      accent: '0.797 0.13 82.2', accent2: '0.758 0.163 52.4', onAccent: '0.163 0.014 264.1',
      success: '0.825 0.175 125.8', warning: '0.824 0.141 70.2', danger: '0.626 0.164 23.1', info: '0.777 0.13 237.3',
      syntax: { keyword: '0.758 0.163 52.4', string: '0.825 0.175 125.8', number: '0.797 0.131 306.3', function: '0.824 0.141 70.2', type: '0.777 0.13 237.3', comment: '0.521 0.017 251.3' },
    },
    light: {
      bg: ['0.967 0.002 247.8', '0.991 0 0', '0.982 0.002 247.8', '0.955 0.003 264.5', '0.915 0.005 258.3'],
      fg: ['0.472 0.01 248', '0.538 0.01 248', '0.635 0.014 251.6'],
      border: '0.816 0.005 258.3',
      accent: '0.545 0.159 69.8', accent2: '0.574 0.16 53', onAccent: '1 0 0',
      success: '0.531 0.179 125.6', warning: '0.545 0.139 73.8', danger: '0.561 0.186 24.1', info: '0.536 0.141 244',
      syntax: { keyword: '0.562 0.16 53', string: '0.54 0.179 125.6', number: '0.562 0.126 306.2', function: '0.554 0.139 73.8', type: '0.548 0.141 244', comment: '0.649 0.004 271.4' },
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    category: 'editor',
    blurb: 'The famous dark theme — purple, pink and neon.',
    credit: 'Dracula Theme (MIT)',
    dark: {
      bg: ['0.255 0.019 280.5', '0.288 0.022 277.5', '0.34 0.027 276', '0.403 0.032 277.8', '0.474 0.042 277.8'],
      fg: ['0.977 0.008 106.5', '0.845 0.019 279.5', '0.672 0.063 276.2'],
      border: '0.409 0.032 277.8',
      accent: '0.742 0.149 301.9', accent2: '0.755 0.183 346.8', onAccent: '0.255 0.019 280.5',
      success: '0.871 0.22 148', warning: '0.955 0.134 112.8', danger: '0.685 0.206 24.4', info: '0.883 0.093 212.8',
      syntax: { keyword: '0.755 0.183 346.8', string: '0.955 0.134 112.8', number: '0.742 0.149 301.9', function: '0.871 0.22 148', type: '0.883 0.093 212.8', comment: '0.611 0.08 270.1' },
    },
  },
  {
    id: 'one',
    name: 'One',
    category: 'editor',
    blurb: 'The balanced, familiar editor classic.',
    credit: 'Inspired by One Dark / One Light (MIT)',
    dark: {
      bg: ['0.263 0.013 258.4', '0.293 0.016 264.3', '0.312 0.018 262.2', '0.351 0.019 260.7', '0.386 0.024 265.7'],
      fg: ['0.903 0.008 260.7', '0.762 0.02 263', '0.612 0.016 264.4'],
      border: '0.41 0.024 265.7',
      accent: '0.73 0.121 245.3', accent2: '0.694 0.164 318.2', onAccent: '0.263 0.013 258.4',
      success: '0.768 0.11 133', warning: '0.825 0.097 82.3', danger: '0.683 0.145 17', info: '0.723 0.092 206.3',
      syntax: { keyword: '0.703 0.164 318.2', string: '0.768 0.11 133', number: '0.727 0.095 63.8', function: '0.73 0.121 245.3', type: '0.825 0.097 82.3', comment: '0.612 0.016 264.4' },
    },
    light: {
      bg: ['0.955 0.001 286.4', '0.985 0 0', '0.964 0.001 286.4', '0.931 0.001 286.4', '0.892 0.001 286.4'],
      fg: ['0.35 0.014 274.5', '0.44 0.02 274.4', '0.532 0.018 273.6'],
      border: '0.835 0.001 286.4',
      accent: '0.539 0.193 263.2', accent2: '0.524 0.211 328.8', onAccent: '1 0 0',
      success: '0.518 0.142 143.5', warning: '0.536 0.116 76.9', danger: '0.552 0.179 28.3', info: '0.527 0.127 237.2',
      syntax: { keyword: '0.524 0.211 328.8', string: '0.524 0.142 143.5', number: '0.542 0.116 76.9', function: '0.545 0.193 263.2', type: '0.541 0.138 76.2', comment: '0.635 0.009 278.6' },
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    category: 'editor',
    blurb: 'Vivid syntax on warm charcoal.',
    credit: 'After the Monokai colour scheme by Wimer Hazenberg',
    dark: {
      bg: ['0.237 0.006 121.9', '0.274 0.011 114.8', '0.314 0.012 113.7', '0.357 0.018 103', '0.399 0.016 102.4'],
      fg: ['0.977 0.008 106.5', '0.851 0.018 106.8', '0.701 0.037 96.5'],
      border: '0.399 0.016 102.4',
      accent: '0.841 0.204 127.3', accent2: '0.879 0.125 103.2', onAccent: '0.237 0.006 121.9',
      success: '0.841 0.204 127.3', warning: '0.767 0.168 62.4', danger: '0.678 0.24 7.5', info: '0.827 0.108 212',
      syntax: { keyword: '0.711 0.24 7.5', string: '0.879 0.125 103.2', number: '0.704 0.181 298.1', function: '0.841 0.204 127.3', type: '0.827 0.108 212', comment: '0.586 0.029 97.4' },
    },
  },
  /* ── Made for the design styles (styles.ts) ───────────────────────────── */
  {
    id: 'swiss',
    name: 'Swiss',
    category: 'minimal',
    blurb: 'Pure white, true black and one signal red — the International Style.',
    dark: {
      bg: ['0.13 0 0', '0.165 0 0', '0.2 0 0', '0.235 0 0', '0.275 0 0'],
      fg: ['0.975 0 0', '0.81 0 0', '0.68 0 0'],
      border: '0.33 0 0',
      accent: '0.7 0.19 27', accent2: '0.74 0.17 35', onAccent: '0.15 0.02 27',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.15 27', string: '0.8 0.12 145', number: '0.8 0.13 55', function: '0.86 0 0', type: '0.8 0.1 235', comment: '0.68 0 0' },
    },
    light: {
      bg: ['0.99 0 0', '1 0 0', '0.982 0 0', '0.955 0 0', '0.91 0 0'],
      fg: ['0.16 0 0', '0.38 0 0', '0.53 0 0'],
      border: '0.85 0 0',
      accent: '0.54 0.21 27', accent2: '0.48 0.19 27', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.19 27', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.22 0 0', type: '0.5 0.12 235', comment: '0.55 0 0' },
    },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    category: 'signature',
    blurb: 'Drafting-table navy with cyan linework, or pale blueprint paper.',
    dark: {
      bg: ['0.2 0.045 255', '0.235 0.05 255', '0.27 0.052 255', '0.305 0.054 255', '0.345 0.055 255'],
      fg: ['0.97 0.012 240', '0.83 0.025 240', '0.72 0.03 240'],
      border: '0.39 0.055 250',
      accent: '0.82 0.12 210', accent2: '0.86 0.1 200', onAccent: '0.2 0.045 255',
      success: '0.8 0.15 150', warning: '0.82 0.14 80', danger: '0.8 0.15 25', info: '0.82 0.11 220',
      syntax: { keyword: '0.83 0.1 200', string: '0.84 0.12 150', number: '0.84 0.12 70', function: '0.85 0.1 230', type: '0.84 0.09 180', comment: '0.72 0.03 240' },
    },
    light: {
      bg: ['0.965 0.014 240', '0.99 0.007 240', '0.975 0.012 240', '0.945 0.016 240', '0.9 0.02 240'],
      fg: ['0.25 0.06 255', '0.42 0.05 255', '0.53 0.04 255'],
      border: '0.845 0.025 240',
      accent: '0.5 0.16 255', accent2: '0.45 0.15 255', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.5 0.15 280', string: '0.5 0.13 150', number: '0.5 0.14 55', function: '0.5 0.16 255', type: '0.5 0.11 200', comment: '0.53 0.04 255' },
    },
  },
  {
    id: 'newsprint',
    name: 'Newsprint',
    category: 'signature',
    blurb: 'Warm newsprint and pressroom black, with an oxblood accent.',
    dark: {
      bg: ['0.17 0.006 70', '0.205 0.007 70', '0.24 0.008 70', '0.275 0.009 70', '0.315 0.01 70'],
      fg: ['0.955 0.012 85', '0.8 0.012 85', '0.69 0.012 85'],
      border: '0.35 0.01 70',
      accent: '0.74 0.12 30', accent2: '0.77 0.1 45', onAccent: '0.17 0.03 30',
      success: '0.78 0.15 150', warning: '0.78 0.14 72', danger: '0.78 0.18 25', info: '0.78 0.12 235',
      syntax: { keyword: '0.8 0.11 30', string: '0.8 0.12 145', number: '0.8 0.13 60', function: '0.82 0.08 85', type: '0.8 0.1 210', comment: '0.69 0.012 85' },
    },
    light: {
      bg: ['0.965 0.012 85', '0.988 0.008 85', '0.975 0.01 85', '0.945 0.013 85', '0.9 0.016 85'],
      fg: ['0.2 0.01 60', '0.4 0.012 60', '0.53 0.012 60'],
      border: '0.85 0.014 85',
      accent: '0.47 0.15 25', accent2: '0.42 0.14 25', onAccent: '1 0 0',
      success: '0.5 0.15 150', warning: '0.5 0.14 72', danger: '0.5 0.18 25', info: '0.5 0.12 235',
      syntax: { keyword: '0.47 0.15 25', string: '0.5 0.13 145', number: '0.5 0.14 55', function: '0.3 0.01 60', type: '0.5 0.11 210', comment: '0.53 0.012 60' },
    },
  },
]

/** Accent overrides — each pair is tuned to hold contrast on every theme of its mode. */
export const ACCENTS: AccentOverride[] = [
  {
    id: 'blue',
    label: 'Blue',
    dark: { accent: '0.798 0.16 256', accent2: '0.74 0.15 285', onAccent: '0.17 0.03 256' },
    light: { accent: '0.477 0.16 256', accent2: '0.52 0.15 285', onAccent: '1 0 0' },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    dark: { accent: '0.804 0.16 275', accent2: '0.74 0.15 300', onAccent: '0.17 0.03 275' },
    light: { accent: '0.483 0.16 275', accent2: '0.52 0.15 300', onAccent: '1 0 0' },
  },
  {
    id: 'violet',
    label: 'Violet',
    dark: { accent: '0.81 0.16 300', accent2: '0.74 0.15 330', onAccent: '0.17 0.03 300' },
    light: { accent: '0.489 0.16 300', accent2: '0.52 0.15 330', onAccent: '1 0 0' },
  },
  {
    id: 'pink',
    label: 'Pink',
    dark: { accent: '0.816 0.16 355', accent2: '0.74 0.15 325', onAccent: '0.17 0.03 355' },
    light: { accent: '0.492 0.16 355', accent2: '0.52 0.15 325', onAccent: '1 0 0' },
  },
  {
    id: 'red',
    label: 'Red',
    dark: { accent: '0.813 0.17 25', accent2: '0.74 0.16 10', onAccent: '0.17 0.03 25' },
    light: { accent: '0.492 0.17 25', accent2: '0.52 0.16 10', onAccent: '1 0 0' },
  },
  {
    id: 'orange',
    label: 'Orange',
    dark: { accent: '0.81 0.16 50', accent2: '0.74 0.16 35', onAccent: '0.17 0.03 50' },
    light: { accent: '0.483 0.16 50', accent2: '0.52 0.16 35', onAccent: '1 0 0' },
  },
  {
    id: 'amber',
    label: 'Amber',
    dark: { accent: '0.804 0.15 80', accent2: '0.74 0.15 62', onAccent: '0.17 0.03 80' },
    light: { accent: '0.474 0.15 80', accent2: '0.52 0.15 62', onAccent: '1 0 0' },
  },
  {
    id: 'green',
    label: 'Green',
    dark: { accent: '0.783 0.15 150', accent2: '0.74 0.12 170', onAccent: '0.17 0.03 150' },
    light: { accent: '0.459 0.15 150', accent2: '0.52 0.12 170', onAccent: '1 0 0' },
  },
  {
    id: 'teal',
    label: 'Teal',
    dark: { accent: '0.786 0.11 190', accent2: '0.74 0.11 215', onAccent: '0.17 0.03 190' },
    light: { accent: '0.462 0.11 190', accent2: '0.52 0.11 215', onAccent: '1 0 0' },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    dark: { accent: '0.82 0.012 260', accent2: '0.76 0.01 260', onAccent: '0.17 0 260' },
    light: { accent: '0.4 0.012 260', accent2: '0.46 0.01 260', onAccent: '1 0 0' },
  },
]

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
