/*
  Renders the teachers' small portraits (client/public/teachers/<id>.jpg,
  shown while a teacher loads or if 3D fails) in the site's own lighting, so
  they match the 3D teacher. Needs a local server with a signed-in owner:

    node scripts/teacher/render-portraits.cjs [base URL] [username] [password] [ids, e.g. neha,dev]
*/
const path = require('path')
const { chromium } = require('playwright')
const BASE = process.argv[2] || 'http://localhost:3100'
const USER = process.argv[3] || 'vowner'
const PASS = process.argv[4] || 'secret123'
const ALL = ['priya', 'kavya', 'neha', 'ananya', 'arjun', 'rohan', 'dev']
const IDS = process.argv[5] ? process.argv[5].split(',') : ALL
const OUT = path.join(__dirname, '..', '..', 'client', 'public', 'teachers')

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  for (const id of IDS) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: 'light', deviceScaleFactor: 2 })
    await ctx.addInitScript((id) => {
      localStorage.setItem('nexora:appearance', 'light')
      localStorage.setItem('nexora:voice', JSON.stringify({ v: 1, consent: true, lang: 'en-IN', speak: false, engine: 'auto', teacher: id, teacherSize: 'l' }))
    }, id)
    await ctx.request.post(`${BASE}/api/user/login`, { data: { username: USER, password: PASS } })
    const p = await ctx.newPage()
    await p.goto(`${BASE}/hub`, { waitUntil: 'networkidle' })
    await p.waitForSelector('.tch[data-ready]', { timeout: 120000 })
    // A plain backdrop, like a photo.
    await p.addStyleTag({ content: '.tch-stage { background: #e6e9ed !important }' })
    await p.waitForTimeout(2500)
    // Not mid-blink: shoot right after a blink would have ended (TalkingHead blinks every few seconds, for ~0.2 s).
    await p.waitForTimeout(300)
    const box = await p.locator('.tch-stage').boundingBox()
    // The face: the upper middle of the stage, at the portrait's 4:5 shape.
    const w = box.width * 0.38
    const h = w * 1.25
    const clip = { x: box.x + (box.width - w) / 2, y: box.y + box.height * 0.19, width: w, height: h }
    const file = path.join(OUT, `${id}.png`)
    await p.screenshot({ path: file, clip })
    console.log(id, Math.round(w), Math.round(h))
    await ctx.close()
  }
  await b.close()
})()
