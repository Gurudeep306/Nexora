// Dry run for Kotlin: the student's program is instrumented (tree-sitter) and
// run on the remote judges (there is no kotlinc here or in CI). These tests
// check the shape of the instrumented code, and replay traces recorded from a
// real run on the Kotlin Playground (tests/fixtures/dryrun-kotlin-*.json).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { instrumentKotlin } = require('../src/dryrun/kotlin');
const { parseTrace, supported } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `dryrun-kotlin-${name}.json`), 'utf8'));
function frames(name) {
  const fx = fixture(name);
  const { events } = parseTrace(fx.stderr);
  setLanguage('kotlin');
  return { events, frames: toFrames(replay(events), fx.code, fx.stdout) };
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`)));
const program = (code) => instrumentKotlin(code).then((r) => r.code.split('/* NexoraGuru')[0]);

test('Kotlin is a dry-run language', () => {
  assert.equal(supported('kotlin'), true);
});

test('every line stays where it was, and each function gets a frame', async () => {
  const code = fixture('collections').code;
  const out = await program(code);
  const lines = code.split('\n');
  const outLines = out.split('\n');
  for (const [i, line] of lines.entries()) {
    const t = line.trim();
    if (t) assert.ok(outLines[i].includes(t.split(/\s+/)[0]), `line ${i + 1} stays on line ${i + 1}`);
  }
  for (const fn of ['reverse', 'main']) assert.match(out, new RegExp(`val __nx_f = __Nx\\.call\\("${fn}"`));
  assert.match(out, /catch \(__nx_t: Throwable\) \{ __nx_f\.exc\(__nx_t\); throw __nx_t \}/);
});

test('a body on the next line stays the loop’s body (the grammar leaves it outside)', async () => {
  const out = await program('fun main() {\n    var s = 0\n    for (i in 0 until 3)\n        for (j in 0 until i)\n            s += j\n    println(s)\n}\n');
  // No step may sit between `for (…)` and its body: it would become the body.
  assert.doesNotMatch(out, /for \([^)]*\)\s*__nx_f\.at/);
  assert.match(out, /for \(i in 0 until 3\)\n\s*\{ __nx_f\.head\(.*"i", i\) else null\); /);
  assert.match(out, /s \+= j; __nx_f\.tail\(4, .*\}; __nx_f\.tail\(3, .*\}\n/);
});

test('`= expr` functions keep their inferred type; while loops step in their condition', async () => {
  const out = await program('fun sq(x: Int) = x * x\nfun main() {\n    var n = 3\n    while (n > 0) n--\n    println(sq(n))\n}\n');
  assert.match(out, /fun sq\(x: Int\) = __Nx\.call\("sq", 1, .*\)\.let \{ __nx_f -> try \{ __nx_f\.at\(1, .*\); __nx_f\.ret\(x \* x, /);
  assert.match(out, /while \(__nx_f\.tail\(4, .*\) && \(n > 0\)\)/);
});

test('labels, unset vals, returns, and what is not traced', async () => {
  const out = await program([
    'data class P(val x: Int)',
    'class C(val k: Int) { lateinit var s: String; val lazyOne by lazy { 1 }; override fun toString() = "C"; fun get(): Int { return k } }',
    'fun main() {',
    '    val t: Int',
    '    t = 2',
    '    outer@ for (a in 0 until 2) { if (a > t) break@outer }',
    '    System.out.println(C(t).get())',
    '}',
    '',
  ].join('\n'));
  assert.match(out, /__nx_f\.at\(6, .*\); outer@ for/, 'the step goes before the label');
  assert.match(out, /__nx_f\.at\(5, null\); t = 2/, 't is not read before it is set');
  assert.match(out, /__nx_f\.at\(6, if \(__Nx\.on\) arrayOf<Any\?>\("t", t\)/, 'and is read after');
  assert.match(out, /return __nx_f\.ret\(k, if \(__Nx\.on\) arrayOf<Any\?>\("k", k\) else null\)/, 'a class property is shown, lateinit and lazy ones are not');
  assert.doesNotMatch(out, /call\("toString"/);
  assert.match(out, /__Nx\.out\.println/, 'System.out output is counted');
});

test('recorded Kotlin bubble sort: the array, j and j+1 under it, and the swap', () => {
  const { frames: fr, events } = frames('bubble');
  assert.ok(fr.some((f) => find(f, 'array', 'a')?.cells.map((c) => c.v).join() === '1,5,4,2,8'), 'the first swap is drawn');
  const sorted = fr.filter((f) => find(f, 'array', 'a')).pop();
  assert.deepEqual(find(sorted, 'array', 'a').cells.map((c) => c.v), [1, 2, 4, 5, 8]);
  const swap = fr.find((f) => find(f, 'array', 'a')?.pointers?.j !== undefined);
  assert.ok(swap, 'j points into the array');
  assert.equal(events[events.length - 1].o, '1 2 4 5 8\n'.length, 'println output is counted');
});

test('recorded Kotlin collections: stack, queue, map, linked list, grid and recursion', () => {
  const { frames: fr } = frames('collections');
  const kinds = new Set(fr.flatMap((f) => f.structures.map((s) => s.kind)));
  for (const k of ['stack', 'queue', 'map', 'list', 'grid', 'tree']) assert.ok(kinds.has(k), `${k} is drawn`);
  const list = fr.map((f) => find(f, 'list')).filter(Boolean).pop();
  assert.deepEqual(list.nodes.map((n) => n.v), [3, 2, 1], 'the reversed list (built 1→2→3)');
  const calls = fr[fr.length - 1].structures.find((s) => s.id === 'recursion');
  assert.ok(calls.nodes.some((n) => n.v === 'fib(6)'));
});

test('Kotlin: a list of 100 (recorded from a real run) is drawn in part and says "first 40 of 100"', () => {
  const { frames: fr } = frames('big');
  const arr = [...fr].reverse().map((f) => find(f, 'array', 'a')).find(Boolean);
  assert.ok(arr, 'the array is drawn');
  assert.equal(arr.cells.length, 40);
  assert.match(arr.label, /first 40 of 100/);
});
