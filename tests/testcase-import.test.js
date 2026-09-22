// Importing a statement's samples as testcases must be one request, must never
// duplicate a case, and must survive being fired twice (auto-import racing a
// click on "Import all").
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-tcimport-'));
const DB = path.join(tmp, 'test.db');
let proc, base, cookie, pid;

const call = async (method, p, ck, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(ck ? { Cookie: ck } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers };
};

test.before(async () => {
  const port = 4400 + Math.floor(Math.random() * 300);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB);
  db.exec("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES('codeforces','8881A','Sum it','https://x',800,'[]')");
  pid = Number(db.prepare("SELECT id FROM problems WHERE problem_id='8881A'").get().id);
  db.close();
  const name = 'tc' + Date.now().toString(36);
  const r = await call('POST', '/api/user/register', null, { username: name, email: `${name}@t.io`, password: 'secret123' });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
test.after(() => proc?.kill('SIGKILL'));

const SAMPLES = [
  { label: 'Sample 1', input: '3\n1 2 3\n', expected_output: '6' },
  { label: 'Sample 2', input: '2\n5 5\n', expected_output: '10' },
];

test('bulk import inserts the whole batch in one request', async () => {
  const r = await call('POST', '/api/testcases/bulk', cookie, { problem_rowid: pid, testcases: SAMPLES });
  assert.equal(r.status, 200);
  assert.equal(r.body.added, 2);
  assert.equal(r.body.skipped, 0);
  assert.equal(r.body.testcases.length, 2);
});

test('re-importing the same samples adds nothing', async () => {
  const r = await call('POST', '/api/testcases/bulk', cookie, { problem_rowid: pid, testcases: SAMPLES });
  assert.equal(r.body.added, 0);
  assert.equal(r.body.skipped, 2);
});

test('de-duplication ignores line endings, labels and trailing blanks', async () => {
  const r = await call('POST', '/api/testcases/bulk', cookie, {
    problem_rowid: pid,
    testcases: [{ label: 'Renamed', input: '3\r\n1 2 3\r\n\n', expected_output: '6\n' }],
  });
  assert.equal(r.body.added, 0, 'same content in a different shape is the same testcase');
});

test('a genuinely new sample still gets added', async () => {
  const r = await call('POST', '/api/testcases/bulk', cookie, {
    problem_rowid: pid,
    testcases: [{ label: 'Sample 3', input: '1\n7\n', expected_output: '7' }],
  });
  assert.equal(r.body.added, 1);
  const p = await call('GET', `/api/problems/${pid}`, cookie);
  assert.equal((p.body.testcases || []).length, 3);
});

test('bulk import rejects nonsense and requires a session', async () => {
  assert.equal((await call('POST', '/api/testcases/bulk', cookie, { problem_rowid: pid, testcases: [] })).status, 400);
  assert.equal((await call('POST', '/api/testcases/bulk', null, { problem_rowid: pid, testcases: SAMPLES })).status, 401);
});
