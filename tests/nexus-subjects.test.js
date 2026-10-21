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

const GATE_SUBJECTS = ['dl', 'coa', 'os', 'dbms', 'cn', 'toc', 'cd', 'algo', 'dm', 'la', 'prob', 'calc', 'c'];
const BEYOND = ['ml', 'deep', 'web', 'app', 'sysd'];

/* ── outlines ─────────────────────────────────────────────────────────── */

test('every subject outline is valid: no dangling requires, no cycles, known PYQ topics', () => {
  const docs = subjects.readOutlines();
  assert.deepEqual(docs.map((d) => d.id).sort(), [...GATE_SUBJECTS, ...BEYOND].sort());
  const errors = subjects.validateOutlines(docs, NEXUS_NODES, { bank: loadGateBank() });
  assert.deepEqual(errors, []);
  for (const d of docs) {
    assert.ok(d.nodes.length >= 15 && d.nodes.length <= 40, `${d.id}: ${d.nodes.length} nodes`);
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
  for (const d of subjects.readOutlines()) {
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
  assert.equal(sums.length, 19);
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
  assert.equal(body.subjects.length, 19);
  const trees = body.nodes.find((n) => n.id === 'gb_trees');
  assert.ok(trees.crossUnlocks.some((c) => c.subject === 'dbms'));
});

test('GET /api/nexus?subject=… serves every subject; unknown → 404', async () => {
  for (const id of [...GATE_SUBJECTS, ...BEYOND]) {
    const { status, body } = await call('GET', `/api/nexus?subject=${id}`);
    assert.equal(status, 200, id);
    assert.equal(body.subject.id, id);
    assert.ok(body.nodes.length >= 15, id);
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
