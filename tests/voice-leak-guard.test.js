/*
  Guru's Leak Guard (src/voice/guru.js leaks(), docs/voice/GURU_SPEC.md) at
  scale, on the real answer keys of every GATE question in the bank:
  - every way a reply could give the answer away — English, Hinglish, Hindi
    (Devanagari), "Ans: B", "उत्तर बी है", numbers in words ("forty two",
    "बयालीस"), fractions ("1/2"), a value inside a range key — must be caught;
  - Socratic hints that point at options or use other numbers must pass, so
    Guru can still teach.
  An unsolved question's answer must never reach the student by voice.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const G = require('../src/voice/guru');
const N = require('../src/voice/numwords');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'gate', 'questions.json'), 'utf8'));
const QS = Array.isArray(raw) ? raw : raw.questions;
const letterQs = QS.filter((q) => /^[A-D](\s*[;,]\s*[A-D])*$/.test(String(q.answer ?? '').trim()));
const numberQs = QS.filter((q) => /^-?\d+(\.\d+)?$/.test(String(q.answer ?? '').trim()));
const rangeQs = QS.filter((q) => /^-?\d+(\.\d+)?\s*(:|to)\s*-?\d+(\.\d+)?$/.test(String(q.answer ?? '').trim()));

const leak = (reply, q) => G.leaks({ reply, answerKey: q.answer, options: q.options || [] }).leak;
const DEV = { A: 'ए', B: 'बी', C: 'सी', D: 'डी' };

function run(t, label, items) {
  const missed = [];
  const alarms = [];
  for (const [reply, q, want] of items) {
    const got = leak(reply, q);
    if (want && !got) missed.push(`${q.id} [${q.answer}] "${reply}"`);
    if (!want && got) alarms.push(`${q.id} [${q.answer}] "${reply}" (${G.leaks({ reply, answerKey: q.answer, options: q.options || [] }).why})`);
  }
  t.diagnostic(`${label}: ${items.length} replies checked (${items.filter((x) => x[2]).length} leaks, ${items.filter((x) => !x[2]).length} safe hints)`);
  assert.equal(missed.length, 0, `${missed.length} leaks not caught:\n${missed.slice(0, 30).join('\n')}`);
  assert.equal(alarms.length, 0, `${alarms.length} safe hints blocked:\n${alarms.slice(0, 30).join('\n')}`);
}

test('the bank has the keys this test needs', () => {
  assert.ok(letterQs.length > 2000, `${letterQs.length} letter keys`);
  assert.ok(numberQs.length > 250, `${numberQs.length} number keys`);
  assert.ok(rangeQs.length > 100, `${rangeQs.length} range keys`);
});

/* ── option letters ── */

const LETTER_LEAKS = [
  (L) => `The answer is ${L}.`, (L) => `${L} is correct.`, (L) => `Option ${L} sahi hai.`, (L) => `सही उत्तर ${L} है।`, (L) => `Go with (${L}).`,
  (L) => `Correct option: ${L}`, (L) => `${L} wala option sahi hai`, (L) => `It's option ${L}.`, (L) => `The right one is ${L}.`, (L) => `Answer: ${L}`,
  (L) => `Ans: ${L}`, (L) => `Ans ${L}`, (L) => `${L} hi sahi hai`, (L, d) => `उत्तर ${d} है`, (L) => `सही विकल्प ${L} है`, (L) => `jawab ${L} hai`,
  (L) => `${L} is the answer`, (L) => `The correct choice is (${L})`, (L) => `You should mark ${L}.`, (L) => `${L} is right`, (L) => `Option (${L}) is the one.`,
  (L) => `Sahi jawab option ${L}`, (L) => `${L} ✓`, (L) => `Pick option ${L}.`, (L) => `${L} sahi rahega`, (L) => `${L} correct hai`, (L) => `option ${L.toLowerCase()} is correct`,
  (L, d) => `सही जवाब ${d} है`, (L) => `So the answer comes out as option ${L}.`, (L) => `Hence (${L}).  That is the correct answer.`,
];

function otherLetter(key) {
  return ['A', 'B', 'C', 'D'].find((x) => !key.includes(x));
}

const LETTER_SAFE = [
  (L, o) => `Look at option ${o} carefully: what does it say about the worst case?`,
  (L, o) => `Compare option ${L} with option ${o}. Which one fits the definition?`,
  () => 'Check each option against the definition, one at a time.',
  (L, o) => `Option ${o} mentions something important. When does it happen?`,
  () => 'A good first step is to write down what is given.',
  () => 'Try a small example by hand before choosing.',
  (L, o) => `Why might someone be tempted by option ${o}?`,
  () => 'Think about the base case first. What happens there?',
  (L, o) => `Option ${o} ko dhyan se padho: kya woh hamesha true hai?`,
  () => 'पहले परिभाषा लिखो, फिर हर विकल्प को जाँचो।',
];

test('every letter key in the bank: every way of saying the answer is caught', (t) => {
  const items = [];
  for (const q of letterQs) {
    const L = String(q.answer).split(/[;,]/)[0].trim();
    for (const f of LETTER_LEAKS) items.push([f(L, DEV[L]), q, true]);
  }
  run(t, 'letter leaks', items);
});

test('every letter key in the bank: Socratic hints that point at options still pass', (t) => {
  const items = [];
  for (const q of letterQs) {
    const key = String(q.answer);
    const L = key.split(/[;,]/)[0].trim();
    const o = otherLetter(key);
    if (!o) continue;
    for (const f of LETTER_SAFE) items.push([f(L, o), q, false]);
  }
  run(t, 'letter hints', items);
});

test('quoting the right option’s own words as the answer is caught', (t) => {
  const items = [];
  for (const q of letterQs) {
    const L = String(q.answer).split(/[;,]/)[0].trim();
    const opt = (q.options || []).find((o) => String(o.l).toUpperCase() === L);
    const text = String(opt?.t || '').trim();
    if (text.length < 6 || /\$/.test(text)) continue;
    items.push([`The correct answer is: ${text}`, q, true], [`Sahi jawab hai ${text}`, q, true]);
  }
  run(t, 'quoted options', items);
});

/* ── numbers ── */

const fmt = (n) => String(n);
function numberLeaks(n) {
  const s = fmt(n);
  const out = [`The answer is ${s}.`, `jawab ${s} hai`, `उत्तर ${s} है`, `Final answer: ${s}`, `So it comes to ${s}.`, `${s} aayega`, `x = ${s}`, `The result is ${s}.`, `That gives ${s}.`];
  // Whole numbers also in words, as a model might write or say them.
  if (Number.isInteger(n) && n >= 0 && n < 100000) {
    const en = english(n);
    out.push(`The answer is ${en}.`, `It comes to ${en.replace(/ /g, '-')}.`, `उत्तर ${N.spellHindi(n)} है`, `jawab ${hinglish(n)} hai`);
  }
  if (!Number.isInteger(n)) out.push(`The answer is ${n.toFixed(2)}.`);
  return out;
}

const EN1 = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN10 = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function english(n) {
  if (n < 20) return EN1[n];
  if (n < 100) return EN10[Math.floor(n / 10)] + (n % 10 ? ' ' + EN1[n % 10] : '');
  if (n < 1000) return EN1[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + english(n % 100) : '');
  return english(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + english(n % 1000) : '');
}
const ROM = new Map(N.HINDI_NUMBERS.map(([v, ...w]) => [v, w.find((x) => /^[a-z]+$/.test(x))]));
function hinglish(n) {
  if (n < 100) return ROM.get(n);
  if (n < 1000) return `${ROM.get(Math.floor(n / 100))} sau` + (n % 100 ? ' ' + ROM.get(n % 100) : '');
  return `${hinglish(Math.floor(n / 1000))} hazaar` + (n % 1000 ? ' ' + hinglish(n % 1000) : '');
}

const NUMBER_SAFE = (n) => {
  const other = Math.abs(n) * 3 + 17;
  return ['Write down the formula first, then put in the values.', 'How many steps does each pass take?', `Try it with n = ${other} first and see the pattern.`,
    'What is given, and what is asked? Start there.', 'Draw the table and fill the first row.', 'Kaunsa formula yahan lagega? Pehle woh likho.'];
};

test('every number key in the bank: the value in digits, words, Hindi and Hinglish is caught', (t) => {
  const items = [];
  for (const q of numberQs) {
    const n = Number(q.answer);
    for (const r of numberLeaks(n)) {
      // Small whole numbers are only caught next to answer words (they turn up in hints); every leak form here has one, except "x = n" which has "=".
      items.push([r, q, true]);
    }
  }
  run(t, 'number leaks', items);
});

test('every number key in the bank: hints with other numbers still pass', (t) => {
  const items = [];
  for (const q of numberQs) for (const r of NUMBER_SAFE(Number(q.answer))) items.push([r, q, false]);
  run(t, 'number hints', items);
});

test('every range key in the bank: a value inside the range, next to answer words, is caught; one outside passes', (t) => {
  const items = [];
  for (const q of rangeQs) {
    const [a, b] = String(q.answer).split(/\s*(?::|to)\s*/).map(Number);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const mid = Math.round(((lo + hi) / 2) * 1000) / 1000;
    for (const v of [lo, hi, mid]) items.push([`The answer is ${v}.`, q, true], [`jawab ${v} aayega`, q, true], [`उत्तर ${v} है`, q, true]);
    const outside = Math.round((hi + Math.max(1, hi - lo) * 5 + 11) * 100) / 100;
    items.push([`Try a value like ${outside} to see how the formula behaves.`, q, false]);
  }
  run(t, 'ranges', items);
});

test('fractions and decimals said for a decimal key', (t) => {
  const q = { id: 'made-up', answer: '0.5', options: [] };
  const q25 = { id: 'made-up', answer: '0.25', options: [] };
  const items = [
    ['The answer is 1/2.', q, true], ['It is one half.', q, true], ['answer is point five', q, true], ['zero point five', q, true],
    ['The answer is zero point five.', q, true], ['उत्तर 0.5 है', q, true], ['jawab aadha hai', q, true], ['The answer is 0.50', q, true],
    ['The answer is one quarter.', q25, true], ['answer: 1/4', q25, true], ['Take half of the array first.', q, false],
  ];
  run(t, 'fractions', items);
});

test('an English "a" is an article, not option A', () => {
  const q = { id: 'made-up', answer: 'A', options: [] };
  for (const s of ['A stack is a list where the last item in comes out first. The answer depends on that.', 'The answer is a bit subtle: think about the worst case.', 'Is there a correct way to start? Try a small case.']) {
    assert.equal(leak(s, q), false, s);
  }
  for (const s of ['The answer is A.', 'A is correct.', 'Option A sahi hai.', 'उत्तर ए है', '(A) is right.']) assert.equal(leak(s, q), true, s);
});
