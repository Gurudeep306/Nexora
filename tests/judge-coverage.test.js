// A verdict says what it rests on (POST /api/judge → coverage): Codeforces'
// own tests when the open dataset has them, else only the examples (and the
// student's own tests). "Accepted" on examples alone must never look like a
// full check: the client shows "Passed the examples" from this field.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-cov-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36);
let proc, base, cookie;
let serverLog = '';
const call = async (method, p, body) => {
  const r = await fetch(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
function withDb(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 });
  try { return fn(db); } finally { db.close(); }
}
const addProblem = (platform, pid, samples) => withDb((db) => {
  db.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES(?,?,?,?,800,'[]','math')").run(platform, pid, `T ${pid}`, `https://judge.example/${pid}`);
  const id = Number(db.prepare('SELECT id FROM problems WHERE problem_id=?').get(pid).id);
  db.prepare("INSERT INTO problem_statements(problem_rowid, statement, samples, scraped_at) VALUES(?,?,?,?)").run(id, 'Read w and print YES or NO, a long enough statement.', JSON.stringify(samples), new Date().toISOString());
  return id;
});
// "Even and more than 2": the classic wrong answer forgets w = 2.
const WRONG = "const w=+require('fs').readFileSync(0,'utf8');console.log(w%2===0?'YES':'NO')";

test.before(async () => {
  const port = 29000 + Math.floor(Math.random() * 900);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JUDGE_MODE: 'local', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    if (proc.exitCode !== null || i > 160) throw new Error(`server not up: ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  const name = `cov${stamp}`;
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, email: `${name}@t.io`, password: 'secret123' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('a judge that keeps its tests private: the examples only, and said so', async () => {
  const id = addProblem('atcoder', `abc${stamp}_a`, [{ input: '8', output: 'YES' }]);
  const r = await call('POST', '/api/judge', { problem_id: id, language: 'javascript', code: WRONG });
  assert.equal(r.body.verdict, 'AC', 'the wrong idea passes the one example');
  assert.deepEqual(r.body.coverage, { full: false, official: 0, judge: 'atcoder', url: `https://judge.example/abc${stamp}_a` });
});

test('Codeforces before its tests are fetched: examples only, "pending"', async () => {
  const id = addProblem('codeforces', '9991A', [{ input: '8', output: 'YES' }]);
  const r = await call('POST', '/api/judge', { problem_id: id, language: 'javascript', code: WRONG });
  assert.equal(r.body.coverage.full, false);
  assert.equal(r.body.coverage.pending, true);
});

test('Codeforces with its official tests: the full check catches the wrong idea', async () => {
  const id = addProblem('codeforces', '9992A', [{ input: '8', output: 'YES' }]);
  withDb((db) => {
    db.exec('CREATE TABLE IF NOT EXISTS cf_dataset_tests (id TEXT PRIMARY KEY, tests TEXT NOT NULL, exact INTEGER NOT NULL, fetched_at INTEGER NOT NULL)');
    db.prepare('INSERT OR REPLACE INTO cf_dataset_tests(id, tests, exact, fetched_at) VALUES(?,?,1,?)').run('9992/A', JSON.stringify([{ input: '2', output: 'NO' }, { input: '6', output: 'YES' }]), Date.now());
  });
  const r = await call('POST', '/api/judge', { problem_id: id, language: 'javascript', code: WRONG });
  assert.equal(r.body.coverage.full, true);
  assert.equal(r.body.coverage.official, 2);
  assert.equal(r.body.verdict, 'WA', 'w = 2 is caught');
});

test('practice runs with no stored problem carry no coverage', async () => {
  const r = await call('POST', '/api/judge', { language: 'javascript', code: "console.log('YES')", testcases: [{ input: '', expected_output: 'YES' }] });
  assert.equal(r.body.verdict, 'AC');
  assert.equal(r.body.coverage, undefined);
});
