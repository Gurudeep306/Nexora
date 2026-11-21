#!/usr/bin/env node
/*
  Voice-ready names (WCAG 2.5.3 "Label in Name"): every button and link's
  accessible name must contain its visible text, so a student can say what
  they see ("click Start") with any voice tool, and so our own voice control
  can find it. Also flags controls with no name at all.

  Usage (a local server must be running, signed-in test user):
    node client/scripts/check-names.cjs [baseUrl] [username] [password]
  Exits 1 if any page has an issue.
*/
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.argv[2] || 'http://localhost:3100'
const USER = process.argv[3] || 'auditor'
const PASS = process.argv[4] || 'audit-pass-123'
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [path.join(__dirname, '..')] }), 'utf8')
const ROUTES = ['/', '/hub', '/problems', '/contests', '/workshop', '/nexus', '/analytics', '/achievements', '/learn', '/learn/dm', '/learn/dsa', '/social', '/submissions', '/bookmarks', '/profile', '/theme', '/settings', '/gate', '/gate/notes', '/gate/notes/dm', '/gate/practice', '/gate/review', '/gate/daily', '/gate/tests', '/live', '/messages']
const RULES = ['label-content-name-mismatch', 'button-name', 'link-name']

;(async () => {
  const browser = await chromium.launch()
  const issues = new Map()
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport })
    await ctx.request.post(`${BASE}/api/user/login`, { data: { username: USER, password: PASS } })
    const page = await ctx.newPage()
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {})
      await page.waitForTimeout(800)
      await page.addScriptTag({ content: AXE })
      const found = await page.evaluate(async (rules) => {
        const r = await window.axe.run(document, { runOnly: { type: 'rule', values: rules } })
        return r.violations.flatMap((v) => v.nodes.map((n) => `${v.id} :: ${n.target.join(' ')} :: ${n.html.slice(0, 140)}`))
      }, RULES)
      for (const f of found) issues.set(f, [...(issues.get(f) ?? []), `${viewport.width}px ${route}`])
    }
    await ctx.close()
  }
  await browser.close()
  if (!issues.size) {
    console.log(`Voice-ready names: 0 issues on ${ROUTES.length} pages (desktop and phone).`)
    return
  }
  for (const [k, where] of issues) console.log(`${k}\n   on ${where.slice(0, 3).join(', ')}`)
  console.log(`\n${issues.size} issue(s).`)
  process.exit(1)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
