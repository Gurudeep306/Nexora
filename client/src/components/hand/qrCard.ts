import { markSvg } from '@/components/brand/traversal'
import { encodeQr, qrArt } from '@/components/profile/qr'

/*
 * The handwriting link as a printed card in the person's theme: the theme's
 * paper and ink (cameras need dark modules on a light ground, so a dark theme
 * keeps a light card), the three corner eyes in the theme's accent, the
 * NexoraGuru mark in the centre of the code, and the wordmark at the foot.
 * Every colour is checked for contrast before it is used.
 */
export type QrColors = { paper: string; ink: string; accent: string; muted: string }

const FALLBACK: QrColors = { paper: '#FFFFFF', ink: '#1C1B19', accent: '#B4532F', muted: '#6B6A64' }

/** A CSS colour (any syntax, oklch included) as [r, g, b], read back from a 1×1 canvas. */
function rgbOf(css: string): [number, number, number] | null {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#000'
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return a < 250 ? null : [r, g, b]
  } catch {
    return null
  }
}
const hex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

function deepen(c: [number, number, number], paper: [number, number, number]): [number, number, number] {
  let x = c
  for (let i = 0; i < 24 && contrast(x, paper) < 3.2; i++) x = x.map((v) => Math.round(v * 0.92)) as [number, number, number]
  return x
}

/** The card's colours from the live theme, made safe for cameras. */
export function themeQrColors(): QrColors {
  if (typeof document === 'undefined') return FALLBACK
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string) => cs.getPropertyValue(name).trim()
  const dark = document.documentElement.dataset.mode === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches && !document.documentElement.dataset.mode
  const paperC = dark ? null : rgbOf(v('--ed-card') || v('--color-bg-surface'))
  const inkC = dark ? null : rgbOf(v('--ed-ink') || v('--color-text-primary'))
  const paper = paperC && lum(paperC) > 0.75 ? paperC : ([252, 251, 248] as [number, number, number])
  const ink = inkC && contrast(inkC, paper) >= 9 ? inkC : ([28, 27, 25] as [number, number, number])
  const accC = rgbOf(v('--color-accent-brand'))
  // A dark theme's accent is light; deepen it (same hue) until a camera and an eye can see it on paper.
  const accent = accC ? deepen(accC, paper) : ink
  const mutedC = rgbOf(v('--color-text-secondary'))
  const muted = mutedC && contrast(mutedC, paper) >= 4.5 ? mutedC : ([95, 93, 87] as [number, number, number])
  return { paper: hex(paper), ink: hex(ink), accent: hex(accent), muted: hex(muted) }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string)

export function handQrCard(url: string, { title, sub, colors = FALLBACK }: { title: string; sub: string; colors?: QrColors }): string {
  const { paper, ink, accent, muted } = colors
  // Level Q leaves room for the mark (a 7×7 hole is about 6% of the code; Q mends 25%)
  // and keeps the dots larger than H, so older phone cameras read it faster.
  const m = encodeQr(url, 'Q')
  const centre = m.length >= 33 ? 7 : 5
  const art = qrArt(m, { quiet: 0, centre, ink, paper, eye: accent, mark: markSvg({ id: 'hqrmark', ink, clay: accent }) })
  const W = 340
  const pad = 30
  const qr = W - pad * 2
  const H = pad + qr + 92
  const k = qr / art.size
  const tick = (x: number, y: number, dx: number, dy: number) => `M${x} ${y + dy * 12}V${y}H${x + dx * 12}`
  const foot = pad + qr
  const brand = markSvg({ id: 'hqrfoot', ink, clay: accent }).replace('<svg ', `<svg x="${W - pad - 100}" y="${foot + 29}" width="19" height="19" `)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="QR code: ${esc(title)}">` +
    `<rect width="${W}" height="${H}" rx="24" fill="${paper}"/>` +
    `<path d="${tick(14, 14, 1, 1)}${tick(W - 14, 14, -1, 1)}${tick(14, H - 14, 1, -1)}${tick(W - 14, H - 14, -1, -1)}" fill="none" stroke="${muted}" stroke-width="1.2"/>` +
    `<g transform="translate(${pad} ${pad}) scale(${k.toFixed(4)})">${art.svg}</g>` +
    `<path d="M${pad} ${foot + 18}H${W - pad}" stroke="${muted}" stroke-opacity="0.6" stroke-width="1"/>` +
    `<rect x="${pad}" y="${foot + 16.5}" width="28" height="3" rx="1.5" fill="${accent}"/>` +
    `<text x="${pad}" y="${foot + 44}" fill="${ink}" font-family="'Newsreader Variable', Newsreader, Georgia, serif" font-size="18">${esc(title)}</text>` +
    `<text x="${pad}" y="${foot + 68}" fill="${muted}" font-family="'JetBrains Mono Variable', ui-monospace, Menlo, monospace" font-size="10.5">${esc(sub)}</text>` +
    brand +
    `<text x="${W - pad}" y="${foot + 44}" text-anchor="end" fill="${ink}" font-family="'Newsreader Variable', Newsreader, Georgia, serif" font-size="15">NexoraGuru</text>` +
    `</svg>`
  )
}

/** A placeholder card with the mark, shown for the moment before the code exists. */
export function handQrPlaceholder(colors: QrColors = FALLBACK): string {
  const { paper, ink, accent, muted } = colors
  const W = 340
  const H = 30 + 280 + 92
  const mark = markSvg({ id: 'hqrwait', ink, clay: accent }).replace('<svg ', `<svg x="${W / 2 - 28}" y="${30 + 140 - 28}" width="56" height="56" `)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Making your code">` +
    `<rect width="${W}" height="${H}" rx="24" fill="${paper}"/>` +
    `<rect x="30" y="30" width="280" height="280" rx="18" fill="none" stroke="${muted}" stroke-opacity="0.35" stroke-dasharray="6 8"/>` +
    mark +
    `<text x="${W / 2}" y="${30 + 140 + 54}" text-anchor="middle" fill="${muted}" font-family="'JetBrains Mono Variable', ui-monospace, Menlo, monospace" font-size="11">Making your code…</text>` +
    `</svg>`
  )
}
