/*
  Real-browser checks of the Teacher studio (/teacher, docs/voice/VIRTUAL_TEACHER.md §3.2.10) and the teacher's
  "More" menu: she stands in the studio's preview box, the settings change her (framing, captions, speed, name),
  the Settings card opens the studio, the menu works with the keyboard; axe 0 in light, dark and at 360 px,
  no sideways scroll, no page errors.
  Same server as sweep.cjs (steps 1–3 there), then: node scripts/voice/sweep/teacher-studio.cjs <screenshot dir>
*/
const path = require('path')
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), path.join(__dirname, '..', '..', '..', 'client')] }))
const AXE = require('fs').readFileSync(require.resolve('axe-core/axe.min.js', { paths: [path.join(__dirname, '..', '..', '..', 'client')] }), 'utf8')
const BASE = process.env.BASE || 'http://localhost:3100'
const S = process.argv[2] || require('os').tmpdir()
const results = []
const ok = (n, pass, d = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`) }
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  async function open(scheme, width, url, voice) {
    const ctx = await b.newContext({ viewport: { width, height: width < 500 ? 780 : 900 }, colorScheme: scheme })
    await ctx.addInitScript(({ scheme, voice }) => {
      localStorage.setItem('nexora:appearance', scheme)
      if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', '1'); localStorage.setItem('nexora:voice', JSON.stringify(voice)) }
    }, { scheme, voice })
    await ctx.request.post(`${BASE}/api/user/login`, { data: { username: 'vowner', password: 'secret123' } })
    // Keep the account's saved prefs out of it: each run starts from the prefs above.
    await ctx.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { settings: {} } }) : r.fulfill({ json: { ok: true } })))
    const p = await ctx.newPage()
    p.__errs = []
    p.on('pageerror', (e) => p.__errs.push(String(e).slice(0, 200)))
    p.on('console', (m) => m.type() === 'error' && /React error|page error/.test(m.text()) && p.__errs.push(m.text().slice(0, 200)))
    await p.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    return { ctx, p }
  }
  const axe = async (p) => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`)) }
  const prefs = (o = {}) => ({ v: 1, consent: true, lang: 'en-IN', speak: false, engine: 'device', teacher: 'priya', teacherSize: 'm', teacherNames: { priya: 'Meera' }, ...o })

  // 1. The studio: she stands in the preview box.
  {
    const { ctx, p } = await open('light', 1280, '/teacher', prefs())
    await p.waitForSelector('.tch[data-ready][data-anchored]', { timeout: 90000 })
    await p.waitForTimeout(500)
    const fit = await p.evaluate(() => {
      const s = document.querySelector('.ts-stage-box').getBoundingClientRect()
      const t = document.querySelector('.tch').getBoundingClientRect()
      return { dx: Math.abs((t.left + t.width / 2) - (s.left + s.width / 2)), dy: Math.abs(t.top - s.top), inside: t.bottom <= document.querySelector('.ts-stage').getBoundingClientRect().bottom + 1 }
    })
    ok('she stands centred in the studio preview', fit.dx < 3 && fit.dy < 3 && fit.inside, JSON.stringify(fit))
    ok('the top bar names the page', (await p.locator('[aria-label="Breadcrumb"]').innerText()).includes('Teacher studio'))
    // Framing changes the camera, captions and speed save.
    await p.getByRole('radio', { name: 'Face' }).click()
    await p.getByRole('radio', { name: 'Slower' }).click()
    await p.getByRole('switch', { name: 'Captions' }).click()
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('nexora:voice')))
    ok('framing, speed and captions are saved', saved.teacherView === 'head' && saved.rate === 0.85 && saved.teacherCaptions === false, JSON.stringify({ v: saved.teacherView, r: saved.rate, c: saved.teacherCaptions }))
    // Renaming shows on her bar at once.
    await p.locator('#tch-name').fill('Asha')
    await p.locator('#tch-name').press('Enter')
    ok('a new name shows on her bar', (await p.locator('.tch-name').innerText()) === 'Asha')
    // Hidden on other pages, still shown here.
    await p.screenshot({ path: path.join(S, 'studio.png') })
    ok('no page errors (studio)', p.__errs.length === 0, p.__errs.join(' | '))
    await ctx.close()
  }

  // 2. Her "More" menu, by keyboard and pointer, beside a page.
  {
    const { ctx, p } = await open('light', 1280, '/hub', prefs())
    await p.waitForSelector('.tch[data-ready]', { timeout: 90000 })
    const more = p.getByRole('button', { name: 'More with Meera' })
    await more.focus()
    await p.keyboard.press('Enter')
    const items = await p.getByRole('menuitem').allInnerTexts()
    ok('the menu lists what she can do', items.some((t) => /whiteboard/i.test(t)) && items.includes('Teacher studio') && items.includes('Hide'), items.join(', '))
    const first = await p.evaluate(() => document.activeElement?.getAttribute('role'))
    await p.keyboard.press('ArrowDown')
    await p.keyboard.press('Escape')
    const back = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    ok('arrow keys move in it, Escape closes it and returns to the button', first === 'menuitem' && back === 'More with Meera' && (await p.getByRole('menu').count()) === 0)
    await more.click()
    await p.getByRole('menuitem', { name: 'Teacher studio' }).click()
    await p.waitForURL('**/teacher')
    ok('"Teacher studio" in the menu opens the studio', true)
    ok('no page errors (menu)', p.__errs.length === 0, p.__errs.join(' | '))
    await ctx.close()
  }

  // 3. The Settings card opens the studio.
  {
    const { ctx, p } = await open('light', 1280, '/settings?tab=preferences', prefs())
    const link = p.getByRole('link', { name: 'Open Teacher studio' })
    await link.waitFor({ timeout: 20000 }).catch(() => {})
    ok('Settings has a short teacher card that opens the studio', (await link.count()) === 1)
    await ctx.close()
  }

  // 4. Accessibility and layout: studio in light, dark and at 360 px; off state.
  for (const [scheme, width, who] of [['light', 1280, 'priya'], ['dark', 1280, 'priya'], ['light', 360, 'priya'], ['dark', 360, '']]) {
    const { ctx, p } = await open(scheme, width, '/teacher', prefs({ teacher: who }))
    if (who) await p.waitForSelector('.tch[data-ready]', { timeout: 90000 })
    await p.waitForTimeout(600)
    const v = await axe(p)
    ok(`${scheme} ${width}px${who ? '' : ' (no teacher)'}: axe 0 on the studio`, v.length === 0, v.join(', '))
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(`${scheme} ${width}px${who ? '' : ' (no teacher)'}: no sideways scroll`, wide <= 0, `${wide}px`)
    ok(`${scheme} ${width}px${who ? '' : ' (no teacher)'}: no page errors`, p.__errs.length === 0, p.__errs.join(' | '))
    await p.screenshot({ path: path.join(S, `studio-${scheme}-${width}${who ? '' : '-off'}.png`), fullPage: width < 500 })
    await ctx.close()
  }
  console.log(`${results.filter(Boolean).length} of ${results.length} passed`)
  process.exitCode = results.every(Boolean) ? 0 : 1
  await b.close()
})()
