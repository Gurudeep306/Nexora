// Hive team mode: parts that own the same file never run at the same time on
// the shared working copy (src/hive/runner.js laneParts).
const test = require('node:test');
const assert = require('node:assert/strict');
const { laneParts } = require('../src/hive/runner');

test('parts with no shared files run side by side', () => {
  assert.deepEqual(laneParts([['a.js'], ['b.js'], ['c.js']]), [[0], [1], [2]]);
});

test('parts that share a file queue in one lane, in the lead\'s order', () => {
  assert.deepEqual(laneParts([['src/a.js'], ['src/b.js'], ['./src/a.js']]), [[0, 2], [1]]);
});

test('sharing is followed through other parts, and paths are compared loosely', () => {
  // 0 and 2 share a.js, 2 and 4 share c.js: all three in one lane.
  assert.deepEqual(laneParts([['a.js'], ['b.js'], ['A.js', 'c.js'], [], ['c.js']]), [[0, 2, 4], [1], [3]]);
  assert.deepEqual(laneParts([['src\\x.ts'], ['src/x.ts']]), [[0, 1]]);
});

test('parts that name no files each get their own lane', () => {
  assert.deepEqual(laneParts([[], [], ['']]), [[0], [1], [2]]);
});
