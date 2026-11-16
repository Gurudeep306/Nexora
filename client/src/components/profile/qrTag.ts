import { markSvg } from '@/components/brand/traversal'
import { encodeQr, qrArt } from './qr'

/*
 * The profile QR as a printed tag: white card (scanners need contrast in
 * any theme), the styled level-H code with the NexoraGuru mark in its
 * centre, crop marks at the corners and the link set in mono underneath.
 * One SVG string is both the on-screen preview and the downloaded file.
 */
const INK = '#1C1B19'
const MUTED = '#6B6A64'
const CLAY = '#D97757'

export function qrTagSvg(url: string, username: string): { svg: string; w: number; h: number } {
  const m = encodeQr(url, 'H')
  const centre = m.length >= 33 ? 7 : 5
  const art = qrArt(m, { quiet: 0, centre, mark: markSvg({ id: 'qrmark', ink: INK }) })
  const W = 360
  const pad = 40
  const qr = W - pad * 2
  const H = pad + qr + 92
  const k = qr / art.size
  const tick = (x: number, y: number, dx: number, dy: number) => `M${x} ${y + dy * 12}V${y}H${x + dx * 12}`
  const host = url.replace(/^https?:\/\//, '')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" rx="22" fill="#FFFFFF"/>` +
    `<path d="${tick(18, 18, 1, 1)}${tick(W - 18, 18, -1, 1)}${tick(18, H - 18, 1, -1)}${tick(W - 18, H - 18, -1, -1)}" fill="none" stroke="${MUTED}" stroke-width="1.2"/>` +
    `<g transform="translate(${pad} ${pad}) scale(${k.toFixed(4)})">${art.svg}</g>` +
    `<path d="M${pad} ${pad + qr + 24}H${W - pad}" stroke="${INK}" stroke-width="1"/>` +
    `<text x="${pad}" y="${pad + qr + 50}" fill="${INK}" font-family="'Newsreader Variable', Newsreader, Georgia, serif" font-size="22">@${escapeXml(username)}</text>` +
    `<text x="${pad}" y="${pad + qr + 72}" fill="${MUTED}" font-family="'JetBrains Mono Variable', ui-monospace, Menlo, monospace" font-size="11">${escapeXml(host)}</text>` +
    `<rect x="${W - pad - 30}" y="${pad + qr + 38}" width="30" height="4" fill="${CLAY}"/>` +
    `<text x="${W - pad}" y="${pad + qr + 64}" text-anchor="end" fill="${MUTED}" font-family="'Geist Variable', system-ui, sans-serif" font-size="10" font-weight="600" letter-spacing="1.2">SCAN TO OPEN</text>` +
    `</svg>`
  return { svg, w: W, h: H }
}

function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string)
}

/** Draw an SVG string to a PNG blob at `scale` and hand it to the browser as a download. */
export function downloadSvgAsPng(svg: string, w: number, h: number, filename: string, scale = 3) {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = w * scale
    c.height = h * scale
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
    c.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }, 'image/png')
  }
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
