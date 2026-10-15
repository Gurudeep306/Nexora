// Security regression tests for sign-in, sessions and admin rights:
// look-alike usernames must not become admins, admins editing other people
// must not be switched into their account, private AI chat history needs a
// login, and the login form is rate limited.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-authsec-'));
const DB = path.join(tmp, 'test.db');
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
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers };
};
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
async function signup(name) {
  const r = await call('POST', '/api/user/register', null, { username: name, email: `${name}@t.io`, password: 'secret123' });
  assert.equal(r.status, 200, `register ${name}: ${JSON.stringify(r.body)}`);
  return { cookie: cookieOf(r), user: r.body.user };
}
function sql(stmt, ...args) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB);
  try { return db.prepare(stmt).run(...args); } finally { db.close(); }
}

const stamp = Date.now().toString(36).slice(-6);
const ADMIN = `boss${stamp}`;
const VICTIM = `vic${stamp}`;
let admin, victim;

test.before(async () => {
  const port = 25000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: DB,
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  admin = await signup(ADMIN);
  victim = await signup(VICTIM);
  // Admin is granted only through the stored role.
  sql("UPDATE users SET role='admin' WHERE username=?", ADMIN);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('a formerly hardcoded admin name registers as a plain member', async () => {
  const { user } = await signup('GuruDeep');
  assert.equal(user.role, 'member');
});

test('a case variant of an existing username is rejected as taken', async () => {
  const variant = ADMIN.toUpperCase();
  const r = await call('POST', '/api/user/register', null, { username: variant, password: 'secret123' });
  assert.equal(r.status, 409);
  assert.equal(r.headers.get('set-cookie'), null, 'no session for the look-alike');
  const check = await call('GET', `/api/user/check-username?username=${variant}`);
  assert.equal(check.body.available, false);
});

test('renaming to a case variant of someone else is rejected', async () => {
  const r = await call('PUT', '/api/user/profile', victim.cookie, { currentUsername: VICTIM, newUsername: ADMIN.toUpperCase() });
  assert.equal(r.status, 400);
});

test('a role read from the database applies immediately (demotion)', async () => {
  assert.equal((await call('GET', '/api/admin/users', admin.cookie)).status, 200);
  sql("UPDATE users SET role='member' WHERE username=?", ADMIN);
  assert.equal((await call('GET', '/api/admin/users', admin.cookie)).status, 404, 'demoted admin loses rights (the admin API 404s)');
  sql("UPDATE users SET role='admin' WHERE username=?", ADMIN);
  assert.equal((await call('GET', '/api/admin/users', admin.cookie)).status, 200);
});

test("an admin editing someone else's profile stays signed in as themselves", async () => {
  const r = await call('PUT', '/api/user/profile', admin.cookie, { currentUsername: VICTIM, displayName: 'Edited by admin' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.user.username, VICTIM);
  assert.equal(r.body.user.display_name, 'Edited by admin');
  assert.equal(r.body.user.password_hash, undefined, 'no password hash in the response');
  assert.equal(r.body.user.email, undefined, "no other user's email in the response");
  const status = await call('GET', '/api/auth/status', admin.cookie);
  assert.equal(status.body.user.username, ADMIN, 'session was not switched to the victim');
});

test('editing your own profile never returns the password hash', async () => {
  const r = await call('PUT', '/api/user/profile', victim.cookie, { currentUsername: VICTIM, bio: 'hi' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.password_hash, undefined);
});

test('AI chat history is private and needs a login', async () => {
  assert.equal((await call('GET', `/api/agent/conversations?username=${VICTIM}`)).status, 401);
  assert.equal((await call('DELETE', `/api/agent/conversations/x?username=${VICTIM}`)).status, 401);
  const mine = await call('GET', `/api/agent/conversations?username=${VICTIM}`, admin.cookie);
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.body.conversations, [], 'a ?username= override is ignored');
});

test('signing in issues a new session id (no session fixation)', async () => {
  const r = await call('POST', '/api/user/login', victim.cookie, { username: VICTIM, password: 'secret123' });
  assert.equal(r.status, 200);
  const fresh = cookieOf(r);
  assert.ok(fresh, 'a session cookie is set');
  assert.notEqual(fresh, victim.cookie);
  assert.equal((await call('GET', '/api/auth/status', fresh)).body.user.username, VICTIM);
  assert.equal((await call('GET', '/api/auth/status', victim.cookie)).body.authenticated, false, 'the old id is dead');
  victim.cookie = fresh;
});

test('contest passwords are hashed with scrypt and still verify', async () => {
  const created = await call('POST', '/api/contests/create', admin.cookie, {
    creator: ADMIN, title: 'T', type: 'speed', password: 'pass1234', start_time: new Date().toISOString(),
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const code = created.body.contest_code;
  const bad = await call('POST', '/api/contests/join', victim.cookie, { contest_code: code, password: 'nope' });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error, 'Wrong password');
  assert.equal((await call('POST', '/api/contests/join', victim.cookie, { contest_code: code, password: 'pass1234' })).status, 200);

  // Contests created before the switch (static-salt SHA-256) still work.
  const legacy = require('node:crypto').createHash('sha256').update('old12345nexora_salt').digest('hex');
  const legacyCode = `NX-L${stamp.slice(-5).toUpperCase()}`;
  sql("INSERT INTO custom_contests(creator,title,type,contest_code,password_hash,start_time) VALUES(?,?,?,?,?,?)",
    ADMIN, 'Legacy', 'speed', legacyCode, legacy, new Date().toISOString());
  assert.equal((await call('POST', '/api/contests/join', victim.cookie, { contest_code: legacyCode, password: 'wrong' })).status, 401);
  assert.equal((await call('POST', '/api/contests/join', victim.cookie, { contest_code: legacyCode, password: 'old12345' })).status, 200);
});

test('login gives one generic error and is rate limited', async () => {
  const unknown = await call('POST', '/api/user/login', null, { username: `nobody${stamp}`, password: 'whatever1' });
  const wrong = await call('POST', '/api/user/login', null, { username: VICTIM, password: 'whatever1' });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.equal(unknown.body.error, wrong.body.error, 'unknown user and wrong password look the same');
  assert.ok(wrong.headers.get('ratelimit-policy') || wrong.headers.get('ratelimit'), 'login sends rate-limit headers');

  let last;
  for (let i = 0; i < 12; i++) {
    last = await call('POST', '/api/user/login', null, { username: VICTIM, password: `bad${i}xx` });
    if (last.status === 429) break;
  }
  assert.equal(last.status, 429, 'repeated failed logins are throttled');
});
