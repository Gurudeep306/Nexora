/*
  Numerical answers by voice in the exam console: a spoken number becomes the
  digits the answer box takes, in English, Hinglish and Hindi, and an action
  that reads its own value wins over phrase matching.
*/
const test = require('node:test');
const assert = require('node:assert/strict');

const { spokenNumber } = require('../client/src/voice/actions/number.ts');
const { matchCommand } = require('../client/src/voice/actions/match.ts');

test('digits as the browser writes them', () => {
  assert.equal(spokenNumber('42.5'), '42.5');
  assert.equal(spokenNumber('answer 42.5'), '42.5');
  assert.equal(spokenNumber('the answer is 0.75'), '0.75');
  assert.equal(spokenNumber('-3'), '-3');
  assert.equal(spokenNumber('minus 3.25'), '-3.25');
  assert.equal(spokenNumber('1,024'), '1024');
  assert.equal(spokenNumber('answer is 0.50'), '0.50');
  assert.equal(spokenNumber('.5'), '0.5');
  assert.equal(spokenNumber('४२'), '42');
});

test('number words: English, Hinglish, Hindi', () => {
  assert.equal(spokenNumber('forty two point five'), '42.5');
  assert.equal(spokenNumber('answer one hundred twenty eight'), '128');
  assert.equal(spokenNumber('two thousand and forty eight'), '2048');
  assert.equal(spokenNumber('point two five'), '0.25');
  assert.equal(spokenNumber('negative seven'), '-7');
  assert.equal(spokenNumber('minus do point paanch'), '-2.5');
  assert.equal(spokenNumber('jawab teen hai'), '3');
  assert.equal(spokenNumber('42 point 5'), '42.5');
  assert.equal(spokenNumber('उत्तर बयालीस'), '42');
  assert.equal(spokenNumber('तीन दशमलव पाँच'), '3.5');
  assert.equal(spokenNumber('ek lakh'), '100000');
});

test('not a number: commands stay commands', () => {
  for (const s of ['save and next', 'question 12', 'mark for review', 'next', 'clear response', 'answer', 'calculator kholo', 'option B', '']) {
    assert.equal(spokenNumber(s), null, s);
  }
});

test('an action that reads its own value wins', () => {
  const specs = [
    { id: 'exam.next', say: { en: ['save and next', 'next'] }, risk: 'reversible' },
    { id: 'exam.number', say: { en: ['type the answer'] }, risk: 'reversible', parse: (u) => { const v = spokenNumber(u); return v == null ? null : { value: v }; } },
  ];
  assert.deepEqual(matchCommand('answer 42.5', specs).best, { id: 'exam.number', args: { value: '42.5' }, score: 1 });
  assert.equal(matchCommand('save and next', specs).best.id, 'exam.next');
});
