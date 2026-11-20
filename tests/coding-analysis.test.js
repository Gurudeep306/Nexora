// Coding analysis: what an Accepted earns ("+XP" and the level before and
// after), your record on one problem, verdicts week by week, and the level
// rules the Profile explains. Each user only ever sees their own numbers.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-analysis-'));
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
  const db = new DatabaseSync(DB, { timeout: 10000 });
  try { return fn(db); } finally { db.close(); }
}

const DOUBLE = "const n=+require('fs').readFileSync(0,'utf8');console.log(n*2)";
const stamp = Date.now().toString(36);
let alice, bob, pid;

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JUDGE_MODE: 'local', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  withDb((db) => {
    db.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES('codeforces','9101A','Double','https://x',1500,'[]')").run();
    pid = Number(db.prepare("SELECT id FROM problems WHERE problem_id='9101A'").get().id);
    db.prepare("INSERT INTO problem_statements(problem_rowid, samples, scraped_at) VALUES(?,?,datetime('now'))")
      .run(pid, JSON.stringify([{ input: '4\n', output: '8\n' }, { input: '5\n', output: '10\n' }]));
    // Codeforces' official tests (as the open dataset supplies them): only a full check counts as solved (owner's rule, session 10).
    db.exec('CREATE TABLE IF NOT EXISTS cf_dataset_tests (id TEXT PRIMARY KEY, tests TEXT NOT NULL, exact INTEGER NOT NULL, fetched_at INTEGER NOT NULL)');
    db.prepare('INSERT OR REPLACE INTO cf_dataset_tests(id, tests, exact, fetched_at) VALUES(?,?,1,?)').run('9101/A', JSON.stringify([{ input: '4\n', output: '8\n' }, { input: '5\n', output: '10\n' }]), Date.now());
  });
  alice = await signup(`an${stamp}`);
  bob = await signup(`bn${stamp}`);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

const submit = (who, code) => call('POST', '/api/judge', who, { problem_id: pid, language: 'javascript', code, testcases: [] });

test('a wrong answer earns nothing and reports no XP', async () => {
  const r = await submit(alice, 'console.log(0)');
  assert.equal(r.body.verdict, 'WA');
  assert.equal(r.body.xp, undefined);
});

test('the first Accepted reports +XP and the level before and after; a second one adds none', async () => {
  const first = await submit(alice, DOUBLE);
  assert.equal(first.body.verdict, 'AC', JSON.stringify(first.body).slice(0, 300));
  const x = first.body.xp;
  assert.equal(x.firstSolve, true);
  assert.equal(x.gainedXp, 40, 'a 1500-rated problem is worth 40 XP');
  assert.equal(x.before.xp, 0);
  assert.equal(x.after.xp, 40);
  assert.equal(x.solved, 1);
  assert.equal(x.after.level, x.before.level);
  assert.equal(x.after.probsInLevel, x.before.probsInLevel + 1);
  const stats = (await call('GET', '/api/stats', alice)).body;
  assert.equal(stats.level.xp, x.after.xp, 'the same level the Profile shows');

  const again = (await submit(alice, DOUBLE)).body.xp;
  assert.equal(again.firstSolve, false);
  assert.equal(again.gainedXp, 0);
  assert.equal(again.after.xp, 40);
});

test('your record on a problem: tries, first Accepted, tests passed — and only yours', async () => {
  const p = (await call('GET', `/api/problems/${pid}`, alice)).body;
  assert.deepEqual(
    { attempts: p.analysis.attempts, accepted: p.analysis.accepted, triesToAccept: p.analysis.triesToAccept, languages: p.analysis.languages },
    { attempts: 3, accepted: 2, triesToAccept: 2, languages: 1 },
  );
  assert.ok(p.analysis.minutesToAccept >= 0);
  const wa = p.submissions.find((s) => s.verdict === 'WA');
  assert.deepEqual({ passed: wa.passed, total: wa.total, language: wa.language }, { passed: 0, total: 2, language: 'javascript' });
  assert.ok(!('test_results' in wa), 'the stored test output is not sent');
  const theirs = (await call('GET', `/api/problems/${pid}`, bob)).body;
  assert.equal(theirs.analysis, null, "Bob sees nothing of Alice's record");
  assert.equal(theirs.submissions.length, 0);
});

test('verdicts week by week: twelve weeks, this week holds this week’s submissions', async () => {
  const perf = (await call('GET', '/api/performance', alice)).body;
  assert.equal(perf.verdictTrend.length, 12);
  const now = perf.verdictTrend[11];
  assert.deepEqual({ AC: now.AC, WA: now.WA, total: now.total }, { AC: 2, WA: 1, total: 3 });
  assert.ok(perf.verdictTrend.slice(0, 11).every((w) => w.total === 0));
  assert.equal(new Date(`${now.week}T00:00:00Z`).getUTCDay(), 1, 'weeks are named by their Monday');
  const bobs = (await call('GET', '/api/performance', bob)).body;
  assert.ok(bobs.verdictTrend.every((w) => w.total === 0));
});

test('the level rules are the ones XP is really counted by', async () => {
  const r = (await call('GET', '/api/levels/rules', alice)).body;
  assert.equal(r.xpByRating.find((b) => b.below === null || 1500 < b.below).xp, 40, 'matches the XP the solve earned');
  assert.equal(r.problemLevels[0].xp, 0);
  assert.ok(r.problemLevels.every((l, i, a) => i === 0 || (l.xp >= a[i - 1].xp && l.minProblems >= a[i - 1].minProblems)));
  assert.equal(r.web.dsaShare, 0.25);
});
