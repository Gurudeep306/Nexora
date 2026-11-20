// Admin → Staff access (src/authz/sections.js, /api/admin/staff-access):
// per staff member and Admin section, hidden / see only / change, enforced on
// the server; only the owner, and admins the owner allows, can set it.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-staff-'));
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
  const port = await freePort();
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
const set = (who, user, section, level) => call('PUT', `/api/admin/staff-access/${user}`, c[who], { section, level });

test.before(async () => {
  await startServer();
  for (const n of [OWNER, ADA, BEA, MOD, MEM, ZED]) {
    const r = await register(n);
    ok(r, `register ${n}`);
    c[n] = r.cookie;
  }
  ok(await call('PUT', '/api/admin/site/private-mode', c[OWNER], { enabled: false }));
  for (const [u, role] of [[ADA, 'admin'], [BEA, 'admin'], [MOD, 'moderator']]) ok(await call('POST', `/api/admin/users/${u}/role`, c[OWNER], { role }), `${u} → ${role}`);
});
test.after(async () => {
  await stopServer();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('with no choice made, sections follow the role, as before', async () => {
  ok(await call('GET', '/api/admin/reports', c[MOD]), 'moderators moderate');
  assert.equal((await call('GET', '/api/admin/site', c[MOD])).status, 403, 'but not the Site section');
  assert.equal((await call('GET', '/api/admin/me', c[MEM])).status, 404, 'members see no admin panel');
  const me = await call('GET', '/api/admin/me', c[MOD]);
  assert.equal(me.body.sections.moderation, 'edit');
  assert.equal(me.body.sections.site, 'none');
  assert.equal(me.body.canStaff, false);
});

test('the owner hides a section, makes one see-only, and the server holds to it', async () => {
  ok(await set(OWNER, MOD, 'site', 'view'));
  ok(await call('GET', '/api/admin/site', c[MOD]), 'see only: reading works');
  const w = await call('PUT', '/api/admin/site/maintenance', c[MOD], { enabled: true, message: 'x' });
  assert.equal(w.status, 403);
  assert.equal(w.body.code, 'section_read_only');

  ok(await set(OWNER, MOD, 'moderation', 'none'));
  const h = await call('GET', '/api/admin/reports', c[MOD]);
  assert.equal(h.status, 403);
  assert.equal(h.body.code, 'section_hidden');
  assert.equal((await call('GET', '/api/admin/me', c[MOD])).body.sections.moderation, 'none');

  ok(await set(OWNER, MOD, 'moderation', 'default'));
  ok(await call('GET', '/api/admin/reports', c[MOD]), 'back to the role default');
});

test('a hidden or see-only section holds however the address is written (case, slashes)', async () => {
  // Express matches routes case-insensitively and ignores a trailing slash,
  // so the section rule must too, or "/api/ADMIN/reports" walks past it.
  ok(await set(OWNER, MOD, 'moderation', 'none'));
  for (const p of ['/api/ADMIN/reports', '/api/admin/Reports', '/API/admin/reports', '/api/admin/reports/', '/api/admin//reports']) {
    const r = await call('GET', p, c[MOD]);
    assert.notEqual(r.status, 200, `${p} must not open a hidden section`);
    if (r.status === 403) assert.equal(r.body.code, 'section_hidden', p);
  }
  ok(await set(OWNER, MOD, 'moderation', 'default'));

  assert.equal((await call('GET', '/api/admin/me', c[MOD])).body.sections.site, 'view', 'Site is see-only from the test above');
  for (const p of ['/api/ADMIN/site/maintenance', '/api/Admin/Site/maintenance', '/api/admin/site/maintenance/']) {
    const w = await call('PUT', p, c[MOD], { enabled: true, message: 'x' });
    assert.notEqual(w.status, 200, `${p} must not change a see-only section`);
  }
  assert.equal((await call('GET', '/api/admin/site', c[OWNER])).body.settings?.maintenance?.enabled ?? false, false, 'maintenance stayed off');
  // Leave Site as the earlier test set it (see only); later tests read it.
});

test('a member given one section opens Admin for that section only; nothing leaks', async () => {
  ok(await set(OWNER, MEM, 'sources', 'edit'));
  const me = await call('GET', '/api/admin/me', c[MEM]);
  ok(me, 'the panel opens');
  assert.equal(me.body.sections.sources, 'edit');
  assert.equal(me.body.sections.users, 'none');
  ok(await call('GET', '/api/problem-sources', c[MEM]), 'the section works');
  ok(await call('GET', '/api/authoring', c[OWNER]));
  assert.equal((await call('GET', '/api/authoring', c[MEM])).status, 403, 'the same permission elsewhere stays shut');
  assert.equal((await call('GET', '/api/admin/users', c[MEM])).status, 403);
  ok(await set(OWNER, MEM, 'sources', 'default'));
  assert.equal((await call('GET', '/api/admin/me', c[MEM])).status, 404, 'back to a plain member');
});

test('only the owner, and admins the owner allows, open Staff access; they stay below their own rank and level', async () => {
  assert.equal((await call('GET', '/api/admin/staff-access', c[ADA])).status, 403, 'admins need the owner to allow it');
  assert.equal((await call('PUT', `/api/admin/staff-access/${ADA}/top`, c[ADA], { on: true })).status, 403, 'nobody makes themselves one');
  ok(await call('PUT', `/api/admin/staff-access/${ADA}/top`, c[OWNER], { on: true }));
  const list = await call('GET', '/api/admin/staff-access', c[ADA]);
  ok(list);
  assert.ok(list.body.sections.some((s) => s.id === 'users'));
  const mod = list.body.people.find((p) => p.username === MOD);
  assert.equal(mod.editable, true);
  assert.equal(mod.chosen.site, 'view');
  const owner = list.body.people.find((p) => p.username === OWNER);
  assert.equal(owner.role, 'owner', 'the owner heads the list');
  assert.equal(owner.editable, false);
  assert.equal(list.body.people[0].username, OWNER, 'listed by rank, owner first');
  assert.equal(list.body.people.find((p) => p.username === BEA).editable, false, 'not another admin');

  ok(await set(ADA, MOD, 'users', 'view'), 'an allowed admin sets a moderator');
  assert.equal((await set(ADA, BEA, 'users', 'view')).status, 403, 'not another admin');
  assert.equal((await set(ADA, ADA, 'users', 'none')).status, 400, 'not themselves');
  const more = await set(ADA, MOD, 'site', 'edit');
  assert.equal(more.status, 400, 'admins have no Site section, so they cannot hand it out');
  assert.match(more.body.error, /more access than you have/);
  assert.equal((await set(ADA, MOD, 'nope', 'edit')).status, 400);
  assert.equal((await set(ADA, MOD, 'users', 'all')).status, 400);
  assert.equal((await set(ZED, MOD, 'users', 'edit')).status, 404, 'members do not even see the API');

  ok(await call('PUT', `/api/admin/staff-access/${ADA}/top`, c[OWNER], { on: false }));
  assert.equal((await call('GET', '/api/admin/staff-access', c[ADA])).status, 403, 'taken back');
  const audit = await call('GET', '/api/admin/audit', c[OWNER]);
  const actions = (audit.body.entries || audit.body.rows || audit.body.log || []).map((e) => e.action);
  assert.ok(actions.includes('staff.section'), JSON.stringify(Object.keys(audit.body)));
  assert.ok(actions.includes('staff.manage.grant'));
});

test('team titles: set by the owner (or an allowed admin for people below them), shown on the profile', async () => {
  const title = (who, user, t) => call('PUT', `/api/admin/staff-access/${user}/title`, c[who], { title: t });
  ok(await title(OWNER, OWNER, 'Founder'), 'the owner titles themselves');
  ok(await title(OWNER, MOD, '  Head of   GATE content '));
  const p = await call('GET', `/api/profiles/${MOD}`, c[ZED]);
  assert.equal(p.body.profile.team_title, 'Head of GATE content', 'spaces tidied, shown to everyone');
  assert.equal((await call('GET', `/api/profiles/${OWNER}`, c[ZED])).body.profile.team_title, 'Founder');
  assert.equal((await title(OWNER, MOD, 'x'.repeat(41))).status, 400);
  assert.equal((await title(OWNER, MOD, '<b>hi</b>')).status, 400);
  assert.equal((await title(MOD, MOD, 'Boss')).status, 403, 'moderators cannot set titles');
  assert.equal((await call('PUT', `/api/admin/staff-access/${MOD}/top`, c[OWNER], { on: true })).status, 400, 'only admins can be allowed to manage staff');
  ok(await call('PUT', `/api/admin/staff-access/${ADA}/top`, c[OWNER], { on: true }));
  ok(await title(ADA, MOD, 'GATE editor'), 'an allowed admin titles a moderator');
  assert.equal((await title(ADA, BEA, 'Nope')).status, 403, 'but not another admin');
  assert.equal((await title(ADA, ADA, 'Boss')).status, 400, 'nor themselves');
  ok(await title(OWNER, MOD, ''), 'cleared');
  assert.equal((await call('GET', `/api/profiles/${MOD}`, c[ZED])).body.profile.team_title, null);
});

test('finer permissions: AI models, code runners and writing problems have their own, owner-granted where sensitive', async () => {
  // Admins write problems and verify accounts by default, but AI and runners stay with the owner.
  ok(await call('GET', '/api/authoring', c[BEA]), 'admins write problems');
  assert.equal((await call('GET', '/api/admin/ai', c[BEA])).status, 403);
  assert.equal((await call('GET', '/api/admin/runners', c[BEA])).status, 403);
  const me = await call('GET', '/api/admin/me', c[BEA]);
  assert.ok(me.body.permissions.includes('problems.author'));
  assert.ok(me.body.permissions.includes('users.verify'));
  assert.ok(!me.body.permissions.includes('ai.manage'));
  assert.equal(me.body.sections.ai, 'none');

  // Only the owner hands out AI models; then that section alone opens.
  assert.equal((await call('PUT', `/api/admin/users/${BEA}/permissions`, c[ADA], { grants: { 'ai.manage': true } })).status, 403, 'not an admin');
  ok(await call('PUT', `/api/admin/users/${BEA}/permissions`, c[OWNER], { grants: { 'ai.manage': true } }));
  ok(await call('GET', '/api/admin/ai', c[BEA]));
  assert.equal((await call('GET', '/api/admin/runners', c[BEA])).status, 403, 'runners are separate');
  assert.equal((await call('GET', '/api/admin/site', c[BEA])).status, 403, 'and so are site settings');

  // Moderators keep what they had: no problem writing.
  assert.equal((await call('GET', '/api/authoring', c[MOD])).status, 403);
});

test('people given the broad permission before the split keep the same access, once', async () => {
  sql("INSERT INTO user_permissions(username, perm, granted, granted_by, created_at) VALUES(?, 'site.settings', 1, ?, ?)", ZED, OWNER, Date.now());
  sql("INSERT INTO user_permissions(username, perm, granted, granted_by, created_at) VALUES(?, 'problems.manage', 1, ?, ?)", ZED, OWNER, Date.now());
  sql("DELETE FROM site_settings WHERE key = 'perm_split_2026_11'");
  await stopServer();
  await startServer();
  const r = await login(ZED);
  const me = await call('GET', '/api/admin/me', r.cookie);
  ok(me);
  for (const p of ['site.settings', 'ai.manage', 'runners.manage', 'problems.manage', 'problems.author']) assert.ok(me.body.permissions.includes(p), p);
  // Reset one to its default: the copy does not come back at the next start.
  sql("DELETE FROM user_permissions WHERE username = ? AND perm = 'ai.manage'", ZED);
  await stopServer();
  await startServer();
  const again = await call('GET', '/api/admin/me', (await login(ZED)).cookie);
  assert.ok(!again.body.permissions.includes('ai.manage'), 'runs only once');
});
