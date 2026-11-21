/* Listen: following the voice word by word (client/src/components/reader/wordTrack.ts). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { wordAt, nextWord } = require('../client/src/components/reader/wordTrack.ts');

test('spoken words are found again in the paragraph, in order', () => {
  const text = 'A set S is countable if there is an injection from S to N.';
  const spoken = 'A set S is countable if there is an injection from S to N.';
  let cursor = 0;
  const found = [];
  for (const m of spoken.matchAll(/[\p{L}\p{N}]+/gu)) {
    const w = wordAt(spoken, m.index);
    const pos = nextWord(text, w, cursor);
    assert.ok(pos >= 0, w);
    found.push(text.slice(pos, pos + w.length));
    cursor = pos + w.length;
  }
  assert.deepEqual(found, spoken.match(/[\p{L}\p{N}]+/gu));
});

test('words said for a formula are not found, and the highlight waits', () => {
  const text = 'The sum is  and it grows fast.'; // the formula's text is not in the paragraph text
  const spoken = 'The sum is n squared over two and it grows fast.';
  assert.equal(nextWord(text, 'squared', 11), -1);
  assert.equal(nextWord(text, 'and', 11), 12);
  assert.equal(nextWord(text, 'is', 0), 8, 'whole words only: not the "is" inside "This"');
  assert.equal(wordAt(spoken, 4), 'sum');
  assert.equal(wordAt(spoken, 3), '');
});
