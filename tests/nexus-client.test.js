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

/* ── insights.ts: goal routes, next step, continue, review, celebration ── */
let I = null;
test.before(async () => {
  try {
    I = await import(path.join(__dirname, '..', 'client', 'src', 'components', 'nexus', 'insights.ts'));
  } catch (e) {
    I = { error: e };
  }
});
const subj = () => [
  { id: 'a', name: 'Alpha', short: 'A', order: 1, nodes: [
    { id: 'x', n: 'X', z: 1, p: 100, s: 2, req: [], ag: 5, iv: 2, td: 4 },
    { id: 'y', n: 'Y', z: 1, p: 40, s: 1, req: ['x'], ag: -1, iv: 0, td: 0.2 },
    { id: 'z', n: 'Z', z: 2, p: 0, s: 0, req: ['y'], td: -1 },
  ] },
  { id: 'b', name: 'Beta', short: 'B', order: 2, nodes: [
    { id: 'q', n: 'Q', z: 1, p: 0, s: 0, req: [], cx: ['a:z'], td: -1 },
    { id: 'r', n: 'R', z: 1, p: 0, s: 1, req: [], td: -1 },
  ] },
];

test('goal route: prerequisites first, across subjects, next steps open first', (t) => {
  if (I?.error) return t.skip('no TS loader');
  const plan = I.routePlan(subj(), ['b']);
  assert.deepEqual([...plan.keys].sort(), ['a:x', 'a:y', 'a:z', 'b:q', 'b:r']);
  const pos = new Map(plan.order.map((k, i) => [k, i]));
  assert.ok(pos.get('a:x') < pos.get('a:y') && pos.get('a:y') < pos.get('a:z') && pos.get('a:z') < pos.get('b:q'));
  assert.deepEqual(plan.next, ['b:r', 'a:y', 'b:q', 'a:z'], 'open steps in the goal first, then open prerequisites, then locked; mastered skipped');
});

test('next step, continue where you left off, spaced review, celebration', (t) => {
  if (I?.error) return t.skip('no TS loader');
  assert.equal(I.nextStep(subj()), 'a:y', 'the open skill you are furthest into');
  assert.deepEqual(I.continueFrom(subj()), { key: 'a:y', name: 'Y', subject: 'a', subjectName: 'Alpha' });
  assert.equal(I.isDue({ s: 2, ag: 5, iv: 2 }), true, 'past its interval (min 3 days)');
  assert.equal(I.isDue({ s: 2, ag: 2, iv: 2 }), false);
  assert.equal(I.isDue({ s: 2, ag: 6, iv: 7 }), false, 'within a longer interval');
  assert.equal(I.isDue({ s: 1, ag: 9, iv: 1 }), false, 'only mastered concepts are reviewed');
  assert.equal(I.isDue({ s: 2, ag: -1, iv: 0 }), false, 'no review data');
  assert.deepEqual(I.newlyMastered(null, subj()), [], 'first visit: nothing to celebrate');
  assert.deepEqual(I.newlyMastered(new Set(), subj()), ['a:x']);
  assert.deepEqual(I.newlyMastered(new Set(I.masteredKeys(subj())), subj()), []);
});

test('goal routes on the real data reach every route subject, in learning order', (t) => {
  if (I?.error) return t.skip('no TS loader');
  const st = structure();
  const subjectsData = st.clusters.map((c) => ({ ...c, nodes: c.nodes.map((n) => ({ ...n, p: 0, s: n.req.length ? 0 : 1 })) }));
  for (const r of st.routes) {
    const plan = I.routePlan(subjectsData, r.subjects);
    assert.ok(plan.order.length >= r.subjects.length * 10, r.id);
    for (const sid of r.subjects) assert.ok(plan.order.some((k) => k.startsWith(`${sid}:`)), `${r.id} covers ${sid}`);
    assert.equal(plan.next.length, 5);
  }
});

test('one canonical page per subject (/learn/<id>); a node opens its lesson at /learn/<id>/<node>', async (t) => {
  let C;
  try {
    C = await import(path.join(__dirname, '..', 'client', 'src', 'components', 'nexus', 'course.ts'));
  } catch {
    return t.skip('no TS loader');
  }
  assert.equal(C.subjectHref({ id: 'dsa', engine: 'dsa' }), '/learn/dsa');
  assert.equal(C.subjectHref({ id: 'dsa', engine: 'dsa' }, 'arrays'), '/learn/dsa/skill/arrays');
  assert.equal(C.subjectHref({ id: 'dl', engine: null, gate: { pyq: 'dl', notes: 'dl' } }, 'place-value'), '/learn/dl/place-value');
  assert.equal(C.subjectHref({ id: 'os', engine: null, gate: { pyq: 'os', notes: null } }), '/learn/os');
  assert.equal(C.subjectHref({ id: 'rust', engine: null }, 'ownership'), '/learn/rust/ownership');
  assert.equal(C.courseHref, C.subjectHref);
  const st = structure();
  const seen = new Set();
  for (const c of st.clusters) {
    const href = C.subjectHref(c);
    assert.ok(c.engine === 'dsa' ? href === '/learn/dsa' : href === `/learn/${c.id}`, c.id);
    assert.ok(!seen.has(href), `one page per subject: ${href}`);
    seen.add(href);
    const n = c.nodes[0].id;
    assert.equal(C.subjectHref(c, n), c.engine === 'dsa' ? `/learn/dsa/skill/${n}` : `/learn/${c.id}/${n}`);
  }
});

test('confidence: lessons, PYQs and accuracy, fading with time; tested out counts at least 80', (t) => {
  if (I?.error) return t.skip('no TS loader');
  const now = Date.UTC(2026, 9, 22);
  const D = 86400000;
  const fresh = I.confidence({ progress: 100, completed: true, metric: { lessons: { done: 1, total: 1 }, pyq: { pool: 11, target: 10, correct: 10, attempted: 11, accuracy: 100 } }, memory: { lastAt: now, interval: 0 } }, now);
  assert.equal(fresh.score, 100);
  const old = I.confidence({ progress: 100, completed: true, metric: { lessons: { done: 1, total: 1 }, pyq: { pool: 11, target: 10, correct: 10, attempted: 11, accuracy: 100 } }, memory: { lastAt: now - 14 * D, interval: 0 } }, now);
  assert.ok(old.score < fresh.score && old.score >= 50, `fades (${old.score}) but never below half`);
  assert.match(old.breakdown, /Lessons 1\/1 · PYQs 10\/10 \(100%\) · last practised 14 days ago/);
  const part = I.confidence({ progress: 33, completed: false, metric: { pyq: { pool: 9, target: 9, correct: 6, attempted: 9, accuracy: 67 } }, memory: null }, now);
  assert.equal(part.score, Math.round(100 * (0.7 * (6 / 9) + 0.3 * 0.67)));
  assert.equal(I.confidence({ progress: 100, completed: true, testedOut: true, metric: { pyq: { pool: 5, target: 5, correct: 0, attempted: 0, accuracy: null } } }, now).score, 80);
  assert.equal(I.confidence({ progress: 0, completed: false, metric: null }, now).breakdown, 'Nothing studied yet');
});

test('shortest unlock path: every unmastered prerequisite, prerequisites first, with time', (t) => {
  if (I?.error) return t.skip('no TS loader');
  const nodes = [
    { id: 'a', requires: [], completed: true },
    { id: 'b', requires: ['a'], completed: false },
    { id: 'c', requires: ['a'], completed: false },
    { id: 'd', requires: ['b', 'c'], completed: false },
    { id: 'e', requires: ['d'], completed: false },
    { id: 'x', requires: [], completed: false },
  ];
  const p = I.unlockPath(nodes, 'e', { b: 30, c: 20, d: 40 });
  assert.deepEqual(p.steps, ['b', 'c', 'd']);
  assert.equal(p.minutes, 90);
  assert.deepEqual(I.unlockPath(nodes, 'b').steps, [], 'already open');
});

test('study plan: prerequisites first, heavier weight earlier, packed into days, on time or not', (t) => {
  if (I?.error) return t.skip('no TS loader');
  const nodes = [
    { id: 'a', requires: [], completed: false, progress: 0 },
    { id: 'b', requires: [], completed: false, progress: 50 },
    { id: 'c', requires: ['a'], completed: false, progress: 0 },
    { id: 'm', requires: [], completed: true, progress: 100 },
  ];
  const start = new Date(Date.UTC(2026, 9, 22));
  const plan = I.studyPlan(nodes, { a: 60, b: 60, c: 60 }, { b: 9, a: 1, c: 5 }, start, 60, new Date(Date.UTC(2026, 9, 30)));
  const order = plan.days.flatMap((d) => d.items.map((i) => i.id));
  assert.deepEqual([...new Set(order)], ['b', 'a', 'c'], 'weight first among ready; c waits for a');
  assert.equal(plan.days[0].date, '2026-10-22');
  assert.ok(plan.days.every((d) => d.minutes <= 60));
  assert.equal(plan.days.reduce((x, d) => x + d.minutes, 0), 30 + 60 + 60, 'remaining minutes only');
  assert.equal(plan.onTime, true);
  assert.equal(I.studyPlan(nodes, { a: 600, b: 600, c: 600 }, {}, start, 60, new Date(Date.UTC(2026, 9, 25))).onTime, false);
  assert.equal(I.fmtMinutes(105), '1h 45m');
  assert.equal(I.fmtMinutes(40), '40m');
});

// The Nexus opening (client/src/components/nexus/intro.ts).
let N = null;
test.before(async () => {
  try {
    N = await import(path.join(__dirname, '..', 'client', 'src', 'components', 'nexus', 'intro.ts'));
  } catch (e) {
    N = { error: e };
  }
});

test('intro: full the first time, short after, a fade with reduced motion; one clock for every beat', (t) => {
  if (N?.error) return t.skip('no TS loader');
  let seen = false;
  const mark = () => seen;
  assert.equal(N.pickIntro(false, mark).mode, 'full');
  seen = true;
  assert.deepEqual(N.pickIntro(false, mark), { mode: 'short', dur: 800 });
  assert.equal(N.pickIntro(true, mark).mode, 'fade');
  // The short intro plays the same beats on the same 2,000 ms clock, faster.
  assert.equal(N.introClock(400, 0, 800), 1000);
  assert.equal(N.introClock(5000, 0, 2000), N.INTRO_CLOCK);
  assert.equal(N.introClock(0, 100, 2000), 0);
  // Eased 0 → 1 within its window, flat outside it.
  assert.equal(N.seg(100, 300, 1100), 0);
  assert.equal(N.seg(1100, 300, 1100), 1);
  assert.ok(N.seg(700, 300, 1100) > 0.5, 'ease-out is past half way at the midpoint');
  assert.equal(N.pop(0, 100, 400), 0);
  assert.ok(Math.abs(N.pop(400, 100, 400) - 1) < 1e-9);
  assert.ok(Math.max(...[150, 200, 250, 300, 350].map((x) => N.pop(x, 100, 400))) > 1, 'a small overshoot');
  // Staggered starts span the window evenly.
  assert.equal(N.stagger(0, 9, 300, 820), 300);
  assert.equal(N.stagger(8, 9, 300, 820), 820);
  assert.equal(N.stagger(0, 1, 300, 820), 300);
});

test('learning order and next lesson: prerequisites first, goal first, then what this lesson opens', (t) => {
  if (I?.error) return t.skip('no TS loader');
  const n = (id, requires, zone, completed = false, unlocked = true) => ({ id, requires, zone, completed, unlocked });
  const nodes = [n('c', ['a', 'b'], 2, false, false), n('a', [], 1, true), n('b', [], 1), n('d', ['a'], 2), n('e', ['c'], 3, false, false)];
  const order = I.learningOrder(nodes);
  assert.deepEqual(order, ['a', 'b', 'c', 'd', 'e']);
  for (const x of nodes) for (const r of x.requires) assert.ok(order.indexOf(r) < order.indexOf(x.id), `${r} before ${x.id}`);
  assert.equal(order[0], 'a');
  // Finishing b opens c (a is done): c is next.
  assert.equal(I.nextLesson(nodes, 'b'), 'c');
  // A goal step here wins.
  assert.equal(I.nextLesson(nodes, 'b', ['d']), 'd');
  // From d (opens nothing): the next open lesson.
  assert.equal(I.nextLesson(nodes, 'd'), 'b');
  // All done: nothing.
  assert.equal(I.nextLesson(nodes.map((x) => ({ ...x, completed: true })), 'a'), null);
});
