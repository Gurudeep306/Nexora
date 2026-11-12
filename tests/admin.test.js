// Owner / admin system: roles + permissions, owner protections, bans,
// private mode ("coming soon" lockdown), feature flags, reports and the audit
// log (src/authz/*, src/routes/admin.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-admin-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `own${stamp}`;
const [ALICE, BOB, CARL, DAVE, ERIN] = ['al', 'bo', 'ca', 'da', 'er'].map((p) => `${p}${stamp}`);
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
  const port = 26000 + Math.floor(Math.random() * 1000);
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

test.before(startServer);
test.after(async () => {
  await stopServer();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('the owner comes from OWNER_USERNAME, else config/site.json', () => {
  const { execFileSync } = require('node:child_process');
  const probe = (env) =>
    execFileSync(process.execPath, ['-e', "process.stdout.write(String(require('./src/authz/site-settings').peekSettings().owner_username))"], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test', DB_PATH: ':memory:', ...env },
    }).toString();
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'site.json'), 'utf8'));
  assert.equal(cfg.owner, 'Gurudeep306');
  assert.equal(probe({ OWNER_USERNAME: '' }), 'Gurudeep306', 'committed default');
  assert.equal(probe({ OWNER_USERNAME: 'someone_else' }), 'someone_else', 'env overrides');
});

test('SITE_PRIVATE=1 forces private mode on (staging copies), even with the stored setting off', () => {
  const { execFileSync } = require('node:child_process');
  const probe = (env, enabled) =>
    execFileSync(process.execPath, ['-e', `const s=require('./src/authz/site-settings');process.stdout.write(String(s.privateModeActive({private_mode:{enabled:${enabled}},owner_username:'Gurudeep306'})))`], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test', DB_PATH: ':memory:', ...env },
    }).toString();
  assert.equal(probe({ SITE_PRIVATE: '' }, false), 'false', 'off by default');
  assert.equal(probe({ SITE_PRIVATE: '1' }, false), 'true', 'env forces it on');
  assert.equal(probe({ SITE_PRIVATE: '' }, true), 'true', 'stored setting still works');
});

test('private mode stays OFF until the owner account exists', async () => {
  assert.equal((await call('GET', '/api/problems')).status, 200, 'public: no owner account yet');
  assert.match(serverLog, /has no account yet/);
  const owner = await register(OWNER);
  assert.equal(owner.status, 200, JSON.stringify(owner.body));
  assert.equal(owner.body.user.role, 'owner', 'the owner name is reserved for the owner');
  c.owner = owner.cookie;
});

test('private mode turns ON at the first boot with the owner account', async () => {
  await stopServer();
  await startServer(); // same database, sessions survive
  assert.equal((await call('GET', '/api/health')).status, 200, 'health stays reachable');
  const api = await call('GET', '/api/problems');
  assert.equal(api.status, 403);
  assert.equal(api.body.code, 'site_private');
  const page = await call('GET', '/hub', null, null, { Accept: 'text/html' });
  assert.equal(page.status, 403);
  assert.match(page.text, /coming soon/i);
  assert.match(page.text, /Owner sign in/);
  const auth = await call('GET', '/auth', null, null, { Accept: 'text/html' });
  assert.notEqual(auth.status, 403, 'the sign-in page still loads');
  const status = await call('GET', '/api/site/status');
  assert.equal(status.status, 200);
  assert.equal(status.body.private, true);
  assert.equal(status.body.allowed, false);
  assert.equal((await call('GET', '/api/problems', c.owner)).status, 200, 'the owner gets in');
});

test('registration is closed while private', async () => {
  const r = await register(ALICE);
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'site_private');
});

test('an invite (allowlist entry) lets someone register and enter while private', async () => {
  const add = await call('POST', '/api/admin/site/allowlist', c.owner, { entry: ERIN, note: 'beta tester' });
  assert.equal(add.status, 200, JSON.stringify(add.body));
  const erin = await register(ERIN);
  assert.equal(erin.status, 200, JSON.stringify(erin.body));
  c.erin = erin.cookie;
  assert.equal((await call('GET', '/api/problems', c.erin)).status, 200, 'invited user has early access');
});

test('private mode off restores access; on again locks non-allowed users out', async () => {
  const off = await call('PUT', '/api/admin/site/private-mode', c.owner, { enabled: false });
  assert.equal(off.status, 200, JSON.stringify(off.body));
  await settle();
  for (const name of [ALICE, BOB, CARL, DAVE]) {
    const r = await register(name);
    assert.equal(r.status, 200, `register ${name}: ${JSON.stringify(r.body)}`);
    c[name] = r.cookie;
  }
  assert.equal((await call('GET', '/api/problems', c[ALICE])).status, 200);
  assert.equal((await call('GET', '/api/problems')).status, 200, 'anonymous visitors too');

  const on = await call('PUT', '/api/admin/site/private-mode', c.owner, { enabled: true, message: 'Back soon' });
  assert.equal(on.status, 200);
  await settle();
  const blocked = await call('GET', '/api/problems', c[ALICE]);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'site_private');
  assert.equal(blocked.body.message, 'Back soon');
  const relogin = await login(ALICE);
  assert.equal(relogin.status, 403, 'non-allowed users cannot sign in while private');
  assert.equal(relogin.body.code, 'site_private');
  assert.equal((await login(OWNER)).status, 200, 'the owner can always sign in');
  assert.equal((await call('GET', '/api/problems', c.erin)).status, 200, 'early access still works');

  const grant = await call('POST', `/api/admin/users/${ALICE}/early-access`, c.owner, { enabled: true });
  assert.equal(grant.status, 200);
  assert.equal((await call('GET', '/api/problems', c[ALICE])).status, 200, 'granted early access');
});

test('permission matrix: roles, rank and owner-only grants', async () => {
  // Only the owner makes admins.
  assert.equal((await call('POST', `/api/admin/users/${BOB}/role`, c.owner, { role: 'admin' })).status, 200);
  // Admins are let in while private.
  assert.equal((await call('GET', '/api/problems', c[BOB])).status, 200, 'admins pass private mode');
  const bobMakesAdmin = await call('POST', `/api/admin/users/${CARL}/role`, c[BOB], { role: 'admin' });
  assert.equal(bobMakesAdmin.status, 403, 'admins cannot create admins');
  assert.equal((await call('POST', `/api/admin/users/${CARL}/role`, c[BOB], { role: 'moderator' })).status, 200);
  assert.equal((await call('POST', `/api/admin/users/${CARL}/role`, c.owner, { role: 'owner' })).status, 400, 'owner cannot be granted');

  // Admin: users + audit, but not site settings (owner grants that).
  assert.equal((await call('GET', '/api/admin/users', c[BOB])).status, 200);
  assert.equal((await call('GET', '/api/admin/overview', c[BOB])).status, 200);
  assert.equal((await call('GET', '/api/admin/site', c[BOB])).status, 403);
  const bobGrants = await call('PUT', `/api/admin/users/${CARL}/permissions`, c[BOB], { grants: { 'site.settings': true } });
  assert.equal(bobGrants.status, 403, 'only the owner grants site.settings');

  // Moderator: user lookup + moderation, nothing else.
  const carl = await login(CARL); // moderators are not let in while private …
  assert.equal(carl.status, 403);
  assert.equal((await call('POST', `/api/admin/users/${CARL}/early-access`, c[BOB], { enabled: true })).status, 200);
  c[CARL] = (await login(CARL)).cookie; // … until given early access
  assert.equal((await call('GET', '/api/admin/users', c[CARL])).status, 200);
  assert.equal((await call('GET', '/api/admin/overview', c[CARL])).status, 403);
  assert.equal((await call('GET', '/api/admin/site', c[CARL])).status, 403);
  assert.equal((await call('POST', `/api/admin/users/${DAVE}/role`, c[CARL], { role: 'moderator' })).status, 403, 'no users.manage');
  // Nobody acts on an equal or higher role.
  assert.equal((await call('POST', `/api/admin/users/${BOB}/ban`, c[CARL], { kind: 'ban', reason: 'nope' })).status, 403);
  assert.equal((await call('POST', `/api/admin/users/${BOB}/role`, c[BOB], { role: 'member' })).status, 403, 'not on yourself either');

  // Members have no admin access at all.
  assert.equal((await call('GET', '/api/admin/me', c.erin)).status, 404);
  assert.equal((await call('GET', '/api/admin/users', c.erin)).status, 404);

  // Granular grants override the role: the owner gives Bob site.settings.
  const g = await call('PUT', `/api/admin/users/${BOB}/permissions`, c.owner, { grants: { 'site.settings': true } });
  assert.equal(g.status, 200, JSON.stringify(g.body));
  assert.ok(g.body.permissions.includes('site.settings'));
  assert.equal((await call('GET', '/api/admin/site', c[BOB])).status, 200);
  // … and can take a default away.
  await call('PUT', `/api/admin/users/${BOB}/permissions`, c.owner, { grants: { 'audit.view': false } });
  assert.equal((await call('GET', '/api/admin/audit', c[BOB])).status, 403);
  await call('PUT', `/api/admin/users/${BOB}/permissions`, c.owner, { grants: { 'audit.view': null } });
  assert.equal((await call('GET', '/api/admin/audit', c[BOB])).status, 200);

  // Existing admin-only routes now follow permissions (admins keep them).
  assert.notEqual((await call('GET', '/api/admin/judge-selftest?langs=none', c[BOB])).status, 403);
  assert.equal((await call('GET', '/api/admin/judge-selftest?langs=none', c.erin)).status, 404);
});

test('the owner cannot be demoted, banned, signed out or deleted by anyone', async () => {
  for (const cookie of [c[BOB], c.owner]) {
    assert.equal((await call('POST', `/api/admin/users/${OWNER}/role`, cookie, { role: 'member' })).status, 403);
    assert.equal((await call('POST', `/api/admin/users/${OWNER}/ban`, cookie, { kind: 'ban', reason: 'coup' })).status, 403);
    assert.equal((await call('POST', `/api/admin/users/${OWNER}/signout`, cookie, {})).status, 403);
  }
  assert.equal((await call('POST', '/api/admin/set-role', c[BOB], { targetUser: OWNER, role: 'member' })).status, 403);
  assert.equal((await call('DELETE', `/api/admin/users/${OWNER}`, c.owner, { confirm: OWNER })).status, 403);
  // A forged role in the DB does not make someone else the owner.
  sql("UPDATE users SET role='owner' WHERE username=?", DAVE);
  const me = await call('GET', '/api/site/status', c[DAVE]);
  assert.notEqual(me.body.me?.role, 'owner');
  sql("UPDATE users SET role='member' WHERE username=?", DAVE);
  const st = await call('GET', '/api/site/status', c.owner);
  assert.equal(st.body.me.role, 'owner');
  assert.equal(st.body.me.isOwner, true);
});

test('ban and suspend block sign-in and the API; unban restores', async () => {
  await call('PUT', '/api/admin/site/private-mode', c.owner, { enabled: false });
  await settle();
  // A ban that lands while a session is open blocks that session's API calls.
  sql("INSERT INTO user_bans(username, kind, reason, created_by, created_at) VALUES(?, 'ban', 'spam', 'test', ?)", DAVE, Date.now());
  const blocked = await call('GET', '/api/bookmarks', c[DAVE]);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'account_banned');
  const st = await call('GET', '/api/auth/status', c[DAVE]);
  assert.equal(st.body.authenticated, false, 'banned users are signed out');
  sql('UPDATE user_bans SET lifted_at=? WHERE username=?', Date.now(), DAVE);
  c[DAVE] = (await login(DAVE)).cookie;

  // Through the admin API (moderator Carl outranks member Dave).
  const ban = await call('POST', `/api/admin/users/${DAVE}/ban`, c[CARL], { kind: 'suspend', reason: 'cool off', hours: 24 });
  assert.equal(ban.status, 200, JSON.stringify(ban.body));
  assert.ok(ban.body.ban.until);
  const st2 = await call('GET', '/api/auth/status', c[DAVE]);
  assert.equal(st2.body.authenticated, false, 'force signed out');
  const l = await login(DAVE);
  assert.equal(l.status, 403);
  assert.equal(l.body.code, 'account_banned');
  assert.match(l.body.error, /suspended/);
  assert.equal((await call('POST', `/api/admin/users/${DAVE}/ban`, c[CARL], { kind: 'ban', reason: '' })).status, 400, 'reason is required');
  assert.equal((await call('POST', `/api/admin/users/${DAVE}/unban`, c[CARL], {})).status, 200);
  const back = await login(DAVE);
  assert.equal(back.status, 200);
  c[DAVE] = back.cookie;
});

test('feature flags switch sections off (the owner keeps access)', async () => {
  const r = await call('PUT', '/api/admin/site/flags', c.owner, { social: false });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await settle();
  const off = await call('GET', `/api/friends/${DAVE}`, c[DAVE]);
  assert.equal(off.status, 403);
  assert.equal(off.body.code, 'feature_disabled');
  assert.equal(off.body.feature, 'social');
  assert.notEqual((await call('GET', `/api/friends/${OWNER}`, c.owner)).body.code, 'feature_disabled');
  const st = await call('GET', '/api/site/status', c[DAVE]);
  assert.equal(st.body.flags.social, false);
  assert.equal(st.body.flags.gate, true);
  assert.equal((await call('PUT', '/api/admin/site/flags', c.owner, { social: 'nope' })).status, 400, 'validated');
  await call('PUT', '/api/admin/site/flags', c.owner, { social: true });
  await settle();
  assert.notEqual((await call('GET', `/api/friends/${DAVE}`, c[DAVE])).status, 403);
});

test('reports queue: report, remove, restore', async () => {
  const m = await call('POST', '/api/messages', c[DAVE], { from: DAVE, to: ALICE, content: 'rude words' });
  const id = m.body.message.id;
  const rep = await call('POST', '/api/reports', c[ALICE], { content_type: 'message', content_id: id, reason: 'harassment' });
  assert.equal(rep.status, 200, JSON.stringify(rep.body));
  assert.equal((await call('POST', '/api/reports', c[ALICE], { content_type: 'message', content_id: id, reason: 'again' })).body.duplicate, true);
  assert.equal((await call('POST', '/api/reports', c[ALICE], { content_type: 'Bad Type!', content_id: 1, reason: 'x1' })).status, 400);
  assert.equal((await call('POST', '/api/reports', null, { content_type: 'post', content_id: 1, reason: 'spam' })).status, 401);
  // Generic: a type with no table yet (posts from the social feed).
  assert.equal((await call('POST', '/api/reports', c[ALICE], { content_type: 'post', content_id: 'p-1', reason: 'spam', target_user: DAVE })).status, 200);

  const q = await call('GET', '/api/admin/reports', c[CARL]);
  assert.equal(q.status, 200);
  const report = q.body.reports.find((r) => r.content_type === 'message' && String(r.content_id) === String(id));
  assert.ok(report);
  assert.equal(report.target_user, DAVE);
  assert.equal(report.snapshot, 'rude words');
  assert.equal((await call('GET', '/api/admin/reports', c.erin)).status, 404);

  const res = await call('POST', `/api/admin/reports/${report.id}/resolve`, c[CARL], { action: 'remove', note: 'abusive' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const convo = await call('GET', `/api/messages/${ALICE}/${DAVE}`, c[ALICE]);
  assert.match(convo.body.messages.find((x) => x.id === id).content, /removed/);
  assert.equal((await call('POST', '/api/admin/content/restore', c[CARL], { content_type: 'message', content_id: id })).status, 200);
  const convo2 = await call('GET', `/api/messages/${ALICE}/${DAVE}`, c[ALICE]);
  assert.equal(convo2.body.messages.find((x) => x.id === id).content, 'rude words');
  const warn = await call('POST', `/api/admin/users/${DAVE}/warn`, c[CARL], { reason: 'Be kind' });
  assert.equal(warn.status, 200);
  const st = await call('GET', '/api/site/status', c[DAVE]);
  assert.equal(st.body.notices[0].reason, 'Be kind');
});

test('announcements: banner + broadcast; pinning is owner-only', async () => {
  const b = await call('POST', '/api/admin/announcements', c[BOB], { kind: 'banner', body: 'Contest on Sunday', link: '/contests', color: 'info', hours: 24 });
  assert.equal(b.status, 200, JSON.stringify(b.body));
  assert.equal((await call('POST', '/api/admin/announcements', c[BOB], { body: 'x pinned', pinned: true })).status, 403);
  assert.equal((await call('POST', '/api/admin/announcements', c[BOB], { body: 'bad link', link: 'javascript:alert(1)' })).status, 400);
  assert.equal((await call('POST', '/api/admin/announcements', c.owner, { body: 'Pinned by owner', pinned: true })).status, 200);
  assert.equal((await call('POST', '/api/admin/announcements', c[BOB], { kind: 'broadcast', title: 'Hi', body: 'Welcome all' })).status, 200);
  const st = await call('GET', '/api/site/status', c[DAVE]);
  assert.equal(st.body.banners[0].body, 'Pinned by owner', 'pinned first');
  assert.ok(st.body.banners.some((x) => x.body === 'Contest on Sunday'));
  assert.equal(st.body.broadcasts[0].body, 'Welcome all');
});

test('admin writes need JSON (CSRF) and are validated', async () => {
  const r = await fetch(`${base}/api/admin/users/${DAVE}/verify`, {
    method: 'POST',
    headers: { Cookie: c.owner, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'verified=true',
  });
  assert.equal(r.status, 415);
  assert.equal((await call('POST', `/api/admin/users/${DAVE}/verify`, c.owner, { verified: 'yes' })).status, 400);
  assert.equal((await call('POST', `/api/admin/users/${DAVE}/verify`, c.owner, { verified: true })).status, 200);
  const badges = await call('GET', '/api/site/badges', c[DAVE]);
  assert.equal(badges.body.owner, OWNER);
  assert.equal(badges.body.staff[BOB], 'admin');
  assert.equal(badges.body.staff[CARL], 'moderator');
  assert.ok(badges.body.verified.includes(DAVE));
  assert.equal((await call('GET', '/api/admin/users/..%2Fx', c.owner)).status, 400);
});

test('audit log records admin actions; admins cannot see the owner\'s', async () => {
  const all = await call('GET', '/api/admin/audit?limit=200', c.owner);
  assert.equal(all.status, 200);
  const actions = all.body.entries.map((e) => e.action);
  for (const a of ['site.private_mode', 'user.role', 'user.permissions', 'user.suspend', 'user.unban', 'site.feature_flags', 'report.remove', 'content.restore', 'user.warn', 'user.verify', 'site.allowlist.add']) {
    assert.ok(actions.includes(a), `audit has ${a}`);
  }
  const role = all.body.entries.find((e) => e.action === 'user.role' && e.target === BOB);
  assert.equal(role.actor, OWNER);
  assert.deepEqual(role.before, { role: 'member' });
  assert.deepEqual(role.after, { role: 'admin' });
  assert.ok(role.ip);
  const bobs = await call('GET', '/api/admin/audit?limit=200', c[BOB]);
  assert.ok(bobs.body.entries.length > 0);
  assert.ok(bobs.body.entries.every((e) => e.actor !== OWNER), 'owner actions hidden from admins');
  assert.ok(bobs.body.entries.some((e) => e.actor === CARL), 'moderator actions visible');
  const filtered = await call('GET', `/api/admin/audit?action=user.&actor=${CARL}`, c.owner);
  assert.ok(filtered.body.entries.every((e) => e.actor === CARL && e.action.startsWith('user.')));
});

test('user search, filters and detail', async () => {
  const s = await call('GET', `/api/admin/users?q=${DAVE}`, c[BOB]);
  assert.equal(s.body.total, 1);
  assert.equal(s.body.users[0].verified, true);
  const mods = await call('GET', '/api/admin/users?role=moderator', c[BOB]);
  assert.deepEqual(mods.body.users.map((u) => u.username), [CARL]);
  const early = await call('GET', '/api/admin/users?status=early', c.owner);
  assert.ok(early.body.users.some((u) => u.username === ERIN));
  const d = await call('GET', `/api/admin/users/${DAVE}`, c[BOB]);
  assert.equal(d.status, 200);
  assert.ok(d.body.bans.length >= 1);
  assert.ok(d.body.warnings.length >= 1);
  assert.equal(d.body.user.password_hash, undefined);
  assert.equal(d.body.canAct, true);
});

test('only the owner deletes accounts, with type-to-confirm', async () => {
  assert.equal((await call('DELETE', `/api/admin/users/${ERIN}`, c[BOB], { confirm: ERIN })).status, 403);
  assert.equal((await call('DELETE', `/api/admin/users/${ERIN}`, c.owner, { confirm: 'wrong' })).status, 400);
  assert.equal((await call('DELETE', `/api/admin/users/${ERIN}`, c.owner, { confirm: ERIN })).status, 200);
  assert.equal((await call('GET', `/api/admin/users/${ERIN}`, c.owner)).status, 404);
  assert.equal((await call('GET', '/api/auth/status', c.erin)).body.authenticated, false);
});

test('the admin API does not exist (404) for anyone without an admin permission', async () => {
  const probes = [
    ['GET', '/api/admin/me'],
    ['GET', '/api/admin/overview'],
    ['GET', '/api/admin/users'],
    ['GET', `/api/admin/users/${OWNER}`],
    ['GET', '/api/admin/audit'],
    ['GET', '/api/admin/site'],
    ['POST', `/api/admin/users/${OWNER}/ban`, { kind: 'ban', reason: 'probe' }],
    ['POST', '/api/admin/set-role', { targetUser: ALICE, role: 'admin' }],
    ['PUT', '/api/admin/site/private-mode', { enabled: false }],
    ['GET', '/api/admin/nonexistent'],
  ];
  for (const [m, p, body] of probes) {
    for (const [who, cookie] of [['anonymous', null], ['member', c[DAVE]]]) {
      const r = await call(m, p, cookie, body);
      assert.equal(r.status, 404, `${who} ${m} ${p}`);
      assert.equal(r.body.error, 'API endpoint not found');
    }
  }
  // Same answer as a route that really doesn't exist.
  assert.deepEqual((await call('GET', '/api/admin/me', c[DAVE])).body, (await call('GET', '/api/nope-nope')).body);
  // Staff missing one permission get a plain 403 instead.
  assert.equal((await call('GET', '/api/admin/site', c[CARL])).status, 403);
  assert.equal((await call('GET', '/api/admin/me', c[CARL])).status, 200);
});

test('client: /admin is gated before its chunk loads, and admin UI is staff-only', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', 'client', 'src', p), 'utf8');
  const app = read('App.tsx');
  // AdminPage is only ever rendered inside AdminRoute, which checks staff
  // permissions first — so the lazy import never runs for members.
  assert.match(app, /<Route path="\/admin" element={<AdminRoute \/>} \/>/);
  const gate = read('components/admin/AdminRoute.tsx');
  assert.match(gate, /isStaff/);
  assert.match(gate, /NotFoundPage/);
  assert.ok(gate.indexOf('if (!isStaff)') < gate.indexOf('<AdminPage'), 'permission check before the lazy page');
  // Not prefetched for everyone.
  const routes = read('routes.ts');
  const common = routes.match(/COMMON_ROUTES = \[([^\]]*)\]/)[1];
  assert.doesNotMatch(common, /admin/);
  // Menu / palette entries require staff (and disappear in "view as member").
  assert.match(read('components/layout/UserMenu.tsx'), /isStaff &&/);
  // Search (top bar and palette) builds its page list in one place.
  const sources = read('components/layout/searchSources.ts');
  assert.match(sources, /isStaff \? \[\{ \.\.\.ADMIN_ITEM/);
  assert.match(sources, /featureOn\(featureForPath/);
  assert.match(read('components/layout/CommandPalette.tsx'), /usePageEntries\(\)/);
  assert.match(read('context/SiteContext.tsx'), /isStaff: !preview/);
});
