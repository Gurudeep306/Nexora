// A problem source switched off in Admin → Problem sources (e.g. SPOJ) shows
// nowhere a student looks: the source list, the Problems list and search,
// tags and the chat share search leave it out (src/problem-catalog.js
// getOpenCatalog, which the assistant's searches also read). Switched back on, it returns.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-sources-off-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `sow${stamp}`;
const MEM = `sme${stamp}`;
let proc, base;
let serverLog = '';
const c = {};

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json };
};
const ok = (r, msg) => assert.equal(r.status, 200, `${msg || ''} ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);

test.before(async () => {
  const port = 32500 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', TOPICS_STARTUP: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  for (const n of [OWNER, MEM]) {
    const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: n, password: 'secret123' }) });
    assert.equal(r.status, 200);
    c[n] = r.headers.get('set-cookie').split(';')[0];
  }
  ok(await call('PUT', '/api/admin/site/private-mode', c[OWNER], { enabled: false }));
  const { DatabaseSync } = require('node:sqlite');
  const d = new DatabaseSync(DB, { timeout: 10000 });
  try {
    const add = d.prepare('INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES(?,?,?,?,?,?)');
    add.run('codeforces', `Q${stamp}A`, `Zebra Paths ${stamp}`, 'https://x', 1400, '["graphs"]');
    add.run('spoj', `Q${stamp}B`, `Zebra Stripes ${stamp}`, 'https://x', 1400, '["spoj-only-tag"]');
  } finally {
    d.close();
  }
  ok(await call('PUT', '/api/problem-sources/spoj', c[OWNER], { enabled: true }), 'start with SPOJ on');
});
test.after(async () => {
  if (proc) {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

const titles = async (q) => (await call('GET', `/api/problems?limit=50&search=${encodeURIComponent(q)}`, c[MEM])).body.problems.map((p) => p.title).sort();
const shareSearch = async () => (await call('GET', `/api/chat/shareables?kind=problem&q=${encodeURIComponent(`Zebra`)}`, c[MEM])).body;

test('with SPOJ on, its problems show everywhere', async () => {
  assert.ok((await call('GET', '/api/sources', c[MEM])).body.sources.some((s) => s.id === 'spoj'));
  assert.deepEqual(await titles(`Zebra`), [`Zebra Paths ${stamp}`, `Zebra Stripes ${stamp}`]);
  assert.ok((await call('GET', '/api/tags', c[MEM])).body.tags.includes('spoj-only-tag'));
  assert.ok(JSON.stringify(await shareSearch()).includes(`Zebra Stripes ${stamp}`));
});

test('switched off, SPOJ leaves the source list, the Problems search, tags and the chat share search', async () => {
  ok(await call('PUT', '/api/problem-sources/spoj', c[OWNER], { enabled: false }));
  try {
    assert.ok(!(await call('GET', '/api/sources', c[MEM])).body.sources.some((s) => s.id === 'spoj'), 'not in any source dropdown');
    assert.deepEqual(await titles(`Zebra`), [`Zebra Paths ${stamp}`], 'not in Problems or its search');
    assert.ok(!(await call('GET', '/api/tags', c[MEM])).body.tags.includes('spoj-only-tag'), 'its tags go too');
    const share = await shareSearch();
    assert.ok(!JSON.stringify(share).includes(`Zebra Stripes ${stamp}`), 'not offered when sharing a problem in chat');
    assert.ok(JSON.stringify(share).includes(`Zebra Paths ${stamp}`), 'other sources still are');
    assert.equal((await call('GET', '/api/problems?limit=50&platform=spoj', c[MEM])).body.total, 0, 'not even by asking for it');
  } finally {
    ok(await call('PUT', '/api/problem-sources/spoj', c[OWNER], { enabled: true }));
  }
  assert.deepEqual(await titles(`Zebra`), [`Zebra Paths ${stamp}`, `Zebra Stripes ${stamp}`], 'back once it is on again');
});

