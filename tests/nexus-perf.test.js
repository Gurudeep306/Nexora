// Regression tests for the batched Nexus / stats / leaderboard queries:
// the responses must stay exactly what the old per-topic / per-user SQL gave.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-nexusperf-'));
const DB = path.join(tmp, 'test.db');
let proc, base, cookie;
let serverLog = '';
const ME = `nx${Date.now().toString(36).slice(-6)}`;

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const getJson = async (p) => {
  const r = await fetch(`${base}${p}`, { headers: { Cookie: cookie } });
  assert.equal(r.status, 200, `${p}: ${r.status}`);
  return r.json();
};
function withDb(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
  try { return fn(db); } finally { db.close(); }
}
const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

test.before(async () => {
  const port = 26000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ME, email: `${ME}@t.io`, password: 'secret123' }),
  });
  assert.equal(r.status, 200);
  cookie = (r.headers.get('set-cookie') || '').split(';')[0];

  withDb((db) => {
    const tagSets = ['["implementation"]', '["math","greedy"]', '["strings"]', '["brute force","sortings"]', '["dp","graphs"]', '["trees","dfs and similar"]'];
    const ins = db.prepare('INSERT OR IGNORE INTO problems(platform,problem_id,title,url,rating,tags) VALUES(?,?,?,?,?,?)');
    for (let i = 0; i < 600; i++) ins.run('codeforces', `NX${i}`, `Nexus ${i}`, `https://x/${i}`, 500 + (i % 30) * 100, tagSets[i % tagSets.length]);
    const ids = db.prepare("SELECT id FROM problems WHERE problem_id LIKE 'NX%' ORDER BY id").all().map((r) => r.id);
    const prog = db.prepare('INSERT INTO progress(username,problem_rowid,status,attempts,xp_earned,solved_at) VALUES(?,?,?,?,?,?)');
    ids.forEach((id, i) => {
      if (i % 9 === 0) prog.run(ME, id, 'solved', 1, 15, day(i % 20));
      else if (i % 13 === 0) prog.run(ME, id, 'attempted', 3, 0, null);
    });
    const act = db.prepare('INSERT OR IGNORE INTO daily_activity(username,date,problems_solved,problems_attempted,xp_earned) VALUES(?,?,?,?,?)');
    // ME: active today..4 days ago, gap, then 6 days in a row  -> current 5, best 6
    for (const n of [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11]) act.run(ME, day(n), 1, 1, 10);
    // a second user: active 1..3 days ago -> current 3 (yesterday counts), best 3
    db.prepare("INSERT OR IGNORE INTO users(username, display_name, created_at) VALUES(?,?,datetime('now'))").run(`${ME}b`, 'B');
    for (const n of [1, 2, 3]) act.run(`${ME}b`, day(n), 1, 1, 10);
  });
});

test.after(() => { proc?.kill(); });

test('/api/level-roadmap pools equal the per-topic SQL they replaced', async () => {
  const body = await getJson('/api/level-roadmap');
  assert.equal(body.ok, true);
  assert.equal(body.weekSeed, Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)));
  const progress = withDb((db) => new Map(db.prepare('SELECT problem_rowid, status, attempts FROM progress WHERE username=?').all(ME).map((r) => [r.problem_rowid, r])));
  let checked = 0;
  for (const level of body.levels) {
    const minR = level.level === 11 ? 2200 : level.minR;
    const maxR = level.level === 11 ? 99999 : level.maxR;
    for (const topic of level.topics) {
      const cond = topic.tags.map(() => 'p.tags LIKE ?').join(' OR ');
      const pool = withDb((db) => db.prepare(
        `SELECT p.id FROM problems p WHERE (${cond}) AND p.rating >= ? AND p.rating <= ? AND p.rating > 0`,
      ).all(...topic.tags.map((t) => `%${t}%`), minR, maxR));
      assert.equal(topic.totalPool, pool.length, `${level.name}/${topic.name} pool size`);
      const solvedInPool = pool.filter((p) => progress.get(p.id)?.status === 'solved').length;
      assert.equal(topic.solvedInPool, solvedInPool, `${level.name}/${topic.name} solved in pool`);
      const poolIds = new Set(pool.map((p) => p.id));
      for (const p of topic.problems) {
        assert.ok(poolIds.has(p.id), 'selected problem comes from the pool');
        assert.equal(p.solve_status, progress.get(p.id)?.status || 'unsolved');
        assert.equal(p.attempts, progress.get(p.id)?.attempts || 0);
      }
      // unsolved problems are preferred
      const unsolvedInPool = pool.length - solvedInPool;
      const pickedSolved = topic.problems.filter((p) => p.solve_status === 'solved').length;
      assert.equal(pickedSolved, Math.max(0, topic.problems.length - unsolvedInPool));
      assert.equal(topic.problems.length, Math.min(pool.length, topic.problems.length));
      checked++;
    }
  }
  assert.ok(checked > 50);
});

test('/api/nexus totals match progress rows', async () => {
  const body = await getJson('/api/nexus');
  const t = withDb((db) => db.prepare("SELECT COALESCE(SUM(xp_earned),0) xp, SUM(status='solved') solved FROM progress WHERE username=?").get(ME));
  assert.equal(body.player.xp, t.xp);
  const ascension = body.nodes.find((n) => n.id === 'overflow_ascension');
  // a tag-less node counts every solve
  assert.equal(ascension.solved, Math.min(t.solved, ascension.target));
  const impl = withDb((db) => db.prepare(
    "SELECT COUNT(DISTINCT p.id) c FROM progress pr JOIN problems p ON p.id=pr.problem_rowid WHERE pr.username=? AND pr.status='solved' AND lower(p.tags) LIKE '%implementation%'",
  ).get(ME).c);
  const node = body.nodes.find((n) => n.tags.length === 1 && n.tags[0] === 'implementation');
  if (node) assert.equal(node.solved, Math.min(impl, node.target));
});

test('streaks: /api/stats and the batched streak leaderboard agree with the activity', async () => {
  const stats = await getJson(`/api/stats?username=${ME}`);
  assert.equal(stats.streak.current, 5);
  assert.equal(stats.streak.best, 6);
  assert.equal(stats.streak.lastWeek.length, 7);
  const lb = await getJson('/api/leaderboard?type=streak');
  const mine = lb.leaderboard.find((r) => r.username === ME);
  const other = lb.leaderboard.find((r) => r.username === `${ME}b`);
  assert.deepEqual([mine.current_streak, mine.best_streak], [5, 6]);
  assert.deepEqual([other.current_streak, other.best_streak], [3, 3]);
  const idx = (u) => lb.leaderboard.findIndex((r) => r.username === u);
  assert.ok(idx(ME) < idx(`${ME}b`), 'sorted by best streak');
});

test('/api/skill-tree/:id/problems still returns the matching total', async () => {
  const body = await getJson('/api/skill-tree/eb_fft/problems');
  assert.equal(body.ok, true);
  assert.equal(typeof body.skill.totalAvailable, 'number');
  assert.ok(body.problems.length <= 50);
});
