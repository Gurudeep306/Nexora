/*
  The Dock still works: it magnifies under the cursor, auto-hides and comes
  back at the bottom edge, and opens More. Run against the demo server:

    PORT=3300 node scripts/hive-demo.js        (in the repo root)
    node client/scripts/check-dock.cjs [base-url]

  Checks every style named in STYLES (default: journal and studio), so a skin
  change in one style can't break the Dock in another. Exits 1 on a failure.
*/
const { chromium } = require('playwright')

const BASE = process.argv[2] || 'http://localhost:3300'
const STYLES = (process.env.STYLES || 'journal,studio').split(',')
const ROUTE = '/hub'

async function check(browser, style) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const login = await ctx.request.post(`${BASE}/api/user/login`, { data: { username: 'owner', password: 'owner123' } })
  if (!login.ok()) throw new Error(`login failed: ${login.status()}`)
  // Keep the account's saved look and Dock out of it: the check sets its own
  // on this device (saving is answered locally, so the account is untouched).
  await ctx.route('**/api/settings', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { settings: {} } }) : r.fulfill({ json: { ok: true } }),
  )
  const page = await ctx.newPage()
  const fails = []
  const ok = (cond, what) => {
    console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${what}`)
    if (!cond) fails.push(what)
  }

  // Pick the style the way the Appearance page does (the saved look).
  await page.goto(`${BASE}${ROUTE}`)
  await page.evaluate((s) => {
    const look = JSON.parse(localStorage.getItem('nexora:look') || '{}')
    localStorage.setItem('nexora:look', JSON.stringify({ ...look, v: 4, style: s }))
    localStorage.setItem('nexora:dock', JSON.stringify({ ...JSON.parse(localStorage.getItem('nexora:dock') || '{}'), autoHide: false }))
  }, style)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  console.log(`${style} (data-style=${await page.evaluate(() => document.documentElement.dataset.style)})`)

  // 1. Magnification.
  const glass = page.locator('.dock-glass').first()
  const box = await glass.boundingBox()
  ok(!!box, 'the Dock is on the page')
  if (!box) return fails
  const tile = page.locator('.dock-tile').first()
  const before = (await tile.boundingBox()).width
  await page.mouse.move(box.x + 36, box.y + box.height / 2)
  await page.waitForTimeout(500)
  const after = (await tile.boundingBox()).width
  ok(after > before + 4, `magnifies under the cursor (${before.toFixed(0)}px → ${after.toFixed(0)}px)`)

  // 2. More.
  await page.getByRole('button', { name: 'More destinations' }).click()
  await page.waitForTimeout(300)
  ok(await page.locator('.dock-more').isVisible(), 'opens More')
  await page.mouse.click(box.x + 4, box.y + 4) // a click beside the menu closes it
  await page.waitForTimeout(300)
  ok(!(await page.locator('.dock-more').isVisible()), 'closes on a click outside')

  // 3. Auto-hide: away from the edge it slips away; at the edge it returns.
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nexora:dock') || '{}')
    localStorage.setItem('nexora:dock', JSON.stringify({ ...d, autoHide: true }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.mouse.move(700, 300)
  await page.mouse.move(720, 320)
  await page.waitForTimeout(1600)
  const shown = () =>
    page.evaluate(() => {
      const el = document.querySelector('nav[aria-label="Dock"]')
      return !!el && el.getAttribute('aria-hidden') !== 'true' && Number(getComputedStyle(el).opacity) > 0.5
    })
  ok(!(await shown()), 'hides when the cursor is away')
  await page.mouse.move(720, 897)
  await page.waitForTimeout(800)
  ok(await shown(), 'comes back at the bottom edge')

  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nexora:dock') || '{}')
    localStorage.setItem('nexora:dock', JSON.stringify({ ...d, autoHide: false }))
  })
  await ctx.close()
  return fails
}

;(async () => {
  const browser = await chromium.launch()
  let fails = []
  for (const s of STYLES) fails = fails.concat(await check(browser, s))
  await browser.close()
  console.log(fails.length ? `\n${fails.length} failed` : '\nThe Dock works in every style checked.')
  process.exit(fails.length ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
