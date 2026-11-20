// "Add a coding problem" over HTTP: only staff with the Problems permission
// reach it, and a published NexoraGuru problem is judged on its own tests
// with its checker — the hidden tests' contents stay with staff.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-authoring-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36);
const OWNER = `boss${stamp}`;
let proc, base, owner, student;
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
  const r = await fetch(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, email: `${name}@t.io`, password: 'secret123' }) });
  assert.equal(r.status, 200, `register ${name}`);
  return r.headers.get('set-cookie').split(';')[0];
}
function withDb(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 });
  try { return fn(db); } finally { db.close(); }
}

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JUDGE_MODE: 'local', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', OWNER_USERNAME: OWNER },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  owner = await signup(OWNER);
  student = await signup(`st${stamp}`);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('only staff with the Problems permission can author problems', async () => {
  assert.equal((await call('GET', '/api/authoring', student)).status, 403);
  assert.equal((await call('POST', '/api/authoring', student, { data: { title: 'x' } })).status, 403);
  const list = await call('GET', '/api/authoring', owner);
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.langs, ['cpp', 'java', 'python', 'javascript', 'c']);
  const made = await call('POST', '/api/authoring', owner, { data: { title: 'Sum it' } });
  assert.equal(made.body.problem.data.title, 'Sum it');
  assert.equal((await call('GET', `/api/authoring/${made.body.problem.id}`, student)).status, 403);
  const pub = await call('POST', `/api/authoring/${made.body.problem.id}/publish`, owner);
  assert.equal(pub.status, 400);
  assert.match(pub.body.error, /Still needed/);
});

test('a published problem is judged on its own tests with its checker; hidden tests stay hidden', async () => {
  // A published problem as publishing leaves it (tables made by the call above).
  const pid = withDb((db) => {
    db.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES('nexora','NX900','Pair sum','',900,'[\"math\"]','math')").run();
    const id = Number(db.prepare("SELECT id FROM problems WHERE problem_id='NX900'").get().id);
    db.prepare("INSERT INTO problem_tests(problem_rowid, idx, input, output, hidden) VALUES(?,0,'1 2','3',0),(?,1,'40 2','42',1)").run(id, id);
    db.prepare("INSERT INTO problem_checkers(problem_rowid, checker) VALUES(?, ?)").run(id, JSON.stringify({ mode: 'tokens' }));
    return id;
  });
  const sum = "const [a,b]=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);console.log('  ' + (a+b) + '  \\n\\n')";
  const ok = await call('POST', '/api/judge', student, { problem_id: pid, language: 'javascript', code: sum });
  assert.equal(ok.body.verdict, 'AC', JSON.stringify(ok.body).slice(0, 300));
  assert.equal(ok.body.results.length, 2, 'the sample and the hidden test');

  const wrong = await call('POST', '/api/judge', student, { problem_id: pid, language: 'javascript', code: "console.log(3)" });
  assert.equal(wrong.body.verdict, 'WA');
  const hidden = wrong.body.results[1];
  assert.equal(hidden.hidden, true);
  assert.equal(hidden.input, '', 'a student never sees a hidden test');
  assert.equal(hidden.expected, '');
  assert.equal(wrong.body.results[0].input, '1 2', 'the sample is shown');

  const asStaff = await call('POST', '/api/judge', owner, { problem_id: pid, language: 'javascript', code: "console.log(3)" });
  assert.equal(asStaff.body.results[1].input, '40 2', 'staff see the hidden test');
});

test('the preview shows the draft as students will see it, with the written solution', async () => {
  const made = await call('POST', '/api/authoring', owner, { data: { title: 'Preview me', statement: 'Print $n$ twice, as asked here.', editorial: '## Intuition\nEasy.', tests: [{ input: '1', output: '2', sample: true }, { input: '3', output: '6' }] } });
  const id = made.body.problem.id;
  assert.equal((await call('GET', `/api/authoring/${id}/preview`, student)).status, 403);
  const pv = await call('GET', `/api/authoring/${id}/preview`, owner);
  assert.equal(pv.status, 200);
  assert.equal(pv.body.problem.title, 'Preview me');
  assert.match(pv.body.statement.statement, /\$n\$/);
  assert.deepEqual(pv.body.statement.samples, [{ input: '1', output: '2' }], 'only the example is shown');
  assert.equal(pv.body.statement.extra.solution.editorial, '## Intuition\nEasy.');
});

test('an unpublished problem stays hidden from students, even by direct link', async () => {
  const pid = withDb((db) => {
    db.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES('nexora','NX901','Secret','',800,'[]','__hidden')").run();
    return Number(db.prepare("SELECT id FROM problems WHERE problem_id='NX901'").get().id);
  });
  assert.equal((await call('GET', `/api/problems/${pid}`, student)).status, 404);
  assert.equal((await call('GET', `/api/problem-statement/${pid}`, student)).status, 404);
  assert.equal((await call('POST', '/api/judge', student, { problem_id: pid, language: 'javascript', code: 'console.log(1)' })).status, 404);
  assert.equal((await call('GET', `/api/problems/${pid}`, owner)).status, 200, 'staff can still open it');
  const listed = await call('GET', '/api/problems?search=Secret', student);
  assert.ok(!(listed.body.problems || []).some((p) => p.id === pid), 'not in the catalog');
});

test('tests over the total size limit are refused with a clear message', async () => {
  const made = await call('POST', '/api/authoring', owner, { data: { title: 'Big' } });
  const big = 'x'.repeat(1000 * 1000);
  const tests = Array.from({ length: 9 }, () => ({ input: big, output: '' }));
  const r = await call('PUT', `/api/authoring/${made.body.problem.id}`, owner, { data: { title: 'Big', tests } });
  assert.equal(r.status, 413);
  assert.match(r.body.error, /8 MB in all/);
});
