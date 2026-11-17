// Statement maths on the client (client/src/lib/mathHtml.ts): the TeX between
// $$$…$$$ is still HTML text, so "0 &lt; t_1" must reach KaTeX as "0 < t_1".
// It was escaped twice and showed as broken "&lt;" text on every judge.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let prepareMathHtml, unescapeHtml;
test.before(async () => {
  ({ prepareMathHtml, unescapeHtml } = await import(path.join(__dirname, '..', 'client', 'src', 'lib', 'mathHtml.ts')));
});

const texOf = (html) => [...html.matchAll(/data-tex="([^"]*)"/g)].map((m) => unescapeHtml(m[1]));

test('the TeX handed to KaTeX is plain TeX, not HTML', () => {
  const html = prepareMathHtml('<p>$$$0 &lt; t_1 &lt; t_2 \\leq 10^7$$$ and $$$$$$a &amp; b &gt; c$$$$$$</p>');
  assert.deepEqual(texOf(html), ['0 < t_1 < t_2 \\leq 10^7', 'a & b > c']);
  assert.doesNotMatch(html, /&amp;lt;/, 'never escaped twice');
});

test('text without maths is untouched', () => {
  assert.equal(prepareMathHtml('<p>1 &lt; 2, no maths</p>'), '<p>1 &lt; 2, no maths</p>');
});
