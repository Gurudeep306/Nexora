/*
  Real-browser checks of how the teacher listens and speaks (docs/voice/VIRTUAL_TEACHER.md §3.2.9):
  typing to her, the thinking bubble, her answer, dragging her, and the caption lit word by word
  with a device voice that reports words; axe 0 in light, dark and at 360 px, no sideways scroll.
  Same server as sweep.cjs (steps 1–3 there), then: node scripts/voice/sweep/teacher-talk.cjs <screenshot dir>
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
  async function ctxFor(scheme, width, speak) {
    const ctx = await b.newContext({ viewport: { width, height: width < 500 ? 780 : 860 }, colorScheme: scheme, deviceScaleFactor: 1 })
    await ctx.addInitScript(({ scheme, speak }) => {
      localStorage.setItem('nexora:appearance', scheme)
      localStorage.setItem('nexora:voice', JSON.stringify({ v: 1, consent: true, lang: 'en-IN', speak, engine: 'device', teacher: 'priya', teacherSize: 'm', teacherNames: { priya: 'Meera' } }))
      // A device voice that reports each word as it says it (headless Chromium has none).
      window.__spoken = []
      class U { constructor(t) { this.text = t } }
      window.SpeechSynthesisUtterance = U
      const synth = { speaking: false, cancel() { this._c = true }, getVoices() { return [{ name: 'Test en-IN', lang: 'en-IN', localService: true, default: true }] }, addEventListener() {}, removeEventListener() {},
        speak(u) { this._c = false; window.__spoken.push(u.text); const words = [...u.text.matchAll(/\S+/g)]; let i = 0
          setTimeout(() => { u.onstart && u.onstart(); const step = () => { if (this._c) return; if (i < words.length) { const m = words[i++]; u.onboundary && u.onboundary({ name: 'word', charIndex: m.index, charLength: m[0].length }); setTimeout(step, 420) } else u.onend && u.onend() }; step() }, 50) } }
      Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
    }, { scheme, speak })
    await ctx.request.post(`${BASE}/api/user/login`, { data: { username: 'vowner', password: 'secret123' } })
    const p = await ctx.newPage()
    p.__errs = []
    p.on('pageerror', (e) => p.__errs.push(String(e).slice(0, 200)))
    return { ctx, p }
  }
  const axe = async (p) => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`)) }

  // 1. Typing to her, voice off: thinking bubble keeps the question, the answer appears above the box.
  {
    const { ctx, p } = await ctxFor('light', 1280, false)
    // Slow Guru down a little so the thinking moment can be seen.
    await p.route('**/api/voice/guru', async (r) => { await new Promise((ok) => setTimeout(ok, 2500)); await r.continue() })
    await p.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
    await p.waitForSelector('.tch[data-ready]', { timeout: 90000 })
    ok('teacher loads, named Meera', (await p.locator('.tch-name').innerText()) === 'Meera')
    await p.getByRole('button', { name: 'Type to Meera' }).click()
    const input = p.getByPlaceholder('Ask Meera anything…')
    ok('typing box opens and takes focus', await input.evaluate((el) => el === document.activeElement))
    await input.fill('what is a stack')
    await p.getByRole('button', { name: 'Send to Meera' }).click()
    const thinking = await p.locator('.tch-asked').innerText({ timeout: 3000 }).catch(() => '')
    ok('while thinking she shows what was asked', /what is a stack/.test(thinking), thinking)
    await p.screenshot({ path: path.join(S, 'thinking.png') })
    await p.waitForFunction(() => document.querySelector('.tch-type .tch-say-text')?.textContent?.length > 10, null, { timeout: 30000 }).catch(() => {})
    const ans = await p.locator('.tch-type .tch-say-text').innerText().catch(() => '')
    ok('her answer appears above the typing box', ans.length > 10, ans.slice(0, 70))
    await p.screenshot({ path: path.join(S, 'typed-answer.png') })
    let v = await axe(p)
    ok('axe 0 with typing box and answer (light)', v.length === 0, v.join(', '))
    // Drag her by the bar to the left side.
    const bar = p.locator('.tch-bar')
    const bb = await bar.boundingBox()
    await p.mouse.move(bb.x + 20, bb.y + bb.height / 2)
    await p.mouse.down()
    for (let i = 1; i <= 10; i++) await p.mouse.move(bb.x + 20 - i * 100, bb.y + bb.height / 2)
    const dragging = await p.locator('.tch[data-dragging]').count()
    await p.mouse.up()
    await p.waitForTimeout(400)
    ok('dragging follows the pointer, then she settles on the left', dragging === 1 && (await p.locator('.tch').getAttribute('data-side')) === 'left', `dragging=${dragging} side=${await p.locator('.tch').getAttribute('data-side')}`)
    ok('no page errors (typing, drag)', p.__errs.length === 0, p.__errs.join(' | '))
    await ctx.close()
  }

  // 2. Speaking: the caption lights word by word with the voice; dark and phone.
  for (const [scheme, width] of [['dark', 1280], ['light', 360]]) {
    const { ctx, p } = await ctxFor(scheme, width, true)
    await p.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
    await p.waitForSelector('.tch[data-ready]', { timeout: 90000 })
    await p.getByRole('button', { name: 'Type to Meera' }).click()
    await p.getByPlaceholder('Ask Meera anything…').fill('what is a queue')
    await p.keyboard.press('Enter')
    await p.waitForSelector('.tch-cap span[data-w="now"]', { timeout: 30000 }).catch(() => {})
    const a = await p.evaluate(() => [...document.querySelectorAll('.tch-cap span')].findIndex((s) => s.dataset.w === 'now'))
    await p.waitForTimeout(1300)
    const c = await p.evaluate(() => [...document.querySelectorAll('.tch-cap span')].findIndex((s) => s.dataset.w === 'now'))
    ok(`${scheme} ${width}px: the caption lights the word being said and moves on`, a >= 0 && c > a, `${a} → ${c}`)
    await p.screenshot({ path: path.join(S, `speaking-${scheme}-${width}.png`) })
    const v = await axe(p)
    ok(`${scheme} ${width}px: axe 0 while she speaks`, v.length === 0, v.join(', '))
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(`${scheme} ${width}px: no sideways scroll`, wide <= 0, `${wide}px`)
    ok(`${scheme} ${width}px: no page errors`, p.__errs.length === 0, p.__errs.join(' | '))
    await ctx.close()
  }
  console.log(`${results.filter(Boolean).length} of ${results.length} passed`)
  process.exitCode = results.every(Boolean) ? 0 : 1
  await b.close()
})()
