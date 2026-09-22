// Translation helpers: script-based language guess and formula protection.
const test = require('node:test');
const assert = require('node:assert/strict');
const { scriptGuess, protect, restore, LANGUAGES } = require('../src/ai-assist');

test('script guess recognises Indian and world scripts', () => {
  assert.equal(scriptGuess('ఒక శ్రేణి ఇవ్వబడింది').code, 'te');
  assert.equal(scriptGuess('ஒரு வரிசை கொடுக்கப்பட்டுள்ளது').code, 'ta');
  assert.equal(scriptGuess('ಒಂದು ಶ್ರೇಣಿ').code, 'kn');
  assert.equal(scriptGuess('Дано n чисел').code, 'ru');
  assert.equal(scriptGuess('配列が与えられます').code, 'ja');
  assert.equal(scriptGuess('Given an array').code, 'en');
});

test('formulas, code and images survive translation untouched', () => {
  const html = '<p>Given $$$n \\le 10^5$$$ numbers</p><pre>3\n1 2 3</pre><img src="x.png">';
  const { text, keep } = protect(html);
  assert.ok(!text.includes('$$$') && !text.includes('<pre') && !text.includes('<img'));
  const back = restore(text.replace('Given', 'दिया गया है').replace('numbers', 'संख्याएँ'), keep);
  assert.ok(back.includes('$$$n \\le 10^5$$$'));
  assert.ok(back.includes('<pre>3\n1 2 3</pre>'));
  assert.ok(back.includes('<img src="x.png">'));
});

test('20 Indian languages are offered', () => {
  assert.ok(LANGUAGES.filter((l) => l.group === 'indian').length >= 20);
});
