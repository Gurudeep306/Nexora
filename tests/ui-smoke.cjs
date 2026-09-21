const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const puppeteer = require('puppeteer');

async function main() {
  const port = 3197;
  const base = `http://127.0.0.1:${port}`;
  const output = '/tmp/nexora-ui';
  await fs.mkdir(output, { recursive: true });
  const server = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', (chunk) => { serverLog += chunk; });
  server.stderr.on('data', (chunk) => { serverLog += chunk; });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      try { ready = (await fetch(`${base}/api/health`)).ok; } catch {}
      if (ready) break;
      if (server.exitCode !== null) throw new Error(serverLog);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, `Test server did not start: ${serverLog}`);
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`${base}/auth`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: `${output}/auth-desktop.png` });
    await page.locator('::-p-text(Create Account)').click();
    await page.locator('input[autocomplete="username"]').fill('ui_rebuild_check');
    await page.locator('input[type="email"]').fill('ui-check@example.test');
    await page.locator('input[type="password"]').fill('NexoraTest123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => location.pathname === '/hub');
    await page.waitForSelector('main h1');
    await page.waitForNetworkIdle({ idleTime: 400, timeout: 20000 }).catch(() => {});
    const routes = ['hub', 'problems', 'contests', 'workshop', 'nexus', 'analytics', 'achievements', 'ailab', 'learn', 'social', 'submissions', 'bookmarks', 'profile', 'settings'];
    for (const width of [1440, 768, 375]) {
      await page.setViewport({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(`${base}/${route}`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('main h1');
        const result = await page.evaluate(() => ({
          title: document.querySelector('main h1')?.textContent,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          failure: document.body.innerText.includes('This page could not be displayed'),
        }));
        console.log(JSON.stringify({ width, route, ...result }));
        assert.equal(result.failure, false, `${route} crashed`);
        assert.equal(result.overflow, false, `${route} overflows at ${width}px`);
        if (['hub', 'problems', 'settings', 'nexus'].includes(route)) {
          await page.screenshot({ path: `${output}/${route}-${width}.png`, fullPage: true });
        }
      }
    }
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`${base}/problems`, { waitUntil: 'networkidle2' });
    const bookmark = await page.$('button[aria-label^="Bookmark "]');
    assert.ok(bookmark, 'Problems expose a bookmark control');
    await bookmark.click();
    await page.waitForSelector('button[aria-label^="Remove bookmark for "]');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('button[aria-label^="Remove bookmark for "]');
    await page.locator('button[aria-label="Notifications"]').click();
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    await page.locator('button[aria-label="Collapse sidebar"]').click();
    await page.screenshot({ path: `${output}/sidebar-collapsed.png` });
    await page.setViewport({ width: 375, height: 812 });
    await page.locator('button[aria-label="Open navigation"]').click();
    await page.waitForSelector('nav a[href="/settings"]');
    assert.ok(await page.$eval('nav a[href="/settings"]', (element) => element.innerText.includes('Settings')));
    await page.screenshot({ path: `${output}/navigation-mobile.png` });
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log(`UI checks passed. Screenshots: ${output}`);
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
    if (server.exitCode === null) await new Promise((resolve) => server.once('exit', resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
