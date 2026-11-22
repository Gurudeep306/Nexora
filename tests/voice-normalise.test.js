/*
  S5, the server ears' normaliser (src/voice/normalise.js): every case in
  docs/voice/tests/normalise.json must pass (these are rules, so 100%), and
  the server's number words must read exactly like the browser's
  (client/src/voice/actions/number.ts), so the two can't drift.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalise, editDistance, firstSound } = require('../src/voice/normalise');
const { ONES, TENS, readNumber, numbersToDigits } = require('../src/voice/numwords');
const { spokenNumber } = require('../client/src/voice/actions/number.ts');
const set = require('../docs/voice/tests/normalise.json');

test('the test set is large enough', () => {
  assert.ok(set.cases.length >= 300, `${set.cases.length} cases`);
});

test('every case in docs/voice/tests/normalise.json', () => {
  const failed = [];
  for (const c of set.cases) {
    const r = normalise(c.say, { mode: c.mode, hints: c.hints || [], lang: c.lang || 'en-IN' });
    for (const k of ['text', 'code', 'unplaced', 'retryHindi']) {
      if (!(k in c)) continue;
      if (JSON.stringify(r[k]) !== JSON.stringify(c[k])) failed.push(`${JSON.stringify(c.say)} [${c.mode}] ${k}: got ${JSON.stringify(r[k])}, want ${JSON.stringify(c[k])}`);
    }
  }
  assert.equal(failed.length, 0, `${failed.length} of ${set.cases.length} failed:\n` + failed.join('\n'));
});

test('server and browser read every number word the same way', () => {
  for (const w of [...Object.keys(ONES), ...Object.keys(TENS)]) {
    assert.equal(readNumber([w], 0)?.value, spokenNumber(w), w);
  }
  for (const phrase of ['twenty five', 'forty two', 'one hundred', 'two hundred fifty', 'one thousand', 'ek lakh', 'nineteen', 'ninety nine', 'three hundred and', 'pachas']) {
    const words = phrase.split(' ').filter((w) => w !== 'and');
    assert.equal(numbersToDigits(words).join(' '), spokenNumber(phrase), phrase);
  }
});

test('helpers', () => {
  assert.equal(editDistance('mit', 'mid'), 1);
  assert.equal(editDistance('mdi', 'mid'), 1);
  assert.equal(editDistance('visted', 'visited'), 1);
  assert.equal(firstSound('kyu'), firstSound('queue'));
  assert.notEqual(firstSound('node'), firstSound('mode'));
});

test('never invents: an unknown word is left as said', () => {
  const r = normalise('zorblax the frobnicator', { mode: 'command', hints: ['mid'] });
  assert.equal(r.text, 'zorblax the frobnicator');
  assert.deepEqual(r.changes, []);
});
