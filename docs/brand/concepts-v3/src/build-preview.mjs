#!/usr/bin/env node
/**
 * Builds docs/brand/concepts-v3/preview.html — a single self-contained page
 * that shows the four interactive NG concepts. The engine is the same module
 * the React component lazy-loads (client/src/components/brand/concepts/engine.ts),
 * bundled to an inline IIFE with rolldown (already a client devDependency via Vite).
 *
 *   node docs/brand/concepts-v3/src/build-preview.mjs  (archived round-3 concepts; Traversal shipped)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..', '..')
const OUT = join(HERE, '..')
const { rolldown } = createRequire(join(ROOT, 'client', 'package.json'))('rolldown')
const { NG_CONCEPTS } = await import(join(HERE, 'engine.ts'))

const bundle = await rolldown({ input: join(HERE, 'entry.ts'), logLevel: 'warn' })
const { output } = await bundle.generate({ format: 'iife', minify: true })
const js = output[0].code.replace(/<\/script/gi, '<\\/script')

const HINTS = {
  traversal: ['Hover: send a signal', 'Click: re-run the search', 'Idle: a quiet pulse'],
  build: ['Hover: ripple the cells', 'Click: pop and rebuild', 'Idle: an index scan'],
  caret: ['Hover: select the text', 'Click: retype', 'Idle: the caret blinks'],
  depth: ['Hover: tilt and catch the light', 'Click: spin', 'Idle: a slow float'],
}

const wordmark = `<span class="wm">Nexora<b>Guru</b></span>`
const bar = (id, tone) => `
  <div class="bar ${tone}">
    <span data-ng="${id}" data-size="28" data-animate="true"></span>${wordmark}
    <span class="crumb">Play <i>›</i> Home</span><span class="search">Search problems…</span>
  </div>`
const sizes = (id, tone) => `
  <div class="sizes ${tone}">
    ${[16, 32, 64].map((s) => `<figure><span data-ng="${id}" data-size="${s}" data-animate="false"></span><figcaption>${s}</figcaption></figure>`).join('')}
  </div>`

const cards = NG_CONCEPTS.map((c, i) => `
  <article class="card">
    <div class="stage"><span data-ng="${c.id}" data-size="232"></span></div>
    <div class="body">
      <div class="title"><span class="idx">0${i + 1}</span><h2>${c.name}</h2></div>
      <p>${c.story}</p>
      <ul class="hints">${HINTS[c.id].map((h) => `<li>${h}</li>`).join('')}</ul>
      <div class="label">Static, 16 · 32 · 64 px</div>
      <div class="pair">${sizes(c.id, 'on-dark')}${sizes(c.id, 'on-light')}</div>
      <div class="label">Header lockup</div>
      ${bar(c.id, 'on-dark')}${bar(c.id, 'on-light')}
    </div>
  </article>`).join('')

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NexoraGuru logo concepts</title>
<meta name="description" content="Four interactive NG logo concepts for NexoraGuru, built from CS ideas.">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/geist@5.2.8/index.css">
<style>
:root{--bg:#08090d;--panel:#0f1117;--panel-2:#131620;--line:#1d2130;--text:#ececf2;--muted:#8a8fa6;
  --color-text-primary:#ececf2;--color-accent-brand:#4f7cff;color-scheme:dark}
:root[data-theme="light"]{--bg:#f5f6fa;--panel:#ffffff;--panel-2:#f9fafc;--line:#e2e5ee;--text:#11131a;--muted:#5d6377;
  --color-text-primary:#11131a;--color-accent-brand:#2f5bea;color-scheme:light}
.on-dark{--color-text-primary:#ececf2;--color-accent-brand:#4f7cff;--tone-bg:#0c0d12;--tone-line:#1f2230;--tone-text:#ececf2;--tone-muted:#7d8297}
.on-light{--color-text-primary:#11131a;--color-accent-brand:#2f5bea;--tone-bg:#ffffff;--tone-line:#e2e5ee;--tone-text:#11131a;--tone-muted:#6a6f82}
*{box-sizing:border-box}
html,body{margin:0}
body{font-family:'Geist Variable',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);
  -webkit-font-smoothing:antialiased;min-height:100vh;
  background-image:radial-gradient(900px 480px at 12% -8%,color-mix(in oklab,#4f7cff 16%,transparent),transparent 70%),
    radial-gradient(700px 420px at 92% 0%,color-mix(in oklab,#8b5cf6 14%,transparent),transparent 70%),
    radial-gradient(800px 500px at 60% 110%,color-mix(in oklab,#2dd4bf 9%,transparent),transparent 70%);
  background-attachment:fixed}
.wrap{max-width:1240px;margin:0 auto;padding:40px 24px 72px}
header{display:flex;flex-wrap:wrap;align-items:flex-end;gap:20px;justify-content:space-between;margin-bottom:28px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:500}
h1{margin:8px 0 6px;font-size:clamp(28px,4vw,40px);font-weight:600;letter-spacing:-.03em;line-height:1.05}
h1 .wm b{font-weight:600}
.lede{margin:0;color:var(--muted);max-width:620px;line-height:1.55;font-size:15px}
.controls{display:flex;gap:10px;align-items:center}
.seg{display:inline-flex;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
.seg button,.btn{font:inherit;font-size:13px;font-weight:500;color:var(--text);background:transparent;border:0;border-radius:7px;padding:7px 12px;cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--panel-2);box-shadow:0 0 0 1px var(--line) inset}
.btn{border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:8px 14px}
.btn:hover,.seg button:hover{color:var(--color-accent-brand)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
@media (max-width:900px){.grid{grid-template-columns:1fr}}
.card{border:1px solid var(--line);border-radius:18px;background:color-mix(in oklab,var(--panel) 88%,transparent);overflow:hidden;
  backdrop-filter:blur(8px)}
.stage{position:relative;height:300px;display:grid;place-items:center;border-bottom:1px solid var(--line);
  background-image:radial-gradient(circle at 50% 45%,color-mix(in oklab,var(--color-accent-brand) 10%,transparent),transparent 60%),
    radial-gradient(color-mix(in oklab,var(--text) 10%,transparent) 1px,transparent 1.2px);background-size:auto,18px 18px}
.body{padding:20px 22px 22px}
.title{display:flex;align-items:baseline;gap:10px}
.idx{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:12px;color:var(--muted)}
h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em}
.body p{margin:8px 0 12px;color:var(--muted);line-height:1.55;font-size:14px}
.hints{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.hints li{font-size:12px;padding:4px 9px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:14px 0 8px;font-weight:500}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sizes{display:flex;align-items:flex-end;gap:18px;padding:14px 16px;border-radius:12px;background:var(--tone-bg);border:1px solid var(--tone-line)}
.sizes figure{margin:0;display:grid;justify-items:center;gap:6px}
.sizes figcaption{font-size:11px;color:var(--tone-muted);font-variant-numeric:tabular-nums}
.bar{display:flex;align-items:center;gap:10px;height:54px;padding:0 16px;border-radius:12px;margin-top:8px;
  background:var(--tone-bg);border:1px solid var(--tone-line);color:var(--tone-text)}
.wm{font-size:17px;font-weight:400;letter-spacing:-.025em;white-space:nowrap}
.wm b{font-weight:560;background:linear-gradient(100deg,var(--color-accent-brand),#8b5cf6 55%,#2dd4bf);-webkit-background-clip:text;background-clip:text;color:transparent}
h1 .wm{font-size:inherit}
.crumb{margin-left:14px;font-size:13px;color:var(--tone-muted)}
.crumb i{font-style:normal;margin:0 4px}
.search{margin-left:auto;font-size:12.5px;color:var(--tone-muted);border:1px solid var(--tone-line);border-radius:8px;padding:6px 12px;min-width:150px}
@media (max-width:560px){.crumb,.search{display:none}.pair{grid-template-columns:1fr}}
footer{margin-top:28px;color:var(--muted);font-size:13px;line-height:1.6}
code{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:12px;padding:1px 5px;border-radius:5px;background:var(--panel-2);border:1px solid var(--line)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <div class="eyebrow">Identity · round 3</div>
      <h1><span class="wm">Nexora<b>Guru</b></span> logo concepts</h1>
      <p class="lede">Four NG monograms, each built from a computer-science idea so the mark tells the product’s story: <em>learn computer science by watching it run</em>. Every mark is live, so hover, move and click to try it. Below each one are its static small sizes and the header lockup on dark and light.</p>
    </div>
    <div class="controls">
      <div class="seg" role="group" aria-label="Page theme">
        <button type="button" data-set-theme="dark" aria-pressed="true">Dark</button>
        <button type="button" data-set-theme="light" aria-pressed="false">Light</button>
      </div>
      <button type="button" class="btn" id="replay-all">Replay all</button>
    </div>
  </header>
  <main class="grid">${cards}</main>
  <footer>
    With <code>prefers-reduced-motion</code> on, every mark renders its static form. Colours come from theme tokens (<code>--color-accent-brand</code>, <code>--color-text-primary</code>), so in the app the marks follow the active palette. Archived: Traversal was chosen and ships as <code>client/src/components/brand/Logo.tsx</code>; this page is kept for reference.
  </footer>
</div>
<script>${js}</script>
</body>
</html>
`

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'preview.html'), html)
console.log('wrote docs/brand/concepts-v3/preview.html', `(${(html.length / 1024).toFixed(1)} KB, engine ${(js.length / 1024).toFixed(1)} KB)`)
