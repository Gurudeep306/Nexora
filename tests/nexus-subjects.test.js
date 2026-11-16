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
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
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

test('weekly summary: XP since the week baseline, concepts mastered since Monday', () => {
  const now = Date.UTC(2026, 9, 22, 12); // a Thursday
  const monday = ranks.weekStart(now);
  assert.equal(new Date(monday).getUTCDay(), 1);
  const row = { week: ranks.weekKey(now), week_base_xp: 400 };
  const nodes = [
    { completed: true, touchedAt: monday + 3600e3 },
    { completed: true, touchedAt: monday - 3600e3 },
    { completed: false, touchedAt: now },
  ];
  assert.deepEqual(ranks.weekSummary(row, { xp: 650 }, nodes, now), { xp: 250, concepts: 1, since: monday });
  assert.equal(ranks.weekSummary({ week: '2020-W01', week_base_xp: 0 }, { xp: 650 }, nodes, now).xp, 0, 'a stale week counts nothing yet');
});

test('web state carries "last studied" per node (continue where you left off)', async () => {
  const { body } = await call('GET', '/api/nexus/web');
  const dl = body.state.subjects.dl.nodes;
  assert.ok(dl.every((t) => t.length === 7 && typeof t[6] === 'number'));
  assert.ok(body.week && typeof body.week.xp === 'number' && typeof body.week.concepts === 'number');
});

test('node contents: every node has a summary and 3+ topics (data and validation)', () => {
  const reg = subjects.loadRegistry(NEXUS_NODES);
  let count = 0;
  for (const s of reg.subjects.values()) {
    for (const n of s.doc?.nodes || []) {
      count++;
      assert.ok(typeof n.summary === 'string' && n.summary.split(/\s+/).length >= 6, `${s.meta.id}:${n.id} summary`);
      assert.ok(Array.isArray(n.topics) && n.topics.length >= 3 && n.topics.every((t) => typeof t === 'string' && t.trim()), `${s.meta.id}:${n.id} topics`);
    }
  }
  const dsa = subjects.readDsaContent();
  for (const n of NEXUS_NODES) assert.ok(dsa[n.id]?.summary && dsa[n.id].topics.length >= 3, `dsa:${n.id}`);
  assert.equal(count + NEXUS_NODES.length, 1383); // 1407 before System Design (24 nodes) was removed
  assert.deepEqual(subjects.dsaContentGaps(NEXUS_NODES), []);
  // The strict check rejects a node without them.
  const bad = JSON.parse(JSON.stringify(DOCS.find((d) => d.id === 'rust')));
  delete bad.nodes[0].summary;
  bad.nodes[1].topics = ['one'];
  const errors = subjects.validateOutlines([bad], NEXUS_NODES, { strict: true });
  assert.ok(errors.some((e) => /needs a summary/.test(e)) && errors.some((e) => /at least 3 topics/.test(e)));
});

test('GET /api/nexus/content: DL lessons with their sections, examples, animations and practice; courses elsewhere', async () => {
  const dl = await call('GET', '/api/nexus/content/dl/place-value');
  assert.equal(dl.status, 200);
  assert.ok(dl.body.summary && dl.body.topics.length >= 3);
  const lesson = dl.body.lessons[0];
  assert.equal(lesson.id, 'place-value');
  assert.match(lesson.href, /^\/gate\/notes\/dl\/place-value$/);
  assert.ok(lesson.sections.length >= 3 && lesson.sections.every((x) => x.href.startsWith(`${lesson.href}#n-`)));
  assert.ok(!lesson.sections.some((x) => /^where this fits/i.test(x.title)), 'generic headings left out');
  assert.ok(lesson.examples > 0 && lesson.animations > 0 && lesson.practice > 0);
  const rust = await call('GET', '/api/nexus/content/rust/ownership');
  assert.equal(rust.status, 200);
  assert.deepEqual(rust.body.lessons, []);
  assert.equal(rust.body.course, null);
  assert.ok(rust.body.topics.length >= 3);
  const dsa = await call('GET', '/api/nexus/content/dsa/bit_basics');
  assert.equal(dsa.status, 200);
  assert.ok(dsa.body.topics.length >= 3);
  assert.equal((await call('GET', '/api/nexus/content/rust/nope')).status, 404);
  assert.equal((await call('GET', '/api/nexus/content/nope/x')).status, 404);
});

test('one model: every radial node is exactly one subject-tree node, and back', async () => {
  const { body: st } = await call('GET', '/api/nexus/structure');
  const radial = new Set();
  for (const c of st.clusters) for (const n of c.nodes) radial.add(`${c.id}:${n.id}`);
  assert.equal(radial.size, 1383);
  const tree = new Set();
  for (const c of st.clusters) {
    const { status, body } = await call('GET', `/api/nexus?subject=${c.id}`);
    assert.equal(status, 200, c.id);
    for (const n of body.nodes) {
      const k = `${c.id}:${n.id}`;
      assert.ok(!tree.has(k), `${k} appears twice`);
      tree.add(k);
    }
  }
  assert.deepEqual([...radial].filter((k) => !tree.has(k)), [], 'radial nodes missing from their subject tree');
  assert.deepEqual([...tree].filter((k) => !radial.has(k)), [], 'tree nodes missing from the radial');
});

test('insights: time, weightage, high-yield, zone heat, remaining time, notes and history', async () => {
  const { status, body } = await call('GET', '/api/nexus/insights/dl');
  assert.equal(status, 200);
  const pv = body.nodes['place-value'];
  assert.ok(pv.min > 40 && pv.w && pv.w.n > 0 && Object.keys(pv.w.years).length > 0);
  assert.ok(Object.values(body.nodes).some((n) => n.hy), 'some nodes are high-yield');
  assert.equal(Object.values(body.zones).reduce((a, b) => a + b, 0) > 95, true, 'zone heat shares sum to ~100');
  assert.ok(body.remainingMin > 0);
  assert.ok(Array.isArray(body.history));
  const rust = await call('GET', '/api/nexus/insights/rust');
  assert.equal(rust.body.nodes.ownership.w, null, 'no PYQs, no weightage');
  assert.equal((await call('GET', '/api/nexus/insights/nope')).status, 404);
});

test('notes and bookmarks per node: saved on write, read back, cleared when empty', async () => {
  let r = await call('PUT', '/api/nexus/notes/rust/ownership', { note: 'moves vs copies', bookmarked: true });
  assert.equal(r.status, 200);
  r = await call('GET', '/api/nexus/insights/rust');
  assert.deepEqual({ note: r.body.notes.ownership.note, bookmarked: r.body.notes.ownership.bookmarked }, { note: 'moves vs copies', bookmarked: true });
  await call('PUT', '/api/nexus/notes/rust/ownership', { note: '', bookmarked: false });
  r = await call('GET', '/api/nexus/insights/rust');
  assert.equal(r.body.notes.ownership, undefined);
});

test('test out: a passed quick check masters the node (Nexus, web rank and subject rank at once), with fair XP', async () => {
  const bank = loadGateBank();
  const before = await call('GET', '/api/nexus/web');
  const idx = (await call('GET', '/api/nexus/structure')).body.clusters.find((c) => c.id === 'dl').nodes.findIndex((n) => n.id === 'canonical-forms');
  assert.ok(idx >= 0);
  const q = await call('GET', '/api/nexus/testout/dl/canonical-forms');
  assert.equal(q.status, 200);
  assert.ok(q.body.available && q.body.questions.length >= 3 && q.body.questions.every((x) => x.answer === undefined), 'no keys sent');
  // A wrong attempt does not pass.
  const wrong = await call('POST', '/api/nexus/testout/dl/canonical-forms', { answers: Object.fromEntries(q.body.questions.map((x) => [x.id, '__'])) });
  assert.equal(wrong.body.passed, false);
  const answers = {};
  for (const x of q.body.questions) {
    const k = bank.byId.get(x.id).answer;
    answers[x.id] = x.type === 'NAT' ? String(k).split(/\s+to\s+|:/i)[0] : k;
  }
  const r = await call('POST', '/api/nexus/testout/dl/canonical-forms', { answers });
  assert.equal(r.body.passed, true, JSON.stringify(r.body));
  const after = await call('GET', '/api/nexus/web');
  assert.equal(after.body.state.subjects.dl.nodes[idx][1], 2, 'the radial sees it mastered at once');
  assert.ok(after.body.player.xp > before.body.player.xp, 'web XP rises');
  assert.ok(after.body.ranks.dl.progress >= before.body.ranks.dl.progress);
  const tree = await call('GET', '/api/nexus?subject=dl');
  const node = tree.body.nodes.find((n) => n.id === 'canonical-forms');
  assert.equal(node.completed, true);
  assert.equal(node.testedOut, true);
});

test('mark as learned: allowed only where there is nothing to test out with; masters at once', async () => {
  const st = (await call('GET', '/api/nexus/structure')).body;
  const idx = st.clusters.find((c) => c.id === 'rust').nodes.findIndex((n) => n.id === 'cargo');
  let r = await call('POST', '/api/nexus/done/rust/cargo');
  assert.equal(r.status, 200);
  const web = await call('GET', '/api/nexus/web');
  assert.equal(web.body.state.subjects.rust.nodes[idx][1], 2);
  r = await call('POST', '/api/nexus/done/dl/place-value');
  assert.equal(r.status, 409, 'a node with PYQs is tested out instead');
  assert.equal((await call('POST', '/api/nexus/done/rust/nope')).status, 404);
});

test('add to review: the node PYQs land in the Review deck (due today)', async () => {
  const r = await call('POST', '/api/nexus/review/dl/place-value');
  assert.equal(r.status, 200);
  assert.ok(r.body.added > 0);
  const rev = await call('GET', '/api/gate/me/review?limit=100');
  assert.ok(rev.body.dueCount >= r.body.added);
});

test('week keys follow ISO weeks', () => {
  assert.equal(ranks.weekKey(Date.UTC(2026, 9, 21)), '2026-W43');
  assert.equal(ranks.weekKey(Date.UTC(2027, 0, 1)), '2026-W53');
  assert.equal(ranks.weekKey(Date.UTC(2025, 11, 29)), '2026-W01');
});

test('a subject view holds only its own skills and internal links', async () => {
  for (const id of ['dl', 'dsa', 'ml', 'web']) {
    const { status, body } = await call('GET', `/api/nexus?subject=${id}`);
    assert.equal(status, 200, id);
    const ids = new Set(body.nodes.map((n) => n.id));
    for (const n of body.nodes) {
      assert.ok(!n.subject || n.subject === id, `${id}: ${n.id} belongs to ${n.subject}`);
      for (const r of n.requires) assert.ok(ids.has(r), `${id}: ${n.id} requires ${r} inside the subject`);
    }
  }
});

test('courses: the structure names GATE material, course files are served (or null)', async () => {
  const { body } = await call('GET', '/api/nexus/structure');
  const dl = body.clusters.find((c) => c.id === 'dl');
  assert.deepEqual(dl.gate, { pyq: 'dl', notes: 'dl' });
  assert.ok(dl.nodes.some((n) => Array.isArray(n.ls) && n.ls.length), 'DL nodes carry their notes lessons');
  const os = body.clusters.find((c) => c.id === 'os');
  assert.equal(os.gate.notes, null);
  assert.ok(!body.clusters.find((c) => c.id === 'rust').gate, 'a non-GATE subject has no gate material');
  assert.ok(body.clusters.flatMap((c) => c.nodes).some((n) => n.o === 1), 'optional nodes are marked');
  const missing = await call('GET', '/api/courses/rust/ownership');
  assert.equal(missing.status, 200);
  assert.equal(missing.body.body, null);
  assert.equal((await call('GET', '/api/courses/..%2Fsecrets/x')).status, 400);
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
    for (const t of sc.nodes) assert.ok([0, 1, 2].includes(t[1]) && typeof t[2] === 'string' && t.length === 7);
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

test('subject trees paint without waiting: a small immutable tree per subject, tiny progress, layout in the structure', async () => {
  const st = (await call('GET', '/api/nexus/structure')).body;
  // Every node carries its tree layout, so a cached structure paints any subject's tree.
  for (const c of st.clusters) for (const n of c.nodes) assert.equal(typeof n.x, 'number', `${c.id}:${n.id} has no x`);
  for (const c of st.clusters) {
    const r = await fetch(`${base}/api/nexus/tree/${c.id}?v=${st.version}`, { headers: { Cookie: cookie } });
    assert.equal(r.status, 200, c.id);
    assert.match(r.headers.get('cache-control'), /immutable/);
    const text = await r.text();
    // Budget: a tree is a few KB (it is on the critical path of opening a subject).
    assert.ok(text.length < 16 * 1024, `${c.id} tree is ${text.length} B`);
    const t = JSON.parse(text);
    assert.equal(t.version, st.version);
    assert.deepEqual(t.nodes.map((n) => n.id), c.nodes.map((n) => n.id), `${c.id}: structure order`);
    assert.ok(t.zones.every((z) => z.rows >= 1));
    const etag = r.headers.get('etag');
    const again = await fetch(`${base}/api/nexus/tree/${c.id}`, { headers: { Cookie: cookie, 'If-None-Match': etag } });
    assert.equal(again.status, 304);
  }
  assert.equal((await call('GET', '/api/nexus/tree/nope')).status, 404);
  // The reader's numbers for one subject: tiny, lined up with the tree.
  const t = (await call('GET', '/api/nexus/tree/dl')).body;
  const r = await fetch(`${base}/api/nexus/progress/dl`, { headers: { Cookie: cookie } });
  const text = await r.text();
  assert.ok(text.length < 4 * 1024, `progress is ${text.length} B`);
  const p = JSON.parse(text);
  assert.equal(p.nodes.length, t.nodes.length);
  assert.equal(p.zones.length, t.zones.length);
  assert.ok(p.rank && typeof p.rank.progress === 'number');
});
