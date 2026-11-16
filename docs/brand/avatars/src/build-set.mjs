#!/usr/bin/env node
/**
 * Writes the shipped avatar set to client/public/avatars/<id>.svg and a
 * self-contained contact sheet to docs/brand/avatars/set.html.
 *
 *   node docs/brand/avatars/src/build-set.mjs
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AVATAR_SET as CLAY } from './clay-set.mjs'
import { PORTRAIT_SET } from './portraits-set.mjs'

// Portraits first (the default for new accounts), then the Clay characters.
const AVATAR_SET = [...PORTRAIT_SET, ...CLAY]

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..', '..')
const PUB = join(ROOT, 'client', 'public', 'avatars')

mkdirSync(PUB, { recursive: true })
for (const f of readdirSync(PUB)) if (f.endsWith('.svg')) rmSync(join(PUB, f))
let bytes = 0
for (const a of AVATAR_SET) {
  writeFileSync(join(PUB, `${a.id}.svg`), a.svg + '\n')
  bytes += a.svg.length
}
console.log(`wrote ${AVATAR_SET.length} avatars to ${PUB} (${(bytes / 1024).toFixed(1)} KB total)`)

const uri = (s) => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`
const img = (a, px) => `<img src="${uri(a.svg)}" width="${px}" height="${px}" alt="">`
const panel = (theme) => `
  <div class="panel ${theme}">
    <div class="grid">${AVATAR_SET.map((a) => `<figure>${img(a, 96)}</figure>`).join('')}</div>
    <div class="strip">${AVATAR_SET.map((a) => img(a, 32)).join('')}</div>
    <div class="strip">${AVATAR_SET.map((a) => img(a, 24)).join('')}</div>
  </div>`

writeFileSync(
  join(HERE, '..', 'set.html'),
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>NexoraGuru Avatar Set</title>
<style>
*{box-sizing:border-box;margin:0}
body{background:#F3F2EE;color:#17161D;font:14px/1.5 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;padding:32px}
h1{font-size:24px;font-weight:650;letter-spacing:-.01em}
p{color:#6B6977;margin:4px 0 20px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.panel{border-radius:20px;padding:24px;background:#0D0E13;color:#ECEBF2;border:1px solid #272834}
.panel.light{background:#FBFAF7;color:#17161D;border-color:#E4E2DC}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px 10px}
figure{display:flex;flex-direction:column;align-items:center;gap:6px}
figcaption{font-size:12px;opacity:.65}
img{display:block;border-radius:50%;box-shadow:0 0 0 2px rgba(110,107,245,.2)}
.strip{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
@media (max-width:900px){.pair{grid-template-columns:1fr}body{padding:16px}}
</style></head><body>
<h1>NexoraGuru avatars · Portraits and Clay</h1>
<p>${AVATAR_SET.length} avatars (16 Portraits, then 16 Clay characters), shipped as static SVGs in client/public/avatars/. Shown at 96, 32 and 24 px.</p>
<div class="pair">${panel('dark')}${panel('light')}</div>
</body></html>
`,
)
console.log('wrote', join(HERE, '..', 'set.html'))
