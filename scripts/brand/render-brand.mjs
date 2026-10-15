#!/usr/bin/env node
/**
 * Render the NexoraGuru PNG/ICO exports from the SVGs written by build-brand.mjs.
 * Uses puppeteer (a root devDependency) — nothing is added to the client.
 *
 *   node scripts/brand/build-brand.mjs && node scripts/brand/render-brand.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const PUB = join(ROOT, 'client', 'public')
const OUT = join(PUB, 'brand')
const CONCEPTS = join(ROOT, 'docs', 'brand', 'concepts')
const GEIST = join(ROOT, 'client/node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')

const b64 = (f) => readFileSync(f).toString('base64')
const dataSvg = (f) => `data:image/svg+xml;base64,${b64(f)}`

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()

async function shot(html, w, h, file, { transparent = true } = {}) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.setContent(
    `<!doctype html><html><head><style>
      @font-face{font-family:Geist;src:url(data:font/woff2;base64,${b64(GEIST)}) format('woff2');font-weight:100 900}
      html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}
      img{display:block}</style></head><body>${html}</body></html>`,
    { waitUntil: 'load' },
  )
  await page.evaluate(() => document.fonts.ready)
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h }, omitBackground: transparent, type: 'png' })
  if (file) writeFileSync(file, buf)
  return buf
}

const icon = (svgFile, size, out) =>
  shot(`<img src="${dataSvg(svgFile)}" width="${size}" height="${size}">`, size, size, out)

const flat = join(OUT, 'ngmark-flat.svg')
const master = join(OUT, 'ngmark.svg')

// Favicons (flat, hinted) + ICO
const ico = []
for (const s of [16, 32, 48]) ico.push([s, await icon(flat, s, join(OUT, `favicon-${s}.png`))])
const header = Buffer.alloc(6 + 16 * ico.length)
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(ico.length, 4)
let offset = header.length
ico.forEach(([s, png], i) => {
  const e = 6 + i * 16
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3)
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6)
  header.writeUInt32LE(png.length, e + 8); header.writeUInt32LE(offset, e + 12)
  offset += png.length
})
writeFileSync(join(OUT, 'favicon.ico'), Buffer.concat([header, ...ico.map(([, p]) => p)]))
copyFileSync(join(OUT, 'favicon.ico'), join(PUB, 'favicon.ico'))

// Home-screen / PWA icons (3D master)
await icon(join(OUT, 'ngmark-apple.svg'), 180, join(OUT, 'apple-touch-icon.png'))
copyFileSync(join(OUT, 'apple-touch-icon.png'), join(PUB, 'apple-touch-icon.png'))
await icon(master, 192, join(OUT, 'icon-192.png'))
await icon(master, 512, join(OUT, 'icon-512.png'))
await icon(join(OUT, 'ngmark-maskable.svg'), 192, join(OUT, 'icon-maskable-192.png'))
await icon(join(OUT, 'ngmark-maskable.svg'), 512, join(OUT, 'icon-maskable-512.png'))

// Lockups (2x for crisp docs/README use)
for (const v of ['on-dark', 'on-light']) {
  const f = join(OUT, `lockup-${v}.svg`)
  const m = readFileSync(f, 'utf8').match(/viewBox="0 0 (\d+) (\d+)"/)
  const [w, h] = [+m[1] * 2, +m[2] * 2]
  await shot(`<img src="${dataSvg(f)}" width="${w}" height="${h}">`, w, h, join(OUT, `lockup-${v}.png`))
}

// Open Graph card
const lock = readFileSync(join(OUT, 'lockup-on-dark.svg'), 'utf8')
const lw = +lock.match(/viewBox="0 0 (\d+)/)[1]
await shot(
  `<div style="position:relative;width:1200px;height:630px;overflow:hidden;font-family:Geist;
      background:radial-gradient(900px 520px at 18% 30%,rgba(255,153,51,.16),transparent 60%),
                 radial-gradient(700px 500px at 100% 100%,rgba(20,184,166,.14),transparent 60%),
                 linear-gradient(135deg,#1d1958 0%,#100d34 50%,#07061a 100%)">
    <svg width="1200" height="630" style="position:absolute;inset:0;opacity:.07" viewBox="0 0 1200 630">
      <g fill="none" stroke="#f6d27a" stroke-width="1.4">
        ${[120, 180, 240, 300, 360].map((r) => `<circle cx="1010" cy="315" r="${r}"/>`).join('')}
        ${Array.from({ length: 24 }, (_, i) => `<path transform="rotate(${i * 15} 1010 315)" d="M1010 15Q1040 75 1010 135Q980 75 1010 15Z"/>`).join('')}
      </g></svg>
    <div style="position:absolute;left:96px;top:150px">
      <img src="${dataSvg(join(OUT, 'lockup-on-dark.svg'))}" width="${Math.round(lw * 1.25)}" height="160">
    </div>
    <div style="position:absolute;left:100px;top:350px;width:820px;color:#f6f1e4;font-size:44px;font-weight:600;letter-spacing:-.01em;line-height:1.15">
      Learn computer science, step by step.</div>
    <div style="position:absolute;left:100px;top:418px;width:900px;color:#c9c3e6;font-size:26px;font-weight:400;line-height:1.4">
      DSA practice, interactive lessons, GATE CSE &amp; DA prep, contests and an AI tutor — from first step to exam day.</div>
    <div style="position:absolute;left:100px;bottom:62px;display:flex;align-items:center;gap:14px;color:#efbd52;font-size:24px;font-weight:600;letter-spacing:.02em">
      <span style="display:inline-block;width:40px;height:3px;border-radius:2px;background:linear-gradient(90deg,#fde9ad,#c98a26)"></span>nexoraguru.in</div>
  </div>`,
  1200, 630, join(OUT, 'og-image.png'), { transparent: false },
)

// Concept renders + a size sheet comparing all three
const concepts = ['concept-a-diya-shirorekha', 'concept-b-lotus-seal', 'concept-c-gopuram-gate']
for (const c of concepts) await icon(join(CONCEPTS, `${c}.svg`), 512, join(CONCEPTS, `${c}.png`))
const sizes = [16, 32, 64, 128, 256]
const row = (c, bg, fg) =>
  `<div style="display:flex;align-items:flex-end;gap:28px;padding:22px 28px;background:${bg};color:${fg}">
     <div style="width:210px;font:600 15px Geist">${c.replace('concept-', '').replace(/-/g, ' ')}</div>
     ${sizes.map((s) => `<img src="${dataSvg(join(CONCEPTS, `${c}.svg`))}" width="${s}" height="${s}">`).join('')}</div>`
await shot(
  `<div>${concepts.map((c) => row(c, '#f4f1ea', '#1a1747') + row(c, '#0d0d12', '#eee')).join('')}</div>`,
  1000, 6 * 300, join(CONCEPTS, 'concepts-sheet.png'), { transparent: false },
)

await browser.close()
console.log('rendered PNG/ICO exports')
