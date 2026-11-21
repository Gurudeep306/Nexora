/*
  The NexoraGuru benchmark: examples, corner cases and verified AI tests, at
  least 10, never a one-solution answer.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const { pickBenchmark, benchmarkFor } = require('../src/testgen-benchmark');

const mk = (size, confidence, i) => ({ size, confidence, input: `${size} ${i}\n`, expected: `${i}\n`, label: `${size} ${i}` });
const set = [
  mk('sample', 'official', 1),
  mk('sample', 'official', 2),
  ...[1, 2, 3, 4].map((i) => mk('edge', 'verified', i)),
  ...[1, 2, 3].map((i) => mk('tiny', 'verified', i)),
  ...[1, 2, 3].map((i) => mk('small', 'verified', i)),
  ...[1, 2].map((i) => mk('medium', 'verified', i)),
  ...[1, 2].map((i) => mk('large', 'reference', i)),
];

test('examples first, corner cases next, a spread of sizes, at most 12 AI tests', () => {
  const b = pickBenchmark(set);
  assert.ok(b && b.length >= 10 && b.length <= 14);
  assert.deepEqual(b.slice(0, 2).map((t) => t.confidence), ['official', 'official']);
  assert.ok(b.slice(2, 6).every((t) => t.size === 'edge'));
  assert.ok(b.some((t) => t.size === 'medium'));
  assert.ok(!b.some((t) => t.confidence === 'reference'), 'one-solution answers are never benchmark answers');
});

test('too few trusted tests: no benchmark', () => {
  assert.equal(pickBenchmark(set.slice(0, 7)), null);
  assert.equal(pickBenchmark([]), null);
});

test('benchmarkFor reads the saved set and labels the tests', async () => {
  const get = async (sql, args) => (args[0] === 'p:7' ? { tests: JSON.stringify(set) } : undefined);
  const b = await benchmarkFor(get, 7);
  assert.equal(b[0].label, 'Example 1');
  assert.equal(b[2].label, 'Corner case 1');
  assert.ok(b.some((t) => /^Benchmark \d+$/.test(t.label)));
  assert.equal(await benchmarkFor(get, 8), null);
  assert.equal(await benchmarkFor(async () => { throw new Error('no table yet'); }, 7), null);
});
