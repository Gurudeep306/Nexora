#!/usr/bin/env node
/**
 * Builds docs/brand/avatars/preview.html (self-contained) and writes each
 * sample as a standalone SVG under docs/brand/avatars/src/<direction>/.
 *
 *   node docs/brand/avatars/src/build-preview.mjs
 *
 * Open preview.html?d=clay (or ink / orbs) to show one direction only.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIRECTIONS } from './directions.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..')

for (const d of DIRECTIONS) {
  mkdirSync(join(HERE, d.key), { recursive: true })
  for (const a of d.avatars) writeFileSync(join(HERE, d.key, `${a.id}.svg`), a.svg + '\n')
}

const uri = (s) => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`
const img = (a, px, cls = 'av') =>
  `<img class="${cls}" src="${uri(a.svg)}" width="${px}" height="${px}" alt="${a.name}" title="${a.name}">`

const NAMES = ['Mira', 'Kai', 'Noor', 'Arjun', 'Zara', 'Leo']
const XP = ['12,480', '11,920', '10,305']

function panel(d, theme) {
  const A = d.avatars
  const sizes = [128, 64, 40, 24]
    .map(
      (px) =>
        `<div class="ramp${px === 128 ? " big" : ""}"><span class="lbl">${px}</span><div class="row" style="gap:${Math.max(8, px / 6)}px">${A.map((a) => img(a, px)).join('')}</div></div>`,
    )
    .join('')
  const topbar = `
    <div class="mock topbar">
      <span class="logo"><b>NG</b>NexoraGuru</span>
      <span class="search">Search or jump to…<kbd>⌘K</kbd></span>
      <span class="chip">${img(A[0], 28)}<span><b>${A[0].name}</b><small>Level 14</small></span><i>▾</i></span>
    </div>`
  const board = `
    <div class="mock board">
      <div class="bh">GATE leaderboard <span>This week</span></div>
      ${[1, 2, 3]
        .map(
          (r, i) =>
            `<div class="br${i === 1 ? ' me' : ''}"><span class="rk">${r}</span>${img(A[i + 1], 32)}<span class="nm">${A[i + 1].name}${i === 1 ? ' <em>you</em>' : ''}</span><span class="xp">${XP[i]} XP</span></div>`,
        )
        .join('')}
    </div>`
  const chat = `
    <div class="mock chat">
      <div class="msg">${img(A[4], 28)}<div><small>${A[4].name} · 9:41</small><p>Did anyone crack Q37 from GATE 2019? The DP feels off by one.</p></div></div>
      <div class="msg mine"><div><p>Yes, base case should be dp[0] = 1. Sending my notes.</p></div>${img(A[5], 28)}</div>
      <div class="msg">${img(A[3], 28)}<div><small>${A[3].name}</small><p>Same trap got me last week 😅</p></div></div>
    </div>`
  return `<div class="panel ${theme}"><div class="ptag">${theme}</div>${sizes}<div class="mocks">${topbar}${board}${chat}</div></div>`
}

const glance = DIRECTIONS.map(
  (d) => `
  <div class="glance-row" data-d="${d.key}">
    <div class="gname"><b>${d.letter}</b>${d.title}</div>
    <div class="gstrip dark">${d.avatars.map((a) => img(a, 56)).join('')}</div>
    <div class="gstrip light">${d.avatars.map((a) => img(a, 56)).join('')}</div>
  </div>`,
).join('')

const sections = DIRECTIONS.map(
  (d) => `
  <section class="dir" data-d="${d.key}">
    <header>
      <h2><span class="let">${d.letter}</span>${d.title}</h2>
      <p>${d.line}</p>
      <ul>${d.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
    </header>
    <div class="pair">${panel(d, 'dark')}${panel(d, 'light')}</div>
  </section>`,
).join('')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NexoraGuru Avatars</title>
<style>
:root{
  --page:#F3F2EE;--ink:#17161D;--dim:#6B6977;--line:#E2E0DA;--accent:#6E6BF5;
  --font:'Geist','Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
}
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);font:14px/1.5 var(--font);padding:40px 32px 64px;-webkit-font-smoothing:antialiased}
.wrap{max-width:1360px;margin:0 auto}
.top h1{font-size:30px;letter-spacing:-.02em;font-weight:650}
.top p{color:var(--dim);margin-top:6px;max-width:760px}
.av{display:block;border-radius:50%;box-shadow:0 0 0 2px rgba(110,107,245,.2)}
.glance{margin:28px 0 8px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}
.glance-row{display:grid;grid-template-columns:150px 1fr 1fr;align-items:stretch;border-top:1px solid var(--line)}
.glance-row:first-child{border-top:0}
.gname{display:flex;align-items:center;gap:10px;padding:0 20px;font-weight:600;font-size:16px}
.gname b,.let{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:8px;background:var(--ink);color:#fff;font-size:13px}
.gstrip{display:flex;gap:14px;padding:18px 22px;flex-wrap:wrap}
.gstrip.dark{background:#0D0E13}.gstrip.light{background:#FBFAF7}
.dir{margin-top:44px}
.dir header h2{display:flex;align-items:center;gap:12px;font-size:24px;letter-spacing:-.01em;font-weight:650}
.dir header p{color:var(--dim);margin-top:6px;max-width:820px}
.dir header ul{display:flex;gap:8px;flex-wrap:wrap;list-style:none;padding:0;margin-top:12px}
.dir header li{border:1px solid var(--line);background:#fff;border-radius:999px;padding:3px 11px;font-size:12px;color:var(--dim)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
.panel{position:relative;border-radius:20px;padding:26px 24px 24px;
  --bg:#0D0E13;--surf:#15161D;--surf2:#1C1D26;--bd:#272834;--fg:#ECEBF2;--fd:#8D8B9C}
.panel.light{--bg:#FBFAF7;--surf:#FFFFFF;--surf2:#F2F1EC;--bd:#E4E2DC;--fg:#17161D;--fd:#757382}
.panel{background:var(--bg);color:var(--fg);border:1px solid var(--bd)}
.ptag{position:absolute;top:14px;right:16px;font:600 10px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--fd)}
.ramp{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.ramp.big{align-items:flex-start}.ramp.big .lbl{padding-top:56px}
.ramp .lbl{width:28px;font:500 11px var(--font);color:var(--fd);text-align:right;flex:none}
.row{display:flex;align-items:center;flex-wrap:wrap}
.mocks{display:grid;gap:12px;margin-top:22px}
.mock{background:var(--surf);border:1px solid var(--bd);border-radius:14px}
.topbar{display:flex;align-items:center;gap:12px;padding:8px 10px 8px 14px}
.logo{display:flex;align-items:center;gap:8px;font-weight:650;font-size:13px}
.logo b{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#8B88FF,#5A55E8);color:#fff;font-size:10px}
.search{flex:1;display:flex;justify-content:space-between;align-items:center;background:var(--surf2);border-radius:9px;padding:6px 10px;color:var(--fd);font-size:12px}
.search kbd{font:500 10px var(--font);border:1px solid var(--bd);border-radius:5px;padding:1px 5px}
.chip{display:flex;align-items:center;gap:8px;padding:3px 10px 3px 3px;border:1px solid var(--bd);border-radius:999px}
.chip span{display:flex;flex-direction:column;line-height:1.15}
.chip b{font-size:12px;font-weight:600}.chip small{font-size:10px;color:var(--fd)}.chip i{font-style:normal;color:var(--fd);font-size:10px}
.board{padding:6px}
.bh{display:flex;justify-content:space-between;padding:6px 10px 8px;font-weight:600;font-size:12px}
.bh span{color:var(--fd);font-weight:500}
.br{display:flex;align-items:center;gap:12px;padding:7px 10px;border-radius:10px}
.br.me{background:color-mix(in oklab,var(--accent) 14%,transparent)}
.rk{width:16px;font:600 12px var(--font);color:var(--fd);text-align:center}
.nm{flex:1;font-weight:550;font-size:13px}.nm em{font-style:normal;font-size:10px;color:var(--accent);margin-left:6px;font-weight:600}
.xp{font:500 12px ui-monospace,Menlo,monospace;color:var(--fd)}
.chat{padding:12px;display:grid;gap:10px}
.msg{display:flex;gap:9px;align-items:flex-end}
.msg small{display:block;font-size:10px;color:var(--fd);margin:0 0 3px 2px}
.msg p{background:var(--surf2);padding:7px 11px;border-radius:14px 14px 14px 4px;font-size:12.5px;max-width:330px}
.msg.mine{justify-content:flex-end}
.msg.mine p{background:var(--accent);color:#fff;border-radius:14px 14px 4px 14px}
footer{margin-top:40px;color:var(--dim);font-size:12px}
@media (max-width:980px){.pair{grid-template-columns:1fr}.glance-row{grid-template-columns:1fr}.gname{padding:14px 20px 0}}
@media (max-width:560px){body{padding:24px 16px}.search{display:none}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>NexoraGuru avatars: three directions</h1>
    <p>Six hand-drawn SVG samples per direction. Each direction is one art style with one light rig and one palette logic; the final set will be about 16 avatars in the chosen style. Every avatar is a full-bleed circle, shown here with the app's 2 px accent ring.</p>
  </div>
  <div class="glance">${glance}</div>
  ${sections}
  <footer>Source: docs/brand/avatars/src/directions.mjs · rebuild with <code>node docs/brand/avatars/src/build-preview.mjs</code></footer>
</div>
<script>
  const d = new URLSearchParams(location.search).get('d');
  if (d) document.querySelectorAll('[data-d]').forEach((el) => { if (el.dataset.d !== d) el.remove() });
  if (d) document.querySelector('.glance')?.remove(), document.querySelector('.top')?.remove();
</script>
</body>
</html>
`
writeFileSync(join(OUT, 'preview.html'), html)
console.log('wrote', join(OUT, 'preview.html'))
