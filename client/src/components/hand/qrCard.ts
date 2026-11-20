import { markSvg } from '@/components/brand/traversal'
import { encodeQr, qrArt } from '@/components/profile/qr'

/*
 * The handwriting link as a printed card, in the same style as the profile's
 * QR tag: a white card (scanners need contrast in any theme), the level-H code
 * with the NexoraGuru mark in its centre, crop marks, and under it what the
 * code opens and until when. One SVG string.
 */
const INK = '#1C1B19'
const MUTED = '#6B6A64'
const CLAY = '#D97757'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string)

export function handQrCard(url: string, { title, sub }: { title: string; sub: string }): string {
  const m = encodeQr(url, 'H')
  const centre = m.length >= 33 ? 7 : 5
  const art = qrArt(m, { quiet: 0, centre, mark: markSvg({ id: 'hqrmark', ink: INK }) })
  const W = 340
  const pad = 34
  const qr = W - pad * 2
  const H = pad + qr + 84
  const k = qr / art.size
  const tick = (x: number, y: number, dx: number, dy: number) => `M${x} ${y + dy * 12}V${y}H${x + dx * 12}`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="QR code: ${esc(title)}">` +
    `<rect width="${W}" height="${H}" rx="22" fill="#FFFFFF"/>` +
    `<path d="${tick(16, 16, 1, 1)}${tick(W - 16, 16, -1, 1)}${tick(16, H - 16, 1, -1)}${tick(W - 16, H - 16, -1, -1)}" fill="none" stroke="${MUTED}" stroke-width="1.2"/>` +
    `<g transform="translate(${pad} ${pad}) scale(${k.toFixed(4)})">${art.svg}</g>` +
    `<path d="M${pad} ${pad + qr + 20}H${W - pad}" stroke="${INK}" stroke-width="1"/>` +
    `<text x="${pad}" y="${pad + qr + 46}" fill="${INK}" font-family="'Newsreader Variable', Newsreader, Georgia, serif" font-size="20">${esc(title)}</text>` +
    `<text x="${pad}" y="${pad + qr + 67}" fill="${MUTED}" font-family="'JetBrains Mono Variable', ui-monospace, Menlo, monospace" font-size="10.5">${esc(sub)}</text>` +
    `<rect x="${W - pad - 26}" y="${pad + qr + 34}" width="26" height="4" fill="${CLAY}"/>` +
    `</svg>`
  )
}
