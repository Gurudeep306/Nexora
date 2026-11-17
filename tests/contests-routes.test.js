// Hosted contests over HTTP (src/routes/hosted-contests.js): build a mixed
// contest, publish it, join with a password, sit it (coding runs counted by
// /api/judge, the paper graded once), and only the host sees the marks list,
// the analysis and the CSV. Questions are fixed once someone starts, and a
// problem written for a contest stays hidden from everyone else.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-contests-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36);
const HOST = `ho${stamp}`;
const ANN = `an${stamp}`;
const BOB = `bo${stamp}`;
const GATE_Q = 'cse-1993-ii-a-6-4'; // MCQ, key C
let proc, base, host, ann, bob, problemId;
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
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { text }; }
  return { status: r.status, body: json, headers: r.headers };
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
  const port = 29000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JUDGE_MODE: 'local', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  host = await signup(HOST);
  ann = await signup(ANN);
  bob = await signup(BOB);
  problemId = withDb((db) => {
    db.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES('codeforces','CT1','Add two','https://x',800,'[]','math')").run();
    const id = db.prepare("SELECT id FROM problems WHERE problem_id='CT1'").get().id;
    db.prepare('INSERT INTO problem_statements(problem_rowid, statement, samples, scraped_at) VALUES(?,?,?,?)').run(id, '<p>Add</p>', JSON.stringify([{ input: '2 3\n', output: '5\n' }, { input: '10 7\n', output: '17\n' }]), new Date().toISOString());
    return Number(id);
  });
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
  fs.rmSync(tmp, { recursive: true, force: true });
});

let id, code, qid, wsId;

test('build: a draft from anywhere, with catalog, GATE and own questions', async () => {
  assert.equal((await call('POST', '/api/hosted', null, { title: 'x' })).status, 401);
  // "Add to a contest" from a problem page starts a draft with that problem in it.
  const made = await call('POST', '/api/hosted', host, { title: 'Week 1 test', item: { kind: 'problem', ref: problemId } });
  assert.equal(made.status, 200, JSON.stringify(made.body));
  ({ id, code } = made.body);
  assert.match(code, /^NX-[A-Z2-9]{6}$/);
  assert.equal((await call('POST', `/api/hosted/${id}/items`, host, { kind: 'gate', ref: GATE_Q, marks: 3 })).body.added, true);
  assert.equal((await call('POST', `/api/hosted/${id}/items`, host, { kind: 'gate', ref: GATE_Q })).body.added, false, 'no duplicates');
  assert.equal((await call('POST', `/api/hosted/${id}/items`, host, { kind: 'gate', ref: 'nope' })).status, 400);
  assert.equal((await call('POST', `/api/hosted/${id}/items`, ann, { kind: 'gate', ref: GATE_Q })).status, 403, 'only the host edits');
  const q = await call('POST', `/api/hosted/${id}/questions`, host, { data: { type: 'NAT', text: 'What is $2^{10}$?', answer: { min: 1024 }, marks: 2, solution: 'Ten doublings.' } });
  assert.equal(q.status, 200);
  qid = q.body.id;
  assert.deepEqual(q.body.problems, []);
  // A coding problem written only for this contest (Workshop editor).
  const ws = await call('POST', `/api/hosted/${id}/coding-problem`, host);
  wsId = ws.body.id;
  const view = await call('GET', `/api/hosted/${id}`, host);
  assert.deepEqual(view.body.items.map((i) => i.kind), ['problem', 'gate', 'question', 'workshop']);
  assert.equal(view.body.totalMarks, 100 + 3 + 2 + 100);
});

test('publish needs every piece; the contest-only problem stays hidden', async () => {
  const check = await call('POST', `/api/hosted/${id}/publish`, host);
  assert.equal(check.status, 400);
  assert.match(check.body.error, /tests for/);
  // Hidden from the Workshop list and from other people's direct links.
  const list = await call('GET', '/api/custom-problems', ann);
  assert.ok(!list.body.problems.some((p) => p.id === wsId));
  assert.equal((await call('GET', `/api/custom-problems/${wsId}`, ann)).status, 404);
  assert.equal((await call('POST', '/api/judge', ann, { custom_problem_id: wsId, code: 'print(1)', language: 'python' })).status, 404);
  // Give it tests; set a password and timing; publish.
  await call('PUT', `/api/custom-problems/${wsId}`, host, { title: 'Double it', statement: 'Print 2n', samples: [{ input: '3\n', output: '6\n' }], testcases: [{ input: '50\n', output: '100\n' }], editorial: 'Multiply by two.' });
  await call('PUT', `/api/hosted/${id}`, host, { startTime: new Date(Date.now() - 60000).toISOString(), durationMins: 90, settings: { access: 'password', standings: 'hidden' } });
  assert.match((await call('POST', `/api/hosted/${id}/publish`, host)).body.error, /a password/);
  assert.equal((await call('PUT', `/api/hosted/${id}`, host, { password: 'abc' })).status, 400);
  await call('PUT', `/api/hosted/${id}`, host, { password: 'open sesame' });
  const pub = await call('POST', `/api/hosted/${id}/publish`, host);
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
});

test('join with the password, start, and run code that counts', async () => {
  const lobby = await call('GET', `/api/hosted/code/${code.toLowerCase()}`, ann);
  assert.equal(lobby.status, 200);
  assert.equal(lobby.body.needsPassword, true);
  assert.equal(lobby.body.itemCount, 4);
  assert.equal((await call('GET', `/api/hosted/${id}`, ann)).status, 403, 'not joined yet');
  assert.equal((await call('POST', `/api/hosted/code/${code}/join`, ann, { password: 'wrong' })).status, 401);
  assert.equal((await call('POST', `/api/hosted/code/${code}/join`, ann, { password: 'open sesame' })).status, 200);
  assert.equal((await call('POST', `/api/hosted/code/${code}/join`, bob, { password: 'open sesame' })).status, 200);
  // A fixed contest that is live: joined people see the questions at once.
  const view = await call('GET', `/api/hosted/${id}`, ann);
  assert.equal(view.body.me.state, 'running');
  assert.equal(view.body.items.length, 4);
  assert.equal(view.body.items[2].question, undefined, 'no answers for people taking part');
  // The contest problem opens for people in it now.
  assert.equal((await call('GET', `/api/custom-problems/${wsId}`, ann)).status, 200);
  // A wrong run, then a right one.
  const wa = await call('POST', '/api/judge', ann, { problem_id: problemId, contest_id: id, code: 'print(0)', language: 'python' });
  assert.equal(wa.body.contest?.counted, true, JSON.stringify(wa.body).slice(0, 300));
  const ac = await call('POST', '/api/judge', ann, { problem_id: problemId, contest_id: id, code: 'a,b=map(int,input().split())\nprint(a+b)', language: 'python' });
  assert.equal(ac.body.verdict, 'AC');
  assert.equal(ac.body.contest.counted, true);
  const ws = await call('POST', '/api/judge', bob, { custom_problem_id: wsId, contest_id: id, code: 'print(int(input())*2)', language: 'python' });
  assert.equal(ws.body.verdict, 'AC');
  assert.equal(ws.body.contest.counted, true);
  // The host's own run does not count (not taking part).
  assert.equal((await call('POST', '/api/judge', host, { problem_id: problemId, contest_id: id, code: 'print(5)', language: 'python' })).body.contest.counted, false);
});

test('questions are fixed once someone has started', async () => {
  assert.equal((await call('POST', `/api/hosted/${id}/items`, host, { kind: 'problem', ref: problemId })).status, 409);
  assert.equal((await call('PUT', `/api/hosted/${id}/questions/${qid}`, host, { data: { type: 'NAT', text: 'x', answer: { min: 1 } } })).status, 409);
  assert.equal((await call('PUT', `/api/hosted/${id}`, host, { title: 'Week 1 test (final)' })).status, 200, 'the title can still change');
});

test('the paper: no answers before review, graded once', async () => {
  const paper = await call('GET', `/api/hosted/${id}/paper`, ann);
  assert.equal(paper.status, 200);
  assert.equal(paper.body.review, false);
  assert.equal(paper.body.questions.length, 2);
  for (const q of paper.body.questions) assert.equal(q.answer, undefined, `no key for ${q.id}`);
  const [gq, own] = paper.body.questions;
  assert.equal(gq.marks, 3);
  assert.equal(gq.negative, 1, 'a third of the contest marks');
  const sub = await call('POST', `/api/hosted/${id}/paper`, ann, { responses: { [gq.id]: 'C', [own.id]: '1024' }, timeMs: { [gq.id]: 40000, [own.id]: 20000 } });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.marks, undefined, 'marks wait for the end of the contest');
  assert.equal((await call('POST', `/api/hosted/${id}/paper`, ann, { responses: {} })).status, 409, 'only once');
  await call('POST', `/api/hosted/${id}/paper`, bob, { responses: { [gq.id]: 'A' }, timeMs: { [gq.id]: 30000 } });
});

test('marks list: hidden from people taking part, full for the host, with analysis and CSV', async () => {
  const mine = await call('GET', `/api/hosted/${id}/standings`, ann);
  assert.equal(mine.body.visible, false);
  assert.deepEqual(mine.body.rows.map((r) => r.username), [ANN], 'only your own row');
  const hostView = await call('GET', `/api/hosted/${id}/standings`, host);
  assert.deepEqual(hostView.body.rows.map((r) => [r.username, r.marks]), [[ANN, 105], [BOB, 99]]);
  const a = await call('GET', `/api/hosted/${id}/analysis`, host);
  assert.equal(a.status, 200);
  const gateItem = a.body.perItem.find((x) => x.kind === 'gate');
  assert.deepEqual([gateItem.tried, gateItem.right], [2, 1]);
  assert.deepEqual(gateItem.picks, { C: 1, A: 1 });
  assert.equal((await call('GET', `/api/hosted/${id}/analysis`, ann)).status, 403);
  const one = await call('GET', `/api/hosted/${id}/analysis/${BOB}`, host);
  assert.equal(one.body.items.find((x) => x.kind === 'gate').correct, false);
  assert.equal((await call('GET', `/api/hosted/${id}/analysis/${BOB}`, ann)).status, 403);
  const csv = await fetch(`${base}/api/hosted/${id}/export.csv`, { headers: { Cookie: host } });
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const text = await csv.text();
  assert.ok(text.includes(`1,${ANN},`), text.slice(0, 400));
  assert.equal((await fetch(`${base}/api/hosted/${id}/export.csv`, { headers: { Cookie: ann } })).status, 403);
});

test('after the end: answers and solutions for everyone in it; joining is closed', async () => {
  withDb((db) => db.prepare('UPDATE custom_contests SET start_time=? WHERE id=?').run(new Date(Date.now() - 3 * 3600000).toISOString(), id));
  const paper = await call('GET', `/api/hosted/${id}/paper`, ann);
  assert.equal(paper.body.review, true);
  const own = paper.body.questions.find((q) => q.custom);
  assert.equal(own.answer, '1024');
  assert.equal(own.solutionText, 'Ten doublings.');
  assert.equal(paper.body.mine[own.id].correct, true);
  const late = await signup(`la${stamp}`);
  assert.equal((await call('POST', `/api/hosted/code/${code}/join`, late, { password: 'open sesame' })).status, 409);
  // Runs after your time are not counted.
  const r = await call('POST', '/api/judge', ann, { problem_id: problemId, contest_id: id, code: 'a,b=map(int,input().split())\nprint(a+b)', language: 'python' });
  assert.equal(r.body.contest.counted, false);
  // Deleting removes everything.
  assert.equal((await call('DELETE', `/api/hosted/${id}`, ann)).status, 403);
  assert.equal((await call('DELETE', `/api/hosted/${id}`, host)).status, 200);
  assert.equal(withDb((db) => db.prepare('SELECT COUNT(*) AS n FROM contest_runs WHERE contest_id=?').get(id).n), 0);
});
