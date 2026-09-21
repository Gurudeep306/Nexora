const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

let serverProc;
let baseUrl;
let cookieHeader = '';

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

test.before(async () => {
  const port = 3300 + Math.floor(Math.random() * 400);
  baseUrl = `http://127.0.0.1:${port}`;
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProc.stdout.on('data', () => {});
  serverProc.stderr.on('data', () => {});
  await waitForServer(baseUrl);
});

test.after(async () => {
  if (!serverProc) return;
  serverProc.kill('SIGTERM');
  await new Promise(resolve => serverProc.once('exit', resolve));
});

test('health endpoint responds', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test('manual auth creates a session and blocks unauthenticated profile writes', async () => {
  const username = `codex_${Date.now()}`;

  const noSessionRes = await fetch(`${baseUrl}/api/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentUsername: username, displayName: 'No Session' }),
  });
  assert.equal(noSessionRes.status, 401);

  const registerRes = await fetch(`${baseUrl}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      display_name: 'Codex Smoke',
      password: 'pass1234',
      avatar: 'coder',
    }),
  });
  assert.equal(registerRes.status, 200);
  cookieHeader = registerRes.headers.get('set-cookie')?.split(';')[0] || '';
  assert.ok(cookieHeader.includes('nx.sid='));

  const authStatusRes = await fetch(`${baseUrl}/api/auth/status`, {
    headers: { Cookie: cookieHeader },
  });
  const authStatus = await authStatusRes.json();
  assert.equal(authStatus.ok, true);
  assert.equal(authStatus.authenticated, true);
  assert.equal(authStatus.user.username, username);

  const updateRes = await fetch(`${baseUrl}/api/user/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      currentUsername: username,
      displayName: 'Codex Updated',
      bio: 'Smoke test profile',
    }),
  });
  assert.equal(updateRes.status, 200);
  const updateBody = await updateRes.json();
  assert.equal(updateBody.ok, true);
  assert.equal(updateBody.user.display_name, 'Codex Updated');
});

test('quick run endpoint still executes code after refactor', async () => {
  const runRes = await fetch(`${baseUrl}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'javascript',
      code: 'console.log(8)',
      input: '',
    }),
  });
  assert.equal(runRes.status, 200);
  const runBody = await runRes.json();
  assert.equal((runBody.output || '').trim(), '8');
});

test('message metadata routes are not treated as conversations', async () => {
  const unread = await fetch(`${baseUrl}/api/messages/unread/ui_check`).then(res => res.json());
  assert.deepEqual(unread.counts, []);
  assert.equal(unread.total, 0);
  assert.equal(unread.messages, undefined);

  const reactions = await fetch(`${baseUrl}/api/messages/1/reactions`).then(res => res.json());
  assert.deepEqual(reactions.reactions, {});
  assert.equal(reactions.messages, undefined);
});
