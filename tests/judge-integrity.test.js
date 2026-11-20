// Judging must not be forgeable: verdicts that award progress are computed
// against testcases the server stores, never ones the submission brings along;
// XP is earned once per problem; Workshop answer keys stay with their author;
// private contests and linked Codeforces handles belong to one account.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-integrity-'));
const DB = path.join(tmp, 'test.db');
let proc, base;
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
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, email: `${name}@t.io`, password: 'secret123' }),
  });
  assert.equal(r.status, 200, `register ${name}`);
  return r.headers.get('set-cookie').split(';')[0];
}
function withDb(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
  try { return fn(db); } finally { db.close(); }
}

const DOUBLE = "const n=+require('fs').readFileSync(0,'utf8');console.log(n*2)";
const stamp = Date.now().toString(36);
const A = `al${stamp}`, B = `bo${stamp}`;
let alice, bob;
let bare, stored, sampled, partialP, ownOnly, dailyP; // problem ids

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      JUDGE_MODE: 'local',
      DB_PATH: DB,
      DISABLE_PUPPETEER: '1',
      DISABLE_SCRAPER: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  withDb((db) => {
    const add = (pid, rating) => {
      db.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES('codeforces',?,?,'https://x',?,'[]')")
        .run(pid, pid, rating);
      return Number(db.prepare('SELECT id FROM problems WHERE problem_id=?').get(pid).id);
    };
    bare = add('9001A', 800);
    stored = add('9001B', 1500);
    // Codeforces' official tests (as the open dataset supplies them): only a full check counts as solved (owner's rule, session 10).
    db.exec('CREATE TABLE IF NOT EXISTS cf_dataset_tests (id TEXT PRIMARY KEY, tests TEXT NOT NULL, exact INTEGER NOT NULL, fetched_at INTEGER NOT NULL)');
    db.prepare('INSERT OR REPLACE INTO cf_dataset_tests(id, tests, exact, fetched_at) VALUES(?,?,1,?)').run('9001/B', JSON.stringify([{ input: '21', output: '42' }]), Date.now());
    sampled = add('9001C', 900);
    db.prepare("INSERT INTO problem_statements(problem_rowid, samples, scraped_at) VALUES(?,?,datetime('now'))")
      .run(sampled, JSON.stringify([{ input: '4\n', output: '8\n' }]));
    // Three samples: points follow how many pass (owner's rule, 2026-11-19).
    partialP = add('9001D', 1500);
    db.prepare("INSERT INTO problem_statements(problem_rowid, samples, scraped_at) VALUES(?,?,datetime('now'))")
      .run(partialP, JSON.stringify([{ input: '1\n', output: '2\n' }, { input: '2\n', output: '4\n' }, { input: '3\n', output: '6\n' }]));
    // No samples and no official tests: only the solver's own tests exist.
    ownOnly = add('9001E', 1500);
    // Today's daily challenge: official tests and rating like `stored`.
    dailyP = add('9001F', 1500);
    db.prepare('INSERT OR REPLACE INTO cf_dataset_tests(id, tests, exact, fetched_at) VALUES(?,?,1,?)').run('9001/F', JSON.stringify([{ input: '21', output: '42' }]), Date.now());
    db.prepare("INSERT INTO daily_challenges(date, problem_rowid, difficulty, bonus_xp) VALUES(?,?,'easy',50)")
      .run(new Date().toISOString().slice(0, 10), dailyP);
  });
  alice = await signup(A);
  bob = await signup(B);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('an empty testcase set is never Accepted', () => {
  const { overallVerdict, NO_TESTS } = require('../src/judge');
  assert.equal(overallVerdict([]), NO_TESTS);
  assert.notEqual(overallVerdict([]), 'AC');
});

test('output comparison keeps leading whitespace significant on both sides', () => {
  const { compareOutput } = require('../src/judge');
  assert.ok(compareOutput('  5\n', '  5'));
  assert.ok(!compareOutput('  5', '5'), 'leading spaces are part of the answer');
  assert.ok(compareOutput('1 \n2\n', '1\n2'));
});

test('a problem with no stored testcases records nothing, whatever the client sends', async () => {
  const forged = await call('POST', '/api/judge', alice, {
    problem_id: bare, language: 'javascript', code: 'console.log(1)',
    testcases: [{ input: '', expected_output: '1' }],
  });
  assert.equal(forged.status, 200);
  assert.notEqual(forged.body.verdict, 'AC', 'client testcases must not be judged for a platform problem');
  assert.equal(forged.body.recorded, false);

  const empty = await call('POST', '/api/judge', alice, {
    problem_id: bare, language: 'javascript', code: 'console.log(1)', testcases: [],
  });
  assert.notEqual(empty.body.verdict, 'AC');

  const p = await call('GET', `/api/problems/${bare}`, alice);
  assert.equal(p.body.problem.solve_status, 'unsolved');
  assert.equal(p.body.submissions.length, 0);
  assert.equal((await call('GET', '/api/stats', alice)).body.solved, 0);
});

test('stored testcases override a forged list sent with the submission', async () => {
  await call('POST', '/api/testcases', alice, { problem_rowid: stored, label: 'T', input: '21', expected_output: '42' });
  const r = await call('POST', '/api/judge', alice, {
    problem_id: stored, language: 'javascript', code: 'console.log(5)',
    testcases: [{ input: '', expected_output: '5' }],
  });
  assert.equal(r.body.verdict, 'WA');
  assert.equal(r.body.results.length, 1);
  assert.equal(r.body.results[0].input, '21');
  const p = await call('GET', `/api/problems/${stored}`, alice);
  assert.equal(p.body.problem.solve_status, 'attempted');
});

test("the statement's samples are always judged", async () => {
  // Bob has no testcases of his own; the scraped sample still applies.
  const wrong = await call('POST', '/api/judge', bob, {
    problem_id: sampled, language: 'javascript', code: 'console.log(0)', testcases: [],
  });
  assert.equal(wrong.body.verdict, 'WA');
  assert.equal(wrong.body.recorded, true);
  const right = await call('POST', '/api/judge', bob, {
    problem_id: sampled, language: 'javascript', code: DOUBLE, testcases: [],
  });
  assert.equal(right.body.verdict, 'AC', JSON.stringify(right.body).slice(0, 300));
});

test('re-solving an accepted problem earns no more XP', async () => {
  const solve = () => call('POST', '/api/judge', alice, { problem_id: stored, language: 'javascript', code: DOUBLE });
  assert.equal((await solve()).body.verdict, 'AC');
  const first = (await call('GET', '/api/stats', alice)).body;
  assert.equal((await solve()).body.verdict, 'AC');
  assert.equal((await solve()).body.verdict, 'AC');
  const after = (await call('GET', '/api/stats', alice)).body;
  assert.equal(after.totalXp, first.totalXp, 'progress XP unchanged');
  assert.equal(after.solved, 1);
  const day = withDb((db) =>
    db.prepare('SELECT SUM(problems_solved) s, SUM(xp_earned) x FROM daily_activity WHERE username=?').get(A));
  assert.equal(Number(day.s), 1, 'daily solved count counts the problem once');
  assert.equal(Number(day.x), 40, 'daily XP counts the 1500-rated problem once');
});

test("today's daily challenge adds its bonus once, on the solve that solves it", async () => {
  const xpOf = (user, pid) => withDb((db) =>
    Number(db.prepare('SELECT xp_earned x FROM progress WHERE username=? AND problem_rowid=?').get(user, pid)?.x ?? -1));
  const solve = () => call('POST', '/api/judge', alice, { problem_id: dailyP, language: 'javascript', code: DOUBLE, testcases: [] });
  assert.equal((await solve()).body.verdict, 'AC');
  const base = 40; // a 1500-rated problem, as in the test above
  assert.equal(xpOf(A, dailyP), base + 50, 'first solve: the points plus the 50 bonus');
  assert.equal((await solve()).body.verdict, 'AC');
  assert.equal(xpOf(A, dailyP), base + 50, 're-solving adds nothing');
  const done = withDb((db) => db.prepare(`SELECT COUNT(*) n FROM user_daily_challenges u
    JOIN daily_challenges d ON d.id = u.challenge_id WHERE u.username=? AND d.problem_rowid=?`).get(A, dailyP).n);
  assert.equal(Number(done), 1);

  // A problem solved before it became today's challenge: re-solving it earns nothing.
  const before = xpOf(A, stored);
  withDb((db) => db.prepare("INSERT OR IGNORE INTO daily_challenges(date, problem_rowid, difficulty, bonus_xp) VALUES(?,?,'medium',50)")
    .run(new Date().toISOString().slice(0, 10), stored));
  assert.equal((await call('POST', '/api/judge', alice, { problem_id: stored, language: 'javascript', code: DOUBLE })).body.verdict, 'AC');
  assert.equal(xpOf(A, stored), before, 'no bonus for re-solving an already solved problem');
});

test('testcase count and input size are capped', async () => {
  const many = Array.from({ length: 101 }, (_, i) => ({ input: String(i), expected_output: String(i) }));
  assert.equal((await call('POST', '/api/judge', alice, { language: 'javascript', code: 'x', testcases: many })).status, 400);
  const big = 'x'.repeat(600 * 1024);
  const huge = [{ input: big, expected_output: '' }, { input: big, expected_output: '' }];
  assert.equal((await call('POST', '/api/judge', alice, { language: 'javascript', code: 'x', testcases: huge })).status, 400);
  assert.equal((await call('POST', '/api/run', alice, { language: 'javascript', code: 'x', input: 'y'.repeat(1100 * 1024) })).status, 400);
  // Custom input runs still work.
  const ok = await call('POST', '/api/run', alice, { language: 'javascript', code: DOUBLE, input: '7' });
  assert.equal((ok.body.output || '').trim(), '14');
});

test('a Workshop problem is owned by its author and its hidden tests stay hidden', async () => {
  const made = await call('POST', '/api/custom-problems', alice, {
    title: 'Doubler', statement: 'double it',
    samples: [{ input: '1', output: '2' }],
    testcases: [{ input: '500', expected_output: '1000' }],
  });
  assert.equal(made.status, 200);
  const id = made.body.id;

  const mine = await call('GET', `/api/custom-problems/${id}`, alice);
  assert.equal(mine.body.problem.creator, A);
  assert.match(mine.body.problem.testcases, /1000/);

  const theirs = await call('GET', `/api/custom-problems/${id}`, bob);
  assert.equal(theirs.body.problem.testcases, '[]');
  assert.equal(theirs.body.problem.hidden_count, 1);
  const list = await call('GET', '/api/custom-problems', bob);
  const row = list.body.problems.find((p) => p.id === id);
  assert.ok(row && !/1000/.test(row.testcases), 'the list must not leak hidden tests either');

  assert.equal((await call('PUT', `/api/custom-problems/${id}`, bob, { title: 'pwned' })).status, 403);
  assert.equal((await call('DELETE', `/api/custom-problems/${id}`, bob)).status, 403);

  // Bob is still judged against the hidden case, but never sees it.
  const wrong = await call('POST', '/api/judge', bob, {
    custom_problem_id: id, language: 'javascript', code: "console.log(2)",
  });
  assert.equal(wrong.body.verdict, 'WA');
  const hidden = wrong.body.results.find((r) => r.hidden);
  assert.ok(hidden, 'hidden case was judged');
  assert.equal(hidden.input, '');
  assert.equal(hidden.expected, '');
  const right = await call('POST', '/api/judge', bob, { custom_problem_id: id, language: 'javascript', code: DOUBLE });
  assert.equal(right.body.verdict, 'AC');
});

test('a legacy Workshop problem with no author is editable by admins only', async () => {
  const id = withDb((db) => {
    db.prepare("INSERT INTO custom_problems(creator, title, created_at) VALUES('', 'Legacy', datetime('now'))").run();
    return Number(db.prepare("SELECT id FROM custom_problems WHERE title='Legacy'").get().id);
  });
  assert.equal((await call('PUT', `/api/custom-problems/${id}`, bob, { title: 'mine now' })).status, 403);
  assert.equal((await call('DELETE', `/api/custom-problems/${id}`, bob)).status, 403);
});

test('a private contest cannot be opened by naming its creator in the query', async () => {
  const made = await call('POST', '/api/contests/create', alice, {
    title: 'Private Cup', type: 'speed', password: 'joinme', duration_mins: 60,
    start_time: new Date(Date.now() + 3600e3).toISOString(), problems: '[]',
  });
  assert.equal(made.status, 200, made.body.error);
  const id = made.body.contest_id;
  assert.equal((await call('GET', `/api/contests/${id}?username=${A}`, bob)).status, 403);
  assert.equal((await call('GET', `/api/contests/${id}?username=${A}`, null)).status, 403);
  const own = await call('GET', `/api/contests/${id}`, alice);
  assert.equal(own.status, 200);
  assert.equal(own.body.isOwner, true);
});

test('a Codeforces handle links to one account only', async () => {
  const handle = `cf${stamp}`;
  assert.equal((await call('POST', '/api/settings', alice, { cf_handle: handle })).status, 200);
  assert.equal((await call('POST', '/api/settings', bob, { cf_handle: handle.toUpperCase() })).status, 409);
  assert.equal((await call('POST', '/api/settings', bob, { cf_handle: 'bad handle!' })).status, 400);
});

test('problem list limits are clamped', async () => {
  const r = await call('GET', '/api/problems?limit=-1', alice);
  assert.equal(r.status, 200);
  assert.equal(r.body.limit, 1);
  assert.ok(r.body.problems.length <= 1);
});

/* ── Points follow the tests passed (owner's rule, 2026-11-19) ── */
// Doubles n only when n <= k, so it passes exactly k of the samples 1, 2, 3.
const passK = (k) => `const n = Number(require('fs').readFileSync(0, 'utf8').trim()); console.log(n <= ${k} ? n * 2 : 0)`;
const xpOf = async (who) => (await call('GET', '/api/stats', who)).body.totalXp;

test('partial credit: the share of samples passed, the best try counts, the rest on Accepted', async () => {
  const judge = (code) => call('POST', '/api/judge', bob, { problem_id: partialP, language: 'javascript', code, testcases: [] });
  const start = await xpOf(bob);
  const one = (await judge(passK(1))).body;
  assert.equal(one.verdict, 'WA');
  assert.equal(one.xp.gainedXp, 13, 'one of three samples: a third of 40, rounded');
  assert.deepEqual({ passed: one.xp.partial.passed, total: one.xp.partial.total }, { passed: 1, total: 3 });
  assert.equal(one.xp.firstSolve, false);
  const two = (await judge(passK(2))).body;
  assert.equal(two.xp.gainedXp, 14, 'two of three: up to 27, so 14 more');
  const worse = (await judge(passK(1))).body;
  assert.equal(worse.xp, undefined, 'a worse try earns nothing');
  const all = (await judge(passK(3))).body;
  assert.equal(all.verdict, 'AC');
  assert.equal(all.xp.gainedXp, 13, 'Accepted brings the rest, up to 40');
  // Only the examples exist here (no official tests): full points, but "passed the examples", not solved.
  assert.equal(all.xp.examplesOnly, true);
  assert.equal(all.xp.firstSolve, false);
  assert.equal(await xpOf(bob), start + 40, 'never more than the problem is worth');
  const again = (await judge(passK(3))).body;
  assert.equal(again.xp.gainedXp, 0, 'solving again earns nothing');
});

test("passing only tests you wrote yourself earns no points", async () => {
  await call('POST', '/api/testcases', bob, { problem_rowid: ownOnly, label: 'Mine', input: '5', expected_output: 'anything' });
  const start = await xpOf(bob);
  const r = (await call('POST', '/api/judge', bob, { problem_id: ownOnly, language: 'javascript', code: "console.log('anything')", testcases: [] })).body;
  assert.equal(r.verdict, 'AC', JSON.stringify(r).slice(0, 300));
  assert.equal(r.recorded, true, 'the submission is still recorded');
  assert.equal(r.xp?.gainedXp ?? 0, 0);
  assert.equal(await xpOf(bob), start, 'no XP from a test with your own answer');
});
