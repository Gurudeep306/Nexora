// Dry run for C#: the student's program is instrumented (tree-sitter) and run
// on the remote judges (there is no dotnet here or in CI). These tests check
// the shape of the instrumented code, and replay traces recorded from a real
// run on Compiler Explorer (tests/fixtures/dryrun-csharp-*.json) into frames.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { instrumentCSharp } = require('../src/dryrun/csharp');
const { parseTrace, supported } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `dryrun-csharp-${name}.json`), 'utf8'));
function frames(name) {
  const fx = fixture(name);
  const { events } = parseTrace(fx.stderr);
  setLanguage('csharp');
  return { events, frames: toFrames(replay(events), fx.code, fx.stdout) };
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`)));

test('C# is a dry-run language', () => {
  assert.equal(supported('csharp'), true);
});

test('the instrumented C# keeps every line where it was, and wraps each method in a frame', async () => {
  const code = fixture('collections').code;
  const { code: out } = await instrumentCSharp(code);
  const lines = code.split('\n');
  const outLines = out.split('\n');
  for (const [i, line] of lines.entries()) {
    const t = line.trim();
    if (t && !t.startsWith('using')) assert.ok(outLines[i].includes(t.split(/\s+/)[0]), `line ${i + 1} stays on line ${i + 1}`);
  }
  for (const fn of ['Fib', 'Reverse', 'Main']) assert.match(out, new RegExp(`__Nx\\.Call\\("${fn}"`));
  assert.match(out, /catch \(System\.Exception __nx_e\) when \(__nx_f\.Exc\(__nx_e\)\) \{ throw; \}/);
  assert.match(out, /class __Nx/, 'the runtime is included');
});

test('a for loop sends its end-of-pass step before the update, as a plain statement expression', async () => {
  const { code: out } = await instrumentCSharp('class P { static void Main() { int s = 0; for (int i = 0; i < 3; i++) s += i; System.Console.WriteLine(s); } }\n');
  assert.match(out, /; __nx_f\.Tail\([^;]*\), i\+\+\)/);
  assert.doesNotMatch(out, /\? i\+\+ : 0/);
});

test('top-level programs, local functions and => bodies are traced, on the lines they were written', async () => {
  const code = 'var list = new System.Collections.Generic.List<int> { 3, 1 };\nint Sq(int v) => v * v;\nSystem.Console.WriteLine(Sq(list[0]));\nclass P { public override string ToString() => "P"; static void Hi() => System.Console.Write(1); }\n';
  const { code: out } = await instrumentCSharp(code);
  assert.match(out, /__Nx\.Call\("main", 1/, 'the top-level program is one frame');
  assert.match(out, /int Sq\(int v\) \{ var __nx_f = __Nx\.Call\("Sq", 2[^\n]*return __nx_f\.Ret<int>\(\/\*=> \*\/ v \* v,/);
  assert.match(out, /static void Hi\(\) \{ var __nx_f = __Nx\.Call\("Hi", 4[^\n]*\/\*=> \*\/ System\.Console\.Write\(1\);/);
  assert.doesNotMatch(out, /Call\("ToString"/, 'ToString is called by the runtime, so it is not traced');
  assert.match(out.split('\n')[3], /^class P/, 'line 4 stays line 4');
});

test('recorded C# bubble sort: the array, j and j+1 under it, and the swap', () => {
  const { frames: fr, events } = frames('bubble');
  const swap = fr.find((f) => find(f, 'array', 'a')?.cells.map((c) => c.v).join() === '1,5,4,2,8');
  assert.ok(swap, 'the first swap is drawn');
  const sorted = fr.filter((f) => find(f, 'array', 'a')).pop();
  assert.deepEqual(find(sorted, 'array', 'a').cells.map((c) => c.v), [1, 2, 4, 5, 8]);
  assert.equal(events[events.length - 1].o, '1 2 4 5 8\n'.length, 'Console output is counted');
});

test('recorded C# collections: Stack, Queue, Dictionary, a linked list, a 2D array and recursion', () => {
  const { frames: fr } = frames('collections');
  const kinds = new Set(fr.flatMap((f) => f.structures.map((s) => s.kind)));
  for (const k of ['stack', 'queue', 'map', 'list', 'grid', 'tree']) assert.ok(kinds.has(k), `${k} is drawn`);
  const list = fr.map((f) => find(f, 'list')).filter(Boolean).pop();
  assert.deepEqual(list.nodes.map((n) => n.v), [3, 2, 1], 'the reversed list');
  const calls = fr[fr.length - 1].structures.find((s) => s.id === 'recursion');
  assert.ok(calls.nodes.some((n) => n.v === 'Fib(6)'));
});

test('C#: a list of 100 (recorded from a real run) is drawn in part and says "first 40 of 100"', () => {
  const { frames: fr } = frames('big');
  const arr = [...fr].reverse().map((f) => find(f, 'array', 'a')).find(Boolean);
  assert.ok(arr, 'the array is drawn');
  assert.equal(arr.cells.length, 40);
  assert.match(arr.label, /first 40 of 100/);
});
