/*
  Voice Phase 3, code by voice (lane C): spoken edits → exact code, no AI
  (docs/voice/BLUEPRINT.md §4.3, test set docs/voice/tests/code.json).
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { parseCode, expression } = require('../client/src/voice/code/parse.ts');
const { snippet, renameInCode, summarize, sayLine, opensBlock } = require('../client/src/voice/code/gen.ts');
const cases = require(path.join(__dirname, '..', 'docs', 'voice', 'tests', 'code.json')).cases;

test('code commands: the test set is understood (>= 95%), and questions are left alone', () => {
  assert.ok(cases.length >= 50, 'code cases never shrink');
  const misses = cases.filter((c) => JSON.stringify(parseCode(c.say)) !== JSON.stringify(c.expect));
  const rate = 1 - misses.length / cases.length;
  assert.ok(rate >= 0.95, `understood ${(rate * 100).toFixed(1)}%:\n${misses.map((m) => `  "${m.say}" → ${JSON.stringify(parseCode(m.say))}`).join('\n')}`);
  // A question or an approach must never edit code.
  for (const c of cases.filter((x) => x.expect === null)) assert.equal(parseCode(c.say), null, c.say);
});

test('spoken expressions become small, valid expressions or nothing', () => {
  assert.equal(expression('i plus 1'), 'i + 1');
  assert.equal(expression('arr of i greater than max'), 'arr[i] > max');
  assert.equal(expression('low less than or equal to high'), 'low <= high');
  assert.equal(expression('plus plus'), null);
  assert.equal(expression('sort the array then use two pointers'), null);
});

test('loops, checks and prints are written in the editor language', () => {
  const loop = { what: 'for', v: 'i', from: '0', to: 'n' };
  assert.deepEqual(snippet(loop, 'cpp').lines, ['for (int i = 0; i < n; i++) {', '\t', '}']);
  assert.deepEqual(snippet(loop, 'python').lines, ['for i in range(0, n):', '\tpass']);
  assert.deepEqual(snippet({ ...loop, inclusive: true }, 'python').lines[0], 'for i in range(0, n + 1):');
  assert.equal(snippet(loop, 'javascript').lines[0], 'for (let i = 0; i < n; i++) {');
  assert.equal(snippet(loop, 'go').lines[0], 'for i := 0; i < n; i++ {');
  assert.equal(snippet({ ...loop, inclusive: true }, 'rust').lines[0], 'for i in 0..=n {');
  assert.equal(snippet({ what: 'if', cond: 'a && !b' }, 'python').lines[0], 'if a and not b:');
  assert.equal(snippet({ what: 'print', expr: 'ans' }, 'java').lines[0], 'System.out.println(ans);');
  assert.equal(snippet({ what: 'print', expr: 'ans' }, 'cpp').lines[0], "cout << ans << '\\n';");
  assert.equal(snippet({ what: 'return', expr: 'x' }, 'python').lines[0], 'return x');
  assert.equal(snippet(loop, 'brainfuck'), null, 'an unknown language gets an honest no');
  assert.ok(opensBlock('for (int i = 0; i < n; i++) {', 'cpp'));
  assert.ok(opensBlock('    if x > 0:', 'python'));
});

test('rename skips strings, comments, fields and longer names, and refuses clashes', () => {
  const src = 'int i = 0; // i here\nstring s = "i";\nfor (int i = 0; i < n; i++) a.i = v[i] + idx;\n';
  const r = renameInCode(src, 'i', 'j', 'cpp');
  assert.equal(r.text, 'int j = 0; // i here\nstring s = "i";\nfor (int j = 0; j < n; j++) a.i = v[j] + idx;\n');
  assert.equal(r.count, 5);
  assert.equal(renameInCode('x = 1  # x\nprint(x)', 'x', 'y', 'python').text, 'y = 1  # x\nprint(y)');
  assert.equal(renameInCode('j = 1\ni = 2', 'i', 'j', 'python').clash, true);
});

test('code is described aloud: summary first, then lines in words', () => {
  const s = summarize('int solve(int n) {\n  for (int i=0;i<n;i++) {\n    for (int j=0;j<n;j++) {\n      if (a[i]>a[j]) c++;\n    }\n  }\n  return c;\n}', 'cpp');
  assert.match(s, /One function, solve/);
  assert.match(s, /Two loops, one is nested/);
  assert.match(s, /One if check/);
  assert.equal(summarize('   \n', 'cpp'), 'The editor is empty.');
  assert.equal(sayLine('  if (arr[mid] <= target) lo = mid + 1;'), 'if arr of mid less than or equal to target lo gets mid plus 1');
});
