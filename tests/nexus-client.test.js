// The Nexus web's client logic (client/src/components/nexus/lattice.ts):
// layout determinism (what the version-keyed layout cache relies on),
// hit-testing, goal routes, lineage, keystones, next step and memory.
// Node strips the TypeScript types itself (22.18+ / 23.6+).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const subjects = require('../src/nexus/subjects');
const { NEXUS_NODES } = require('../src/nexus/dsa-nodes');

let L = null;
test.before(async () => {
  try {
    L = await import(path.join(__dirname, '..', 'client', 'src', 'components', 'nexus', 'lattice.ts'));
  } catch (e) {
    L = { error: e };
  }
});
const need = (t) => {
  if (L?.error) {
    t.skip(`this Node cannot load TypeScript directly (${L.error.code || L.error.message})`);
    return false;
  }
  return true;
};

// The real structure, as the server sends it (no per-user data).
function structure() {
  const reg = subjects.loadRegistry(NEXUS_NODES);
  const dsaZones = [...new Set(NEXUS_NODES.map((n) => n.zone))].map((level) => ({ level, nodesCompleted: 0, nodeCount: 0, zoneProgress: 0, name: `Z${level}`, color: '#fff' }));
  return subjects.webStructure(reg, { zones: dsaZones });
}
// Clusters with a given state per node: (clusterId, node) => s.
function clustersFrom(st, stateOf = () => 0) {
  return st.clusters.map((c) => ({
    ...c,
    zones: c.zones.map((z) => ({ ...z, nodesCompleted: 0, nodeCount: 0, zoneProgress: 0, locked: false, current: false, completed: false })),
    nodes: c.nodes.map((n) => ({ ...n, p: 0, s: stateOf(c.id, n), c: '', ag: -1, iv: 0, rc: 0 })),
  }));
}

test('the layout is deterministic for a structure version, and prerequisites sit nearer YOU', (t) => {
  if (!need(t)) return;
  const st = structure();
  const a = L.computeLayout(st.clusters, st.version);
  const b = L.computeLayout(st.clusters, st.version);
  assert.equal(a.version, st.version);
  assert.deepEqual(Array.from(a.pins), Array.from(b.pins), 'same structure → same layout (safe to cache by version)');
  assert.deepEqual(Array.from(a.xy.slice(0, 200)), Array.from(b.xy.slice(0, 200)));
  assert.equal(a.keys.length, st.clusters.reduce((n, c) => n + c.nodes.length, 0));
  assert.ok(Array.from(a.pins).every((p) => p >= 0), 'every concept is pinned');
  assert.equal(new Set(a.pins).size, a.pins.length, 'one concept per lattice point');
  // Every reached lattice point hangs off the tree.
  let orphans = 0;
  for (let i = 0; i < a.parent.length; i++) if (i !== a.origin && a.parent[i] < 0) orphans++;
  assert.ok(orphans / a.parent.length < 0.01);
  const web = L.assemble(a, clustersFrom(st));
  const r = (k) => {
    const c = web.concepts.get(k);
    return Math.hypot(web.xy[2 * c.pt] - web.xy[2 * web.origin], web.xy[2 * c.pt + 1] - web.xy[2 * web.origin + 1]);
  };
  let closer = 0;
  let pairs = 0;
  for (const c of web.concepts.values()) {
    for (const p of c.prereqs) {
      pairs++;
      if (r(p) < r(c.key)) closer++;
    }
  }
  assert.ok(closer / pairs > 0.97, `prerequisites nearer the origin: ${closer}/${pairs}`);
  // A changed structure gets a different layout.
  const st2 = { ...st, clusters: st.clusters.slice(1) };
  const c2 = L.computeLayout(st2.clusters, 'other');
  assert.notEqual(c2.keys.length, a.keys.length);
});

test('hit-testing: the grid finds the nearest point within the radius, in O(1) cells', (t) => {
  if (!need(t)) return;
  const g = new L.HitGrid(28);
  g.add('a', 100, 100);
  g.add('b', 112, 100);
  g.add('c', 400, 300);
  assert.equal(g.nearest(103, 101, 14), 'a');
  assert.equal(g.nearest(110, 99, 14), 'b');
  assert.equal(g.nearest(250, 250, 14), null);
  assert.equal(g.nearest(395, 305, 14), 'c');
  assert.deepEqual(g.position('c'), { x: 400, y: 300 });
  g.clear();
  assert.equal(g.nearest(100, 100, 14), null);
  // Many points: still exact.
  for (let i = 0; i < 2000; i++) g.add(`p${i}`, (i * 37) % 1400, (i * 53) % 900);
  const target = g.position('p777');
  assert.equal(g.nearest(target.x + 1, target.y - 1, 6), 'p777');
});

test('goal routes: prerequisites first, nothing missing, next steps skip what is mastered', (t) => {
  if (!need(t)) return;
  const st = structure();
  const mastered = new Set(['dsa:bit_basics']);
  const web = L.assemble(L.computeLayout(st.clusters, st.version), clustersFrom(st, (c, n) => (mastered.has(`${c}:${n.id}`) ? 2 : n.req.length ? 0 : 1)));
  const plan = L.routePlan(web, ['dbms']);
  const pos = new Map(plan.order.map((k, i) => [k, i]));
  for (const k of plan.order) for (const p of web.concepts.get(k).prereqs) assert.ok(pos.get(p) < pos.get(k), `${p} before ${k}`);
  assert.ok(plan.order.includes('dsa:gb_trees'), 'cross-subject prerequisites are on the route');
  assert.ok(plan.order.includes('dbms:bplus-trees'));
  assert.equal(plan.next.length, 5);
  assert.ok(!plan.next.includes('dsa:bit_basics'), 'mastered steps are skipped');
  const routes = st.routes;
  for (const r of routes) assert.ok(L.routePlan(web, r.subjects).order.length > 10, r.id);
});

test('lineage, keystones, next best step and memory', (t) => {
  if (!need(t)) return;
  const st = structure();
  const web = L.assemble(L.computeLayout(st.clusters, st.version), clustersFrom(st, (c, n) => (n.req.length ? 0 : 1)));
  const chain = L.longestChain(web, 'dbms:bplus-trees');
  assert.equal(chain.at(-1), 'dbms:bplus-trees');
  for (let i = 1; i < chain.length; i++) assert.ok(web.concepts.get(chain[i]).prereqs.includes(chain[i - 1]), 'each step is a real prerequisite');
  assert.ok(web.concepts.get(chain[0]).prereqs.length === 0, 'starts at a root');
  const ks = L.keystones(web);
  const counts = L.unlockCounts(web);
  const top = Math.max(...counts.values());
  assert.ok(ks.size >= 1 && [...ks].some((k) => counts.get(k) === top));
  const next = L.nextBestStep(web, null);
  assert.equal(web.concepts.get(next).node.s, 1, 'the next step is open');
  // Memory: fresh right after review, half-life ≈ 2 × the interval (≥ 3 days).
  assert.equal(L.retention({ s: 1, ag: 5, iv: 2 }), 1, 'only mastered concepts fade');
  assert.equal(L.retention({ s: 2, ag: -1, iv: 0 }), 1, 'no review data: no fading');
  assert.ok(Math.abs(L.retention({ s: 2, ag: 4, iv: 2 }) - 0.5) < 1e-9);
  assert.ok(L.retention({ s: 2, ag: 0, iv: 2 }, 90) < L.retention({ s: 2, ag: 0, iv: 2 }, 7));
});
