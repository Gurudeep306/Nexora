// Screenshot a page and run axe-core on it, signed in as the demo owner.
//
//   PORT=3300 node scripts/hive-demo.js            (in another terminal)
//   npm i --no-save --prefix /tmp/axe axe-core     (once; or set AXE=path/to/axe.min.js)
//   node client/scripts/check-page.cjs <route> <name> [light,dark,phone] [--full] [--wait=ms] [--noaxe] [--click=sel] [--style=journal]
//
// Prints sideways overflow and every axe violation (with its message) per
// mode; screenshots go to OUT (default /tmp/nexora-shots).
const { chromium, devices } = require('playwright')
const fs = require('fs')
const path = require('path')
const AXE_PATH = process.env.AXE || ['/tmp/axe/node_modules/axe-core/axe.min.js', path.join(__dirname, 'node_modules/axe-core/axe.min.js')].find((p) => fs.existsSync(p))
const AXE = AXE_PATH ? fs.readFileSync(AXE_PATH, 'utf8') : ''
const BASE = process.env.BASE || 'http://localhost:3300'
const args = process.argv.slice(2)
const route = args[0]
const name = args[1]
const modes = (args.find((a) => /^[a-z,]+$/.test(a) && a !== route && a !== name) || 'light,dark,phone').split(',')
const opt = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3)
const flag = (k) => args.includes(`--${k}`)
const OUT = process.env.OUT || '/tmp/nexora-shots'
fs.mkdirSync(OUT, { recursive: true })
;(async () => {
  const browser = await chromium.launch()
  let total = 0
  for (const mode of modes) {
    const phone = mode === 'phone'
    const scheme = mode === 'dark' ? 'dark' : 'light'
    const ctx = await browser.newContext(
      phone ? { ...devices['iPhone 13'], colorScheme: scheme, deviceScaleFactor: 1 } : { viewport: { width: 1440, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 },
    )
    await ctx.request.post(`${BASE}/api/user/login`, { data: { username: 'owner', password: 'owner123' } })
    await ctx.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { settings: {} } }) : r.fulfill({ json: { ok: true } })))
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
    await page.goto(`${BASE}/hub`)
    await page.evaluate(([s, m]) => {
      localStorage.setItem('nexora:look', JSON.stringify({ v: 4, style: s }))
      localStorage.setItem('nexora:appearance', m)
    }, [opt('style') || 'journal', scheme])
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(Number(opt('wait') || 1500))
    if (opt('click')) {
      await page.click(opt('click')).catch((e) => errors.push('click ' + e.message.split('\n')[0]))
      await page.waitForTimeout(900)
    }
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    const file = path.join(OUT, `${name}-${mode}.png`)
    await page.screenshot({ path: file, fullPage: flag('full') })
    let v = []
    if (!flag('noaxe') && !AXE) console.log('   (axe-core not found: see the header of this file)')
    if (!flag('noaxe') && AXE) {
      await page.addScriptTag({ content: AXE })
      v = await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ['violations'] })
        return r.violations.map((x) => ({ id: x.id, n: x.nodes.length, t: x.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + ((n.any[0]||{}).message||"").slice(0,140)).join(" | ") }))
      })
    }
    total += v.length
    console.log(`${name} ${mode}: overflowX=${sw} axe=${v.length}${errors.length ? ' errors=' + JSON.stringify(errors) : ''}`)
    for (const x of v) console.log(`   - ${x.id} (${x.n}): ${x.t}`)
    await ctx.close()
  }
  await browser.close()
  process.exit(0)
})()
