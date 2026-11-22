/* S8: answers are spoken sentence by sentence (client/src/voice/sentences.ts). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { splitSentences } = require('../client/src/voice/sentences.ts');

test('splits into sentences, keeping abbreviations, decimals and numbered steps whole', () => {
  assert.deepEqual(splitSentences('First, sort the array. Then use two pointers! Done?'), ['First, sort the array.', 'Then use two pointers!', 'Done?']);
  assert.deepEqual(splitSentences('Use a queue, e.g. a deque. It is O(n log n) here.'), ['Use a queue, e.g. a deque.', 'It is O(n log n) here.']);
  assert.deepEqual(splitSentences('Pi is about 3.14 here.'), ['Pi is about 3.14 here.']);
  assert.deepEqual(splitSentences('Step 1. Read it.'), ['Step 1. Read it.']);
  assert.deepEqual(splitSentences('मिड को अपडेट करो। फिर लूप चलाओ।'), ['मिड को अपडेट करो।', 'फिर लूप चलाओ।']);
  assert.deepEqual(splitSentences('**Bold** `code` text'), ['Bold code text']);
  assert.deepEqual(splitSentences('   '), []);
});

test('a very long sentence is cut at a comma so the first piece starts quickly', () => {
  const long = 'We keep two pointers low and high, ' + 'and we move them towards each other while comparing the middle value with the key, '.repeat(4) + 'until they cross.';
  const parts = splitSentences(long);
  assert.ok(parts.length > 1);
  for (const p of parts) assert.ok(p.length <= 220, p.length);
  assert.equal(parts.join(' ').replace(/\s+/g, ' '), long.replace(/\s+/g, ' '));
});
