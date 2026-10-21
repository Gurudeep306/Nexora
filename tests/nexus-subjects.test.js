// The Nexus across every subject: outline integrity, layout, progress maths,
// and the /api/nexus?subject= API (incl. the cache dropping on study writes).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const subjects = require('../src/nexus/subjects');
const { NEXUS_NODES } = require('../src/nexus/dsa-nodes');
const { loadGateBank } = require('../src/routes/gate');

const ranks = require('../src/nexus/ranks');

// Every subject file there is: nothing here lists subjects by hand.
const DOCS = subjects.readOutlines();
const OUTLINE_IDS = DOCS.filter((d) => !d.engine).map((d) => d.id);
const ALL_IDS = DOCS.map((d) => d.id);

/* ── outlines ─────────────────────────────────────────────────────────── */

test('every subject file is valid: no dangling requires, no cycles, known PYQ topics, a domain', () => {
  assert.ok(DOCS.length >= 60, `${DOCS.length} subjects`);
  assert.equal(new Set(ALL_IDS).size, ALL_IDS.length);
  const errors = subjects.validateOutlines(DOCS, NEXUS_NODES, { bank: loadGateBank(), strict: true });
  assert.deepEqual(errors, []);
  for (const d of DOCS) {
    assert.ok(d.domain, `${d.id}: domain`);
    if (d.engine) continue;
    assert.ok(d.nodes.length >= 12 && d.nodes.length <= 40, `${d.id}: ${d.nodes.length} nodes`);
    assert.ok(d.zones.length >= 4 && d.zones.length <= 7, `${d.id}: ${d.zones.length} zones`);
  }
});

test('the validator catches dangling requires and cycles (also across subjects)', () => {
  const mk = (id, nodes) => ({
    id, name: id, short: id, group: 'gate', icon: 'book', color: '#000',
    zones: [1, 2, 3, 4].map((level) => ({ level, name: `Z${level}` })),
    nodes,
  });
  const fill = (prefix, extra) => [
    ...Array.from({ length: 12 }, (_, i) => ({ id: `${prefix}${i}`, zone: 1 + (i % 4), name: 'n', requires: [] })),
    ...extra,
  ];
  const dangling = subjects.validateOutlines([mk('aa', fill('a', [{ id: 'x', zone: 1, name: 'x', requires: ['nope', 'dsa:nope'] }]))], NEXUS_NODES);
  assert.ok(dangling.some((e) => e.includes('unknown aa:nope')));
  assert.ok(dangling.some((e) => e.includes('unknown dsa:nope')));
  const cyclic = subjects.validateOutlines([
    mk('aa', fill('a', [{ id: 'x', zone: 1, name: 'x', requires: ['bb:y'] }])),
    mk('bb', fill('b', [{ id: 'y', zone: 1, name: 'y', requires: ['aa:x'] }])),
  ], NEXUS_NODES);
  assert.ok(cyclic.some((e) => e.startsWith('cycle')), cyclic.join('\n'));
});

test('layout keeps every prerequisite above (or beside) what it unlocks', () => {
  for (const d of DOCS.filter((x) => !x.engine)) {
    const pos = subjects.layoutSubject(d);
    for (const n of d.nodes) {
      const p = pos.get(n.id);
      assert.ok(p.x >= 0 && p.x <= 100, `${d.id}:${n.id} x=${p.x}`);
      for (const r of n.requires) {
        if (r.includes(':')) continue;
        const parent = d.nodes.find((m) => m.id === r);
        if (parent.zone === n.zone) assert.ok(pos.get(r).row <= p.row, `${d.id}: ${r} below ${n.id}`);
      }
    }
  }
});

test('progress: lessons and PYQs average, prerequisites gate unlocks across subjects', () => {
  const reg = subjects.loadRegistry(NEXUS_NODES);
  const bank = loadGateBank();
  const notes = require('../src/routes/gate-notes').loadGateNotes();
  const pools = subjects.nodePools(reg, bank, notes);
  const pv = pools.get('dl:place-value');
  assert.ok(pv.length >= 5, 'DL lesson PYQs come from the GATE notes');
  const dsa = NEXUS_NODES.map((n) => ({ ...n, progress: 0, completed: false, unlocked: true }));
  const qstate = new Map(pv.map((id) => [id, { attempts: 1, correct: 1 }]));
  const computed = subjects.computeSubjects(reg, dsa, { qstate, lessons: new Set(['dl/place-value']) }, bank, notes);
  const dl = computed.get('dl').nodes;
  const node = dl.find((n) => n.id === 'place-value');
  assert.equal(node.progress, 100);
  assert.equal(node.completed, true);
  assert.equal(node.metric.lessons.done, 1);
  assert.equal(node.metric.pyq.correct, Math.min(pv.length, node.metric.pyq.pool));
  // Its child is now unlocked; something deeper is not.
  assert.equal(dl.find((n) => n.id === 'power-of-two-bases').unlocked, true);
  assert.equal(dl.find((n) => n.id === 'state-minimisation').unlocked, false);
  // Lesson only → half way.
  const half = subjects.computeSubjects(reg, dsa, { qstate: new Map(), lessons: new Set(['dl/place-value']) }, bank, notes);
  assert.equal(half.get('dl').nodes.find((n) => n.id === 'place-value').progress, 50);
  // Cross-subject: DBMS B+ trees needs DSA Trees.
  const bp = computed.get('dbms').nodes.find((n) => n.id === 'bplus-trees');
  assert.ok(bp.crossRequires.some((c) => c.subject === 'dsa' && c.id === 'gb_trees' && c.subjectShort === 'DSA'));
  assert.equal(bp.crossReady, false);
  const dsaDone = dsa.map((n) => (n.id === 'gb_trees' ? { ...n, completed: true, progress: 100 } : n));
  const withTrees = subjects.computeSubjects(reg, dsaDone, { qstate: new Map(), lessons: new Set() }, bank, notes);
  const chip = withTrees.get('dbms').nodes.find((n) => n.id === 'bplus-trees').crossRequires.find((c) => c.id === 'gb_trees');
  assert.equal(chip.completed, true);
  // Cross-subject needs never lock a whole subject: every subject has an open node.
  for (const [sid, v] of computed) assert.ok(v.nodes.some((n) => n.unlocked), `${sid} has no open node`);
  // Reverse chips: DSA Trees knows it unlocks B+ trees.
  assert.ok(subjects.dsaCrossUnlocks(reg, 'gb_trees', computed).some((c) => c.subject === 'dbms' && c.id === 'bplus-trees'));
  // Beyond-GATE tracks start at zero, roots open.
  const web = computed.get('web').nodes;
  assert.ok(web.every((n) => n.progress === 0));
  assert.ok(web.some((n) => n.unlocked));
  const sums = subjects.subjectSummaries(reg, { nodes: dsa, zones: [] }, computed);
  assert.equal(sums[0].id, 'dsa');
  assert.equal(sums.length, ALL_IDS.length);
});

/* ── API ──────────────────────────────────────────────────────────────── */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-nexus-subjects-'));
const DB = path.join(tmp, 'test.db');
let proc;
let base;
let cookie;
let serverLog = '';
const ME = `ns${Date.now().toString(36).slice(-6)}`;

function withDb(fn) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB);
  try { return fn(db); } finally { db.close(); }
}
async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready: ${serverLog}`);
}
const call = async (method, p, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
};

test.before(async () => {
  const port = 27000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1', OWNER_USERNAME: ME, TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '' },
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
});
test.after(async () => {
  if (proc) {
    const done = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await done;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('GET /api/nexus keeps the DSA tree and adds the subject list', async () => {
  const { status, body } = await call('GET', '/api/nexus');
  assert.equal(status, 200);
  assert.equal(body.subject.id, 'dsa');
  assert.equal(body.nodes.length, NEXUS_NODES.length);
  assert.equal(body.zones.length, 11);
  assert.ok(body.player && body.riftLevels.length === 11);
  assert.deepEqual(body.subjects.map((s) => s.id).slice(0, 2), ['dsa', 'dl']);
  assert.equal(body.subjects.length, ALL_IDS.length);
  const trees = body.nodes.find((n) => n.id === 'gb_trees');
  assert.ok(trees.crossUnlocks.some((c) => c.subject === 'dbms'));
});

test('GET /api/nexus?subject=… serves every subject; unknown → 404', async () => {
  for (const id of OUTLINE_IDS) {
    const { status, body } = await call('GET', `/api/nexus?subject=${id}`);
    assert.equal(status, 200, id);
    assert.equal(body.subject.id, id);
    assert.ok(body.nodes.length >= 12, id);
    assert.ok(ranks.TIERS.includes(body.subjectRank.tier) && body.subjectRank.title, id);
    assert.ok(body.nodes.every((n) => n.zone >= 1 && n.zone <= body.zones.length && typeof n.row === 'number'));
  }
  assert.equal((await call('GET', '/api/nexus?subject=nope')).status, 404);
});

test('study writes show up at once (the per-user cache is dropped)', async () => {
  const before = (await call('GET', '/api/nexus?subject=dl')).body.nodes.find((n) => n.id === 'place-value');
  assert.equal(before.progress, 0);
  const put = await call('PUT', '/api/gate/me/notes-progress/dl/place-value', { completed: true });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  const after = (await call('GET', '/api/nexus?subject=dl')).body.nodes.find((n) => n.id === 'place-value');
  assert.equal(after.metric.lessons.done, 1);
  assert.equal(after.progress, 50);
  // A correct PYQ row (written behind the server's back) appears with ?fresh=1.
  const pyqs = (await call('GET', '/api/nexus/pyqs/dl/place-value')).body;
  assert.ok(pyqs.total >= 5);
  withDb((db) => db.prepare('INSERT INTO gate_qstate(username, question_id, outcome, attempts, correct, last_at) VALUES(?,?,?,?,?,?)')
    .run(ME, pyqs.questions[0].id, 'correct', 1, 1, Date.now()));
  const fresh = (await call('GET', '/api/nexus?subject=dl&fresh=1')).body.nodes.find((n) => n.id === 'place-value');
  assert.equal(fresh.metric.pyq.correct, 1);
  assert.ok(fresh.progress > 50);
  const list = (await call('GET', '/api/nexus/pyqs/dl/place-value')).body.questions;
  assert.equal(list.find((q) => q.id === pyqs.questions[0].id).status, 'solved');
  assert.equal((await call('GET', '/api/nexus/pyqs/dl/nope')).status, 404);
});

/* ── ranks ────────────────────────────────────────────────────────────── */

test('subject rank: fair tiers (Master at 80%), the title from the data file (or a default)', () => {
  assert.deepEqual([0, 14, 15, 34, 35, 59, 60, 79, 80, 100].map(ranks.tierFor), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  // Every new threshold is at or below the old 20/40/60/80 one: no tier drops.
  for (let p = 0; p <= 100; p++) assert.ok(ranks.tierFor(p) >= Math.min(4, Math.floor(p / 20)), `no drop at ${p}%`);
  const dl = subjects.loadRegistry(NEXUS_NODES).subjects.get('dl').meta;
  assert.equal(ranks.subjectRank(dl, 45).tier, 'Adept');
  assert.equal(ranks.subjectRank(dl, 45).title, 'Logic Architect');
  assert.equal(ranks.subjectRank(dl, 45).next, 'Expert at 60%');
  assert.equal(ranks.subjectRank(dl, 82).tier, 'Master');
  assert.equal(ranks.subjectRank({ short: 'XYZ' }, 100).title, 'XYZ Pathfinder');
  assert.equal(ranks.subjectRank({ short: 'XYZ' }, 100).next, null);
});

test('subject rank: Master once every core node is done (optional ones may be skipped); next rank in N concepts', () => {
  const mk = (n, opt) => Array.from({ length: n }, (_, i) => ({ id: `n${i}`, kind: i < opt ? 'project' : 'concept', progress: i < opt ? 0 : 100, completed: i >= opt }));
  const nodes = mk(20, 4); // 16 core mastered, 4 optional projects untouched: 80%
  const r = ranks.subjectRank({ short: 'T' }, ranks.subjectProgress(nodes), nodes);
  assert.equal(r.tier, 'Master');
  assert.ok(r.coreDone);
  const fewer = mk(20, 8).map((n, i) => (i === 19 ? { ...n, progress: 0, completed: false } : n)); // a core node left
  const r2 = ranks.subjectRank({ short: 'T' }, ranks.subjectProgress(fewer), fewer);
  assert.ok(!r2.coreDone);
  assert.equal(r2.tier, 'Adept'); // 55%
  assert.deepEqual(r2.toNext, { tier: 'Expert', at: 60, concepts: 1 });
  assert.equal(r2.coreLeft, 1);
  // Data: projects are optional, explicitly.
  const reg = subjects.loadRegistry(NEXUS_NODES);
  const projects = [...reg.subjects.values()].flatMap((s) => s.doc?.nodes || []).filter((n) => n.kind === 'project');
  assert.ok(projects.length > 50 && projects.every((n) => n.optional === true));
});

test('web rank: a fair curve — quick first levels, the top at about a quarter of the web', () => {
  const names = Array.from({ length: 11 }, (_, i) => ({ name: `L${i + 1}` }));
  const W = ranks.WEB_XP;
  assert.equal(W.length, 11);
  for (let i = 2; i < W.length; i++) {
    const ratio = W[i] / W[i - 1];
    assert.ok(ratio > 1.4 && ratio < 2.8, `smooth step to level ${i + 1} (x${ratio.toFixed(2)})`);
  }
  // First rank-up within two or three concepts (one study session).
  assert.ok(W[1] <= 3 * ranks.CONCEPT_XP);
  assert.equal(ranks.webLevel(2 * ranks.CONCEPT_XP, names).level, 2);
  // The top: one stream plus breadth, about 25-30% of every concept's XP.
  const reg = subjects.loadRegistry(NEXUS_NODES);
  const all = [...reg.subjects.values()].flatMap((s) => s.doc?.nodes || []).reduce((a, n) => a + (n.xpReward || 50), 0);
  const share = W.at(-1) / all;
  assert.ok(share > 0.18 && share < 0.32, `top rank at ${(share * 100).toFixed(1)}% of the web's concept XP`);
  assert.ok(W.at(-1) / ranks.CONCEPT_XP >= 300 && W.at(-1) / ranks.CONCEPT_XP <= 400, 'about 300-400 concepts');
  const top = ranks.webLevel(W.at(-1), names);
  assert.equal(top.level, 11);
  assert.equal(top.xpToNext, 0);
  const mid = ranks.webLevel(1000, names);
  assert.equal(mid.level, 4);
  assert.equal(mid.xpToNext, 800);
  assert.equal(mid.conceptsToNext, 8);
});

test('web rank migration: never below the best level stored (no rank drops)', () => {
  const names = Array.from({ length: 11 }, (_, i) => ({ name: `L${i + 1}` }));
  const kept = ranks.webLevel(0, names, 6);
  assert.equal(kept.level, 6);
  assert.ok(kept.kept);
  assert.equal(kept.xpInLevel, 0);
  assert.equal(ranks.webLevel(50000, names, 3).level, 11, 'the floor never caps a higher level');
  assert.equal(ranks.webLevel(500, names, 99).level, 11, 'a bad floor is clamped to the ladder');
});

test('web score: concept XP plus lessons, PYQs and a quarter of DSA problem XP', () => {
  const reg = subjects.loadRegistry(NEXUS_NODES);
  const bank = loadGateBank();
  const notes = require('../src/routes/gate-notes').loadGateNotes();
  const dsa = NEXUS_NODES.map((n) => ({ ...n, progress: 0, completed: false }));
  const empty = subjects.computeSubjects(reg, dsa, { qstate: new Map(), lessons: new Set() }, bank, notes);
  for (const totals of [{ xp: 0, solved: 0 }, { xp: 2500, solved: 230 }, { xp: 90000, solved: 2000 }]) {
    const s = ranks.webScore(totals, empty, dsa);
    assert.equal(s.xp, Math.round(totals.xp * ranks.DSA_XP_SHARE), 'nothing studied: a quarter of the DSA XP');
    assert.equal(s.solved, totals.solved);
  }
  const pool = subjects.nodePools(reg, bank, notes).get('dl:place-value');
  const studied = subjects.computeSubjects(reg, dsa, { qstate: new Map(pool.map((id) => [id, { attempts: 1, correct: 1 }])), lessons: new Set() }, bank, notes);
  const s = ranks.webScore({ xp: 2500, solved: 230 }, studied, dsa);
  assert.ok(s.xp > 625, 'studying adds web XP');
  assert.ok(s.solved > 230, 'correct PYQs count as solves');
  assert.ok(s.subjects.dl > 0);
});

test('week keys follow ISO weeks', () => {
  assert.equal(ranks.weekKey(Date.UTC(2026, 9, 21)), '2026-W43');
  assert.equal(ranks.weekKey(Date.UTC(2027, 0, 1)), '2026-W53');
  assert.equal(ranks.weekKey(Date.UTC(2025, 11, 29)), '2026-W01');
});

test('GET /api/nexus/structure: versioned, immutable with ?v=, 304 on a matching ETag', async () => {
  const { status, body } = await call('GET', '/api/nexus/structure');
  assert.equal(status, 200);
  assert.match(body.version, /^[0-9a-f]{12}$/);
  assert.deepEqual(body.clusters.map((c) => c.id).sort(), [...ALL_IDS].sort());
  for (const c of body.clusters) {
    assert.ok(c.domain && c.zones.length && c.nodes.length, c.id);
    for (const n of c.nodes) assert.ok(n.id && n.n && Array.isArray(n.req) && !('p' in n) && !('s' in n), `${c.id}:${n.id}`);
  }
  assert.ok(body.routes.length >= 4 && body.routes.every((r) => r.subjects.every((id) => ALL_IDS.includes(id))));
  const pinned = await fetch(`${base}/api/nexus/structure?v=${body.version}`, { headers: { Cookie: cookie } });
  assert.match(pinned.headers.get('cache-control'), /immutable/);
  const again = await fetch(`${base}/api/nexus/structure`, { headers: { Cookie: cookie, 'If-None-Match': `"nx-${body.version}"` } });
  assert.equal(again.status, 304);
});

test('GET /api/nexus/web: the reader state in structure order, the web rank and subject ranks', async () => {
  const st = (await call('GET', '/api/nexus/structure')).body
  const { status, body } = await call('GET', '/api/nexus/web');
  assert.equal(status, 200);
  assert.equal(body.user, ME);
  assert.equal(body.state.version, st.version);
  assert.ok(body.player.level >= body.dsaPlayer.level, 'web rank never below the DSA rank');
  assert.ok(body.player.xp >= body.dsaPlayer.xp);
  for (const c of st.clusters) {
    const sc = body.state.subjects[c.id];
    assert.equal(sc.nodes.length, c.nodes.length, c.id);
    assert.equal(sc.zones.length, c.zones.length, c.id);
    for (const t of sc.nodes) assert.ok([0, 1, 2].includes(t[1]) && typeof t[2] === 'string' && t.length === 6);
    assert.ok(ranks.TIERS.includes(body.ranks[c.id].tier), c.id);
  }
  // Memory and recency come from the review data: the PYQ answered in an
  // earlier test was answered right just now.
  const dl = st.clusters.find((c) => c.id === 'dl');
  const pv = body.state.subjects.dl.nodes[dl.nodes.findIndex((n) => n.id === 'place-value')];
  assert.ok(pv[3] >= 0 && pv[3] < 1, 'days since review');
  assert.equal(pv[5], 1, 'studied in the last 24 h');
  // Small: the state is a fraction of the structure.
  assert.ok(JSON.stringify(body).length < JSON.stringify(st).length / 2);
  const node = await call('GET', '/api/nexus/node/dbms/bplus-trees');
  assert.equal(node.status, 200);
  assert.ok(node.body.node.desc && node.body.node.crossRequires.some((c) => c.id === 'gb_trees'));
  const dsaNode = await call('GET', '/api/nexus/node/dsa/gb_trees');
  assert.ok(dsaNode.body.node.crossUnlocks.some((c) => c.subject === 'dbms'));
  assert.equal((await call('GET', '/api/nexus/node/dbms/nope')).status, 404);
});

test('leaderboards: web rank (overall, week, friends) and per subject, from nexus_scores', async () => {
  await call('GET', '/api/nexus/web?fresh=1');
  const row = withDb((db) => db.prepare('SELECT * FROM nexus_scores WHERE username=?').get(ME));
  assert.ok(row, 'visiting the web stores the score');
  const subjectsJson = JSON.parse(row.subjects);
  assert.ok(subjectsJson.dl > 0);
  const overall = await call('GET', '/api/nexus/leaderboard?scope=all');
  assert.equal(overall.status, 200);
  assert.equal(overall.body.rows[0].username, ME);
  assert.equal(overall.body.rows[0].score, row.web_xp);
  const sub = await call('GET', '/api/nexus/leaderboard?scope=subject&subject=dl');
  assert.equal(sub.body.rows[0].username, ME);
  assert.equal(sub.body.rows[0].score, subjectsJson.dl);
  assert.equal((await call('GET', '/api/nexus/leaderboard?scope=subject&subject=nope')).status, 404);
  const friends = await call('GET', '/api/nexus/leaderboard?scope=friends');
  assert.deepEqual(friends.body.rows.map((r) => r.username), [ME]);
  assert.equal((await call('GET', '/api/nexus/leaderboard?scope=week')).status, 200);
  // An unchanged revisit writes nothing.
  const before = withDb((db) => db.prepare('SELECT updated_at FROM nexus_scores WHERE username=?').get(ME).updated_at);
  await call('GET', '/api/nexus/web');
  assert.equal(withDb((db) => db.prepare('SELECT updated_at FROM nexus_scores WHERE username=?').get(ME).updated_at), before);
});
