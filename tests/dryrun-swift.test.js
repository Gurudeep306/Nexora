// Dry run for Swift: the student's program is instrumented (tree-sitter) and
// run on the remote judges (there is no swiftc here or in CI). These tests
// check the shape of the instrumented code, and replay traces recorded from a
// real run on Compiler Explorer (tests/fixtures/dryrun-swift-*.json).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { instrumentSwift } = require('../src/dryrun/swift');
const { parseTrace, supported } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `dryrun-swift-${name}.json`), 'utf8'));
function frames(name) {
  const fx = fixture(name);
  const { events } = parseTrace(fx.stderr);
  setLanguage('swift');
  return { events, frames: toFrames(replay(events), fx.code, fx.stdout) };
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`)));
const program = (code) => instrumentSwift(code).then((r) => r.code.split('/* NexoraGuru')[0]);

test('Swift is a dry-run language', () => {
  assert.equal(supported('swift'), true);
});

test('every line stays where it was; functions get a frame closed by defer; top-level code is "main"', async () => {
  const code = fixture('collections').code;
  const out = await program(code);
  const lines = code.split('\n');
  const outLines = out.split('\n');
  for (const [i, line] of lines.entries()) {
    const t = line.trim();
    if (t) assert.ok(outLines[i].includes(t.split(/\s+/)[0]), `line ${i + 1} stays on line ${i + 1}`);
  }
  assert.match(out, /func reverse\(_ head: Node\?\) -> Node\? \{ let __nx_f = __Nx\.call\("reverse", 9, .*\); defer \{ __nx_f\.end\(.*\); __nx_f\.exit\(\) \};/);
  assert.match(out, /let __nx_f = __Nx\.call\("main", 21, nil\); __nx_f\.at\(21, nil\); var st/);
  assert.match(out, /__nx_f\.exit\(\)\n*$/, 'main ends after the last top-level statement');
  assert.doesNotMatch(out, /call\("init"/, 'init is not traced (self is not ready to read)');
});

test('an implicit return is wrapped; an if / switch that returns from its branches is left a statement', async () => {
  const out = await program([
    'func sq(_ x: Int) -> Int { x * x }',
    'func pick(_ c: Bool) -> Int { if c { 1 } else { 2 } }',
    'func name(_ v: Int) -> String {',
    '    switch v {',
    '    case 0: return "zero"',
    '    default: return "other"',
    '    }',
    '}',
    'print(sq(3), pick(true), name(0))',
    '',
  ].join('\n'));
  assert.match(out, /return __nx_f\.ret\(x \* x, /);
  assert.match(out, /__nx_f\.at\(2, .*\); return if c \{ 1 \} else \{ 2 \}/, 'branches of an if expression stay single expressions');
  assert.match(out, /__nx_f\.at\(4, .*\); switch v/);
  assert.match(out, /case 0: __nx_f\.at\(5, .*\); return __nx_f\.ret\("zero", /);
  assert.doesNotMatch(out, /return switch/);
});

test('if let / guard let / while let bindings, unset lets, labels and loop ends', async () => {
  const out = await program([
    'func f(_ o: Int?) -> Int {',
    '    let t: Int',
    '    t = 2',
    '    guard let y = o else { return 0 }',
    '    var s = 0',
    '    outer: for a in 0..<2 { if a > t { break outer }; s += a }',
    '    return y + s',
    '}',
    'print(f(1))',
    '',
  ].join('\n'));
  assert.match(out, /__nx_f\.at\(3, __Nx\.on \? __Nx\.v\("o", o as Any\) : nil\); t = 2/, 't is not read before it is set');
  assert.match(out, /__nx_f\.at\(5, __Nx\.on \? __Nx\.v\("o", o as Any, "t", t as Any, "y", y as Any\) : nil\); var s/, 'y is readable after the guard');
  assert.match(out, /__nx_f\.at\(6, .*\); outer: for a in 0\.\.<2 \{ __nx_f\.head\(/, 'the step goes before the label');
  assert.match(out, /s \+= a ; __nx_f\.tail\(6, .*"a", a as Any\) : nil\) \}/, 'the end of a pass is sent before the next one');
});

test('recorded Swift bubble sort: the array, j and j+1 under it, and the sorted result', () => {
  const { frames: fr, events } = frames('bubble');
  assert.ok(fr.some((f) => find(f, 'array', 'a')?.cells.map((c) => c.v).join() === '1,5,4,2,8'), 'the first swap is drawn');
  const sorted = fr.filter((f) => find(f, 'array', 'a')).pop();
  assert.deepEqual(find(sorted, 'array', 'a').cells.map((c) => c.v), [1, 2, 4, 5, 8]);
  assert.ok(fr.some((f) => find(f, 'array', 'a')?.pointers?.j !== undefined), 'j points into the array');
  assert.equal(events[events.length - 1].o, '1 2 4 5 8\n'.length, 'print output is counted');
});

test('recorded Swift collections: stack, queue, dictionary, linked list, grid and recursion', () => {
  const { frames: fr } = frames('collections');
  const kinds = new Set(fr.flatMap((f) => f.structures.map((s) => s.kind)));
  for (const k of ['stack', 'queue', 'map', 'list', 'grid', 'tree']) assert.ok(kinds.has(k), `${k} is drawn`);
  const list = fr.map((f) => find(f, 'list')).filter(Boolean).pop();
  assert.deepEqual(list.nodes.map((n) => n.v), [3, 2, 1], 'the reversed list (built 1→2→3)');
  const calls = fr[fr.length - 1].structures.find((s) => s.id === 'recursion');
  assert.ok(calls.nodes.some((n) => n.v === 'fib(6)'));
});

test('Swift: a list of 100 (recorded from a real run) is drawn in part and says "first 40 of 100"', () => {
  const { frames: fr } = frames('big');
  const arr = [...fr].reverse().map((f) => find(f, 'array', 'a')).find(Boolean);
  assert.ok(arr, 'the array is drawn');
  assert.equal(arr.cells.length, 40);
  assert.match(arr.label, /first 40 of 100/);
});
