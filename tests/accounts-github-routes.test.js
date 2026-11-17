// Connecting GitHub (src/server.js /auth/github/link): signed-in only; the
// trip to GitHub carries a one-time state tied to this session and account;
// an answer with a wrong or missing state is refused before anything is read.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-gh-'));
let proc, base, cookie;
let log = '';
async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early: ${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${log}`);
}
const get = (p, c = cookie) => fetch(`${base}${p}`, { redirect: 'manual', headers: c ? { Cookie: c } : {} });

test.before(async () => {
  const port = 30000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: path.join(tmp, 't.db'), DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', GITHUB_CLIENT_ID: 'cid-test', GITHUB_CLIENT_SECRET: 'secret-test', API_URL: base },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { log += d; });
  proc.stderr.on('data', (d) => { log += d; });
  await waitFor(`${base}/api/health`);
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: `gh${Date.now().toString(36)}`, email: 'x@t.io', password: 'secret123' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('the list says GitHub connects by OAuth and is set up', async () => {
  const r = await (await get('/api/accounts')).json();
  const gh = r.judges.find((j) => j.id === 'github');
  assert.deepEqual([gh.oauth, gh.configured], [true, true]);
  assert.ok(r.judges.some((j) => j.id === 'dmoj') && r.judges.some((j) => j.id === 'codechef'));
});

test('a code can not start a GitHub link', async () => {
  const r = await fetch(`${base}/api/accounts/github/start`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ handle: 'octocat' }) });
  assert.equal(r.status, 400);
});

test('Connect goes to GitHub with a state; a wrong state comes back refused', async () => {
  assert.match((await get('/auth/github/link', '')).headers.get('location') || '', /auth_error=signin_first/, 'signed-in only');
  const r = await get('/auth/github/link');
  assert.equal(r.status, 302);
  const to = new URL(r.headers.get('location'));
  assert.equal(to.host, 'github.com');
  assert.equal(to.searchParams.get('client_id'), 'cid-test');
  assert.match(to.searchParams.get('redirect_uri'), /\/auth\/github\/callback\/link$/);
  const state = to.searchParams.get('state');
  assert.match(state, /^[0-9a-f]{32}$/);
  const bad = await get('/auth/github/callback/link?code=abc&state=wrong');
  assert.match(bad.headers.get('location'), /link_error=expired/);
  // The state is single-use: even the right one fails after a wrong answer used it up.
  const again = await get(`/auth/github/callback/link?code=abc&state=${state}`);
  assert.match(again.headers.get('location'), /link_error=expired/);
  // Cancelled on GitHub.
  const r2 = await get('/auth/github/link');
  const s2 = new URL(r2.headers.get('location')).searchParams.get('state');
  assert.match((await get(`/auth/github/callback/link?error=access_denied&state=${s2}`)).headers.get('location'), /link_error=denied/);
});
