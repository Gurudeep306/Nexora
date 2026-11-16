// Open the Solve page, run the visual dry run on a program, screenshot it and
// run axe — the way every dry-run change in docs/HANDOFF.md was checked.
//
//   PORT=3300 node scripts/hive-demo.js             (in another terminal; see HANDOFF for the proxy)
//   npm i --no-save --prefix /tmp/axe axe-core      (once; or set AXE=path/to/axe.min.js)
//   node client/scripts/check-dryrun.cjs <name> <lang> <code-file> [light|dark|phone] [theme]
//
// Env: STEP=<n>|mid  move the scrubber to that step first
//      FOCUS=1       open the player in full screen before the screenshot
//      WAIT=<ms>     time for the run to finish (default 12000; TypeScript on Wandbox needs ~40000)
//      BASE=<url>    server (default http://localhost:3300)
//      OUT=<dir>     screenshots (default /tmp/nexora-shots)
// It signs in as the demo owner and makes the test problem "Sort the numbers"
// (input "5\n5 1 4 2 8") if it is missing; the code is read from the file.
const { chromium, devices } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.BASE || 'http://localhost:3300'
const OUT = process.env.OUT || '/tmp/nexora-shots'
const AXE_PATH = process.env.AXE || ['/tmp/axe/node_modules/axe-core/axe.min.js', path.join(__dirname, 'node_modules/axe-core/axe.min.js')].find((p) => fs.existsSync(p))
const [name, lang, file, mode = 'light', style = 'journal'] = process.argv.slice(2)
if (!name || !lang || !file) {
  console.error('usage: check-dryrun.cjs <name> <lang> <code-file> [light|dark|phone] [theme]')
  process.exit(2)
}
const code = fs.readFileSync(file, 'utf8')

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch()
  const ctx = await b.newContext(mode === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 }, colorScheme: mode })
  await ctx.request.post(`${BASE}/api/user/login`, { data: { username: 'owner', password: 'owner123' } })
  // The test problem (id 1) — the demo database starts empty.
  const has = await ctx.request.get(`${BASE}/api/custom-problems/1`).then((r) => r.json()).catch(() => ({}))
  if (!has.ok) {
    const sample = { input: '5\n5 1 4 2 8\n', output: '1 2 4 5 8' }
    await ctx.request.post(`${BASE}/api/custom-problems`, { data: { title: 'Sort the numbers', statement: 'Read n, then n integers. Print them sorted ascending, space separated.', samples: [sample], testcases: [sample], difficulty: 1000 } })
  }
  await ctx.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { settings: {} } }) : r.fulfill({ json: { ok: true } })))
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  await p.goto(`${BASE}/hub`)
  await p.evaluate(([l, c, m, s]) => {
    localStorage.setItem('nexora:code:custom-1:' + l, c)
    localStorage.setItem('nexora:lang', l)
    localStorage.setItem('nexora:look', JSON.stringify({ v: 6, style: s }))
    localStorage.setItem('nexora:appearance', m === 'dark' ? 'dark' : 'light')
  }, [lang, code, mode, style])
  await p.goto(`${BASE}/solve/custom/1`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(3000)
  await p.locator('button:has-text("Dry run")').first().click().catch((e) => errs.push('click ' + e.message.split('\n')[0]))
  await p.waitForTimeout(+(process.env.WAIT || 12000))
  if (process.env.STEP) {
    await p
      .locator('input[aria-label="Step"]')
      .first()
      .evaluate((el, v) => {
        if (v === 'mid') v = String(Math.floor(Number(el.max) * 0.6))
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }, process.env.STEP)
      .catch((e) => errs.push('step ' + e.message.split('\n')[0]))
    await p.waitForTimeout(1200)
  }
  if (process.env.FOCUS) {
    await p.locator('button[aria-label="Full screen"]').first().click().catch((e) => errs.push('focus ' + e.message.split('\n')[0]))
    await p.waitForTimeout(900)
  }
  const shot = path.join(OUT, `dry-${name}-${mode}${process.env.STEP ? '-s' + process.env.STEP : ''}${process.env.FOCUS ? '-f' : ''}.png`)
  await p.screenshot({ path: shot, fullPage: mode === 'phone' })
  let v = ['(axe not installed: npm i --no-save --prefix /tmp/axe axe-core)']
  if (AXE_PATH) {
    await p.addScriptTag({ content: fs.readFileSync(AXE_PATH, 'utf8') })
    v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((x) => `${x.id}(${x.nodes.length}) ${x.nodes[0].target.join(' ')} :: ${((x.nodes[0].any[0] || {}).message || '').slice(0, 130)}`))
  }
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log(name, mode, 'overflow', sw, 'axe', v.length, errs.length ? errs : '', shot)
  v.forEach((x) => console.log('  ', x))
  await b.close()
})()
