const { chromium } = require(require.resolve('playwright', { paths: ['/home/user/Nexora/client'] }))
const fs = require('fs')
;(async () => {
  const [q, out, fps] = [process.argv[2], process.argv[3], Number(process.argv[4] || 25)]
  fs.mkdirSync(out, { recursive: true })
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
  p.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 300)))
  await p.goto(`http://localhost:8090/index.html?model=${q}`)
  await p.waitForFunction(() => window.ready, null, { timeout: 300000 })
  const total = (await p.evaluate(() => window.DURATION)) + 900
  const n = Math.ceil((total / 1000) * fps)
  for (let i = 0; i < n; i++) {
    await p.evaluate((ms) => window.renderAt(ms), (i * 1000) / fps)
    await p.locator('canvas').screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.png` })
    if (i % 50 === 0) console.log('frame', i, 'of', n)
  }
  await b.close()
  console.log('done', n)
})()
