const { chromium } = require('playwright')
const fs = require('fs')
;(async () => {
  const [, , outDir, fps, from, to, only] = process.argv
  fs.mkdirSync(outDir, { recursive: true })
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
  p.on('pageerror', (e) => console.log('PAGEERR', e.message))
  p.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text()))
  await p.addInitScript(() => { window.PHOTOS = Array.from({ length: 12 }, (_, i) => `demo/photos/p${String(i).padStart(2, '0')}.jpg`) })
  await p.goto((process.env.PB_LAB_URL || 'http://localhost:8765/') + 'demo.html')
  await p.waitForFunction('window.ready', null, { timeout: 300000 })
  const times = only ? only.split(',').map(Number) : []
  if (!only) for (let f = Math.round(+from * fps); f < Math.round(+to * fps); f++) times.push(f / fps)
  let k = 0
  for (const t of times) {
    await p.evaluate((t) => window.renderAt(t), t)
    const name = only ? `t${t.toFixed(1)}.png` : `f${String(Math.round(t * fps)).padStart(5, '0')}.png`
    await p.screenshot({ path: `${outDir}/${name}` })
    if (++k % 50 === 0) console.log('frames', k, 't', t.toFixed(2))
  }
  await b.close()
})()
