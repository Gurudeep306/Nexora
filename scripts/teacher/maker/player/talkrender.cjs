const { chromium } = require('playwright')
const fs = require('fs')
;(async () => {
  const [, , url, outDir, fps] = process.argv
  fs.mkdirSync(outDir, { recursive: true })
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage({ viewport: { width: 720, height: 720 } })
  p.on('pageerror', (e) => console.log('PAGEERR', e.message))
  await p.goto('http://localhost:8765/' + url)
  await p.waitForFunction('window.ready', null, { timeout: 300000 })
  const dur = await p.evaluate('window.DURATION')
  for (let k = 0; k < Math.ceil(dur * fps); k++) {
    await p.evaluate((t) => window.renderAt(t), k / fps)
    await p.screenshot({ path: `${outDir}/f${String(k).padStart(4, '0')}.png` })
  }
  await b.close()
})()
