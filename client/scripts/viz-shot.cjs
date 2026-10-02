/**
 * Screenshots animations in the dev-only /viz-lab page.
 *   node scripts/viz-shot.cjs http://localhost:5300 /tmp/shots ll-floyd@end ll-floyd@7 ex-bst-insert
 * Each spec is <algo-id>[@<steps forward>|@end]; writes <out>/<id>-<steps>.png.
 */
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = require('/opt/node22/lib/node_modules/playwright'))
}
(async () => {
  const [base, out, ...ids] = process.argv.slice(2);
  require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
  for (const spec of ids) {
    const [id, steps] = spec.split('@');
    await p.goto(`${base}/viz-lab?algo=${id}`, { waitUntil: 'networkidle' });
    await p.waitForSelector('[aria-label^="Animation:"]', { timeout: 15000 });
    const player = p.locator('[aria-label^="Animation:"]').first();
    await player.focus();
    const n = steps === 'end' ? 999 : Number(steps || 0);
    if (steps === 'end') await p.keyboard.press('End');
    else for (let i = 0; i < n; i++) await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(1200);
    await player.screenshot({ path: `${out}/${id}-${steps || 0}.png` });
  }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
