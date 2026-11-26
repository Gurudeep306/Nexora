const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage({ viewport: { width: 900, height: 900 } })
  p.on('console', (m) => m.type() === 'error' && console.log('ERR', m.text()))
  p.on('pageerror', (e) => console.log('PAGEERR', e.message))
  for (const [q, out] of JSON.parse(process.argv[2])) {
    await p.goto((process.env.PB_LAB_URL || 'http://localhost:8765/') + q)
    await p.waitForFunction('window.ready', null, { timeout: 120000 })
    await p.screenshot({ path: out })
  }
  await b.close()
})()
