#!/usr/bin/env node
/**
 * NexoraGuru brand builder — writes every logo SVG from the Traversal geometry
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
const { traversalSvg, RAMP } = await import(join(ROOT, 'client/src/components/brand/traversal.ts'))
const WM = JSON.parse(readFileSync(join(HERE, 'wordmark-paths.json'), 'utf8'))

/** Wordmark text colours per ground. */
export const WORDMARK = {
  dark: { ink: '#ececf2', guru: ['#6f95ff', '#a78bfa', '#2dd4bf'] },
  light: { ink: '#11131a', guru: ['#2f5bea', '#7c3aed', '#0d9488'] },
}

/** Place a 32-unit mark SVG string at (x, y) with size s inside another SVG. */
const place = (markSvg, x, y, s) =>
  markSvg.replace('<svg xmlns="http://www.w3.org/2000/svg" ', `<svg x="${x}" y="${y}" width="${s}" height="${s}" `)

function wordmark(id, { x, baseline, cap, tone }) {
  const s = cap / WM.capHeight
  const c = WORDMARK[tone]
  // the gradient lives inside the scaled group, so it is in font units
  const gx1 = WM.guruX
  const gx2 = WM.advance
  return {
    width: WM.advance * s,
    defs: `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${gx1.toFixed(1)}" y1="0" x2="${gx2.toFixed(1)}" y2="0">` +
      `<stop offset="0" stop-color="${c.guru[0]}"/><stop offset=".55" stop-color="${c.guru[1]}"/><stop offset="1" stop-color="${c.guru[2]}"/></linearGradient>`,
    body: `<g transform="translate(${x.toFixed(2)} ${baseline.toFixed(2)}) scale(${s.toFixed(5)})">` +
      `<path fill="${c.ink}" d="${WM.nexora}"/><path fill="url(#${id})" d="${WM.guru}"/></g>`,
  }
}

/** Horizontal lockup: mark + wordmark, for a dark or a light ground. */
export function lockup(tone, { H = 128 } = {}) {
  const cap = H * 0.34
  const markSize = H
  const trim = markSize * (4.2 / 32) // the glyph's own side bearing inside its 32-unit box
  const mark = traversalSvg({ id: `l${tone}`, colors: RAMP[tone] })
  const x = markSize - trim + H * 0.1
  const wm = wordmark(`w${tone}`, { x, baseline: H / 2 + cap / 2, cap, tone })
  const W = Math.ceil(x + wm.width + 2 - trim)
  return {
    W, H,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${trim.toFixed(2)} 0 ${W} ${H}" width="${W}" height="${H}">` +
      `<title>NexoraGuru</title><defs>${wm.defs}</defs>${place(mark, 0, 0, markSize)}${wm.body}</svg>\n`,
  }
}

export function build() {
  mkdirSync(OUT, { recursive: true })
  const flat = traversalSvg({ id: 'f', small: true, tile: 'rounded', colors: RAMP.dark, title: 'NexoraGuru' }) + '\n'
  const files = {
    'ngmark.svg': traversalSvg({ id: 'm', colors: RAMP.neutral, title: 'NexoraGuru' }) + '\n',
    'ngmark-on-dark.svg': traversalSvg({ id: 'd', colors: RAMP.dark, title: 'NexoraGuru' }) + '\n',
    'ngmark-on-light.svg': traversalSvg({ id: 'l', colors: RAMP.light, title: 'NexoraGuru' }) + '\n',
    'ngmark-flat.svg': flat,
    'ngmark-tile.svg': traversalSvg({ id: 't', tile: 'rounded', colors: RAMP.dark, title: 'NexoraGuru' }) + '\n',
    'ngmark-maskable.svg': traversalSvg({ id: 'k', tile: 'bleed', scale: 0.72, colors: RAMP.dark, title: 'NexoraGuru' }) + '\n',
    'ngmark-apple.svg': traversalSvg({ id: 'a', tile: 'bleed', scale: 0.84, colors: RAMP.dark, title: 'NexoraGuru' }) + '\n',
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
