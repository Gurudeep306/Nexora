/*
  Colour maths for the theme system — OKLCH ⇄ sRGB, gamut mapping and WCAG
  contrast. Dependency-free and type-strippable, so the same code runs in the
  browser, in vite.config.ts (CSS generation, first-paint table) and in the
  node contrast test (tests/theme-contrast.test.js).

  Colours are written as 'L C H' strings (the inside of oklch()), e.g.
  '0.62 0.19 256'. L is 0–1, C is chroma, H is hue in degrees.
*/

export type Oklch = [l: number, c: number, h: number]
type Rgb = [number, number, number]

export function parseOklch(s: string): Oklch {
  const [l, c, h] = s.trim().split(/\s+/).map(Number)
  return [l, c, Number.isFinite(h) ? h : 0]
}

export function formatOklch([l, c, h]: Oklch): string {
  const r = (n: number, d: number) => String(Math.round(n * 10 ** d) / 10 ** d)
  return `${r(l, 3)} ${r(c, 3)} ${r(((h % 360) + 360) % 360, 1)}`
}

function oklchToOklab([l, c, h]: Oklch): Rgb {
  const r = (h * Math.PI) / 180
  return [l, c * Math.cos(r), c * Math.sin(r)]
}

function oklabToOklch([l, a, b]: Rgb): Oklch {
  const c = Math.hypot(a, b)
  let h = (Math.atan2(b, a) * 180) / Math.PI
  if (h < 0) h += 360
  return [l, c, c < 1e-4 ? 0 : h]
}

function oklabToLinear([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function linearToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/**
 * Linear sRGB for an OKLCH colour, mapped into gamut the way CSS Color 4
 * does it (reduce chroma at constant L and H until it fits), so contrast is
 * computed for the colour the browser will actually paint.
 */
export function oklchToLinearSrgb(col: Oklch): Rgb {
  const [l, c, h] = col
  if (l >= 1) return [1, 1, 1]
  if (l <= 0) return [0, 0, 0]
  let rgb = oklabToLinear(oklchToOklab(col))
  if (inGamut(rgb)) return rgb
  let lo = 0
  let hi = c
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const t = oklabToLinear(oklchToOklab([l, mid, h]))
    if (inGamut(t)) lo = mid
    else hi = mid
  }
  rgb = oklabToLinear(oklchToOklab([l, lo, h]))
  return rgb.map((v) => Math.min(1, Math.max(0, v))) as Rgb
}

const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

export function oklchToHex(col: Oklch | string): string {
  const c = typeof col === 'string' ? parseOklch(col) : col
  return (
    '#' +
    oklchToLinearSrgb(c)
      .map((v) => Math.round(Math.min(1, Math.max(0, encode(v))) * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

export function hexToOklch(hex: string): Oklch {
  const h = hex.replace('#', '')
  const n = [0, 2, 4].map((i) => decode(parseInt(h.slice(i, i + 2), 16) / 255)) as Rgb
  return oklabToOklch(linearToOklab(n))
}

/** WCAG 2.x relative luminance. */
export function luminance(col: Oklch | string): number {
  const c = typeof col === 'string' ? parseOklch(col) : col
  const [r, g, b] = oklchToLinearSrgb(c)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio (1–21). */
export function contrast(a: Oklch | string, b: Oklch | string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** color-mix(in oklab, a t, b) — t is the share of a. */
export function mixOklab(a: Oklch | string, b: Oklch | string, t: number): Oklch {
  const A = oklchToOklab(typeof a === 'string' ? parseOklch(a) : a)
  const B = oklchToOklab(typeof b === 'string' ? parseOklch(b) : b)
  return oklabToOklch([0, 1, 2].map((i) => A[i] * t + B[i] * (1 - t)) as Rgb)
}
