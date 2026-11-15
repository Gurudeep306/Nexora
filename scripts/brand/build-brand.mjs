#!/usr/bin/env node
/**
 * NexoraGuru brand builder — writes every logo SVG from the mark geometry
 * in client/src/components/brand/traversal.ts (imported directly; Node strips
 * the types), so the app, the favicon engine and the exported files can't drift.
 *
 *   node scripts/brand/build-brand.mjs      → SVGs (no deps)
 *   node scripts/brand/render-brand.mjs     → PNG/ICO exports (puppeteer, root devDep)
 *
 * The wordmark outlines come from scripts/brand/wordmark-paths.json
 * (outline-wordmark.py: Geist 400 "Nexora" + Geist 500 "Guru").
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const OUT = join(ROOT, 'client', 'public', 'brand')
const { markSvg } = await import(join(ROOT, 'client/src/components/brand/traversal.ts'))
const WM = JSON.parse(readFileSync(join(HERE, 'wordmark-paths.json'), 'utf8'))

/** Ink per ground: the mark, "Nexora", and the quieter "Guru". One colour family, no gradient. */
export const INK = {
  dark: { ink: '#f4f4f5', guru: '#a1a1aa' },
  light: { ink: '#16171a', guru: '#5f6168' },
}
export const TILE = '#16171a'
export const ON_TILE = '#f4f4f5'

/** Place a 32-unit mark SVG string at (x, y) with size s inside another SVG. */
const place = (markSvg, x, y, s) =>
  markSvg.replace('<svg xmlns="http://www.w3.org/2000/svg" ', `<svg x="${x}" y="${y}" width="${s}" height="${s}" `)

function wordmark({ x, baseline, cap, tone }) {
  const s = cap / WM.capHeight
  const c = INK[tone]
  return {
    width: WM.advance * s,
    body: `<g transform="translate(${x.toFixed(2)} ${baseline.toFixed(2)}) scale(${s.toFixed(5)})">` +
      `<path fill="${c.ink}" d="${WM.nexora}"/><path fill="${c.guru}" d="${WM.guru}"/></g>`,
  }
}

/** Horizontal lockup: mark + wordmark, for a dark or a light ground. */
export function lockup(tone, { H = 128 } = {}) {
  const cap = H * 0.34
  const markSize = H * 0.78
  const mark = markSvg({ id: `l${tone}`, ink: INK[tone].ink })
  const x = markSize + H * 0.2
  const wm = wordmark({ x, baseline: H / 2 + cap / 2, cap, tone })
  const W = Math.ceil(x + wm.width + 2)
  return {
    W, H,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
      `<title>NexoraGuru</title>${place(mark, 0, (H - markSize) / 2, markSize)}${wm.body}</svg>\n`,
  }
}

export function build() {
  mkdirSync(OUT, { recursive: true })
  // The favicon: the N alone on a dark tile (it reads on light and dark tab bars).
  const flat = markSvg({ id: 'f', tiny: true, ink: TILE, glyph: ON_TILE, title: 'NexoraGuru' }) + '\n'
  const files = {
    'ngmark.svg': markSvg({ id: 'm', ink: TILE, title: 'NexoraGuru' }) + '\n',
    'ngmark-on-dark.svg': markSvg({ id: 'd', ink: INK.dark.ink, title: 'NexoraGuru' }) + '\n',
    'ngmark-on-light.svg': markSvg({ id: 'l', ink: INK.light.ink, title: 'NexoraGuru' }) + '\n',
    'ngmark-flat.svg': flat,
    'ngmark-tile.svg': markSvg({ id: 't', ink: TILE, glyph: ON_TILE, title: 'NexoraGuru' }) + '\n',
    'ngmark-maskable.svg': markSvg({ id: 'k', shape: 'bleed', inset: 0.78, ink: TILE, glyph: ON_TILE, title: 'NexoraGuru' }) + '\n',
    'ngmark-apple.svg': markSvg({ id: 'a', shape: 'bleed', inset: 0.92, ink: TILE, glyph: ON_TILE, title: 'NexoraGuru' }) + '\n',
    'lockup-on-dark.svg': lockup('dark').svg,
    'lockup-on-light.svg': lockup('light').svg,
  }
  const written = []
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(OUT, name), content)
    written.push(join(OUT, name))
  }
  // legacy icon paths (old bookmarks, the static pages in public/) get the same small mark
  for (const p of [join(ROOT, 'client', 'public', 'favicon.svg'), join(ROOT, 'client', 'public', 'nexora.svg'), join(ROOT, 'public', 'favicon.svg')]) {
    writeFileSync(p, flat)
    written.push(p)
  }
  return written
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const f of build()) console.log('wrote', f.replace(ROOT + '/', ''))
}
