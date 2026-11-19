// One-line previews of GATE questions (lists, queues, the notebook) show the
// maths as readable symbols instead of dropping it: "n \ge 1" used to come out
// as "n 1" and "4 \times 4" as "4 \time…".
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'gate', f)).href);

test('LaTeX turns into readable symbols', async () => {
  const { texToPlain } = await load('texPlain.ts');
  const cases = [
    ['4 \\times 4', '4 × 4'],
    ['n \\ge 1', 'n ≥ 1'],
    ['a \\leq b \\neq c', 'a ≤ b ≠ c'],
    ['\\frac{n}{2}', 'n/2'],
    ['\\sqrt{n}', '√(n)'],
    ['p \\to q \\leftrightarrow r', 'p → q ↔ r'],
    ['\\forall x \\in S', '∀ x ∈ S'],
    ['O(n \\log n)', 'O(n log n)'],
    ['\\Theta(n^{2})', 'Θ(n^2)'],
    ['\\{1, 2\\}', '{1, 2}'],
    ['\\left( x \\right)', '( x )'],
    ['\\mathbb{Z}_{n}', 'Z_n'],
    ['\\unknowncommand x', ' x'],
  ];
  for (const [tex, want] of cases) assert.equal(texToPlain(tex), want, tex);
});

test('question previews keep the maths', async () => {
  const { snippet } = await load('answers.ts');
  assert.equal(snippet('Consider $4 \\times 4$ matrices with $n \\ge 1$.'), 'Consider 4 × 4 matrices with n ≥ 1.');
  const { snippet: insight } = await load('insights/format.ts');
  assert.equal(insight('For $n \\geq 1$, the maximum is $\\frac{n}{2}$.'), 'For n ≥ 1, the maximum is n/2.');
  // Set braces inside maths survive (they used to be stripped with markup).
  assert.equal(insight('Suppose $A=\\{a, b\\}$ and $\\Pi_1=\\{\\{a\\}, \\{b\\}\\}$.'), 'Suppose A={a, b} and Π₁={{a}, {b}}.');
});

// Listen (read aloud) says maths in words instead of spelling symbols.
test('maths is read aloud as words', async () => {
  const { texToSpeech, symbolsToSpeech } = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'components', 'reader', 'speech.ts')).href);
  const cases = [
    ['p \\to q', 'p implies q'],
    ['p \\leftrightarrow q', 'p if and only if q'],
    ['\\neg(p \\land q) \\equiv \\neg p \\lor \\neg q', 'not p and q is equivalent to not p or not q'],
    ['x \\in S', 'x in S'],
    ['n^2', 'n squared'],
    ['2^{n}', '2 to the power n'],
    ['a_{i}', 'a sub i'],
    ['\\frac{n}{2}', 'n over 2'],
    ['n \\ge 1', 'n is at least 1'],
  ];
  for (const [tex, want] of cases) assert.equal(texToSpeech(tex), want, tex);
  assert.equal(symbolsToSpeech('Biconditional (↔) and XOR (⊕)'), 'Biconditional ( if and only if ) and XOR ( x-or )'.replace(/\s+/g, ' '));
});
