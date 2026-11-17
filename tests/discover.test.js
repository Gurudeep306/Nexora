// "Something to explore" (client/src/lib/discover.ts): picks from every real
// part of the site, the same while you look, different later and on Shuffle,
// mixed kinds, never what you already did.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let D;
test.before(async () => {
  D = await import(path.join(__dirname, '..', 'client', 'src', 'lib', 'discover.ts'));
});

const sources = () => ({
  dsa: [
    { id: 'arrays', title: 'Arrays', blurb: 'Memory and traversal. More.', load: () => null },
    { id: 'heaps', title: 'Heaps', blurb: 'Priority queues.', load: () => null },
    { id: 'soon', title: 'Not written yet', blurb: '' },
  ],
  clusters: [
    { id: 'os', name: 'Operating Systems', engine: null, description: 'Processes and memory. Long text.', gate: { pyq: 'os', notes: 'os' }, nodes: [{ id: 'proc', n: 'Processes', z: 0 }, { id: 'deep', n: 'Deep thing', z: 3 }] },
    { id: 'dsa', name: 'DSA', engine: 'dsa', nodes: [] },
  ],
  gate: [
    { id: 'os', name: 'Operating Systems', topics: [{ id: 'sched', name: 'Scheduling' }] },
    { id: 'old', name: 'Old', legacy: true, topics: [{ id: 'x', name: 'X' }] },
  ],
  links: { subject: (c, n) => `/learn/${c.id}${n ? `/${n}` : ''}`, practice: ({ subject, topic }) => `/gate/practice?s=${subject}&t=${topic}` },
});

test('the pool holds every real part, and nothing unwritten, legacy or duplicated', () => {
  const pool = D.discoverPool(sources());
  const keys = pool.map((p) => p.key);
  assert.ok(keys.includes('dsa:arrays') && keys.includes('dsa:heaps'));
  assert.ok(!keys.includes('dsa:soon'), 'a chapter that is not written yet is never offered');
  assert.ok(keys.includes('subject:os') && keys.includes('notes:os') && keys.includes('concept:os:proc'));
  assert.ok(!keys.includes('concept:os:deep'), 'only starting concepts');
  assert.ok(!keys.some((k) => k.startsWith('subject:dsa')), 'the DSA course is offered by chapter');
  assert.ok(keys.includes('topic:os:sched') && !keys.includes('topic:old:x'));
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(pool.find((p) => p.key === 'subject:os').line, 'Processes and memory.', 'its own first sentence');
});

test('the same seed gives the same picks; another window or a shuffle changes them; kinds are mixed', () => {
  const pool = D.discoverPool(sources());
  const a = D.choose(pool, 3, 'home:u:100:0').map((p) => p.key);
  assert.deepEqual(D.choose(pool, 3, 'home:u:100:0').map((p) => p.key), a, 'stays put while you look');
  const seen = new Set([a.join()]);
  for (let w = 101; w < 140; w++) seen.add(D.choose(pool, 3, `home:u:${w}:0`).map((p) => p.key).join());
  assert.ok(seen.size > 5, 'changes over time, not a fixed set');
  const kinds = new Set(D.choose(pool, 3, 'x').map((p) => p.kind));
  assert.equal(kinds.size, 3, 'three different kinds when there are enough');
  const skip = new Set(['dsa:arrays', 'dsa:heaps']);
  for (let w = 0; w < 20; w++) assert.ok(!D.choose(pool, 3, `s${w}`, skip).some((p) => skip.has(p.key)), 'never what you already did');
});

test('the time window and the lead line follow the clock and the seed', () => {
  assert.equal(D.windowOf(0), 0);
  assert.equal(D.windowOf(D.WINDOW_HOURS * 3_600_000 - 1), 0);
  assert.equal(D.windowOf(D.WINDOW_HOURS * 3_600_000), 1);
  assert.equal(D.leadFor('a'), D.leadFor('a'));
});
