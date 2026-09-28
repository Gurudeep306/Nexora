// Every account must have its own progress: solving a problem as one user
// must not change another user's solved count, XP, submissions or streak.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-peruser-'));
const DB = path.join(tmp, 'test.db');
let proc, base;

async function waitFor(url) {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server not ready');
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers };
};
async function signup(name) {
  const r = await call('POST', '/api/user/register', null, { username: name, email: `${name}@t.io`, password: 'secret123' });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}

const stamp = Date.now().toString(36);
let alice, bob, pid;

test.before(async () => {
  const port = 4100 + Math.floor(Math.random() * 300);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB },
    stdio: 'ignore',
  });
  await waitFor(`${base}/api/health`);
  // Seed one problem + a testcase straight into the database file.
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB);
  db.exec("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES('codeforces','9999Z','Double it','https://x',900,'[\"math\"]')");
  pid = Number(db.prepare("SELECT id FROM problems WHERE problem_id='9999Z'").get().id);
  db.close();
  alice = await signup(`al${stamp}`);
  bob = await signup(`bo${stamp}`);
});
test.after(() => proc?.kill('SIGKILL'));

test("a new account starts at zero", async () => {
  const s = await call('GET', '/api/stats', bob);
  assert.equal(s.body.solved, 0);
  assert.equal(s.body.totalXp, 0);
});

test("solving as alice updates only alice", async () => {
  const j = await call('POST', '/api/judge', alice, {
    problem_id: pid,
    language: 'javascript',
    code: "const n=+require('fs').readFileSync(0,'utf8');console.log(n*2)",
    testcases: [{ input: '21', expected_output: '42' }],
  });
  assert.equal(j.body.verdict, 'AC', JSON.stringify(j.body).slice(0, 300));

  const a = await call('GET', '/api/stats', alice);
  const b = await call('GET', '/api/stats', bob);
  assert.equal(a.body.solved, 1);
  assert.ok(a.body.totalXp > 0);
  assert.equal(b.body.solved, 0, "bob must not see alice's solve");
  assert.equal(b.body.totalXp, 0);

  const pa = await call('GET', `/api/problems/${pid}`, alice);
  const pb = await call('GET', `/api/problems/${pid}`, bob);
  assert.equal(pa.body.problem.solve_status, 'solved');
  assert.equal(pb.body.problem.solve_status, 'unsolved');
  assert.equal(pa.body.submissions.length, 1);
  assert.equal(pb.body.submissions.length, 0);

  const ach = (await call('GET', '/api/stats', alice)).body.achievements.find((x) => x.id === 'first_blood');
  const achB = (await call('GET', '/api/stats', bob)).body.achievements.find((x) => x.id === 'first_blood');
  assert.ok(ach?.unlocked_at, 'alice unlocked first blood');
  assert.ok(!achB?.unlocked_at, 'bob did not');
});

test("leaderboard ranks by each user's own XP", async () => {
  const lb = await call('GET', '/api/leaderboard', alice);
  const rowA = lb.body.leaderboard.find((r) => r.username === `al${stamp}`);
  const rowB = lb.body.leaderboard.find((r) => r.username === `bo${stamp}`);
  assert.ok(rowA.total_xp > 0 && rowA.total_solved === 1);
  assert.equal(rowB.total_xp, 0);
});

test("settings and reset are personal", async () => {
  await call('POST', '/api/settings', alice, { cf_handle: 'alice_cf' });
  const sb = await call('GET', '/api/settings', bob);
  assert.notEqual(sb.body.settings.cf_handle, 'alice_cf');
  await call('POST', '/api/reset-progress', bob, {});
  const a = await call('GET', '/api/stats', alice);
  assert.equal(a.body.solved, 1, "bob's reset must not touch alice");
});

test("testcases belong to the account that created them", async () => {
  // Alice adds a case of her own to the shared problem.
  const made = await call('POST', '/api/testcases', alice, {
    problem_rowid: pid, label: 'Alice only', input: '42\n', expected_output: '84',
  });
  assert.equal(made.status, 200);
  const tcId = made.body.id;

  // Bob must not see it.
  const bobView = await call('GET', `/api/problems/${pid}`, bob);
  const labels = (bobView.body.testcases || []).map((t) => t.label);
  assert.ok(!labels.includes('Alice only'), `bob saw alice's testcase: ${labels.join(', ')}`);

  // Alice does.
  const aliceView = await call('GET', `/api/problems/${pid}`, alice);
  assert.ok((aliceView.body.testcases || []).some((t) => t.label === 'Alice only'));

  // And bob cannot reach it by id, for either verb.
  const edit = await call('PUT', `/api/testcases/${tcId}`, bob, {
    label: 'hijacked', input: 'x', expected_output: 'y',
  });
  assert.equal(edit.status, 404, "bob must not be able to edit alice's testcase");
  const del = await call('DELETE', `/api/testcases/${tcId}`, bob);
  assert.equal(del.status, 404, "bob must not be able to delete alice's testcase");

  // Alice's case survived both attempts, unchanged.
  const after = await call('GET', `/api/problems/${pid}`, alice);
  const mine = (after.body.testcases || []).find((t) => t.id === tcId);
  assert.ok(mine, 'alice still has her testcase');
  assert.equal(mine.label, 'Alice only');
  assert.equal(mine.expected_output, '84');
});

test("bulk sample import is scoped per account", async () => {
  const samples = { problem_rowid: pid, testcases: [{ label: 'Sample 1', input: '9\n', expected_output: '18' }] };
  // Both import the same sample; each gets their own row.
  assert.equal((await call('POST', '/api/testcases/bulk', alice, samples)).body.added, 1);
  assert.equal(
    (await call('POST', '/api/testcases/bulk', bob, samples)).body.added, 1,
    "bob's import must not be de-duplicated against alice's rows",
  );
  // Re-importing is still a no-op within one account.
  assert.equal((await call('POST', '/api/testcases/bulk', bob, samples)).body.added, 0);

  const a = (await call('GET', `/api/problems/${pid}`, alice)).body.testcases || [];
  const b = (await call('GET', `/api/problems/${pid}`, bob)).body.testcases || [];
  assert.equal(b.filter((t) => t.label === 'Sample 1').length, 1, 'bob sees exactly his own copy');
  assert.ok(a.every((t) => !b.some((x) => x.id === t.id)), 'no row is shared between the two accounts');
});

test("a signed-out visitor gets no testcases at all", async () => {
  const anon = await call('GET', `/api/problems/${pid}`, null);
  assert.equal((anon.body.testcases || []).length, 0);
});

test("'my contests' cannot be read for someone else", async () => {
  const made = await call('POST', '/api/contests/create', alice, {
    title: 'Alice Cup', type: 'speed', password: 'joinme', duration_mins: 60,
    start_time: new Date(Date.now() + 3600e3).toISOString(), problems: '[]',
  });
  assert.equal(made.status, 200, `contest create failed: ${made.body.error}`);
  // Bob asks for alice's contests by name — the old route trusted ?username=.
  const asBob = await call('GET', `/api/contests/mine?username=al${stamp}`, bob);
  assert.equal(asBob.status, 200);
  assert.ok(
    !(asBob.body.contests || []).some((c) => c.title === 'Alice Cup'),
    'bob must only ever see his own contests, whatever username he asks for',
  );
  const asAlice = await call('GET', '/api/contests/mine', alice);
  assert.ok((asAlice.body.contests || []).some((c) => c.title === 'Alice Cup'));
});
