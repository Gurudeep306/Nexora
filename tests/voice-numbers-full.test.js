/*
  Spoken numbers, checked in full: every number from 0 to 9,999 said in
  English, Hindi and Hinglish (with the spelling variants speech recognisers
  write), plus lakhs, decimals, negatives and Devanagari digits, through both
  readers — the browser's answer box (client/src/voice/actions/number.ts) and
  the server ears' sentence normaliser (src/voice/numwords.js).

  The expected words come from small speller functions written here,
  independently of the readers, so the readers are not checked against
  themselves. Hindi 0–99 come from the shared table; that table is checked
  separately against a fixed list of well-known values.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../src/voice/numwords');
const { spokenNumber, HINDI_NUMBERS } = require('../client/src/voice/actions/number.ts');

/* ── independent spellers ── */

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** English words for 0 ≤ n < 10,00,00,000, Indian grouping above 99,999. `and` after hundreds when asked. */
function english(n, and = false) {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + EN_ONES[n % 10] : '');
  if (n < 1000) return EN_ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? (and ? ' and ' : ' ') + english(n % 100) : '');
  if (n < 100000) return english(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + english(n % 1000, and) : '');
  return english(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + english(n % 100000, and) : '');
}

const forms = new Map(HINDI_NUMBERS.map(([v, ...w]) => [v, w]));
const isDev = (w) => /[ऀ-ॿ]/.test(w);
const devForms = (v) => forms.get(v).filter(isDev);
const romForms = (v) => forms.get(v).filter((w) => !isDev(w));
/** The k-th spelling of v (cycles through every variant over the range). */
const pick = (list, k) => list[k % list.length];

/** Hindi (Devanagari) or Hinglish words for n, Indian grouping; `k` picks spelling variants. */
function hindi(n, k = 0, roman = false) {
  const word = (v) => pick(roman ? romForms(v) : devForms(v), k + v);
  const SAU = roman ? 'sau' : 'सौ';
  const HAZAAR = roman ? pick(['hazaar', 'hazar'], k) : pick(['हज़ार', 'हजार'], k);
  const LAKH = roman ? 'lakh' : 'लाख';
  if (n < 100) return word(n);
  if (n < 1000) return `${word(Math.floor(n / 100))} ${SAU}` + (n % 100 ? ' ' + word(n % 100) : '');
  if (n < 100000) return `${word(Math.floor(n / 1000))} ${HAZAAR}` + (n % 1000 ? ' ' + hindi(n % 1000, k, roman) : '');
  return `${word(Math.floor(n / 100000))} ${LAKH}` + (n % 100000 ? ' ' + hindi(n % 100000, k, roman) : '');
}

/** Read with both readers: the answer box and the sentence normaliser. */
function readBoth(phrase) {
  const words = phrase.toLowerCase().normalize('NFC').split(/\s+/).filter((w) => w && w !== 'and');
  return { box: spokenNumber(phrase), sentence: N.numbersToDigits(words).join(' ') };
}

function check(t, label, cases) {
  const bad = [];
  for (const [phrase, want, opts = {}] of cases) {
    const r = readBoth(phrase);
    if (r.box !== want) bad.push(`box: "${phrase}" → ${r.box} (want ${want})`);
    if (!opts.boxOnly && r.sentence !== want) bad.push(`sentence: "${phrase}" → ${r.sentence} (want ${want})`);
  }
  t.diagnostic(`${label}: ${cases.length} phrases`);
  assert.equal(bad.length, 0, `${bad.length} of ${cases.length} wrong:\n${bad.slice(0, 25).join('\n')}`);
  return cases.length;
}

const range = (a, b, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

/* ── the table itself ── */

test('the Hindi table has every number 0–99 once, each with Devanagari and Hinglish words', () => {
  assert.deepEqual(HINDI_NUMBERS.map(([v]) => v), range(0, 99));
  const seen = new Map();
  for (const [v, ...words] of HINDI_NUMBERS) {
    assert.ok(words.some(isDev), `${v} has a Devanagari word`);
    assert.ok(words.some((w) => !isDev(w)), `${v} has a Hinglish word`);
    for (const w of words) {
      assert.equal(w, w.normalize('NFC'), `${w} is stored in NFC`);
      assert.ok(!seen.has(w) || seen.get(w) === v, `"${w}" means both ${seen.get(w)} and ${v}`);
      seen.set(w, v);
    }
  }
});

test('the Hindi table matches the well-known words (spot list written separately)', () => {
  const KNOWN = {
    'इक्कीस': 21, 'बाईस': 22, 'छब्बीस': 26, 'उनतीस': 29, 'बत्तीस': 32, 'छत्तीस': 36, 'उनतालीस': 39, 'बयालीस': 42, 'सैंतालीस': 47, 'उनचास': 49,
    'इक्यावन': 51, 'बावन': 52, 'पचपन': 55, 'छप्पन': 56, 'उनसठ': 59, 'चौंसठ': 64, 'उनहत्तर': 69, 'बहत्तर': 72, 'पचहत्तर': 75,
    'उन्यासी': 79, 'चौरासी': 84, 'नवासी': 89, 'बानवे': 92, 'निन्यानबे': 99, 'निन्यानवे': 99,
  };
  for (const [w, v] of Object.entries(KNOWN)) assert.equal(spokenNumber(w), String(v), w);
  // Every multiple of ten has its own word in Hindi too.
  const TENS = { 10: 'दस', 20: 'बीस', 30: 'तीस', 40: 'चालीस', 50: 'पचास', 60: 'साठ', 70: 'सत्तर', 80: 'अस्सी', 90: 'नब्बे' };
  for (const [v, w] of Object.entries(TENS)) assert.ok(devForms(Number(v)).includes(w), `${v} is ${w}`);
});

test('every spelling of every Hindi and Hinglish number 0–99', (t) => {
  const cases = [];
  // Alone in a sentence, words that are also everyday Hinglish ("do" = do, "sat") stay words; the answer box reads them.
  const LONE = new Set(['do', 'teen', 'char', 'che', 'sat', 'ath', 'das', 'saath']);
  for (const [v, ...words] of HINDI_NUMBERS) for (const w of words) cases.push([w, String(v), { boxOnly: LONE.has(w) }]);
  // A nukta written as two characters (ड + ़) reads the same as the single one (ड़).
  cases.push(['अड़तीस', '38'], ['सड़सठ', '67']);
  check(t, 'Hindi spellings', cases);
});

/* ── 0 to 9,999, every number, every language ── */

test('every number 0–9,999 in English (with and without "and")', (t) => {
  const cases = range(0, 9999).flatMap((n) => {
    const out = [[english(n), String(n)]];
    if (n >= 100 && n % 100) out.push([english(n, true), String(n), { boxOnly: false }]);
    return out;
  });
  check(t, 'English 0–9,999', cases);
});

test('every number 0–9,999 in Hindi (Devanagari), every spelling variant used', (t) => {
  check(t, 'Hindi 0–9,999', range(0, 9999).map((n) => [hindi(n, n), String(n)]));
});

test('every number 0–9,999 in Hinglish', (t) => {
  // Single words that are also everyday Hinglish words ("do", "sat") are numbers only near another number in a sentence; the answer box reads them always.
  const cases = range(0, 9999).map((n) => {
    const phrase = hindi(n, n, true);
    const lone = !phrase.includes(' ') && ['do', 'sat', 'char', 'che', 'ath', 'das', 'teen', 'saath'].includes(phrase);
    return [phrase, String(n), { boxOnly: lone }];
  });
  check(t, 'Hinglish 0–9,999', cases);
});

test('every number 0–9,999 as Devanagari and as Western digits', (t) => {
  const dev = (n) => String(n).replace(/\d/g, (d) => '०१२३४५६७८९'[d]);
  check(t, 'digits 0–9,999', range(0, 9999).flatMap((n) => [[String(n), String(n)], [dev(n), String(n), { boxOnly: true }]]));
});

/* ── bigger numbers, decimals, signs ── */

test('thousands and lakhs (every 997th number up to 99,99,999) in all three languages', (t) => {
  const cases = range(10000, 9999999, 997).flatMap((n, k) => [
    [english(n), String(n)],
    [hindi(n, k), String(n)],
    [hindi(n, k, true), String(n)],
  ]);
  check(t, 'up to 99 lakh', cases);
});

test('decimals: every whole part 0–199 with fractions read digit by digit', (t) => {
  const FRACS = ['5', '25', '75', '05', '125', '333', '0', '50'];
  const DIG_EN = (f) => f.split('').map((d) => EN_ONES[d]).join(' ');
  const DIG_HI = (f, k) => f.split('').map((d) => pick(devForms(Number(d)), k)).join(' ');
  const DIG_HG = (f, k) => f.split('').map((d) => pick(romForms(Number(d)), k)).join(' ');
  const cases = [];
  range(0, 199).forEach((n, k) => {
    for (const f of FRACS) {
      const want = `${n}.${f}`;
      cases.push([`${english(n)} point ${DIG_EN(f)}`, want]);
      cases.push([`${hindi(n, k)} दशमलव ${DIG_HI(f, k)}`, want]);
      cases.push([`${hindi(n, k, true)} point ${DIG_HG(f, k)}`, want, { boxOnly: true }]);
      cases.push([`${n}.${f}`, want, { boxOnly: true }]);
    }
  });
  check(t, 'decimals', cases);
});

test('negative answers in the exam box: minus, negative, ऋण, माइनस', (t) => {
  const cases = range(1, 500).flatMap((n, k) => [
    [`minus ${english(n)}`, `-${n}`, { boxOnly: true }],
    [`negative ${english(n)} point five`, `-${n}.5`, { boxOnly: true }],
    [`${pick(['ऋण', 'माइनस'], k)} ${hindi(n, k)}`, `-${n}`, { boxOnly: true }],
    [`minus ${hindi(n, k, true)}`, `-${n}`, { boxOnly: true }],
    [`-${n}`, `-${n}`, { boxOnly: true }],
  ]);
  check(t, 'negatives', cases);
});

test('the answer box ignores the words around the number', (t) => {
  const WRAP = [
    (x) => `answer ${x}`, (x) => `the answer is ${x}`, (x) => `my answer is ${x}`, (x) => `type ${x}`, (x) => `enter ${x} please`,
    (x) => `jawab ${x} hai`, (x) => `uttar ${x}`, (x) => `${x} likho`, (x) => `उत्तर ${x} है`, (x) => `जवाब ${x}`, (x) => `answer is equal to ${x}`,
  ];
  const cases = [];
  range(0, 999, 7).forEach((n, k) => {
    for (const [i, w] of WRAP.entries()) cases.push([w(i % 3 === 0 ? english(n) : i % 3 === 1 ? hindi(n, k) : String(n)), String(n), { boxOnly: true }]);
  });
  check(t, 'with filler words', cases);
});

test('words that are not numbers stay out of the answer box', () => {
  const NOT = ['save and next', 'question 12 kholo', 'mark for review', 'next', 'previous', 'clear response', 'answer', 'calculator kholo', 'option B', 'B chuno',
    'point', 'minus', 'what is binary search', 'मुझे समझ नहीं आया', 'stack kya hai', 'go back', 'submit', 'pause', 'हिंट दो', 'next question'];
  for (const s of NOT) assert.equal(spokenNumber(s), null, s);
});

test('in sentences, numbers become digits and everything else stays', (t) => {
  const cases = [];
  range(0, 300).forEach((n, k) => {
    const en = english(n);
    const hi = hindi(n, k);
    cases.push([`for i from zero to ${en}`, `for i from 0 to ${n}`]);
    cases.push([`i se ${hi} tak`, `i se ${n} tak`]);
    cases.push([`line ${en} pe jao`, `line ${n} pe jao`]);
    cases.push([`n minus ${en}`, `n minus ${n}`]);
    cases.push([`array of size ${hindi(n, k, true)} banao`, `array of size ${n} banao`]);
  });
  const bad = [];
  for (const [said, want] of cases) {
    const got = N.numbersToDigits(said.normalize('NFC').split(' ')).join(' ');
    if (got !== want) bad.push(`"${said}" → "${got}" (want "${want}")`);
  }
  t.diagnostic(`sentences: ${cases.length}`);
  assert.equal(bad.length, 0, `${bad.length} wrong:\n${bad.slice(0, 25).join('\n')}`);
});

test('everyday Hinglish words are not turned into numbers outside a number', () => {
  assert.equal(N.numbersToDigits('ye kaam kar do'.split(' ')).join(' '), 'ye kaam kar do');
  assert.equal(N.numbersToDigits('saath mein padhte hain'.split(' ')).join(' '), 'saath mein padhte hain');
  assert.equal(N.numbersToDigits('main do baar bola'.split(' ')).join(' '), 'main do baar bola');
  assert.equal(N.numbersToDigits('tum sat ho'.split(' ')).join(' '), 'tum sat ho');
});

/* ── the voice says numbers in Hindi ── */

test('Hindi spelling of every number 0–1,00,000 reads back to the same number', (t) => {
  const bad = [];
  let n = 0;
  for (let v = 0; v <= 100000; v++, n++) {
    const said = N.spellHindi(v);
    if (spokenNumber(said) !== String(v)) bad.push(`${v} → "${said}" → ${spokenNumber(said)}`);
  }
  for (let v = 100000; v <= 999999999; v += 99991, n++) {
    const said = N.spellHindi(v);
    if (spokenNumber(said) !== String(v)) bad.push(`${v} → "${said}" → ${spokenNumber(said)}`);
  }
  t.diagnostic(`spelled and read back: ${n}`);
  assert.equal(bad.length, 0, bad.slice(0, 20).join('\n'));
  assert.equal(N.spellHindi(47), 'सैंतालीस');
  assert.equal(N.spellHindi(1024), 'एक हज़ार चौबीस');
  assert.equal(N.spellHindi(2026), 'दो हज़ार छब्बीस');
  assert.equal(N.spellHindi(150000), 'एक लाख पचास हज़ार');
  assert.equal(N.spellHindi(12345678), 'एक करोड़ तेईस लाख पैंतालीस हज़ार छह सौ अठहत्तर');
  assert.equal(N.spellHindi(-1), null);
});
