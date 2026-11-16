// Home "For you today": real picks, stable within a day, new on Shuffle, and
// never a problem the person has already solved.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { targetRating, rng } = require('../src/routes/today');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-today-'));
const DB = path.join(tmp, 'test.db');
let proc, base, cookie, ids;
let serverLog = '';

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const call = async (method, p, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers };
};

test('targetRating aims a little above the recent median', () => {
  assert.equal(targetRating([]), 900);
  assert.equal(targetRating([800, 1000, 1200]), 1100);
  assert.equal(targetRating([0, 0]), 900, 'unrated solves do not count');
});

test('rng is stable for a seed and differs across seeds', () => {
  const a = rng('x|2026-11-16|0');
  const b = rng('x|2026-11-16|0');
  const c = rng('x|2026-11-16|1');
  const sa = [a(), a(), a()];
  assert.deepEqual(sa, [b(), b(), b()]);
  assert.notDeepEqual(sa, [c(), c(), c()]);
});

test.before(async () => {
  const port = 25000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 });
  for (let i = 0; i < 12; i++) {
    db.exec(`INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES('codeforces','T${i}','Problem ${i}','https://x',${800 + i * 100},'["math"]')`);
  }
  db.exec("UPDATE catalog_meta SET v = v + 1 WHERE k = 'problems'");
  ids = db.prepare("SELECT id FROM problems WHERE problem_id LIKE 'T%'").all().map((r) => Number(r.id));
  db.close();
  const r = await call('POST', '/api/user/register', { username: `td${Date.now().toString(36)}`, email: `td${Date.now()}@t.io`, password: 'secret123' });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

test('picks are real, stable for the day and change on shuffle', async () => {
  const a = await call('GET', '/api/today/picks');
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.ok(a.body.problem, 'a problem is picked');
  assert.ok(ids.includes(a.body.problem.id), 'the problem exists');
  assert.ok(a.body.gate && a.body.gate.id, 'a GATE question is picked');
  assert.ok(Array.isArray(a.body.notes));
  const again = await call('GET', '/api/today/picks');
  assert.equal(again.body.problem.id, a.body.problem.id, 'stable within the day');
  assert.equal(again.body.gate.id, a.body.gate.id);
  const seen = new Set();
  for (let s = 0; s < 8; s++) seen.add((await call('GET', `/api/today/picks?shuffle=${s}`)).body.gate.id);
  assert.ok(seen.size > 1, 'shuffle brings new picks');
});
