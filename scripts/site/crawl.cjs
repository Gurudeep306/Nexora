/*
  Site crawl: opens every page reachable by links from the main sections
  (every subject, notes lesson, DSA lesson, GATE page …) in a real browser and
  reports, per page: page errors, console errors, failed API calls, "page not
  found", axe violations and sideways scroll. Then one page of each kind
  (route pattern) again in dark and at 360 px.

    node scripts/site/crawl.cjs [--base http://localhost:3100] [--max 900] [--out <dir>]

  Run against a local server (see AGENTS.md) signed in as the owner:
  CRAWL_USER / CRAWL_PASS (default vowner / secret123). Read-only: it only
  follows links, never presses buttons.
*/
const path = require('path')
const fs = require('fs')
const CLIENT = path.join(__dirname, '..', '..', 'client')
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), CLIENT] }))
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [CLIENT] }), 'utf8')

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : d
}
const BASE = arg('base', 'http://localhost:3100')
const MAX = Number(arg('max', 900))
const OUT = arg('out', require('os').tmpdir())
const START = ['/hub', '/learn', '/gate', '/gate/notes', '/gate/practice', '/gate/tests', '/gate/review', '/gate/daily', '/gate/syllabus', '/gate/planner', '/gate/notebook',
  '/gate/leaderboard', '/gate/analytics', '/gate/cbt', '/nexus', '/problems', '/problems/sets', '/contests', '/workshop', '/analytics', '/achievements', '/social', '/explore',
  '/live', '/submissions', '/bookmarks', '/profile', '/settings', '/theme', '/learn/dsa', '/learn/ai-courses', '/learn/system-design', '/admin', '/welcome']
// Never follow: sign-out, the staff workspace (its own checks), raw files, device pages that need a token.
const SKIP = /^\/(hive|auth|logout|api|uploads|pad|snap|explain\/pad|live\/d)\b|\.(pdf|png|jpe?g|svg|zip|json)$/i

/** /learn/dsa/arrays/2 → /learn/dsa/:x/:x (one page per kind for the dark/phone pass). */
const pattern = (p) => p.replace(/\/\d+(?=\/|$)/g, '/:n').split('/').map((s, i) => (i > 2 && s && !s.startsWith(':') ? ':x' : s)).join('/')

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  async function ctxFor(scheme, width) {
    const ctx = await b.newContext({ viewport: { width, height: width < 500 ? 780 : 900 }, colorScheme: scheme, reducedMotion: 'reduce' })
    await ctx.addInitScript((m) => localStorage.setItem('nexora:appearance', m), scheme)
    await ctx.request.post(`${BASE}/api/user/login`, { data: { username: process.env.CRAWL_USER || 'vowner', password: process.env.CRAWL_PASS || 'secret123' } })
    return ctx
  }

  async function check(ctx, url, { links = false, axe = true } = {}) {
    const p = await ctx.newPage()
    const r = { url, errors: [], api: [], axe: [], sideways: 0, notFound: false, links: [] }
    p.on('pageerror', (e) => r.errors.push(String(e.message || e).slice(0, 200)))
    p.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR_|ResizeObserver/.test(m.text())) r.errors.push('console: ' + m.text().slice(0, 200))
    })
    p.on('response', (res) => {
      const u = res.url()
      if (u.startsWith(BASE + '/api/') && res.status() >= 400 && ![401, 403].includes(res.status())) r.api.push(`${res.status()} ${u.replace(BASE, '')}`)
    })
    try {
      await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch (e) {
      r.errors.push('load: ' + e.message.split('\n')[0])
    }
    await p.waitForTimeout(600)
    r.notFound = await p.evaluate(() => /page not found|this page doesn.t exist|404/i.test(document.querySelector('main, [role=main], body')?.innerText?.slice(0, 600) || '')).catch(() => false)
    r.sideways = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0)
    if (axe) {
      await p.addScriptTag({ content: AXE }).catch(() => {})
      r.axe = await p
        .evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`))
        .catch((e) => [`axe failed: ${e.message.slice(0, 80)}`])
    }
    if (links) {
      r.links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))).catch(() => [])
    }
    await p.close()
    return r
  }

  const results = []
  const seen = new Set()
  const queue = [...START]
  const ctx = await ctxFor('light', 1280)
  while (queue.length && seen.size < MAX) {
    const url = queue.shift()
    if (seen.has(url)) continue
    seen.add(url)
    const r = await check(ctx, url, { links: true })
    results.push(r)
    for (const href of r.links) {
      if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) continue
      const u = new URL(href, BASE + url)
      if (u.origin !== new URL(BASE).origin) continue
      const p = u.pathname.replace(/\/+$/, '') || '/'
      if (!SKIP.test(p) && !seen.has(p) && !queue.includes(p)) queue.push(p)
    }
    const bad = r.errors.length + r.api.length + r.axe.length + (r.notFound ? 1 : 0) + (r.sideways > 0 ? 1 : 0)
    process.stdout.write(`${bad ? 'BAD ' : 'ok  '} ${seen.size}/${seen.size + queue.length} ${url}${bad ? '  ' + JSON.stringify({ e: r.errors.slice(0, 2), api: r.api.slice(0, 2), axe: r.axe.slice(0, 2), nf: r.notFound || undefined, sw: r.sideways || undefined }) : ''}\n`)
  }
  await ctx.close()

  // One page of each kind again: dark at 1280, light and dark at 360.
  const kinds = new Map()
  for (const r of results) if (!kinds.has(pattern(r.url))) kinds.set(pattern(r.url), r.url)
  const extra = []
  for (const [scheme, width] of [['dark', 1280], ['light', 360], ['dark', 360]]) {
    const c = await ctxFor(scheme, width)
    for (const url of kinds.values()) {
      const r = await check(c, url)
      r.mode = `${scheme} ${width}`
      extra.push(r)
      const bad = r.errors.length + r.api.length + r.axe.length + (r.sideways > 0 ? 1 : 0)
      if (bad) process.stdout.write(`BAD  [${r.mode}] ${url}  ${JSON.stringify({ e: r.errors.slice(0, 2), api: r.api.slice(0, 2), axe: r.axe.slice(0, 2), sw: r.sideways || undefined })}\n`)
    }
    await c.close()
  }
  await b.close()

  const all = [...results.map((r) => ({ ...r, mode: 'light 1280', links: undefined })), ...extra]
  const bad = all.filter((r) => r.errors.length || r.api.length || r.axe.length || r.notFound || r.sideways > 0)
  fs.writeFileSync(path.join(OUT, 'crawl-report.json'), JSON.stringify({ pages: results.length, kinds: kinds.size, checks: all.length, bad }, null, 1))
  console.log(`\n${results.length} pages crawled, ${kinds.size} kinds, ${all.length} page checks; ${bad.length} with problems. Report: ${path.join(OUT, 'crawl-report.json')}`)
})()
