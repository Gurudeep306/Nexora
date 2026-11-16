// Admin → Code runners: add our own Piston servers with a password, test
// them, and check that code really runs on them, with each runner only given
// the languages it has (src/runners.js, /api/admin/runners*). A fake Piston
// runs on localhost; nothing leaves this machine.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-runners-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `own${stamp}`;
const TOKEN = `runner-pass-${stamp}-wxyz`;
let proc, base, fake, fakeUrl;
let serverLog = '';
const executed = []; // { language, code }

function startFakePiston() {
  return new Promise((resolve) => {
    fake = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        if (req.headers.authorization !== `Bearer ${TOKEN}`) {
          res.writeHead(401);
          return res.end();
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        if (req.url === '/api/v2/runtimes') {
          return res.end(JSON.stringify([
            { language: 'python', version: '3.12.0', aliases: ['py', 'python3'] },
            { language: 'c++', version: '10.2.0', aliases: ['cpp', 'g++'] },
          ]));
        }
        const j = JSON.parse(body || '{}');
        executed.push({ language: j.language, code: j.files?.[0]?.content });
        const out = j.files?.[0]?.content === 'print(6*7)' ? '42\n' : 'from our runner\n';
        return res.end(JSON.stringify({ run: { stdout: out, stderr: '', code: 0, signal: null, status: null, wall_time: 3 } }));
      });
    });
    fake.listen(0, '127.0.0.1', () => {
      fakeUrl = `http://127.0.0.1:${fake.address().port}`;
      resolve();
    });
  });
}

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${serverLog}`);
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json, headers: r.headers };
};
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];

let owner, member;

test.before(async () => {
  await startFakePiston();
  const port = 28000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, OWNER_USERNAME: OWNER, JUDGE_MODE: 'remote', DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' };
  delete env.PISTON_URL;
  proc = spawn(process.execPath, ['src/server.js'], { cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  owner = cookieOf(await call('POST', '/api/user/register', null, { username: OWNER, password: 'secret123' }));
  await call('PUT', '/api/admin/site/private-mode', owner, { enabled: false });
  member = cookieOf(await call('POST', '/api/user/register', null, { username: `mem${stamp}`, password: 'secret123' }));
});

test.after(async () => {
  if (proc) {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  }
  fake?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('only site.settings can see or add code runners', async () => {
  assert.equal((await call('GET', '/api/admin/runners', member)).status, 404);
  const r = await call('GET', '/api/admin/runners', owner);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.runners, []);
  assert.ok(r.body.hosts.some((h) => h.id === 'oracle'));
});

test('a plain http address on the internet is refused', async () => {
  const r = await call('POST', '/api/admin/runners', owner, { url: 'http://1.2.3.4', token: 'x' });
  assert.equal(r.status, 400);
});

test('a wrong password is reported, sealed at rest and never returned', async () => {
  const r = await call('POST', '/api/admin/runners', owner, { name: 'Wrong', host: 'oracle', url: fakeUrl, token: 'nope-1234' });
  assert.equal(r.status, 200);
  assert.equal(r.body.runner.test.ok, false);
  assert.match(r.body.runner.test.error, /password was refused/);
  assert.equal(r.body.runner.last4, '1234');
  assert.ok(!JSON.stringify(r.body).includes('nope-1234'));
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB);
  const row = db.prepare("SELECT value FROM site_settings WHERE key='judge_runners'").get();
  db.close();
  assert.ok(row && !row.value.includes('nope-1234'), 'the password is sealed at rest');
  await call('DELETE', `/api/admin/runners/${r.body.runner.id}`, owner);
});

test('a working runner is tested, then runs the languages it has', async () => {
  const add = await call('POST', '/api/admin/runners', owner, { name: 'Oracle free', host: 'oracle', url: `${fakeUrl}/`, token: TOKEN });
  assert.equal(add.body.runner.test.ok, true, JSON.stringify(add.body.runner.test));
  assert.ok(add.body.runner.test.languages.includes('python'));
  assert.ok(executed.some((e) => e.code === 'print(6*7)'), 'the test ran a real program');
  assert.equal((await call('POST', '/api/admin/runners', owner, { url: fakeUrl, token: TOKEN })).status, 400, 'no duplicates');

  // The judge reads the list from its cache; a save refreshes it at once.
  const langs = await (await fetch(`${base}/api/languages`)).json();
  const by = Object.fromEntries(langs.map((l) => [l.id, l]));
  assert.equal(by.python.runners[0], 'piston', 'our runner goes first');
  assert.ok(!by.haskell.runners.includes('piston'), 'not for a language it lacks');

  const ran = await call('POST', '/api/run', owner, { code: 'print("hi")', input: '', language: 'python' });
  assert.equal(ran.body.output?.trim?.() ?? ran.body.stdout?.trim(), 'from our runner');

  // Switched off: the judge stops using it.
  await call('PUT', `/api/admin/runners/${add.body.runner.id}`, owner, { enabled: false });
  const after = Object.fromEntries((await (await fetch(`${base}/api/languages`)).json()).map((l) => [l.id, l]));
  assert.ok(!after.python.runners.includes('piston'));
});
