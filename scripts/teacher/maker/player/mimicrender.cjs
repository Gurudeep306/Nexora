// Films mimic.html frame by frame: node mimicrender.cjs "<page url with ?m=&s=>" <out dir>
const { chromium } = require('playwright')
const fs = require('fs')
;(async () => {
  const [, , url, outDir] = process.argv
  fs.mkdirSync(outDir, { recursive: true })
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage({ viewport: { width: 720, height: 720 } })
  p.on('pageerror', (e) => console.log('PAGEERR', e.message))
  await p.goto((process.env.PB_LAB_URL || 'http://localhost:8765/') + url)
  await p.waitForFunction('window.ready', null, { timeout: 300000 })
  const n = await p.evaluate('window.FRAMES')
  for (let k = 0; k < n; k++) {
    await p.evaluate((i) => window.renderAt(i), k)
    await p.screenshot({ path: `${outDir}/f${String(k).padStart(4, '0')}.png` })
  }
  await b.close()
  console.log('MIMIC', n, 'frames')
})()
