// Statement media: what the rewriter emits, and what the image proxy will fetch.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isProxyableHost,
  absolutizeUrl,
  normalizeStatementHtml,
} = require('../src/statement-media');

const CF = { platform: 'codeforces' };

test('relative statement URLs become absolute against the source platform', () => {
  assert.equal(absolutizeUrl('/pic.png', 'https://codeforces.com'), 'https://codeforces.com/pic.png');
  assert.equal(absolutizeUrl('pic.png', 'https://codeforces.com'), 'https://codeforces.com/pic.png');
  assert.equal(absolutizeUrl('//espresso.codeforces.com/a.png', ''), 'https://espresso.codeforces.com/a.png');
  assert.equal(absolutizeUrl('https://x.test/a.png', 'https://codeforces.com'), 'https://x.test/a.png');
  assert.equal(absolutizeUrl('data:image/png;base64,AA', 'https://codeforces.com'), 'data:image/png;base64,AA');
});

test('images load direct with no referrer and carry a proxy fallback', () => {
  const out = normalizeStatementHtml('<p><img src="/predownloaded/a/b.png" alt="fig"></p>', CF);
  assert.match(out, /src="https:\/\/codeforces\.com\/predownloaded\/a\/b\.png"/);
  assert.match(out, /referrerpolicy="no-referrer"/);
  assert.match(out, /loading="lazy"/);
  assert.match(out, /data-proxy="\/api\/imgproxy\?url=https%3A%2F%2Fcodeforces\.com%2Fpredownloaded%2Fa%2Fb\.png"/);
  assert.match(out, /alt="fig"/, 'other attributes survive');
});

test('srcset is dropped — its candidates are relative to the source page', () => {
  const out = normalizeStatementHtml('<img srcset="a.png 1x, b.png 2x" src="/c.png">', CF);
  assert.ok(!/srcset/i.test(out));
});

test('the rewriter is idempotent', () => {
  const once = normalizeStatementHtml('<img src="/a.png">', CF);
  assert.equal(normalizeStatementHtml(once, CF), once);
});

test('video and audio get controls, absolute URLs and a proxy fallback', () => {
  const out = normalizeStatementHtml('<video src="/m/clip.mp4" poster="/m/p.jpg"></video>', CF);
  assert.match(out, /<video[^>]*\scontrols/);
  assert.match(out, /src="https:\/\/codeforces\.com\/m\/clip\.mp4"/);
  assert.match(out, /poster="https:\/\/codeforces\.com\/m\/p\.jpg"/);
  assert.match(out, /data-proxy="\/api\/imgproxy\?url=https%3A%2F%2Fcodeforces\.com%2Fm%2Fclip\.mp4"/);
});

test('<source> inside a video is rewritten too', () => {
  const out = normalizeStatementHtml(
    '<video><source src="https://img.atcoder.jp/a/b.webm" type="video/webm"></video>',
    { platform: 'atcoder' },
  );
  assert.match(out, /<source[^>]*data-proxy="\/api\/imgproxy\?url=https%3A%2F%2Fimg\.atcoder\.jp%2Fa%2Fb\.webm"/);
  assert.match(out, /type="video\/webm"/);
});

test('relative statement links point back at the source site', () => {
  assert.match(normalizeStatementHtml('<a href="/problemset">x</a>', CF), /href="https:\/\/codeforces\.com\/problemset"/);
  assert.match(normalizeStatementHtml('<a href="#note">x</a>', CF), /href="#note"/);
});

test('the proxy allowlist covers subdomains but nothing else', () => {
  for (const h of [
    'codeforces.com', 'espresso.codeforces.com', 'm2.codeforces.com',
    'userpic.codeforces.org', 'img.atcoder.jp', 'cdn.codechef.com',
    'assets.leetcode.com', 's3.amazonaws.com', 'd1abc.cloudfront.net', 'web.archive.org',
  ]) {
    assert.ok(isProxyableHost(h), `${h} should be proxyable`);
  }
  for (const h of ['evil.test', 'codeforces.com.evil.test', 'localhost', '127.0.0.1', '']) {
    assert.ok(!isProxyableHost(h), `${h} must not be proxyable`);
  }
});

/* ── the proxy route itself ── */
const { spawn } = require('node:child_process');
const path = require('node:path');
let proc, base;
let serverLog = '';

test.before(async () => {
  const port = 25000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  serverLog = '';
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* not up yet */ }
    if (proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('the image proxy refuses anything outside the allowlist', async () => {
  assert.equal((await fetch(`${base}/api/imgproxy?url=not-a-url`)).status, 400);
  assert.equal((await fetch(`${base}/api/imgproxy?url=${encodeURIComponent('https://evil.test/a.png')}`)).status, 403);
  assert.equal((await fetch(`${base}/api/imgproxy?url=${encodeURIComponent('http://codeforces.com/a.png')}`)).status, 403,
    'plain http is refused even for an allowed host');
  assert.equal((await fetch(`${base}/api/imgproxy?url=${encodeURIComponent('https://127.0.0.1:9/a.png')}`)).status, 403,
    'no SSRF into the local network');
});
