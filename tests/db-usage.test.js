// Guard rails for the database budget (Turso bills every row read/written —
// see docs/ops/db-usage.md):
//   • no hot endpoint runs a full scan of `problems` (EXPLAIN-based, via the
//     DB_STATS instrumentation behind GET /api/admin/db-stats);
//   • a signed-in page view never writes the session;
//   • the session read cache is invalidated at once by sign-out, role change,
//     ban and force-sign-out (the admin features rely on it);
//   • the in-memory catalog answers /api/problems exactly like the SQL did.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-dbusage-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `ow${stamp}`;
const MEMBER = `me${stamp}`;
const OTHER = `ot${stamp}`;
let proc, base;
let serverLog = '';

const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, body: json, headers: r.headers };
};
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const register = async (name) => cookieOf(await call('POST', '/api/user/register', null, { username: name, password: 'secret123' }));
const login = async (name) => cookieOf(await call('POST', '/api/user/login', null, { username: name, password: 'secret123' }));
const stats = async (cookie) => {
  const r = await call('GET', '/api/admin/db-stats?top=200', cookie);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
};
function withDb(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
  try { return fn(db); } finally { db.close(); }
}
const c = {};

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1',
      DB_STATS: '1', OWNER_USERNAME: OWNER, SESSION_CACHE_TTL_MS: '60000', TURSO_DATABASE_URL: '', USE_CLOUD_DB: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    if (proc.exitCode !== null || i > 160) throw new Error(`server not up: ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  c.owner = await register(OWNER);
  c.member = await register(MEMBER);
  c.other = await register(OTHER);
  withDb((db) => {
    const ins = db.prepare('INSERT INTO problems(platform,problem_id,title,url,rating,tags,category) VALUES(?,?,?,?,?,?,?)');
    const tags = ['["dp","math"]', '["graphs"]', '["Greedy","sortings"]', '[]', '["strings","hashing"]', null];
    for (let i = 0; i < 1500; i++) {
      ins.run(i % 3 ? 'codeforces' : 'atcoder', `GR${i}`, `${i % 7 ? 'Tree' : 'path_50%'} task ${i}`, `https://x/${i}`,
        i % 11 === 0 ? 0 : 800 + (i % 25) * 100, tags[i % tags.length], i % 2 ? 'DP' : '');
    }
    const ids = db.prepare("SELECT id FROM problems WHERE problem_id LIKE 'GR%' ORDER BY id").all().map((r) => r.id);
    const pr = db.prepare('INSERT INTO progress(username, problem_rowid, status, attempts, xp_earned, solved_at) VALUES(?,?,?,?,?,?)');
    ids.slice(0, 120).forEach((id, k) => pr.run(MEMBER, id, k % 3 ? 'solved' : 'attempted', 1, 20, '2026-01-01T00:00:00.000Z'));
  });
});
test.after(async () => {
  if (proc) {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

const HOT = [
  '/api/problems?limit=50', '/api/problems?limit=50&offset=100', '/api/problems?platform=codeforces&minRating=1200&maxRating=1600',
  '/api/problems?tag=dp', '/api/problems?search=tree&sort=title&order=desc', '/api/problems?status=solved',
  '/api/problems?status=unsolved&sort=id', '/api/tags', '/api/stats', '/api/performance', '/api/nexus', '/api/level-roadmap',
  '/api/skill-tree', '/api/skill-tree/eb_fft/problems', '/api/roadmap', '/api/weakness-analysis', '/api/leaderboard',
  '/api/leaderboard?type=streak', '/api/gate/leaderboard?period=week', '/api/gate/trends?exam=CSE', '/api/gate/daily',
  '/api/site/status', '/api/site/badges', '/api/social/feed', '/api/social/feed?tab=explore', '/api/social/trending',
  '/api/social/suggestions', `/api/profiles/${MEMBER}`, `/api/profiles/${MEMBER}/showcase`, '/api/tutorials',
  '/api/scrape-stats', '/api/health',
];

test('no hot endpoint scans the problems table', async () => {
  for (const p of HOT) {
    const r = await call('GET', p, c.member);
    assert.ok(r.status < 500, `${p}: ${r.status}`);
  }
  const s = await stats(c.owner);
  assert.equal(s.detailed, true);
  // The only statement allowed to read all of `problems` is the catalog
  // (re)build itself, which runs once per catalog version — not per request.
  const offenders = s.scanning.filter(
    (q) => q.scans.includes('problems') && !/^SELECT id, platform, problem_id, title, url, rating, tags, category FROM problems ORDER BY id$/.test(q.sql),
  );
  assert.deepEqual(offenders, [], `full scans of problems:\n${offenders.map((o) => o.sql).join('\n')}`);
  const loads = s.scanning.find((q) => q.scans.includes('problems'));
  assert.ok(!loads || loads.calls <= 2, `catalog rebuilt ${loads?.calls} times`);
});

test('the catalog answers /api/problems like the SQL it replaced', async () => {
  const me = MEMBER;
  const sqlFor = (q) => {
    const where = ['1=1'];
    const args = [];
    if (q.platform) { where.push('p.platform=?'); args.push(q.platform); }
    if (q.minRating) { where.push('p.rating>=?'); args.push(+q.minRating); }
    if (q.maxRating) { where.push('p.rating<=?'); args.push(+q.maxRating); }
    if (q.tag) { where.push('p.tags LIKE ?'); args.push(`%${q.tag}%`); }
    if (q.search) { where.push('(p.title LIKE ? OR p.problem_id LIKE ?)'); args.push(`%${q.search}%`, `%${q.search}%`); }
    if (q.status === 'solved') where.push("COALESCE(pr.status,'unsolved')='solved'");
    if (q.status === 'unsolved') where.push("(pr.status IS NULL OR pr.status='unsolved')");
    const col = { rating: 'p.rating', title: 'p.title', id: 'p.problem_id' }[q.sort] || 'p.rating';
    return withDb((db) => {
      const from = `FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=? WHERE ${where.join(' AND ')}`;
      const total = db.prepare(`SELECT COUNT(*) AS n ${from}`).get(me, ...args).n;
      const ids = db.prepare(`SELECT p.id ${from} ORDER BY ${col === 'p.rating' ? '(p.rating = 0), ' : ''}${col} ${q.order === 'desc' ? 'DESC' : 'ASC'}, p.id ASC LIMIT 50 OFFSET ?`)
        .all(me, ...args, +(q.offset || 0)).map((r) => r.id);
      return { total, ids };
    });
  };
  for (const q of [
    {}, { offset: '50' }, { platform: 'atcoder', sort: 'title' }, { tag: 'GREEDY' }, { tag: 'dp', minRating: '1000', maxRating: '1500', order: 'desc' },
    { search: '50%' }, { search: 'path_' }, { search: 'gr1', sort: 'id', order: 'desc' }, { status: 'solved' }, { status: 'unsolved', tag: 'graphs' },
    { minRating: 'abc' },
  ]) {
    const qs = new URLSearchParams({ ...q, limit: '50' }).toString();
    const r = await call('GET', `/api/problems?${qs}`, c.member);
    assert.equal(r.status, 200);
    const want = sqlFor(q);
    assert.equal(r.body.total, want.total, `total for ${qs}`);
    assert.deepEqual(r.body.problems.map((p) => p.id), want.ids, `page for ${qs}`);
  }
  // A problem added behind the server's back (another process) shows up.
  withDb((db) => db.prepare("INSERT INTO problems(platform,problem_id,title,url,rating,tags) VALUES('codeforces','FRESH1','Fresh one','u',900,'[]')").run());
  const r = await call('GET', '/api/problems?search=FRESH1', c.member);
  assert.equal(r.body.total, 1);
});

const sessionWrites = (s) =>
  s.topWrites.filter((q) => /^(INSERT INTO sessions|UPDATE sessions)/.test(q.sql)).reduce((n, q) => n + q.calls, 0);

test('a signed-in page view does not write the session', async () => {
  const before = sessionWrites(await stats(c.owner));
  for (const p of ['/api/auth/status', '/api/stats', '/api/problems', '/api/site/status', '/api/nexus', '/api/auth/status']) {
    assert.equal((await call('GET', p, c.member)).status, 200, p);
  }
  const after = sessionWrites(await stats(c.owner));
  assert.equal(after, before, 'page views wrote the session');
});

test('cached sessions: sign-out, role change, ban and force sign-out apply at once', async () => {
  const authed = async (cookie) => (await call('GET', '/api/auth/status', cookie)).body.authenticated;
  // Warm the cache, then sign out: the old cookie is anonymous immediately.
  const extra = await login(OTHER);
  assert.equal(await authed(extra), true);
  await call('POST', '/api/auth/logout', extra, {});
  assert.equal(await authed(extra), false, 'sign-out');

  // Role change through the admin API.
  assert.equal((await call('GET', '/api/admin/users', c.other)).status, 404);
  assert.equal((await call('POST', `/api/admin/users/${OTHER}/role`, c.owner, { role: 'admin' })).status, 200);
  assert.equal((await call('GET', '/api/admin/users', c.other)).status, 200, 'promotion applies on the next request');
  assert.equal((await call('POST', `/api/admin/users/${OTHER}/role`, c.owner, { role: 'member' })).status, 200);
  assert.equal((await call('GET', '/api/admin/users', c.other)).status, 404, 'demotion applies on the next request');

  // Force sign-out.
  assert.equal(await authed(c.other), true);
  assert.equal((await call('POST', `/api/admin/users/${OTHER}/signout`, c.owner, {})).status, 200);
  assert.equal(await authed(c.other), false, 'force sign-out');

  // Ban.
  const again = await login(OTHER);
  assert.equal(await authed(again), true);
  const ban = await call('POST', `/api/admin/users/${OTHER}/ban`, c.owner, { kind: 'ban', reason: 'test' });
  assert.equal(ban.status, 200, JSON.stringify(ban.body));
  assert.equal(await authed(again), false, 'ban');
});

test('the admin card data: projection against the free-plan quota', async () => {
  const s = await stats(c.owner);
  assert.equal(s.projection.quota.reads, 500_000_000);
  assert.equal(s.projection.quota.writes, 10_000_000);
  assert.ok(s.totals.reads > 0 && s.totals.statements > 0);
  assert.equal(typeof s.projection.warning, 'boolean');
  assert.equal((await call('GET', '/api/admin/db-stats', c.member)).status, 404, 'members never see it');
});

test('user_stats (leaderboard totals) stays equal to the progress/activity aggregates', async () => {
  withDb((db) => {
    const ids = db.prepare("SELECT id FROM problems WHERE problem_id LIKE 'GR%' ORDER BY id LIMIT 300").all().map((r) => r.id);
    db.prepare("UPDATE progress SET status='solved', xp_earned=xp_earned+5 WHERE username=? AND status='attempted'").run(MEMBER);
    db.prepare('DELETE FROM progress WHERE username=? AND problem_rowid IN (?,?)').run(MEMBER, ids[0], ids[1]);
    db.prepare("INSERT INTO progress(username, problem_rowid, status, attempts, xp_earned) VALUES(?,?, 'solved', 1, NULL)").run(OTHER, ids[200]);
    db.prepare("INSERT INTO daily_activity(username, date, problems_solved) VALUES(?, '2026-01-02', 2), (?, '2026-01-03', 0)").run(MEMBER, MEMBER);
    db.prepare("UPDATE daily_activity SET problems_solved=3 WHERE username=? AND date='2026-01-03'").run(MEMBER);
    const want = db.prepare(`SELECT u.username,
        COALESCE((SELECT SUM(xp_earned) FROM progress p WHERE p.username=u.username),0) AS xp,
        (SELECT COUNT(*) FROM progress p WHERE p.username=u.username AND status='solved') AS solved,
        (SELECT COUNT(*) FROM daily_activity d WHERE d.username=u.username AND problems_solved>0) AS days
      FROM users u ORDER BY u.username`).all();
    const got = db.prepare(`SELECT u.username, COALESCE(s.xp,0) AS xp, COALESCE(s.solved,0) AS solved, COALESCE(s.active_days,0) AS days
      FROM users u LEFT JOIN user_stats s ON s.username=u.username ORDER BY u.username`).all();
    assert.deepEqual(got, want);
  });
});
