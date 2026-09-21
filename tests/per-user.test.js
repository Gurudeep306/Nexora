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
