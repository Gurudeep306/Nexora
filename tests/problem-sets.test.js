// Problem sets (src/routes/problem-sets.js): your own sets (private until
// public), public sets by likes, the CSES series built live from the catalog,
// company sets that must cite a public source, and community "asked at"
// reports that show only once enough people made them.
const { freePort } = require('./helpers/free-port');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-sets-'));
const DB = path.join(tmp, 'test.db');
const stamp = Date.now().toString(36).slice(-5);
const [OWNER, ANA, BEN, CAT] = ['pow', 'pan', 'pbe', 'pca'].map((p) => `${p}${stamp}`);
let proc, base;
let serverLog = '';
const c = {};
const pid = {};

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
const ok = (r, msg) => assert.equal(r.status, 200, `${msg || ''} ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, OWNER_USERNAME: OWNER, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', TOPICS_STARTUP: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  for (const n of [OWNER, ANA, BEN, CAT]) {
    const r = await fetch(`${base}/api/user/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: n, password: 'secret123' }) });
    assert.equal(r.status, 200);
    c[n] = r.headers.get('set-cookie').split(';')[0];
  }
  ok(await call('PUT', '/api/admin/site/private-mode', c[OWNER], { enabled: false }));
  ok(await call('PUT', '/api/problem-sources/cses', c[OWNER], { enabled: true }));
  const { DatabaseSync } = require('node:sqlite');
  const d = new DatabaseSync(DB, { timeout: 10000 });
  try {
    const add = d.prepare('INSERT INTO problems(platform, problem_id, title, url, rating, tags, category) VALUES(?,?,?,?,?,?,?)');
    for (const [k, platform, id, title, cat] of [
      ['a', 'codeforces', `S${stamp}A`, 'Two Sum Again', null],
      ['b', 'codeforces', `S${stamp}B`, 'Longest Path', null],
      ['c', 'codeforces', `S${stamp}C`, 'Unpublished One', '__hidden'],
      ['w', 'cses', `CSES9${stamp}1`, 'Weird Start', 'Introductory Problems'],
      ['x', 'cses', `CSES9${stamp}2`, 'Sorting Things', 'Sorting and Searching'],
      // In the built-in library: Blind 75 starts with Contains Duplicate; KEYENCE's first contest with Last Card.
      ['lc', 'leetcode', 'LC217', 'Contains Duplicate', null],
      ['ac', 'atcoder', 'abc227_a', 'Last Card', null],
      ['l', 'leetcode', 'LC1', 'Two Sum', null],
    ]) {
      add.run(platform, id, title, 'https://x', 1300, '[]', cat);
      pid[k] = Number(d.prepare('SELECT id FROM problems WHERE problem_id=?').get(id).id);
    }
  } finally {
    d.close();
  }
});
test.after(async () => {
  if (proc) {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

let mine;

test('your own set: private to you until you make it public', async () => {
  assert.equal((await call('POST', '/api/problem-sets', null, { title: 'x' })).status, 401);
  assert.equal((await call('POST', '/api/problem-sets', c[ANA], { title: 'x' })).status, 400, 'a real name');
  const r = await call('POST', '/api/problem-sets', c[ANA], { title: 'Graph warm-up', description: 'Before the contest', problemIds: [pid.a, pid.b, pid.c, pid.a] });
  ok(r);
  mine = r.body.id;
  const s = await call('GET', `/api/problem-sets/${mine}`, c[ANA]);
  ok(s);
  assert.deepEqual(s.body.items.map((i) => i.problem.title), ['Two Sum Again', 'Longest Path'], 'no unpublished problem, no repeats');
  assert.equal(s.body.set.visibility, 'private');
  assert.equal(s.body.canEdit, true);
  assert.equal((await call('GET', `/api/problem-sets/${mine}`, c[BEN])).status, 404, 'others cannot see a private set');
  assert.ok((await call('GET', '/api/problem-sets?tab=mine', c[ANA])).body.sets.some((x) => x.id === mine));
  assert.ok(!(await call('GET', '/api/problem-sets?tab=public', c[BEN])).body.sets.some((x) => x.id === mine));
  assert.notEqual((await call('PUT', `/api/problem-sets/${mine}`, c[BEN], { title: 'Mine now' })).status, 200, 'only its owner changes it');
});

test('add, remove and reorder; your progress shows on the set', async () => {
  const add = await call('POST', `/api/problem-sets/${mine}/items`, c[ANA], { problemId: pid.w });
  ok(add);
  assert.equal(add.body.added, 1);
  assert.equal((await call('POST', `/api/problem-sets/${mine}/items`, c[ANA], { problemId: pid.w })).body.added, 0, 'already there');
  assert.equal((await call('POST', `/api/problem-sets/${mine}/items`, c[ANA], { url: 'https://example.com/p', title: 'Elsewhere' })).status, 400, 'own sets hold our problems only');
  ok(await call('PUT', `/api/problem-sets/${mine}/order`, c[ANA], { order: [2, 0, 1] }));
  let s = (await call('GET', `/api/problem-sets/${mine}`, c[ANA])).body;
  assert.deepEqual(s.items.map((i) => i.problem.title), ['Weird Start', 'Two Sum Again', 'Longest Path']);
  assert.equal((await call('PUT', `/api/problem-sets/${mine}/order`, c[ANA], { order: [0, 1] })).status, 400, 'every position once');
  ok(await call('DELETE', `/api/problem-sets/${mine}/items/0`, c[ANA]));
  s = (await call('GET', `/api/problem-sets/${mine}`, c[ANA])).body;
  assert.deepEqual(s.items.map((i) => [i.position, i.problem.title]), [[0, 'Two Sum Again'], [1, 'Longest Path']], 'positions close up');
  const { DatabaseSync } = require('node:sqlite');
  const d = new DatabaseSync(DB, { timeout: 10000 });
  try {
    d.prepare("INSERT INTO progress(username, problem_rowid, status, attempts, xp_earned) VALUES(?,?,'solved',1,10)").run(ANA, pid.a);
  } finally {
    d.close();
  }
  const card = (await call('GET', '/api/problem-sets?tab=mine', c[ANA])).body.sets.find((x) => x.id === mine);
  assert.deepEqual([card.count, card.solved], [2, 1]);
  assert.equal((await call('GET', `/api/problem-sets/${mine}`, c[ANA])).body.items[0].status, 'solved');
});

test('public sets: anyone sees them, ranked by likes; a like counts once', async () => {
  ok(await call('PUT', `/api/problem-sets/${mine}`, c[ANA], { visibility: 'public' }));
  const other = await call('POST', '/api/problem-sets', c[BEN], { title: 'Ben picks', visibility: 'public', problemIds: [pid.b] });
  ok(other);
  ok(await call('PUT', `/api/problem-sets/${mine}/like`, c[BEN]));
  ok(await call('PUT', `/api/problem-sets/${mine}/like`, c[BEN]), 'twice is still once');
  const liked = await call('PUT', `/api/problem-sets/${mine}/like`, c[CAT]);
  assert.equal(liked.body.likes, 2);
  const list = (await call('GET', '/api/problem-sets?tab=public', c[CAT])).body.sets;
  assert.deepEqual(list.slice(0, 2).map((x) => x.id), [mine, other.body.id], 'most liked first');
  assert.equal(list[0].liked, true);
  assert.equal((await call('DELETE', `/api/problem-sets/${mine}/like`, c[CAT])).body.likes, 1);
  assert.ok((await call('GET', '/api/problem-sets?tab=public&q=ben', c[CAT])).body.sets.every((x) => x.title === 'Ben picks'), 'search');
});

test('the CSES series is built live from the catalog, in sections', async () => {
  const list = (await call('GET', '/api/problem-sets?tab=series', c[CAT])).body.sets;
  const cses = list.find((x) => x.id === 'cses');
  assert.ok(cses && cses.builtIn);
  assert.equal(cses.count, 2);
  const s = (await call('GET', '/api/problem-sets/cses', c[CAT])).body;
  assert.deepEqual(s.items.map((i) => [i.section, i.problem.title]), [['Introductory Problems', 'Weird Start'], ['Sorting and Searching', 'Sorting Things']]);
  assert.equal(s.canEdit, false);
  // Switched off in Admin, CSES and its series go.
  ok(await call('PUT', '/api/problem-sources/cses', c[OWNER], { enabled: false }));
  try {
    assert.ok(!(await call('GET', '/api/problem-sets?tab=series', c[CAT])).body.sets.some((x) => x.id === 'cses'));
    assert.equal((await call('GET', '/api/problem-sets/cses', c[CAT])).status, 404);
    assert.ok(!(await call('GET', `/api/problem-sets/${mine}`, c[CAT])).body.items.some((i) => i.problem?.platform === 'cses'));
  } finally {
    ok(await call('PUT', '/api/problem-sources/cses', c[OWNER], { enabled: true }));
  }
});

test('the built-in library: famous series and one set per company, named just the company', async () => {
  const lib = require('../content/problem-sets/library.json');
  assert.ok(lib.series.length >= 15 && lib.companies.length >= 40, 'many sets');
  for (const co of lib.companies) {
    assert.equal(co.title, co.company, 'a company set is titled with the company name only');
    assert.ok(co.sourceUrl && co.sections.length, co.company);
  }
  const series = (await call('GET', '/api/problem-sets?tab=series', c[CAT])).body.sets;
  const blind = series.find((x) => x.id === 'blind-75');
  assert.ok(blind && blind.builtIn && blind.count === lib.series.find((x) => x.id === 'blind-75').sections.flatMap((x) => x.items).length);
  const b = (await call('GET', '/api/problem-sets/blind-75', c[CAT])).body;
  assert.equal(b.items[0].problem.id, pid.lc, 'matched to our catalog');
  assert.ok(b.items[1].link && b.items[1].link.url.startsWith('https://leetcode.com/'), 'a problem we lack is a link to the original');
  assert.equal(b.canEdit, false);
  const cos = (await call('GET', '/api/problem-sets?tab=company', c[CAT])).body.sets;
  const key = cos.find((x) => x.id === 'company:KEYENCE');
  assert.ok(key && key.title === 'KEYENCE' && key.kind === 'company');
  assert.ok(!cos.some((x) => /asked at/i.test(x.title)));
  const k = (await call('GET', '/api/problem-sets/company/KEYENCE', c[CAT])).body;
  assert.equal(k.set.title, 'KEYENCE');
  assert.equal(k.items[0].problem.id, pid.ac);
  assert.equal((await call('GET', '/api/problem-sets/company/keyence', c[CAT])).body.set.title, 'KEYENCE', 'any letter case');
  const found = (await call('GET', '/api/problem-sets?tab=company&q=toyota', c[CAT])).body.sets;
  assert.ok(found.length && found.every((x) => /toyota/i.test(`${x.title} ${x.description}`)));
});

test('series and company sets are staff-only, and must cite a public source', async () => {
  assert.equal((await call('POST', '/api/problem-sets', c[ANA], { title: 'Famous', kind: 'series', sourceUrl: 'https://example.com' })).status, 403);
  assert.equal((await call('POST', '/api/problem-sets', c[OWNER], { title: 'Famous', kind: 'series' })).status, 400, 'a link to the original');
  assert.equal((await call('POST', '/api/problem-sets', c[OWNER], { title: 'Acme list', kind: 'company', company: 'Acme' })).status, 400, 'a public source');
  assert.equal((await call('POST', '/api/problem-sets', c[OWNER], { title: 'Acme list', kind: 'company', company: 'Acme', sourceUrl: 'javascript:alert(1)' })).status, 400);
  const s = await call('POST', '/api/problem-sets', c[OWNER], { title: 'A famous sheet', kind: 'series', sourceUrl: 'https://example.com/sheet', problemIds: [pid.a] });
  ok(s);
  ok(await call('POST', `/api/problem-sets/${s.body.id}/items`, c[OWNER], { url: 'https://example.com/elsewhere', title: 'A problem we do not have', section: 'Arrays' }));
  const got = (await call('GET', `/api/problem-sets/${s.body.id}`, c[CAT])).body;
  assert.equal(got.set.sourceUrl, 'https://example.com/sheet');
  assert.deepEqual(got.items.map((i) => i.problem?.title ?? i.link.title), ['Two Sum Again', 'A problem we do not have']);
  assert.equal(got.items[1].link.url, 'https://example.com/elsewhere');
  const co = await call('POST', '/api/problem-sets', c[OWNER], { title: 'Acme list', kind: 'company', company: 'acme', sourceUrl: 'https://example.com/acme' });
  ok(co);
  const list = (await call('GET', '/api/problem-sets?tab=company', c[CAT])).body;
  assert.equal(list.sets.find((x) => x.id === co.body.id).company, 'Acme');
});

test('"asked at" reports: a company shows a problem only once two people reported it', async () => {
  assert.equal((await call('POST', `/api/problems/${pid.b}/asked`, c[ANA], { company: '<script>' })).status, 400);
  assert.equal((await call('POST', `/api/problems/${pid.b}/asked`, c[ANA], { company: 'Globex', year: 1990 })).status, 400);
  assert.equal((await call('POST', `/api/problems/${pid.c}/asked`, c[ANA], { company: 'Globex' })).status, 404, 'not on an unpublished problem');
  ok(await call('POST', `/api/problems/${pid.b}/asked`, c[ANA], { company: 'globex', year: 2025 }));
  ok(await call('POST', `/api/problems/${pid.b}/asked`, c[ANA], { company: 'Globex' }), 'the same person again counts once');
  let list = (await call('GET', '/api/problem-sets?tab=company', c[CAT])).body;
  assert.ok(!list.reported.some((x) => x.company === 'Globex'), 'one report is not enough');
  ok(await call('POST', `/api/problems/${pid.b}/asked`, c[BEN], { company: 'Globex' }));
  list = (await call('GET', '/api/problem-sets?tab=company', c[CAT])).body;
  assert.deepEqual(list.reported.find((x) => x.company === 'Globex'), { company: 'Globex', count: 1 });
  const set = (await call('GET', `/api/problem-sets/company/${encodeURIComponent('Globex')}`, c[CAT])).body;
  assert.deepEqual(set.items.map((i) => [i.problem.title, i.reports]), [['Longest Path', 2]]);
  assert.match(set.set.description, /not from Globex/);
  const asked = (await call('GET', `/api/problems/${pid.b}/asked`, c[ANA])).body;
  assert.deepEqual(asked.companies[0], { company: 'Globex', reports: 2, year: 2025, shown: true });
  assert.deepEqual(asked.mine.map((m) => m.company), ['Globex']);
  ok(await call('DELETE', `/api/problems/${pid.b}/asked/Globex`, c[BEN]));
  assert.equal((await call('GET', `/api/problem-sets/company/Globex`, c[CAT])).body.items.length, 0, 'back under two reports');
  const after = (await call('GET', `/api/problems/${pid.b}/asked`, c[CAT])).body;
  assert.deepEqual([after.companies, after.waiting], [[], 1], 'one report is counted, not named');
  assert.ok(!JSON.stringify(after).includes('Globex'), 'the name stays hidden from others');
});

test('"Add to a set" lists your sets with whether this problem is in each; deleting a set removes it', async () => {
  const r = (await call('GET', `/api/problem-sets-for/${pid.a}`, c[ANA])).body;
  assert.deepEqual(r.sets.map((s) => [s.id, s.has]), [[mine, true]]);
  ok(await call('DELETE', `/api/problem-sets/${mine}`, c[ANA]));
  assert.equal((await call('GET', `/api/problem-sets/${mine}`, c[ANA])).status, 404);
  assert.equal((await call('PUT', `/api/problem-sets/${mine}/like`, c[BEN])).status, 404);
});

test('built-in famous series ship with the app: listed, resolved live, links for what we lack', async () => {
  const lib = require('../content/problem-sets/library.json');
  const ncLen = lib.series.find((x) => x.id === 'neetcode-150').sections.flatMap((x) => x.items).length;
  const list = (await call('GET', '/api/problem-sets?tab=series', c[CAT])).body.sets;
  const nc = list.find((x) => x.id === 'neetcode-150');
  assert.ok(nc && nc.builtIn, 'NeetCode 150 is listed without any database seed');
  assert.match(nc.sourceUrl, /^https:\/\/neetcode\.io\//);
  assert.equal(nc.count, ncLen, 'every free entry: our problems plus links to the original');
  assert.ok(list.every((x) => x.count > 0), 'no empty series');
  const s = (await call('GET', '/api/problem-sets/neetcode-150', c[CAT])).body;
  assert.equal(s.canEdit, false);
  assert.equal(s.items.length, ncLen);
  assert.ok(s.items.every((i, idx) => i.position === idx), 'positions are 0..n-1');
  const twoSum = s.items.find((i) => i.problem?.title === 'Two Sum');
  assert.ok(twoSum && twoSum.problem.platform === 'leetcode' && twoSum.problem.id === pid.l, 'LC1 matched to our catalog row');
  const linked = s.items.find((i) => i.link);
  assert.ok(linked && linked.link.url.startsWith('https://leetcode.com/problems/'), 'entries we do not have stay as links to the original');
  assert.equal((await call('GET', '/api/problem-sets/nope-404', c[CAT])).status, 404);
});

test('company sources: cited on the company page; a card only once it has problems, titled with the name', async () => {
  const list = (await call('GET', '/api/problem-sets?tab=company', c[CAT])).body;
  assert.ok(!list.sets.some((x) => x.id === 'company:Google'), 'no empty card');
  assert.ok(list.sets.filter((x) => x.builtIn).every((x) => x.count > 0 && x.title === x.company), 'never empty, name only');
  const s = (await call('GET', '/api/problem-sets/company/Google', c[CAT])).body;
  assert.equal(s.set.title, 'Google');
  assert.equal(s.set.sourceUrl, 'https://www.geeksforgeeks.org/google-interview-questions/');
  assert.deepEqual(s.items, []);
  assert.equal(s.canEdit, false);
  // A report-driven company with no built-in source still works and has none.
  const u = (await call('GET', '/api/problem-sets/company/Globex', c[CAT])).body;
  assert.equal(u.set.sourceUrl, null);
});
