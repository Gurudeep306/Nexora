// "How your code runs": the translation listing is trimmed to the student's
// own lines, labelled, and honest about languages it cannot show.
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/explain-run');

const asm = [
  { text: 'sq(int):', source: null },
  { text: '        imul    edi, edi', source: { line: 3, file: null } },
  { text: '        ret', source: { line: 4, file: null } },
  { text: 'std::vector<int>::size():', source: null },
  { text: '        mov     rax, 1', source: { line: 900, file: '/usr/include/c++/vector' } },
  { text: '        PCDATA  $0, $-2', source: { line: 3, file: null } },
  { text: '.LBB0_2:', source: null },
  { text: 'main:', source: null },
  { text: '        xor     eax, eax', source: { line: 6, file: null } },
];

test('the listing keeps only the student\'s own instructions, under their labels', () => {
  const { lines, mapped, truncated } = E.trimListing(asm, 6);
  assert.equal(mapped, true);
  assert.equal(truncated, false);
  assert.deepEqual(lines, [
    { text: 'sq(int):', line: null, label: true },
    { text: '        imul    edi, edi', line: 3 },
    { text: '        ret', line: 4 },
    { text: 'main:', line: null, label: true },
    { text: '        xor     eax, eax', line: 6 },
  ]);
});

test('a listing with no line links is kept as it is', () => {
  const { lines, mapped } = E.trimListing([{ text: 'PASCALMAIN:' }, { text: '        ret' }], 3);
  assert.equal(mapped, false);
  assert.equal(lines.length, 2);
});

test('every language says what it turns into and what runs it', () => {
  assert.deepEqual(E.plan('cpp'), { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU', listing: true, canToggleOpt: true });
  assert.equal(E.plan('java').kind, 'bytecode');
  assert.equal(E.plan('csharp').kind, 'jit');
  const js = E.plan('javascript');
  assert.equal(js.listing, false, 'no free source of V8 bytecode, so none is promised');
  assert.match(js.runner, /V8/);
  const { LANG_CONFIG } = require('../src/judge');
  for (const lang of Object.keys(LANG_CONFIG)) assert.ok(E.plan(lang).runner, `${lang} has a runner sentence`);
});

test('translate asks Compiler Explorer once, with the right flags, and caches it', async () => {
  const calls = [];
  const post = async (opts) => {
    calls.push(JSON.parse(opts.payload));
    return { ok: true, body: { code: 0, asm } };
  };
  const code = 'int sq(int x){\n\n  return x*x;\n}\n\nint main(){return 0;}';
  const a = await E.translate(code, 'cpp', { optimise: false, post });
  assert.equal(a.ok, true);
  assert.equal(calls[0].options.userArguments, '-O0 -std=c++20');
  assert.equal(calls[0].options.filters.execute, false);
  await E.translate(code, 'cpp', { optimise: false, post });
  assert.equal(calls.length, 1, 'cached');
  await E.translate(code, 'cpp', { optimise: true, post });
  assert.equal(calls[1].options.userArguments, '-O2 -std=c++20');
});

test('a compile error comes back as the compiler wrote it', async () => {
  const post = async () => ({ ok: true, body: { code: 1, asm: [{ text: '<Compilation failed>' }], stderr: [{ text: '<source>:2:3: error: expected \';\'' }] } });
  const r = await E.translate('int main(){ int x }', 'c', { post });
  assert.equal(r.ok, false);
  assert.match(r.compileError, /expected ';'/);
});

test('no listing is asked for when a language has none', async () => {
  let called = false;
  const r = await E.translate('console.log(1)', 'javascript', { post: async () => { called = true; } });
  assert.equal(called, false);
  assert.equal(r.ok, false);
  assert.equal(r.plan.listing, false);
});
