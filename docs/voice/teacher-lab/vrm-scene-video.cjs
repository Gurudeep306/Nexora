const { chromium } = require(require.resolve('playwright', { paths: ['/home/user/Nexora/client'] }))
const fs = require('fs')
;(async () => {
  fs.mkdirSync('sframes', { recursive: true })
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
  await p.goto('http://localhost:8092/scene.html')
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 })
  const { lines, END } = await p.evaluate(() => window.SCENE)
  fs.writeFileSync('scene.json', JSON.stringify({ lines, END }))
  const n = Math.ceil((END / 1000) * 25)
  for (let i = 0; i < n; i++) { await p.evaluate((ms) => window.renderAt(ms), i * 40); await p.screenshot({ path: `sframes/f${String(i).padStart(4, '0')}.png` }) }
  await b.close(); console.log('frames', n)
})()
