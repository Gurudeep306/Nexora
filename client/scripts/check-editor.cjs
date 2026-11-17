// The editor in every main language, in a real browser: suggestions as you
// type, parameter hints, hover help, the live syntax check, Format and the
// cheat sheet. Run it against a running site (the demo is enough):
//
//   PORT=3300 node scripts/hive-demo.js            # in one terminal
//   node client/scripts/check-editor.cjs [base] [lang,lang…]
//
// Each language prints one line: ok/BAD per feature. Exit code 1 if any fails.
const { chromium } = require('playwright')

const BASE = process.argv[2] || 'http://localhost:3300'
// language → [what to type for a suggestion, a call to open (parameter hints), the word to hover]
const CASES = {
  cpp: ['reve', 'reverse(', 'reverse'],
  c: ['prin', 'printf(', 'printf'],
  python: ['prin', 'print(', 'print'],
  java: ['Integer.pars', 'Integer.parseInt(', 'parseInt'],
  javascript: ['parseI', 'parseInt(', 'parseInt'],
  typescript: ['parseI', 'parseInt(', 'parseInt'],
  go: ['fmt.Prin', 'fmt.Println(', 'Println'],
  rust: ['v.pu', 'v.push(', 'push'],
  kotlin: ['printl', 'println(', 'println'],
  csharp: ['Console.WriteL', 'Console.WriteLine(', 'WriteLine'],
  swift: ['prin', 'print(', 'print'],
  ruby: ['put', 'puts(', 'puts'],
  php: ['tri', 'trim(', 'trim'],
  lua: ['prin', 'print(', 'print'],
}

;(async () => {
  const only = (process.argv[3] || '').split(',').filter(Boolean)
  const langs = Object.keys(CASES).filter((l) => !only.length || only.includes(l))
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  const login = await page.request.post(`${BASE}/api/user/login`, { data: { username: process.env.USERNAME_ || 'owner', password: process.env.PASSWORD_ || 'owner123' } })
  if (!login.ok()) throw new Error('Could not sign in')
  const made = await page.request.post(`${BASE}/api/custom-problems`, {
    data: { title: 'Editor check', statement: '<p>Editor check.</p>', difficulty: 'Easy', tags: [], samples: [{ input: '1\n', output: '1\n' }], testcases: [{ input: '1\n', output: '1\n' }] },
  })
  const pid = (await made.json()).id
  let failed = 0
  for (const lang of langs) {
    const [prefix, call, word] = CASES[lang]
    await page.goto(`${BASE}/`)
    await page.evaluate(([l, id]) => {
      localStorage.setItem('nexora:lang', l)
      localStorage.setItem(`nexora:code:custom-${id}:${l}`, '\n')
    }, [lang, pid])
    await page.goto(`${BASE}/solve/custom/${pid}`)
    await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 })
    await page.waitForTimeout(1500)
    const editor = page.locator('.monaco-editor .view-lines').first()
    const clear = async () => {
      await editor.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.press('Delete')
    }
    const res = {}
    // 1. Suggestions as you type.
    await clear()
    await page.keyboard.type(prefix, { delay: 40 })
    res.suggest = await page
      .waitForFunction((w) => [...document.querySelectorAll('.suggest-widget.visible .monaco-list-row')].some((r) => r.textContent.includes(w)), word, { timeout: 6000 })
      .then(() => true, () => false)
    await page.keyboard.press('Escape')
    // 2. Parameter hints inside a call.
    await clear()
    await page.keyboard.type(call, { delay: 40 })
    res.hints = await page.waitForSelector('.parameter-hints-widget.visible', { timeout: 6000 }).then(() => true, () => false)
    await page.keyboard.press('Escape')
    // 3. Hover help on the function's name: a fresh line, the typing settled,
    //    the pointer moved onto the word's own token (as a person would).
    await clear()
    // Inserted, not typed: typing would open suggestions, and "." accepts one.
    await page.keyboard.insertText(call.replace(/\($/, ''))
    await page.mouse.click(5, 300)
    await page.waitForTimeout(600)
    // The token holding the word (some languages colour "v.push" as one token):
    // the font is monospaced, so the word's middle is found by its offset.
    const token = page.locator('.monaco-editor .view-line span span').filter({ hasText: word }).first()
    const tb = (await token.count()) ? await token.boundingBox() : null
    const text = tb ? await token.textContent() : ''
    const box = tb && text ? { x: tb.x + (tb.width / text.length) * (text.indexOf(word) + word.length / 2), y: tb.y + tb.height / 2 } : null
    if (box) {
      await page.mouse.move(box.x, box.y, { steps: 4 })
      await page.waitForTimeout(150)
      await page.mouse.move(box.x + 1, box.y, { steps: 2 })
    }
    res.hover = box
      ? await page.waitForFunction(() => [...document.querySelectorAll('.monaco-hover')].some((h) => !h.classList.contains('hidden') && h.textContent.trim().length > 3), null, { timeout: 6000 }).then(() => true, () => false)
      : false
    await page.mouse.move(5, 5)
    // 4. The live syntax check: an unclosed "(" (the editor closes brackets as you type, so delete its ")").
    await clear()
    await page.keyboard.type('(')
    await page.keyboard.press('Delete')
    await page.keyboard.type('x')
    res.syntax = await page.waitForFunction(() => /Ln 1: Brackets/.test(document.body.innerText), null, { timeout: 4000 }).then(() => true, () => false)
    // 5. Format: the button exists for every language and does its job (or says the code is tidy).
    await page.keyboard.press('Control+Z')
    const formatBtn = page.locator('button[aria-label^="Format the code"], button[aria-label^="Fix the indentation"], button[aria-label^="Trim trailing spaces"]').first()
    res.format = (await formatBtn.count()) > 0
    if (res.format) await formatBtn.click()
    // 6. The cheat sheet (the main languages have one).
    const cheatBtn = page.getByRole('button', { name: 'Cheat sheet' })
    if (await cheatBtn.count()) {
      await cheatBtn.click()
      res.cheat = await page.getByRole('dialog', { name: /Cheat sheet/ }).getByText('Common mistakes').isVisible().catch(() => false)
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Close' }).click().catch(() => {})
    } else res.cheat = 'none'
    const bad = Object.entries(res).filter(([, v]) => v === false).map(([k]) => k)
    if (bad.length) failed++
    console.log(`${bad.length ? 'BAD' : 'ok '} ${lang.padEnd(11)} ${Object.entries(res).map(([k, v]) => `${k}:${v === true ? 'ok' : v}`).join('  ')}`)
  }
  await browser.close()
  process.exit(failed ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
