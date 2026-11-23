/*
  Real-browser sweep of the voice and teacher features: each spoken command
  must do what it says (pages, dark mode, scrolling, search, the teacher's
  moves, the whiteboard), questions must reach Guru and open nothing, and
  with Guru's answer open the pages have 0 axe violations and no sideways
  scroll in light, dark and phone width. The mic is stubbed (headless
  Chromium's own speech recognition crashes).

  1. node scripts/voice/sweep/mock-ai.cjs            (a stand-in free model on :3199)
  2. GROQ_API_KEY=test GROQ_BASE_URL=http://localhost:3199 PORT=3100 \
     DB_PATH=<scratch>/site.db SESSION_SECRET=<32+ chars> OWNER_USERNAME=vowner \
     JUDGE_MODE=local DISABLE_PUPPETEER=1 node src/server.js
     (sign up "vowner" / "secret123" once: the owner account)
  3. cd client && npx vite build, then: node scripts/voice/sweep/sweep.cjs [screenshot dir]
*/
const path = require('path')
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), path.join(__dirname, '..', '..', '..', 'client')] }))
const AXE = require('fs').readFileSync(require.resolve('axe-core/axe.min.js', { paths: [path.join(__dirname, '..', '..', '..', 'client')] }), 'utf8')
const BASE = process.env.BASE || 'http://localhost:3100'
const S = process.argv[2] || require('os').tmpdir()

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
  const results = []
  const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }

  async function context(scheme, width, teacher) {
    const ctx = await b.newContext({ viewport: { width, height: width < 500 ? 780 : 860 }, colorScheme: scheme })
    await ctx.addInitScript(({ scheme, teacher }) => {
      localStorage.setItem('nexora:appearance', scheme)
      if (!sessionStorage.getItem('i')) {
        sessionStorage.setItem('i', '1')
        localStorage.setItem('nexora:voice', JSON.stringify({ v: 1, consent: true, lang: 'en-IN', speak: false, engine: 'auto', teacher: teacher || '', teacherSize: 'm' }))
      }
      window.__said = []
      class R { start() { const t = (window.__says || []).shift() || ''; setTimeout(() => { if (t) { window.__said.push(t); this.onresult && this.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: t, confidence: 0.95 } }] }) } this.onend && this.onend() }, 300) } stop() {} abort() {} }
      window.SpeechRecognition = R
      window.webkitSpeechRecognition = R
    }, { scheme, teacher })
    await ctx.request.post(`${BASE}/api/user/login`, { data: { username: 'vowner', password: 'secret123' } })
    await ctx.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { settings: {} } }) : r.fulfill({ json: { ok: true } })))
    const p = await ctx.newPage()
    p.__errs = []
    p.on('pageerror', (e) => p.__errs.push(String(e).slice(0, 160)))
    return { ctx, p }
  }

  /** Say one sentence into the top-bar mic and wait. */
  async function say(p, text, wait = 1400) {
    await p.evaluate((t) => { window.__says = [t] }, text)
    await p.keyboard.press('Alt+m')
    await p.waitForTimeout(wait)
  }
  const pill = (p) => p.locator('.vc-pill').first().textContent().catch(() => '')
  const closePill = async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(200) }

  /* ── 1. Pages and site actions (light, wide) ── */
  {
    const { ctx, p } = await context('light', 1280, '')
    await p.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
    const NAV = [['open problems', '/problems'], ['notes kholo', '/gate/notes'], ['नोट्स खोलो', '/gate/notes'], ['go to contests', '/contests'], ['take me to settings', '/settings'],
      ['mock tests kholo', '/gate/tests'], ['practice questions dikhao', '/gate/practice'], ['open the explore page', '/explore'], ['home page pe jao', '/hub'], ['open learning', '/learn'], ['bookmarks kholo', '/bookmarks']]
    for (const [s, path] of NAV) {
      await say(p, s, 1800)
      const url = new URL(p.url()).pathname
      ok(`"${s}" opens ${path}`, url.startsWith(path), url)
      await closePill(p)
    }
    await p.goto(`${BASE}/problems`, { waitUntil: 'networkidle' })
    await p.goto(`${BASE}/learn`, { waitUntil: 'networkidle' })
    await say(p, 'go back', 1500)
    ok('"go back" returns to the last page', new URL(p.url()).pathname === '/problems', new URL(p.url()).pathname)
    await say(p, 'dark mode')
    ok('"dark mode" switches to dark', (await p.evaluate(() => document.documentElement.getAttribute('data-mode'))) === 'dark')
    await say(p, 'light mode')
    ok('"light mode" switches back', (await p.evaluate(() => document.documentElement.getAttribute('data-mode'))) === 'light')
    await p.goto(`${BASE}/explore`, { waitUntil: 'networkidle' })
    await say(p, 'scroll down', 1500)
    const y1 = await p.evaluate(() => window.scrollY)
    ok('"scroll down" scrolls', y1 > 50, `y=${y1}`)
    await say(p, 'sabse upar', 1500)
    ok('"sabse upar" goes to the top', (await p.evaluate(() => window.scrollY)) < 5)
    await say(p, 'search', 1200)
    ok('"search" opens the command palette', await p.getByRole('dialog', { name: 'Command palette' }).isVisible().catch(() => false))
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    // Questions go to Guru; topic words never open things.
    for (const s of ['what is a stack', 'binary search kya hai', 'show the contents of the stack', 'syntax analysis samjhao']) {
      const before = new URL(p.url()).pathname
      await say(p, s, 2500)
      const text = await pill(p)
      ok(`"${s}" goes to Guru, nothing opens`, new URL(p.url()).pathname === before && /You said|Guru/.test(text), text.slice(0, 80))
      await closePill(p)
    }
    ok('no page errors (pages and actions)', p.__errs.length === 0, p.__errs.join(' | '))
    await ctx.close()
  }

  /* ── 2. The teacher ── */
  {
    const { ctx, p } = await context('light', 1280, 'priya')
    await p.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
    await p.waitForSelector('.tch[data-ready]', { timeout: 120000 })
    const side = () => p.evaluate(() => document.querySelector('.tch')?.dataset.side)
    // The teacher listens, not the website: no box while she is on screen.
    await p.evaluate(() => { window.__says = ['what is a stack'] })
    await p.keyboard.press('Alt+m')
    await p.waitForTimeout(200)
    const listeningBubble = await p.locator('.tch-say--talk').innerText().catch(() => '')
    ok('with the teacher on, she listens (her bubble), not a box on the website', /listening|what is a stack/i.test(listeningBubble) && !(await p.locator('.vc-pill').isVisible().catch(() => false)), listeningBubble.slice(0, 60))
    await p.waitForTimeout(3500)
    const answer = await p.locator('.tch-say').first().innerText().catch(() => '')
    ok('her answer appears in her own bubble (sound off), still no box', /You said: what is a stack/.test(answer) && !(await p.locator('.vc-pill').isVisible().catch(() => false)), answer.slice(0, 80))
    await p.locator('.tch-say button', { hasText: 'Close' }).first().click().catch(() => {})
    // Her Talk button starts a conversation with her.
    await p.evaluate(() => { window.__says = ['bye'] })
    await p.getByRole('button', { name: /^Talk with/ }).click()
    await p.waitForTimeout(400)
    ok('her Talk button starts a conversation with her', (await p.locator('.tch-btn[data-on]').count()) > 0 || /Talking with/.test(await p.locator('.tch-say').first().innerText().catch(() => '')))
    await p.waitForTimeout(3500)
    await say(p, 'go left', 2200)
    ok('"go left" moves the teacher left', (await side()) === 'left', await side())
    await say(p, 'राइट जाओ', 2200)
    ok('"राइट जाओ" moves her right', (await side()) === 'right', await side())
    await say(p, 'left shift kya hai', 2500)
    ok('"left shift kya hai" is a question: she stays right', (await side()) === 'right', await side())
    await closePill(p)
    await say(p, 'please sit down', 2200)
    ok('"please sit down" sits her', await p.evaluate(() => document.querySelector('.tch')?.hasAttribute('data-sitting')))
    await say(p, 'stand up', 2200)
    ok('"stand up" stands her', !(await p.evaluate(() => document.querySelector('.tch')?.hasAttribute('data-sitting'))))
    await say(p, 'hide the teacher', 1500)
    ok('"hide the teacher" hides her', !(await p.locator('.tch').isVisible().catch(() => false)) || (await p.evaluate(() => getComputedStyle(document.querySelector('.tch')).visibility === 'hidden')))
    await say(p, 'teacher dikhao', 2500)
    ok('"teacher dikhao" brings her back', await p.locator('.tch').isVisible().catch(() => false))
    await say(p, 'explain binary search on the whiteboard', 4000)
    const board = p.getByRole('region', { name: /Whiteboard/ })
    ok('"explain binary search on the whiteboard" opens the board', await board.isVisible().catch(() => false))
    await p.waitForTimeout(2500)
    ok('the board draws the lesson', (await p.locator('.wb-svg [data-step]').count()) > 0, `${await p.locator('.wb-svg [data-step]').count()} shapes`)
    await p.addScriptTag({ content: AXE })
    const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((x) => x.id))
    ok('axe with the teacher and the whiteboard open', v.length === 0, v.join(', '))
    await p.screenshot({ path: `${S}/sweep-board.png` })
    await say(p, 'board band karo', 1500)
    ok('"board band karo" closes the board', !(await board.isVisible().catch(() => false)))
    ok('no page errors (teacher)', p.__errs.length === 0, p.__errs.join(' | '))
    await ctx.close()
  }

  /* ── 3. Light, dark and phone: the mic pill and voice pages have no accessibility problems and no sideways scroll ── */
  for (const [scheme, width] of [['light', 1280], ['dark', 1280], ['light', 360], ['dark', 360]]) {
    const { ctx, p } = await context(scheme, width, '')
    for (const path of ['/settings', '/explore', '/hub']) {
      await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
      await say(p, 'what is recursion', 2200)
      await p.addScriptTag({ content: AXE })
      const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((x) => x.id + ':' + x.nodes.length))
      const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      ok(`${scheme} ${width}px ${path} with Guru's answer open: axe 0, no sideways scroll`, v.length === 0 && sw <= 0, `${v.join(', ')} sideways ${sw}`)
      if (path === '/hub') await p.screenshot({ path: `${S}/sweep-${scheme}-${width}.png` })
      await closePill(p)
    }
    ok(`no page errors (${scheme} ${width})`, p.__errs.length === 0, p.__errs.join(' | '))
    await ctx.close()
  }

  await b.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length} of ${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
