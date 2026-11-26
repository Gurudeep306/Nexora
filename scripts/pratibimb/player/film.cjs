// Films a performance with the anime player: node film.cjs <served root url> <character dir (relative)> <perf.json> <out dir> [w] [h]
// Each frame is drawn by window.draw(frame) and saved as a transparent PNG (the character only).
const { chromium } = require('playwright')
const fs = require('fs')
;(async () => {
  const [, , root, cdir, perfPath, outDir, w = '600', h = '700'] = process.argv
  fs.mkdirSync(outDir, { recursive: true })
  const perf = JSON.parse(fs.readFileSync(perfPath, 'utf8'))
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage({ viewport: { width: +w, height: +h } })
  p.on('pageerror', (e) => console.log('PAGEERR', e.message))
  p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()))
  await p.goto(`${root}/anime.html?c=${cdir}&w=${w}&h=${h}`)
  await p.waitForFunction('window.ready', null, { timeout: 120000 })
  for (let k = 0; k < perf.frames.length; k++) {
    await p.evaluate((f) => window.draw(f), perf.frames[k])
    await p.locator('#c').screenshot({ path: `${outDir}/f${String(k).padStart(4, '0')}.png`, omitBackground: true })
  }
  await b.close()
  console.log('FILM', perf.frames.length, 'frames')
})()
