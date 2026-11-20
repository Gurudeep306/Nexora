// The solver's AI tools over HTTP: code analysis (measured metrics + real runs
// even with no AI configured) and the test generator's errors.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-coding-'));
const DB = path.join(tmp, 'test.db');
let proc, base, cookie, pid;
let serverLog = '';

const call = async (method, p, ck, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(ck ? { Cookie: ck } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers };
};

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  serverLog = '';
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: DB,
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
      GROQ_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  let ready = false;
  for (let i = 0; i < 160; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch { /* not up yet */ }
    if (proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error(`server not ready within 40s: ${serverLog}`);
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
  db.exec("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES('codeforces','8881A','Sum it','https://x',800,'[]')");
  pid = Number(db.prepare("SELECT id FROM problems WHERE problem_id='8881A'").get().id);
  db.close();
  const name = 'tc' + Date.now().toString(36);
  const r = await call('POST', '/api/user/register', null, { username: name, email: `${name}@t.io`, password: 'secret123' });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});


const CODE = `import sys
d = sys.stdin.read().split()
n = int(d[0])
a = list(map(int, d[1:1 + n]))
best = 0
for i in range(n):
    for j in range(i + 1, n):
        best = max(best, a[i] + a[j])
print(best)
`;

test('analysis needs a login', async () => {
  const r = await call('POST', '/api/ai/analyze', null, { code: 'print(1)', language: 'python' });
  assert.equal(r.status, 401);
});

test('analysis measures the code and runs it on the given inputs, even with no AI configured', async () => {
  const big = `300\n${Array.from({ length: 300 }, (_, i) => i % 97).join(' ')}\n`;
  const r = await call('POST', '/api/ai/analyze', cookie, { problem_id: pid, code: CODE, language: 'python', inputs: [{ label: 'Large', input: big }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const m = r.body.metrics;
  assert.equal(m.loopDepth, 2);
  assert.equal(m.functions, 0);
  assert.ok(m.cyclomatic >= 3);
  assert.equal(r.body.runs.length, 1);
  assert.equal(r.body.runs[0].verdict, 'OK');
  assert.equal(r.body.runs[0].outputPreview.trim(), '192');
  assert.equal(typeof r.body.runs[0].timeMs, 'number');
  assert.match(r.body.ai.error, /not configured|unavailable/i);
});

test('analysis rejects empty code', async () => {
  const r = await call('POST', '/api/ai/analyze', cookie, { code: '   ', language: 'python' });
  assert.equal(r.status, 400);
});

test('test generation explains when there is nothing to generate from', async () => {
  const r = await call('POST', '/api/ai/testgen', cookie, { problem_id: pid });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /no statement/);
});

test('test generation reports a missing AI key as an error line', async () => {
  const r = await fetch(`${base}/api/ai/testgen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ title: 'Sum', statement: 'Read n and n integers and print their sum. 1 <= n <= 100.', samples: [{ input: '2\n1 2\n', output: '3\n' }] }),
  });
  const lines = (await r.text()).trim().split('\n').map((l) => JSON.parse(l));
  const last = lines[lines.length - 1];
  assert.equal(last.ok, false);
  assert.match(last.error, /not configured/i);
});
