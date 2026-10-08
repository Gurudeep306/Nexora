// Security regression tests for src/middleware/authz.js: users must not be
// able to read other people's DMs or act under someone else's name.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

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
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, email: `${name}@t.io`, password: 'secret123' }),
  });
  assert.equal(r.status, 200, `register ${name}`);
  return r.headers.get('set-cookie').split(';')[0];
}
const call = (method, path, cookie, body) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

let alice, bob, eve;
const A = `al${Date.now().toString(36)}`, B = `bo${Date.now().toString(36)}`, E = `ev${Date.now().toString(36)}`;

test.before(async () => {
  const port = 22000 + Math.floor(Math.random() * 1000);
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
  await waitFor(`${base}/api/health`);
  alice = await signup(A);
  bob = await signup(B);
  eve = await signup(E);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('messages are sent as the logged-in user, not the claimed sender', async () => {
  const r = await (await call('POST', '/api/messages', eve, { from: A, to: B, content: 'hi from "alice"' })).json();
  assert.equal(r.ok, true);
  assert.equal(r.message.from_user, E, 'forged "from" must be replaced by the session user');
});

test('only the two participants can read a conversation', async () => {
  await call('POST', '/api/messages', alice, { from: A, to: B, content: 'secret' });
  assert.equal((await call('GET', `/api/messages/${A}/${B}`, eve)).status, 403);
  assert.equal((await call('GET', `/api/messages/${A}/${B}`)).status, 401);
  const ok = await (await call('GET', `/api/messages/${B}/${A}`, bob)).json();
  assert.ok(ok.messages.some((m) => m.content === 'secret'));
  assert.equal((await call('GET', `/api/messages/unread/${B}`, eve)).status, 403);
});

test('friend requests cannot be forged or accepted by a third party', async () => {
  const r = await (await call('POST', '/api/friends/request', eve, { from: A, to: B })).json();
  assert.equal(r.ok, true);
  const reqs = await (await call('GET', `/api/friends/${B}/requests`, bob)).json();
  const req = (reqs.requests || reqs.incoming || []).find((x) => x.from_user === E || x.username === E) || (reqs.requests || [])[0];
  assert.ok(req, 'bob sees the request, sent from eve (not alice)');
  assert.equal((await call('POST', '/api/friends/accept', alice, { id: req.id })).status, 403);
  assert.equal((await call('GET', `/api/friends/${B}/requests`, eve)).status, 403);
});

test('code execution and AI need an account; catalog sync needs admin', async () => {
  assert.equal((await call('POST', '/api/run', null, { language: 'python', code: 'print(1)' })).status, 401);
  assert.equal((await call('POST', '/api/ai-chat', null, { question: 'x' })).status, 401);
  assert.equal((await call('POST', '/api/sync', eve, {})).status, 403);
  assert.equal((await call('POST', '/api/settings', null, { cf_handle: 'x' })).status, 401);
});

test('bookmarks belong to the session user', async () => {
  await call('POST', '/api/bookmarks', eve, { username: A, problemId: 1 });
  const mine = await (await call('GET', `/api/bookmarks?username=${A}`, eve)).json();
  const alices = await (await call('GET', `/api/bookmarks?username=${A}`, alice)).json();
  assert.equal(alices.problemIds.length, 0, "eve's bookmark must not land in alice's list");
  assert.ok(Array.isArray(mine.problemIds));
});

test('registering an existing username never signs you in as that user', async () => {
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: A, email: 'x@evil.io', password: 'whatever123' }),
  });
  assert.equal(r.status, 409);
  assert.equal(r.headers.get('set-cookie'), null, 'no session for the attacker');
});

test('short passwords are rejected at sign-up', async () => {
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `pw${Date.now().toString(36)}`, password: '123' }),
  });
  assert.equal(r.status, 400);
});
