// Topics on every problem (src/topics.js, src/routes/topics.js): the detector,
// the Problems filter and search, staff corrections that are kept for good,
// the backfill, and who may change what.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const topics = require('../src/topics');

/* ── the detector (no server) ── */

test('the client list of topics is the same as the server list', async () => {
  const { TOPICS } = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'lib', 'topics.ts')).href);
  assert.deepEqual(TOPICS, topics.TOPICS);
  assert.equal(new Set(topics.TOPICS.map((t) => t.id)).size, topics.TOPICS.length, 'ids are unique');
});

test('every tag and text rule points at a real topic', () => {
  const ids = new Set(topics.TOPICS.map((t) => t.id));
  for (const [tag, list] of Object.entries(topics.TAG_MAP)) for (const id of list) assert.ok(ids.has(id), `${tag} → ${id}`);
  for (const [re, list] of topics.TEXT_RULES) for (const id of list) assert.ok(ids.has(id), `${re} → ${id}`);
});

test('the judge’s own tags decide first; words only add on strong evidence', () => {
  const ids = (r) => r.topics.map((t) => t.id);
  const cf = topics.classify({ title: 'Some Problem', tags: ['dp', 'graphs'] });
  assert.ok(ids(cf).includes('dp') && ids(cf).includes('graphs'));
  assert.equal(cf.sure, true);
  assert.equal(cf.topics.find((t) => t.id === 'dp').from, 'tags');

  // "Coin Combinations" is tagged DP: the word "combinations" must not add combinatorics.
  const coin = topics.classify({ title: 'Coin Combinations I', tags: ['Dynamic Programming'] });
  assert.ok(ids(coin).includes('dp'));
  assert.ok(!ids(coin).includes('combinatorics'), JSON.stringify(coin));

  // No tags: the title and statement decide.
  const sp = topics.classify({ title: 'Shortest Routes', statement: 'Find the shortest path from city 1 to every city using Dijkstra.' });
  assert.ok(ids(sp).includes('shortest-paths') && ids(sp).includes('graphs'));
  assert.equal(sp.topics.find((t) => t.id === 'shortest-paths').from, 'text');

  // A specific kind brings its family.
  const bm = topics.classify({ title: 'X', tags: ['bitmasks', 'dp'] });
  assert.ok(ids(bm).includes('dp'));

  // Tags come alphabetically: the telling topics come first, the broad ones after.
  const fft = topics.classify({ title: 'Colorful Works', tags: ['dp', 'fft', 'games', 'implementation'] });
  assert.deepEqual(ids(fft).slice(0, 3).sort(), ['dp', 'fft', 'game-theory']);
  assert.ok(ids(fft).indexOf('implementation') > 2, JSON.stringify(fft));

  // Nothing to go on: no topics, not sure.
  const none = topics.classify({ title: 'Untitled' });
  assert.deepEqual(none.topics, []);
  assert.equal(none.sure, false);

  // Never more than five, highest confidence first.
  const many = topics.classify({ title: 'X', tags: ['dp', 'graphs', 'math', 'greedy', 'strings', 'trees', 'sortings', 'binary search'] });
  assert.ok(many.topics.length <= 5);
  assert.ok(many.topics.every((t, i, a) => i === 0 || a[i - 1].conf >= t.conf));
});

test('search text: topic:<name> filters, a whole topic name also finds its problems', () => {
  assert.deepEqual(topics.topicsInQuery('topic:dp knapsack'), { ids: ['dp'], rest: 'knapsack', orTopic: null });
  assert.deepEqual(topics.topicsInQuery('topic:"binary search"'), { ids: ['binary-search'], rest: '', orTopic: null });
  assert.deepEqual(topics.topicsInQuery('dynamic programming'), { ids: [], rest: 'dynamic programming', orTopic: 'dp' });
  assert.deepEqual(topics.topicsInQuery('binary'), { ids: [], rest: 'binary', orTopic: null }, 'a part of a name is a plain search');
  assert.equal(topics.findTopic('DSU'), 'union-find');
  assert.equal(topics.findTopic('dijkstra'), 'shortest-paths');
  assert.equal(topics.findTopic('nonsense', true), null);
});

/* ── the API ── */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-topics-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const OWNER = `tow${stamp}`;
const MEM = `tme${stamp}`;
let proc, base;
let serverLog = '';
const c = {};

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
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json };
};
const ok = (r, msg) => assert.equal(r.status, 200, `${msg || ''} ${r.status} ${JSON.stringify(r.body)}`);
function db(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const d = new DatabaseSync(DB, { timeout: 10000 });
  try { return fn(d); } finally { d.close(); }
}
const ids = {};

test.before(async () => {
  const port = 30500 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', TOPICS_STARTUP: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  for (const n of [OWNER, MEM]) {
    const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: n, password: 'secret123' }) });
    assert.equal(r.status, 200, `register ${n}`);
    c[n] = r.headers.get('set-cookie').split(';')[0];
  }
  ok(await call('PUT', '/api/admin/site/private-mode', c[OWNER], { enabled: false }));
  db((d) => {
    const add = d.prepare("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES(?,?,?,?,?,?)");
    const rows = [
      ['knap', 'codeforces', `T${stamp}A`, 'Knapsack Again', '["dp"]'],
      ['roads', 'codeforces', `T${stamp}B`, 'City Roads', '["graphs","shortest paths"]'],
      ['both', 'codeforces', `T${stamp}C`, 'Paths and Choices', '["dp","graphs"]'],
      ['plain', 'codeforces', `T${stamp}D`, 'Graphs Are Fun', '[]'],
      ['spoj', 'spoj', `T${stamp}E`, 'Another Knapsack', '["dp"]'],
    ];
    for (const [key, platform, pid, title, tags] of rows) {
      add.run(platform, pid, title, 'https://x', 1500, tags);
      ids[key] = Number(d.prepare('SELECT id FROM problems WHERE problem_id=?').get(pid).id);
    }
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

async function runBackfill(body = {}) {
  ok(await call('POST', '/api/problem-sources/topics/backfill', c[OWNER], body));
  for (let i = 0; i < 100; i++) {
    const s = await call('GET', '/api/problem-sources/topics', c[OWNER]);
    if (!s.body.job.running) return s.body;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('backfill did not finish');
}

const list = async (q) => (await call('GET', `/api/problems?limit=200&${q}`, c[MEM])).body;
const titles = (r) => r.problems.filter((p) => p.problem_id.startsWith(`T${stamp}`)).map((p) => p.title).sort();

test('only staff with the Problems permission run the backfill or change topics', async () => {
  assert.equal((await call('POST', '/api/problem-sources/topics/backfill', c[MEM], {})).status, 403);
  assert.equal((await call('PUT', `/api/problem-sources/topics/${ids.knap}`, c[MEM], { topics: ['greedy'] })).status, 403);
  assert.equal((await call('GET', '/api/problem-sources/topics', c[MEM])).status, 403);
});

test('the backfill gives every problem its topics; the list carries them', async () => {
  const before = await call('GET', '/api/problem-sources/topics', c[OWNER]);
  assert.ok(before.body.summary.total >= 5);
  const done = await runBackfill();
  assert.equal(done.job.error, null);
  assert.ok(done.job.done >= 5);
  assert.equal(done.job.total, done.job.done, 'the progress ends at "n of n"');
  const r = await list('');
  const knap = r.problems.find((p) => p.id === ids.knap);
  assert.deepEqual(knap.topics, ['dp']);
  const roads = r.problems.find((p) => p.id === ids.roads);
  assert.ok(roads.topics.includes('shortest-paths') && roads.topics.includes('graphs'));
  const one = await call('GET', `/api/problems/${ids.roads}`, c[MEM]);
  assert.deepEqual(one.body.problem.topics, roads.topics, 'the problem page shows the same');
});

test('filter by topic (every chosen topic must match) and search by topic', async () => {
  assert.deepEqual(titles(await list('topic=dp')), ['Another Knapsack', 'Knapsack Again', 'Paths and Choices']);
  assert.deepEqual(titles(await list('topic=dp,graphs')), ['Paths and Choices']);
  assert.deepEqual(titles(await list(`search=${encodeURIComponent('topic:graphs')}`)), ['City Roads', 'Paths and Choices']);
  // A whole topic name finds that topic's problems and titles with the word.
  assert.deepEqual(titles(await list('search=graphs')), ['City Roads', 'Graphs Are Fun', 'Paths and Choices']);
  assert.deepEqual(titles(await list('topic=nonsense')), titles(await list('')), 'an unknown topic filters nothing');
});

test('a source switched off in Admin leaves the topic list and its counts', async () => {
  const count = async () => (await call('GET', '/api/topics', c[MEM])).body.topics.find((t) => t.id === 'dp').count;
  const all = await count();
  assert.ok(all >= 3);
  ok(await call('PUT', '/api/problem-sources/spoj', c[OWNER], { enabled: false }), 'turn SPOJ off');
  try {
    assert.equal(await count(), all - 1);
    assert.ok(!titles(await list('topic=dp')).includes('Another Knapsack'));
  } finally {
    ok(await call('PUT', '/api/problem-sources/spoj', c[OWNER], { enabled: true }));
  }
});

test('a staff correction is kept for good, audited, and can be undone', async () => {
  assert.equal((await call('PUT', `/api/problem-sources/topics/${ids.knap}`, c[OWNER], { topics: ['nope'] })).status, 400);
  const put = await call('PUT', `/api/problem-sources/topics/${ids.knap}`, c[OWNER], { topics: ['greedy', 'sorting'] });
  ok(put);
  assert.equal(put.body.locked, true);
  await runBackfill({ all: true });
  const t = await call('GET', `/api/problems/${ids.knap}/topics`, c[MEM]);
  assert.deepEqual(t.body.topics.map((x) => x.id), ['greedy', 'sorting'], 'the backfill never overwrites it');
  assert.equal(t.body.locked, true);
  assert.equal(t.body.canEdit, false);
  assert.ok(titles(await list('topic=greedy')).includes('Knapsack Again'));
  const audit = await call('GET', '/api/admin/audit', c[OWNER]);
  const actions = (audit.body.entries || audit.body.rows || audit.body.log || []).map((e) => e.action);
  assert.ok(actions.includes('problem.topics'));

  ok(await call('DELETE', `/api/problem-sources/topics/${ids.knap}/lock`, c[OWNER]));
  const back = await call('GET', `/api/problems/${ids.knap}/topics`, c[MEM]);
  assert.deepEqual(back.body.topics.map((x) => x.id), ['dp'], 'back to what the tags say');
  assert.equal(back.body.locked, false);
});

test('topics of an unpublished problem stay with staff', async () => {
  db((d) => d.prepare("UPDATE problems SET category='__hidden' WHERE id=?").run(ids.plain));
  try {
    assert.equal((await call('GET', `/api/problems/${ids.plain}/topics`, c[MEM])).status, 404);
    ok(await call('GET', `/api/problems/${ids.plain}/topics`, c[OWNER]));
  } finally {
    db((d) => d.prepare('UPDATE problems SET category=NULL WHERE id=?').run(ids.plain));
  }
});
