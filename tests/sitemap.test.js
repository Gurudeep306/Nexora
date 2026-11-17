// Admin → Site map (src/sitemap.js, /api/admin/sitemap): every part of the
// site, shown to everyone, staff only, coming soon or hidden — enforced on
// the server — and every listed source file exists.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-sitemap-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `own${stamp}`;
const [ADA, BEA, MOD, MEM, ZED] = ['ad', 'be', 'mo', 'me', 'ze'].map((p) => `${p}${stamp}`);
let proc, base;
let serverLog = '';

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const call = async (method, p, cookie, body, headers = {}) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, body: json, text, headers: r.headers };
};
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
async function register(name) {
  const r = await call('POST', '/api/user/register', null, { username: name, password: 'secret123' });
  return { ...r, cookie: cookieOf(r) };
}
async function login(name) {
  const r = await call('POST', '/api/user/login', null, { username: name, password: 'secret123' });
  return { ...r, cookie: cookieOf(r) };
}
function sql(stmt, ...args) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
  try { return db.prepare(stmt).run(...args); } finally { db.close(); }
}
const settle = () => new Promise((r) => setTimeout(r, 50));

const c = {}; // cookies by user

async function startServer() {
  const port = 30500 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: DB,
      OWNER_USERNAME: OWNER,
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
}
async function stopServer() {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
  proc = null;
}


const ok = (r, msg) => assert.equal(r.status, 200, `${msg || ''} ${r.status} ${JSON.stringify(r.body)}`);
const sitemap = require('../src/sitemap');
const ROOT = path.join(__dirname, '..');

test('every part has a page or an API, valid patterns, and only real files', () => {
  const ids = new Set();
  for (const p of sitemap.PARTS) {
    assert.ok(!ids.has(p.id), `duplicate ${p.id}`);
    ids.add(p.id);
    assert.ok(p.pages || p.api, `${p.id} has a page or an API`);
    if (p.pages) new RegExp(p.pages);
    if (p.api) new RegExp(p.api);
    if (p.parent) assert.ok(sitemap.BY_ID.has(p.parent), `${p.id}: parent ${p.parent}`);
    assert.ok(p.files.length, `${p.id} lists its code`);
    for (const f of p.files) assert.ok(fs.existsSync(path.join(ROOT, f)), `${p.id}: ${f} exists`);
  }
});

test('a child is never more open than its parent; old flags still count', () => {
  const eff = sitemap.effectiveModes({ site_parts: { gate: 'soon', 'gate.notes': 'visible', contests: 'staff' }, feature_flags: { social: false } });
  assert.equal(eff['gate.notes'], 'soon');
  assert.equal(eff['gate.tests'], 'soon');
  assert.equal(eff.contests, 'staff');
  assert.equal(eff.social, 'hidden', 'a flag switched off reads as hidden');
  assert.equal(eff.learn, 'visible');
  assert.equal(sitemap.effectiveModes({ site_parts: { social: 'visible' }, feature_flags: { social: false } }).social, 'visible', 'a Site map choice wins');
  assert.equal(sitemap.partForApi('/api/gate/notes/x').id, 'gate.notes', 'the most specific part');
  assert.equal(sitemap.partForApi('/api/hosted/mine').id, 'contests');
  assert.equal(sitemap.partForApi('/api/user/login'), null);
});

test.before(async () => {
  await startServer();
  for (const n of [OWNER, ADA, MOD, MEM]) {
    const r = await register(n);
    ok(r, `register ${n}`);
    c[n] = r.cookie;
  }
  ok(await call('PUT', '/api/admin/site/private-mode', c[OWNER], { enabled: false }));
  ok(await call('POST', `/api/admin/users/${MOD}/role`, c[OWNER], { role: 'moderator' }));
  ok(await call('POST', `/api/admin/users/${ADA}/role`, c[OWNER], { role: 'admin' }));
});
test.after(async () => {
  await stopServer();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('the owner sees the tree with GitHub links; others cannot change it', async () => {
  const r = await call('GET', '/api/admin/sitemap', c[OWNER]);
  ok(r);
  const gate = r.body.parts.find((p) => p.id === 'gate');
  assert.equal(gate.mode, 'visible');
  const file = gate.files.find((f) => f.kind === 'file');
  assert.equal(file.exists, true);
  assert.match(file.url, /^https:\/\/github\.com\/Gurudeep306\/Nexora\/blob\/main\/client\//);
  const folder = gate.files.find((f) => f.kind === 'folder');
  assert.match(folder.url, /\/tree\/main\//);
  assert.ok(folder.files > 0);
  assert.equal((await call('GET', '/api/admin/sitemap', c[ADA])).status, 403, 'admins have no site settings');
  assert.equal((await call('PUT', '/api/admin/sitemap/contests', c[MEM], { mode: 'hidden' })).status, 404);
  assert.equal((await call('PUT', '/api/admin/sitemap/admin', c[OWNER], { mode: 'hidden' })).status, 400, 'Admin is always on');
  assert.equal((await call('PUT', '/api/admin/sitemap/contests', c[OWNER], { mode: 'gone' })).status, 400);
  assert.equal((await call('PUT', '/api/admin/sitemap/nope', c[OWNER], { mode: 'hidden' })).status, 404);
});

test('coming soon, staff only and hidden are enforced on the server', async () => {
  ok(await call('GET', '/api/hosted/mine', c[MEM]), 'open by default');

  ok(await call('PUT', '/api/admin/sitemap/contests', c[OWNER], { mode: 'soon' }));
  let r = await call('GET', '/api/hosted/mine', c[MEM]);
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'feature_disabled');
  assert.equal(r.body.mode, 'soon');
  assert.match(r.body.error, /coming soon/);
  ok(await call('GET', '/api/hosted/mine', c[MOD]), 'staff can try it');
  let st = await call('GET', '/api/site/status', c[MEM]);
  assert.equal(st.body.flags.contests, false);
  const blocked = st.body.parts.find((p) => p.id === 'contests');
  assert.equal(blocked.mode, 'soon');
  assert.ok(blocked.pages);
  st = await call('GET', '/api/site/status', c[MOD]);
  assert.equal(st.body.flags.contests, true);
  assert.ok(!st.body.parts.some((p) => p.id === 'contests'));

  ok(await call('PUT', '/api/admin/sitemap/contests', c[OWNER], { mode: 'hidden' }));
  assert.equal((await call('GET', '/api/hosted/mine', c[MOD])).status, 403, 'hidden: staff too');
  ok(await call('GET', '/api/hosted/mine', c[OWNER]), 'the owner can still check it');

  // A part inside another: GATE notes off, GATE practice still on.
  ok(await call('PUT', '/api/admin/sitemap/contests', c[OWNER], { mode: 'visible' }));
  ok(await call('PUT', '/api/admin/sitemap/gate.notes', c[OWNER], { mode: 'staff' }));
  assert.equal((await call('GET', '/api/gate/notes', c[MEM])).status, 403);
  assert.notEqual((await call('GET', '/api/gate/daily', c[MEM])).status, 403, 'the rest of GATE stays open');
  ok(await call('GET', '/api/hosted/mine', c[MEM]), 'back on');
  const audit = await call('GET', '/api/admin/audit', c[OWNER]);
  assert.ok((audit.body.entries || audit.body.rows || []).some((e) => e.action === 'site.part'));
});

test('each GATE notes subject is its own part: hidden from its pages, the list and search', async () => {
  const dm = sitemap.BY_ID.get('gate.notes.dm');
  assert.ok(dm, 'Discrete Maths is listed');
  assert.equal(dm.label, 'Discrete Mathematics');
  assert.ok(sitemap.BY_ID.get('gate.notes.dl'), 'Digital Logic is listed');
  assert.ok(sitemap.BY_ID.get('learn.os'), 'Learn subjects are listed');
  assert.ok(sitemap.BY_ID.get('learn.dsa.arrays'), 'DSA chapters are listed');
  // Make the demo subject public-facing first (it may be a draft), then hide Discrete Maths.
  ok(await call('PUT', '/api/admin/sitemap/gate.notes', c[OWNER], { mode: 'visible' }));
  ok(await call('PUT', '/api/admin/sitemap/gate.notes.dm', c[OWNER], { mode: 'hidden' }));
  const list = await call('GET', '/api/gate/notes', c[MEM]);
  ok(list);
  assert.ok(!list.body.subjects.some((x) => x.id === 'dm'), 'gone from the list');
  assert.equal((await call('GET', '/api/gate/notes/dm', c[MEM])).status, 403, 'its pages are shut');
  const search = await call('GET', '/api/gate/notes/search?q=graph', c[MEM]);
  assert.ok(!(search.body.results || []).some((x) => x.subject === 'dm'), 'and out of search');
  ok(await call('GET', '/api/gate/notes/dm', c[OWNER]), 'the owner can still check it');
  ok(await call('PUT', '/api/admin/sitemap/gate.notes.dm', c[OWNER], { mode: 'visible' }));
});

test('Hive: admins and the owner only — everyone else finds nothing, not even in the Site map', async () => {
  const hiveMe = (who) => call('GET', '/api/hive/overview', c[who]);
  assert.equal((await hiveMe(MEM)).status, 404);
  assert.equal((await hiveMe(MOD)).status, 404, 'moderators are staff, but not Hive');
  assert.notEqual((await hiveMe(ADA)).status, 404, 'admins get in');
  assert.notEqual((await hiveMe(OWNER)).status, 404);
  const stMod = await call('GET', '/api/site/status', c[MOD]);
  assert.equal(stMod.body.me.mayHive, false);
  assert.ok(stMod.body.parts.some((p) => p.id === 'hive'), 'the app drops it from menus');
  const stAda = await call('GET', '/api/site/status', c[ADA]);
  assert.equal(stAda.body.me.mayHive, true);
  assert.ok(!stAda.body.parts.some((p) => p.id === 'hive'));
  // In the Site map the owner sees Hive and its parts; a hidden part shuts it for admins too.
  const map = await call('GET', '/api/admin/sitemap', c[OWNER]);
  assert.ok(map.body.parts.some((p) => p.id === 'hive.drive'));
  ok(await call('PUT', '/api/admin/sitemap/hive.drive', c[OWNER], { mode: 'hidden' }));
  assert.equal((await call('GET', '/api/hive/drive/tree', c[ADA])).status, 403, 'a hidden Hive part shuts for admins too');
  ok(await call('GET', '/api/hive/overview', c[ADA]), 'the rest of Hive stays open');
  ok(await call('PUT', '/api/admin/sitemap/hive.drive', c[OWNER], { mode: 'visible' }));
});
