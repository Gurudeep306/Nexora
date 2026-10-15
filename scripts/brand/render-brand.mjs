#!/usr/bin/env node
/**
 * Render the NexoraGuru PNG/ICO exports from the SVGs written by build-brand.mjs.
 * Uses puppeteer (a root devDependency) — nothing is added to the client.
 *
 *   node scripts/brand/build-brand.mjs && node scripts/brand/render-brand.mjs
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const PUB = join(ROOT, 'client', 'public')
const OUT = join(PUB, 'brand')
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

// Favicons (small cut on a dark tile) + ICO
const flat = join(OUT, 'ngmark-flat.svg')
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

// Home-screen / PWA icons
await icon(join(OUT, 'ngmark-apple.svg'), 180, join(OUT, 'apple-touch-icon.png'))
copyFileSync(join(OUT, 'apple-touch-icon.png'), join(PUB, 'apple-touch-icon.png'))
await icon(join(OUT, 'ngmark-tile.svg'), 192, join(OUT, 'icon-192.png'))
await icon(join(OUT, 'ngmark-tile.svg'), 512, join(OUT, 'icon-512.png'))
await icon(join(OUT, 'ngmark-maskable.svg'), 192, join(OUT, 'icon-maskable-192.png'))
await icon(join(OUT, 'ngmark-maskable.svg'), 512, join(OUT, 'icon-maskable-512.png'))

// Lockups at 2x (README, docs, press)
for (const v of ['on-dark', 'on-light']) {
  const f = join(OUT, `lockup-${v}.svg`)
  const m = readFileSync(f, 'utf8').match(/width="(\d+)" height="(\d+)"/)
  const [w, h] = [+m[1] * 2, +m[2] * 2]
  await shot(`<img src="${dataSvg(f)}" width="${w}" height="${h}">`, w, h, join(OUT, `lockup-${v}.png`))
}

// Open Graph card: the graph large on the right, the lockup and the line on the left
const lockSvg = join(OUT, 'lockup-on-dark.svg')
const lm = readFileSync(lockSvg, 'utf8').match(/width="(\d+)" height="(\d+)"/)
const lockH = 92
const lockW = Math.round((+lm[1] / +lm[2]) * lockH)
await shot(
  `<div style="position:relative;width:1200px;height:630px;overflow:hidden;font-family:Geist;background:#07080d">
    <div style="position:absolute;inset:0;background:
      radial-gradient(620px 420px at 78% 42%,rgba(91,140,255,.22),transparent 70%),
      radial-gradient(520px 380px at 96% 92%,rgba(45,212,191,.14),transparent 70%),
      radial-gradient(560px 380px at 8% 0%,rgba(155,107,255,.16),transparent 70%)"></div>
    <div style="position:absolute;inset:0;opacity:.5;background-image:radial-gradient(rgba(255,255,255,.12) 1px,transparent 1.3px);background-size:24px 24px;
      -webkit-mask-image:radial-gradient(700px 520px at 75% 45%,#000,transparent 75%)"></div>
    <img src="${dataSvg(join(OUT, 'ngmark-on-dark.svg'))}" width="520" height="520"
      style="position:absolute;right:40px;top:40px;filter:drop-shadow(0 0 40px rgba(91,140,255,.35))">
    <div style="position:absolute;left:84px;top:104px"><img src="${dataSvg(lockSvg)}" width="${lockW}" height="${lockH}"></div>
    <div style="position:absolute;left:92px;top:268px;width:640px;color:#f2f2f7;font-size:64px;font-weight:600;letter-spacing:-.035em;line-height:1.02">
      Learn by watching<br><span style="background:linear-gradient(100deg,#6f95ff,#a78bfa 55%,#2dd4bf);-webkit-background-clip:text;background-clip:text;color:transparent">it run.</span></div>
    <div style="position:absolute;left:94px;top:430px;width:600px;color:#9aa0b8;font-size:24px;line-height:1.45">
      Algorithm visualisations, a real code judge, an AI tutor and GATE prep. Free.</div>
    <div style="position:absolute;left:94px;bottom:58px;color:#c9cdf0;font-size:22px;font-weight:500;letter-spacing:.01em">nexoraguru.in</div>
  </div>`,
  1200, 630, join(OUT, 'og-image.png'), { transparent: false },
)

await browser.close()
console.log('rendered PNG/ICO exports')
