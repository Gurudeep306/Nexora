#!/usr/bin/env node
// Collects every book, course, site and code repo in docs/ai-courses/sources/library.json
// into the private library, so no future session has to hunt for material again.
//
//   NODE_USE_ENV_PROXY=1 node scripts/ai-courses/ingest.mjs           everything (skips what is already there)
//   NODE_USE_ENV_PROXY=1 node scripts/ai-courses/ingest.mjs d2l nanogpt   only these ids
//   ... --refresh                                                       fetch again (git pull, re-download)
//
// Where things go (git-ignored, never committed or published):
//   docs/ai-courses/private/library/{books,courses,sites,repos}/<id>/
// What is recorded (committed, no content): docs/ai-courses/sources/INGEST.md
//
// Manners: one request per second per host, robots.txt respected for crawls,
// a generic user agent, page limits per site. Material is for our own reading;
// lessons are written in our own words (docs/ai-courses/AGENT_RULES.md, part D).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '../../docs/ai-courses')
const LIB = join(DOCS, 'private/library')
const items = JSON.parse(readFileSync(join(DOCS, 'sources/library.json'), 'utf8')).items
const args = process.argv.slice(2)
const refresh = args.includes('--refresh')
const only = new Set(args.filter((a) => !a.startsWith('--')))
const UA = 'NexoraGuru-course-library/1.0'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const folder = (it) => join(LIB, `${it.kind === 'repo' ? 'repos' : it.kind === 'book' ? 'books' : it.kind === 'site' ? 'sites' : 'courses'}`, it.id)

const lastHit = new Map()
async function get(url, { binary = false } = {}) {
  const host = new URL(url).host
  const wait = 1000 - (Date.now() - (lastHit.get(host) || 0))
  if (wait > 0) await sleep(wait)
  lastHit.set(host, Date.now())
  const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(120000) })
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return { url: r.url, type: r.headers.get('content-type') || '', body: binary ? Buffer.from(await r.arrayBuffer()) : await r.text() }
}

const robots = new Map()
async function allowed(url) {
  const u = new URL(url)
  if (!robots.has(u.origin)) {
    let rules = []
    try {
      const t = (await get(`${u.origin}/robots.txt`)).body
      let applies = false
      for (const line of t.split('\n')) {
        const [k, ...v] = line.split(':')
        const key = k.trim().toLowerCase()
        const val = v.join(':').trim()
        if (key === 'user-agent') applies = val === '*'
        else if (applies && key === 'disallow' && val) rules.push(val)
      }
    } catch {}
    robots.set(u.origin, rules)
  }
  return !robots.get(u.origin).some((d) => u.pathname.startsWith(d))
}

const links = (html, base) =>
  [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)]
    .map((m) => {
      try {
        return new URL(m[1], base).href
      } catch {
        return null
      }
    })
    .filter(Boolean)
const safeName = (url) => new URL(url).pathname.replace(/^\/+/, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 150) || 'index'

async function savePdf(url, dir) {
  const r = await get(url, { binary: true })
  if (r.body.subarray(0, 5).toString() !== '%PDF-') throw new Error(`not a PDF: ${url}`)
  // Readable names: a storage-service name (long, or a release asset) becomes <item-id>[-n].pdf.
  let name = safeName(r.url).split('_').pop().replace(/(\.pdf)?$/i, '.pdf')
  if (name.length > 60 || /release-asset|^[0-9a-f-]{20,}/i.test(safeName(r.url))) {
    const id = dirname(join(dir, 'x')).split('/').pop()
    const n = readdirSync(dir).length
    name = `${id}${n ? `-${n + 1}` : ''}.pdf`
  }
  writeFileSync(join(dir, name), r.body)
  return 1
}

async function ingest(it) {
  const dir = folder(it)
  const f = it.fetch
  if (f.git) {
    if (existsSync(join(dir, '.git'))) {
      if (refresh) execFileSync('git', ['-C', dir, 'pull', '-q', '--depth', '1'], { stdio: 'pipe', timeout: 600000 })
    } else {
      mkdirSync(dirname(dir), { recursive: true })
      execFileSync('git', ['clone', '-q', '--depth', '1', f.git, dir], { stdio: 'pipe', timeout: 900000 })
    }
    return
  }
  if (existsSync(dir) && readdirSync(dir).length && !refresh) return
  mkdirSync(dir, { recursive: true })
  if (f.pdf) for (const u of f.pdf) await savePdf(u, dir)
  if (f.discover) {
    const page = await get(f.discover.page)
    const re = new RegExp(f.discover.match, 'i')
    const found = [...new Set(links(page.body, page.url).filter((u) => re.test(u)))].slice(0, f.discover.max || 10)
    if (!found.length) throw new Error(`no link matching /${f.discover.match}/ on ${f.discover.page}`)
    let ok = 0
    for (const u of found) {
      try {
        ok += await savePdf(u, dir)
      } catch {}
    }
    if (!ok) throw new Error(`found ${found.length} links but none was a PDF (the site may need a browser)`)
  }
  if (f.crawl) {
    const seen = new Set()
    const queue = [f.crawl.start]
    let saved = 0
    while (queue.length && saved < (f.crawl.max || 30)) {
      const u = queue.shift().split('#')[0]
      if (seen.has(u)) continue
      seen.add(u)
      if (!(await allowed(u))) continue
      let r
      try {
        r = await get(u)
      } catch {
        continue
      }
      if (!/html/i.test(r.type)) continue
      if (u.startsWith(f.crawl.allow) || u === f.crawl.start) {
        writeFileSync(join(dir, safeName(r.url).replace(/(\.html?)?$/i, '.html')), r.body)
        saved++
      }
      for (const l of links(r.body, r.url)) if (l.startsWith(f.crawl.allow) && !seen.has(l) && !/\.(png|jpe?g|gif|svg|css|js|zip|mp4|ico|woff2?)$/i.test(l)) queue.push(l)
    }
    if (!saved) throw new Error('no pages saved (blocked by robots.txt or the network)')
  }
}

const du = (d) => {
  if (!existsSync(d)) return [0, 0]
  let files = 0
  let bytes = 0
  const walk = (x) => {
    for (const n of readdirSync(x)) {
      if (n === '.git') continue
      const p = join(x, n)
      const s = statSync(p)
      if (s.isDirectory()) walk(p)
      else {
        files++
        bytes += s.size
      }
    }
  }
  walk(d)
  return [files, bytes]
}

const status = []
for (const it of items) {
  if (only.size && !only.has(it.id)) continue
  process.stdout.write(`${it.kind} ${it.id} … `)
  try {
    await ingest(it)
    const [files, bytes] = du(folder(it))
    status.push({ it, ok: true, files, bytes })
    console.log(`ok (${files} files, ${(bytes / 1e6).toFixed(1)} MB)`)
  } catch (e) {
    status.push({ it, ok: false, why: String(e.message || e).split('\n')[0].slice(0, 160) })
    console.log(`FAILED: ${status.at(-1).why}`)
  }
}

// INGEST.md: what the library holds (all items, not only this run).
const rows = items.map((it) => {
  const s = status.find((x) => x.it.id === it.id)
  const [files, bytes] = du(folder(it))
  return { it, have: files > 0, files, bytes, why: s && !s.ok ? s.why : '' }
})
const have = rows.filter((r) => r.have)
const L = [
  '# Library: books, courses, sites and code',
  '',
  `Generated by \`ingest.mjs\` on ${new Date().toISOString().slice(0, 10)}. The material lives in \`docs/ai-courses/private/library/\` (git-ignored). **${have.length} of ${items.length} collected, ${(have.reduce((a, r) => a + r.bytes, 0) / 1e9).toFixed(2)} GB.** Papers are listed in LIBRARY.md.`,
  '',
  'Not collected = this machine could not reach the site, the site refuses automated access, or it needs a browser. Open those by hand, or download them on your computer and put them in `private/library/<kind>/<id>/`.',
  '',
  '| Kind | Id | Title | Have | Files | Size | Licence | Note |',
  '|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.it.kind} | ${r.it.id} | ${r.it.title} | ${r.have ? 'yes' : '**no**'} | ${r.files || ''} | ${r.have ? (r.bytes / 1e6).toFixed(1) + ' MB' : ''} | ${r.it.licence} | ${r.why} |`),
]
writeFileSync(join(DOCS, 'sources/INGEST.md'), L.join('\n') + '\n')
console.log(`\nLibrary: ${have.length} of ${items.length} collected. Wrote sources/INGEST.md. Next: node scripts/ai-courses/search.mjs --build`)
