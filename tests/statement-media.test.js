// Statement media: what the rewriter emits, and what the image proxy will fetch.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isProxyableHost,
  isProxyableUrl,
  isProxyableMediaType,
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

test('judge images are served by us (our stored copy), never hot-linked', () => {
  const out = normalizeStatementHtml('<p><img src="/predownloaded/a/b.png" alt="fig"></p>', CF);
  assert.match(out, /src="\/api\/imgproxy\?url=https%3A%2F%2Fcodeforces\.com%2Fpredownloaded%2Fa%2Fb\.png"/);
  assert.doesNotMatch(out, /src="https:\/\/codeforces\.com/, 'the judge CDN is never in src');
  assert.match(out, /loading="lazy"/);
  assert.match(out, /alt="fig"/, 'other attributes survive');
});

test('an image on a host we may not fetch keeps its own URL, sent with no referrer', () => {
  const out = normalizeStatementHtml('<img src="https://example.org/x.png">', CF);
  assert.match(out, /src="https:\/\/example\.org\/x\.png"/);
  assert.match(out, /referrerpolicy="no-referrer"/);
});

test('srcset is dropped — its candidates are relative to the source page', () => {
  const out = normalizeStatementHtml('<img srcset="a.png 1x, b.png 2x" src="/c.png">', CF);
  assert.ok(!/srcset/i.test(out));
});

test('the rewriter is idempotent', () => {
  const once = normalizeStatementHtml('<img src="/a.png"><video src="/v.mp4" poster="/p.jpg"></video><img src="https://example.org/x.png">', CF);
  assert.equal(normalizeStatementHtml(once, CF), once);
  assert.doesNotMatch(once, /codeforces\.com\/api\/imgproxy/, 'our own URL is never made absolute against the judge');
});

test('video and audio get controls, and their media and poster are served by us', () => {
  const out = normalizeStatementHtml('<video src="/m/clip.mp4" poster="/m/p.jpg"></video>', CF);
  assert.match(out, /<video[^>]*\scontrols/);
  assert.match(out, /src="\/api\/imgproxy\?url=https%3A%2F%2Fcodeforces\.com%2Fm%2Fclip\.mp4"/);
  assert.match(out, /poster="\/api\/imgproxy\?url=https%3A%2F%2Fcodeforces\.com%2Fm%2Fp\.jpg"/);
});

test('<source> inside a video is rewritten too', () => {
  const out = normalizeStatementHtml(
    '<video><source src="https://img.atcoder.jp/a/b.webm" type="video/webm"></video>',
    { platform: 'atcoder' },
  );
  assert.match(out, /<source[^>]*src="\/api\/imgproxy\?url=https%3A%2F%2Fimg\.atcoder\.jp%2Fa%2Fb\.webm"/);
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
    'assets.leetcode.com', 'abc007.contest.atcoder.jp', 'web.archive.org',
    's3-lc-upload.s3.amazonaws.com', 'raw.githubusercontent.com', 'i.imgur.com',
  ]) {
    assert.ok(isProxyableHost(h), `${h} should be proxyable`);
  }
  for (const h of [
    'evil.test', 'codeforces.com.evil.test', 'localhost', '127.0.0.1', '',
    // Shared hosting suffixes: anyone can put a file there.
    'amazonaws.com', 'evil-bucket.s3.amazonaws.com', 's3.amazonaws.com',
    'd1abc.cloudfront.net', 'evil.githubusercontent.com', 'x.akamaized.net', 'cdn.jsdelivr.net',
  ]) {
    assert.ok(!isProxyableHost(h), `${h} must not be proxyable`);
  }
});

test('proxy URLs: https only, allowed hosts, and only known path-style S3 buckets', () => {
  for (const u of [
    'https://espresso.codeforces.com/a.png',
    'https://img.atcoder.jp/abc001/a.png',
    'https://s3.amazonaws.com/codechef_shared/download/a.png',
    'https://s3-lc-upload.s3.amazonaws.com/uploads/a.png',
    new URL('https://assets.leetcode.com/a.jpg'),
  ]) {
    assert.ok(isProxyableUrl(u), `${u} should be proxyable`);
  }
  for (const u of [
    'http://codeforces.com/a.png',
    'https://s3.amazonaws.com/evil-bucket/a.png',
    'https://s3.amazonaws.com/',
    'https://user:pw@codeforces.com/a.png',
    'https://codeforces.com:8443/a.png',
    'https://d1abc.cloudfront.net/a.png',
    'javascript:alert(1)',
    'not a url',
  ]) {
    assert.ok(!isProxyableUrl(u), `${u} must not be proxyable`);
  }
});

test('the proxy relays raster images, video and audio, never SVG or HTML', () => {
  for (const t of ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp',
    'image/x-icon', 'IMAGE/PNG; charset=binary', 'video/mp4', 'audio/mpeg']) {
    assert.ok(isProxyableMediaType(t), `${t} should be relayed`);
  }
  for (const t of ['image/svg+xml', 'image/svg+xml; charset=utf-8', 'text/html', 'application/xml',
    'text/xml', 'application/javascript', 'image/*', '']) {
    assert.ok(!isProxyableMediaType(t), `${t} must be refused`);
  }
});

/* ── the proxy route itself ── */
const { spawn } = require('node:child_process');
const path = require('node:path');
let proc, base;
let serverLog = '';

test.before(async () => {
  const port = await freePort();
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

test('the image proxy refuses shared-hosting hosts and unknown S3 buckets', async () => {
  for (const u of [
    'https://evil-bucket.s3.amazonaws.com/x.svg',
    'https://s3.amazonaws.com/evil-bucket/x.svg',
    'https://d1abc.cloudfront.net/x.svg',
  ]) {
    assert.equal((await fetch(`${base}/api/imgproxy?url=${encodeURIComponent(u)}`)).status, 403, u);
  }
});

test('uploaded SVGs are served sandboxed and unsniffable, PNGs untouched', async () => {
  const fs = require('node:fs');
  const dir = path.join(__dirname, '..', 'public', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const name = `xss-test-${process.pid}-${Date.now()}`;
  const svg = path.join(dir, `${name}.svg`);
  const png = path.join(dir, `${name}.png`);
  fs.writeFileSync(svg, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  fs.writeFileSync(png, Buffer.from('89504e470d0a1a0a', 'hex'));
  try {
    const r = await fetch(`${base}/uploads/${name}.svg`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /^image\/svg\+xml/, 'still an image for <img>');
    assert.match(r.headers.get('content-security-policy') || '', /default-src 'none'.*sandbox/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');

    const p = await fetch(`${base}/uploads/${name}.png`);
    assert.equal(p.status, 200);
    assert.equal(p.headers.get('x-content-type-options'), 'nosniff');
    assert.doesNotMatch(p.headers.get('content-security-policy') || '', /sandbox/);
  } finally {
    fs.rmSync(svg, { force: true });
    fs.rmSync(png, { force: true });
  }
});
