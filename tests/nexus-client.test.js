// The radial Nexus layout (client/src/components/nexus/radial.ts): one
// tree of every subject — sectors per subject, zones as concentric rings —
// deterministic (what the version-keyed layout cache relies on), plus
// hit-testing and the focus chain.
// Node strips the TypeScript types itself (22.18+ / 23.6+).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const subjects = require('../src/nexus/subjects');
const { NEXUS_NODES } = require('../src/nexus/dsa-nodes');

let L = null;
test.before(async () => {
  try {
    L = await import(path.join(__dirname, '..', 'client', 'src', 'components', 'nexus', 'radial.ts'));
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
  const st = subjects.webStructure(reg, { zones: dsaZones });
  // The layout's input, as layoutCache.ts builds it.
  const rank = new Map(st.streams.map((x) => [x.id, x.order]));
  return { ...st, clusters: st.clusters.map((c) => ({ ...c, streamOrder: rank.get(c.stream) ?? 99 })) };
}

test('radial layout: deterministic, every skill placed once, zones as rings outward', (t) => {
  if (!need(t)) return;
  const st = structure();
  const a = L.computeRadial(st.clusters, st.version);
  const b = L.computeRadial(st.clusters, st.version);
  assert.deepEqual(Array.from(a.xy), Array.from(b.xy), 'same structure → same layout (safe to cache by version)');
  const total = st.clusters.reduce((n, c) => n + c.nodes.length, 0);
  assert.equal(a.keys.length, total);
  assert.equal(a.sectors.length, st.clusters.length, 'one sector per subject');
  // Streams are contiguous sectors, in their order, holding exactly their subjects.
  assert.deepEqual(a.streams.map((x) => x.id), st.streams.map((x) => x.id));
  for (const sct of a.sectors) {
    const stream = st.clusters.find((c) => c.id === sct.id).stream;
    const arc = a.streams.find((x) => x.id === stream);
    assert.ok(sct.a0 >= arc.a0 - 1e-9 && sct.a1 <= arc.a1 + 1e-9, `${sct.id} inside ${stream}`);
  }
  // Rings are concentric, in zone order, and each skill sits inside its zone's ring.
  for (let i = 1; i < a.rings.length; i++) {
    assert.ok(a.rings[i].level > a.rings[i - 1].level);
    assert.equal(a.rings[i].r0, a.rings[i - 1].r1);
  }
  const ring = new Map(a.rings.map((g) => [g.level, g]));
  const zoneOf = new Map();
  for (const c of st.clusters) for (const n of c.nodes) zoneOf.set(`${c.id}:${n.id}`, n.z);
  a.keys.forEach((k, i) => {
    const r = Math.hypot(a.xy[2 * i], a.xy[2 * i + 1]);
    const g = ring.get(zoneOf.get(k));
    assert.ok(r > g.r0 && r < g.r1, `${k} inside ring ${g.level}`);
  });
  // Each skill sits in its own subject's sector.
  a.keys.forEach((k, i) => {
    const s = L.sectorAt(a, a.xy[2 * i], a.xy[2 * i + 1]);
    assert.equal(s && s.id, k.split(':')[0], `${k} in its sector`);
  });
  // Orbs never overlap (an orb with its name needs more than its diameter).
  let minD = Infinity;
  for (let i = 0; i < a.keys.length; i++) {
    for (let j = i + 1; j < a.keys.length; j++) minD = Math.min(minD, Math.hypot(a.xy[2 * i] - a.xy[2 * j], a.xy[2 * i + 1] - a.xy[2 * j + 1]));
  }
  assert.ok(minD >= L.NODE * 2, `closest orbs ${Math.round(minD)} apart`);
  // Prerequisites in an earlier zone sit nearer the centre.
  const at = new Map(a.keys.map((k, i) => [k, Math.hypot(a.xy[2 * i], a.xy[2 * i + 1])]));
  for (const c of st.clusters) {
    for (const n of c.nodes) {
      for (const r of n.req) {
        const p = c.nodes.find((x) => x.id === r);
        if (p && p.z < n.z) assert.ok(at.get(`${c.id}:${r}`) < at.get(`${c.id}:${n.id}`));
      }
    }
  }
  // A changed structure gets a different layout.
  assert.notEqual(L.computeRadial(st.clusters.slice(1), 'other').keys.length, a.keys.length);
});

test('hit-testing: the grid finds the nearest point within the radius', (t) => {
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
  for (let i = 0; i < 2000; i++) g.add(`p${i}`, (i * 37) % 1400, (i * 53) % 900);
  const target = g.position('p777');
  assert.equal(g.nearest(target.x + 1, target.y - 1, 6), 'p777');
});

test('focus chain: every prerequisite and everything it leads to, nothing else', (t) => {
  if (!need(t)) return;
  const pre = new Map([
    ['s:a', []],
    ['s:b', ['s:a']],
    ['s:c', ['s:b']],
    ['s:d', []],
    ['t:e', ['s:c']],
  ]);
  assert.deepEqual([...L.lineage(pre, 's:b')].sort(), ['s:a', 's:b', 's:c', 't:e']);
  assert.deepEqual([...L.lineage(pre, 's:d')], ['s:d']);
});
