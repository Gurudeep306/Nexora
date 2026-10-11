// Regression tests for LiveClass (/api/live) access control:
// the live routes used to 500 on every write, private classes were open to
// everyone, and any signed-in user could delete other teachers' content.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-live-'));
const DB = path.join(tmp, 'test.db');
function sql(stmt, ...args) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB);
  try { return db.prepare(stmt).run(...args); } finally { db.close(); }
}

let proc;
let base;
let serverLog = '';

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const cookieOf = (r) => r.headers.get('set-cookie').split(';')[0];
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, email: `${name}@t.io`, password: 'secret123' }),
  });
  assert.equal(r.status, 200, `register ${name}`);
  return cookieOf(r);
}
async function login(name) {
  const r = await fetch(`${base}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: 'secret123' }),
  });
  assert.equal(r.status, 200, `login ${name}`);
  return cookieOf(r);
}
const call = (method, path, cookie, body) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
const json = async (p) => (await p).json();

const id = Date.now().toString(36);
const T1 = `ta${id}`, T2 = `tb${id}`, S = `st${id}`;
let teacher1, teacher2, stranger;

test.before(async () => {
  const port = 23000 + Math.floor(Math.random() * 1000);
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

  await signup(T1);
  await signup(T2);
  stranger = await signup(S);
  // Roles are granted only through the stored role, never by username.
  for (const t of [T1, T2]) sql("UPDATE users SET role='teacher' WHERE username=?", t);
  // Sign in again so the session carries the new role.
  teacher1 = await login(T1);
  teacher2 = await login(T2);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function liveClass(cookie, body) {
  const r = await call('POST', '/api/live/classes', cookie, body);
  assert.equal(r.status, 200, 'create class');
  const cls = (await r.json()).class;
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/start`, cookie)).status, 200, 'start class');
  return cls;
}

test('live class create / start / join / message / leave / end all work', async () => {
  const cls = await liveClass(teacher1, { title: 'Graphs 101' });
  const j = await call('POST', `/api/live/classes/${cls.id}/join`, stranger);
  assert.equal(j.status, 200);
  assert.equal((await j.json()).participant.user_id, S);
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/messages`, stranger, { message: 'hi' })).status, 200);
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/leave`, stranger)).status, 200);
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/join`, stranger)).status, 200, 'rejoin');
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/end`, teacher1)).status, 200);
  const att = await json(call('GET', `/api/live/classes/${cls.id}/attendance`, teacher1));
  const me = att.attendance.find((p) => p.user_id === S);
  assert.ok(me.attendance_seconds >= 0 && me.attendance_seconds < 60, 'attendance is measured in UTC');
});

test('a full class turns away extra students', async () => {
  const cls = await liveClass(teacher1, { title: 'Tiny', max_participants: 1 });
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/join`, stranger)).status, 200);
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/join`, teacher2)).status, 409);
});

test('private classes are hidden from strangers until invited', async () => {
  const cls = await liveClass(teacher1, { title: 'Secret', is_public: false });
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/join`, stranger)).status, 403);
  assert.equal((await call('GET', `/api/live/classes/${cls.id}`, stranger)).status, 403);
  assert.equal((await call('GET', `/api/live/classes/${cls.id}/messages`, stranger)).status, 403);
  assert.equal((await call('GET', `/api/live/classes/${cls.id}/participants`, stranger)).status, 403);
  assert.equal((await call('GET', `/api/live/classes/${cls.id}/recordings`, stranger)).status, 403);
  const list = await json(call('GET', '/api/live/classes', stranger));
  assert.ok(!list.classes.some((c) => c.id === cls.id), 'not listed for a stranger');

  // Another teacher can't invite people to someone else's class.
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/invite`, teacher2, { user_id: S })).status, 403);
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/invite`, teacher1, { user_id: S })).status, 200);
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/join`, stranger)).status, 200);
});

test("another teacher can't add or publish recordings on someone else's class", async () => {
  const cls = await liveClass(teacher1, { title: 'Recorded' });
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/recordings`, teacher2, { file_url: '/x.webm' })).status, 403);
  const rec = await json(call('POST', `/api/live/classes/${cls.id}/recordings`, teacher1, { file_url: '/r.webm' }));
  assert.equal(rec.ok, true);
  const body = { recording_id: rec.id };
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/publish-recording`, teacher2, body)).status, 403);
  assert.equal((await call('GET', `/api/live/classes/${cls.id}/attendance`, teacher2)).status, 403);
  assert.equal((await call('POST', `/api/live/classes/${cls.id}/publish-recording`, teacher1, body)).status, 200);
});
