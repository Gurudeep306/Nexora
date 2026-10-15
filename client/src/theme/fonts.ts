/*
  Typefaces offered by the Theme Centre. All are self-hosted through
  @fontsource(-variable) and loaded only when selected (see ./fontLoaders.ts);
  the default UI and code fonts are bundled in main.tsx.

  Each entry carries metric overrides for a local fallback face (computed
  from the font's real metrics with @capsizecss/metrics), so text set in the
  fallback while the webfont downloads occupies the same space and the swap
  doesn't shift the layout. vite.config.ts turns this file into CSS.

  Keep this module dependency-free and type-strippable (node reads it).
*/

export interface FallbackMetrics {
  /** Local system face the metrics are matched against. */
  local: 'Arial' | 'Times New Roman' | 'Courier New'
  size: number
  ascent: number
  descent: number
  lineGap: number
}

export interface UiFont {
  id: string
  label: string
  /** CSS family name declared by the fontsource package. */
  family: string
  /** Optional separate headline family (pairing). */
  display?: { family: string; fallback: FallbackMetrics }
  kind: 'grotesk' | 'geometric' | 'humanist' | 'serif' | 'rounded'
  /** Why it's here, shown on the font card. */
  note: string
  /** Tracking applied to headings — some faces want it tighter than others. */
  headingTracking?: string
  fallback: FallbackMetrics
}

export interface CodeFont {
  id: string
  label: string
  family: string
  note: string
  ligatures: boolean
  fallback: FallbackMetrics
}

const A = (size: number, ascent: number, descent: number, lineGap = 0): FallbackMetrics => ({ local: 'Arial', size, ascent, descent, lineGap })
const C = (size: number, ascent: number, descent: number, lineGap = 0): FallbackMetrics => ({ local: 'Courier New', size, ascent, descent, lineGap })

export const UI_FONTS: UiFont[] = [
  { id: 'geist', label: 'Geist', family: 'Geist Variable', kind: 'grotesk', fallback: A(104.8, 95.9, 28.2),
    note: 'Vercel’s Swiss-style grotesk — neutral, precise and very clear at small sizes.' },
  { id: 'onest', label: 'Onest', family: 'Onest Variable', kind: 'grotesk', fallback: A(105.2, 92.2, 29),
    note: 'Open apertures and a tall x-height; friendly but businesslike.' },
  { id: 'manrope', label: 'Manrope', family: 'Manrope Variable', kind: 'geometric', fallback: A(103.2, 103.3, 29.1),
    note: 'Semi-condensed geometric with crisp, modern numerals.' },
  { id: 'figtree', label: 'Figtree', family: 'Figtree Variable', kind: 'geometric', fallback: A(100.7, 94.3, 24.8),
    note: 'Clean geometric with warmth; excellent body-text rhythm.' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans Variable', kind: 'geometric', fallback: A(105, 98.9, 21.1), headingTracking: '-0.025em',
    note: 'Contemporary geometric with distinctive, slightly flared curves.' },
  { id: 'outfit', label: 'Outfit', family: 'Outfit Variable', kind: 'geometric', fallback: A(99.8, 100.2, 26),
    note: 'Pure circles and straight lines — a clean, branded feel.' },
  { id: 'sora', label: 'Sora', family: 'Sora Variable', kind: 'geometric', fallback: A(113.7, 85.3, 25.5), headingTracking: '-0.03em',
    note: 'Wide, technological geometric designed for screens.' },
  { id: 'instrument', label: 'Instrument Sans', family: 'Instrument Sans Variable', kind: 'grotesk', fallback: A(102.7, 94.4, 24.3),
    note: 'Precise, slightly narrow neo-grotesk with real character.' },
  { id: 'schibsted', label: 'Schibsted Grotesk', family: 'Schibsted Grotesk Variable', kind: 'grotesk', fallback: A(104.5, 93.5, 24.7),
    note: 'A newsroom grotesk: sturdy, confident, made for headlines and UI.' },
  { id: 'hanken', label: 'Hanken Grotesk', family: 'Hanken Grotesk Variable', kind: 'grotesk', fallback: A(100.9, 99.1, 30),
    note: 'Light-footed grotesk with a calm, airy texture.' },
  { id: 'red-hat', label: 'Red Hat', family: 'Red Hat Text Variable', kind: 'humanist', fallback: A(100.3, 101.5, 30.4),
    display: { family: 'Red Hat Display Variable', fallback: A(100.3, 101.5, 30.4) },
    note: 'A pairing: Red Hat Display for headings, Red Hat Text tuned for reading.' },
  { id: 'plex', label: 'IBM Plex Sans', family: 'IBM Plex Sans Variable', kind: 'humanist', fallback: A(101.2, 101.3, 27.2),
    note: 'Engineered grotesk with humanist details — a quiet classic.' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: 'Space Grotesk Variable', kind: 'grotesk', fallback: A(109.7, 89.7, 26.6),
    note: 'Quirky, technical shapes from Space Mono; the previous NexoraGuru face.' },
  { id: 'bricolage', label: 'Bricolage Grotesque', family: 'Bricolage Grotesque Variable', kind: 'grotesk', fallback: A(105.4, 88.2, 25.6), headingTracking: '-0.035em',
    note: 'Expressive, optical-size grotesk — punchy headlines, calm body.' },
  { id: 'lexend', label: 'Lexend', family: 'Lexend Variable', kind: 'geometric', fallback: A(109.9, 91, 22.7),
    note: 'Designed to reduce visual stress and improve reading fluency.' },
  { id: 'atkinson', label: 'Atkinson Hyperlegible', family: 'Atkinson Hyperlegible Next Variable', kind: 'humanist', fallback: A(99.6, 98.8, 31.7),
    note: 'From the Braille Institute: every letter unmistakable, for low vision.' },
  { id: 'nunito', label: 'Nunito', family: 'Nunito Variable', kind: 'rounded', fallback: A(101.4, 99.7, 34.8),
    note: 'Rounded terminals with an open, legible skeleton — soft but clear.' },
  { id: 'literata', label: 'Literata', family: 'Literata Variable', kind: 'serif', fallback: { local: 'Times New Roman', size: 118.2, ascent: 99.6, descent: 26.1, lineGap: 0 },
    note: 'Google’s e-reading serif — for long-form reading, still crisp in UI.' },
]

export const CODE_FONTS: CodeFont[] = [
  { id: 'jetbrains', label: 'JetBrains Mono', family: 'JetBrains Mono Variable', ligatures: true, fallback: C(100, 102, 30),
    note: 'Tall x-height and clear shapes, with code ligatures.' },
  { id: 'geist-mono', label: 'Geist Mono', family: 'Geist Mono Variable', ligatures: false, fallback: C(100, 100.5, 29.5),
    note: 'Geist’s monospace sibling — tidy and modern.' },
  { id: 'fira', label: 'Fira Code', family: 'Fira Code Variable', ligatures: true, fallback: C(100, 99, 32.2),
    note: 'The original ligature font, from Mozilla’s Fira Mono.' },
  { id: 'plex-mono', label: 'IBM Plex Mono', family: 'IBM Plex Mono', ligatures: false, fallback: C(100, 102.5, 27.5),
    note: 'Slab-like serifs on i, l and 1 for zero ambiguity.' },
  { id: 'source-code', label: 'Source Code Pro', family: 'Source Code Pro Variable', ligatures: false, fallback: C(100, 98.4, 27.3),
    note: 'Adobe’s workhorse — light, open and calm.' },
  { id: 'victor', label: 'Victor Mono', family: 'Victor Mono Variable', ligatures: true, fallback: C(100, 110, 25),
    note: 'Narrow and crisp, with a cursive italic for comments.' },
  { id: 'martian', label: 'Martian Mono', family: 'Martian Mono Variable', ligatures: false, fallback: C(116.6, 85.7, 17.1),
    note: 'Wide, geometric and distinctly futuristic.' },
  { id: 'commit', label: 'Commit Mono', family: 'Commit Mono', ligatures: false, fallback: C(100, 100, 30),
    note: 'Neutral and anonymous, tuned for smooth reading rhythm.' },
]

export const DEFAULT_FONT = 'geist'
export const DEFAULT_CODE_FONT = 'jetbrains'

export const TEXT_SIZES = [
  { id: 'small', label: 'Small', scale: 0.9375 },
  { id: 'default', label: 'Default', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.0625 },
  { id: 'xl', label: 'Extra large', scale: 1.125 },
] as const

export type TextSizeId = (typeof TEXT_SIZES)[number]['id']
export const DEFAULT_TEXT_SIZE: TextSizeId = 'default'

const sansTail = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
const serifTail = "ui-serif, Georgia, 'Times New Roman', serif"
const monoTail = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

/** CSS font-family stack for a UI font (body, display). */
export function uiFontStacks(f: UiFont): { body: string; display: string } {
  const tail = f.kind === 'serif' ? serifTail : sansTail
  const body = `'${f.family}', '${f.label} Fallback', ${tail}`
  const display = f.display ? `'${f.display.family}', '${f.label} Display Fallback', ${tail}` : body
  return { body, display }
}

export function codeFontStack(f: CodeFont): string {
  return `'${f.family}', '${f.label} Fallback', ${monoTail}`
}

/*
  Solution handwriting — the face GATE worked solutions are set in (prose
  only: maths, code, the animation canvas, controls and the answer keep their
  own fonts). All are print-style hands, never cursive. Hand fonts run small
  or loose next to a UI grotesk, so each carries its own size scale, leading
  and tracking, exposed as --solution-* custom properties (themeCss.ts) and
  applied by gate/solution/solution-font.css.
*/
export interface SolutionFont {
  id: string
  label: string
  /** CSS family name declared by the fontsource package ('' = the UI font). */
  family: string
  note: string
  /** Multiplies the solution's authored text sizes. */
  scale: number
  /** Unitless line-height for paragraphs. */
  leading: number
  tracking: string
  /** Body weight (variable faces can sit between stops). */
  weight: number
  /** font-variation-settings — design axes only; weight goes through font-weight. */
  variation?: string
  fallback?: FallbackMetrics
}

export const SOLUTION_FONTS: SolutionFont[] = [
  { id: 'shantell', label: 'Shantell Sans', family: 'Shantell Sans Variable', scale: 1.06, leading: 1.7, tracking: '0.006em', weight: 430,
    variation: "'INFM' 50", fallback: A(110.8, 92.1, 28.9),
    note: 'Marker-drawn print with a variable informality axis, set halfway: hand-made detail that still reads like print.' },
  { id: 'patrick', label: 'Patrick Hand', family: 'Patrick Hand', scale: 1.2, leading: 1.58, tracking: '0.012em', weight: 400,
    fallback: A(80.1, 130.2, 39),
    note: 'Neat, upright print from a real hand — compact and very clear.' },
  { id: 'architects', label: 'Architects Daughter', family: 'Architects Daughter', scale: 1.04, leading: 1.76, tracking: '0.01em', weight: 400,
    fallback: A(107, 92.1, 37.7),
    note: 'A draftsman’s lettering — like neat notes on a whiteboard.' },
  { id: 'mali', label: 'Mali', family: 'Mali', scale: 1.0, leading: 1.72, tracking: '0.004em', weight: 400,
    fallback: A(110.6, 95, 22.6),
    note: 'Friendly, rounded schoolbook hand with real weights for emphasis.' },
  { id: 'off', label: 'Off', family: '', scale: 1, leading: 1.75, tracking: 'normal', weight: 400,
    note: 'Solutions use the interface font.' },
]

export const DEFAULT_SOLUTION_FONT = 'shantell'

/** CSS font-family stack for a solution font ('off' → the UI font). */
export function solutionFontStack(f: SolutionFont): string {
  return f.family ? `'${f.family}', '${f.label} Fallback', var(--font-body)` : 'var(--font-body)'
}
