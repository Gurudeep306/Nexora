// Dry run for JavaScript and TypeScript: the student's program is
// instrumented (tree-sitter) without moving a line, run with node, and its
// events become the same pictures as Python's and C++'s.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { instrumentJs } = require('../src/dryrun/js');
const { parseTrace } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

async function trace(code, input = '', { typescript = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-js-'));
  try {
    const { code: out } = await instrumentJs(code, { typescript });
    const file = path.join(dir, typescript ? 'main.ts' : 'main.js');
    fs.writeFileSync(file, out);
    // Node runs TypeScript by stripping its types, as the judge's runners do.
    const r = spawnSync('node', typescript ? ['--experimental-strip-types', '--no-warnings', file] : [file], { input, encoding: 'utf8' });
    const { events, errors } = parseTrace(r.stderr);
    setLanguage(typescript ? 'typescript' : 'javascript');
    return { events, errors, frames: toFrames(replay(events), code, r.stdout), stdout: r.stdout, status: r.status, instrumented: out };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`) || s.id === id));

test('JS keeps every line where it was', async () => {
  const code = "const a = [3, 1];\nfunction f(x) {\n  return x + 1;\n}\nconsole.log(f(a[0]));\n";
  const { code: instrumented } = await instrumentJs(code);
  assert.equal(instrumented.split('\n').length, code.split('\n').length);
});

test('JS bubble sort: the array, j and j+1 under it, and the swap on the right boxes', async () => {
  const code = `const a = [3, 1, 2];
const n = a.length;
for (let i = 0; i < n; i++) {
  for (let j = 0; j + 1 < n - i; j++) {
    if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]];
  }
}
console.log(a.join(' '));
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '1 2 3\n');
  const swap = frames.find((f) => f.line === 5 && Object.values(find(f, 'array', 'a')?.roles ?? {}).includes('swap'));
  assert.ok(swap, 'a swap step');
  const a = find(swap, 'array', 'a');
  assert.deepEqual(a.cells.map((c) => c.v), [1, 3, 2]);
  assert.deepEqual(a.pointers, { j: 0, 'j+1': 1 }, 'j is still where the swap happened');
});

test('JS classes: a linked list reversed rides head / prev / cur; the constructor is a call', async () => {
  const code = `class Node {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}
let head = null;
for (const x of [1, 2, 3]) head = new Node(x, head);
let prev = null, cur = head;
while (cur) {
  const nxt = cur.next;
  cur.next = prev;
  prev = cur;
  cur = nxt;
}
console.log(prev.val);
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '1\n');
  const mid = frames.find((f) => f.line === 13 && find(f, 'list'));
  const list = find(mid, 'list');
  assert.ok(list.pointers.cur && list.pointers.prev, 'cur and prev ride on nodes');
  assert.ok(frames.some((f) => f.kind === 'call' && /^Call Node\(/.test(f.note)), 'the constructor is a call named Node');
});

test('JS recursion: a recursion tree with returned values; a call shows only its own arguments', async () => {
  const code = `const data = [3];
function fib(k) {
  if (k < 2) return k;
  return fib(k - 1) + fib(k - 2);
}
console.log(fib(data[0]));
`;
  const { frames, events, stdout } = await trace(code);
  assert.equal(stdout, '2\n');
  const t = find(frames[frames.length - 1], 'tree', 'recursion');
  assert.deepEqual(t.nodes.map((n) => n.v).sort(), ['fib(0)', 'fib(1)', 'fib(1)', 'fib(2)', 'fib(3)']);
  assert.equal(t.nodes.find((n) => n.v === 'fib(3)').note, '= 2');
  const call = events.find((e) => e.e === 'call' && e.f === 'fib');
  assert.deepEqual(Object.keys(call.v), ['k'], 'the outer data array is not an argument');
});

test('JS Map and plain-object counters are maps; a 2D array is a grid; an object of functions is left out', async () => {
  const code = `const fs = { readFileSync: () => '' };
const freq = new Map();
const cnt = {};
for (const x of [5, 1, 5]) {
  freq.set(x, (freq.get(x) || 0) + 1);
  cnt[x] = (cnt[x] || 0) + 1;
}
const dp = [[0, 0], [0, 0]];
for (let i = 1; i < 2; i++) dp[i][1] = dp[i - 1][1] + 1;
console.log(freq.get(5), cnt[5], dp[1][1]);
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '2 2 1\n');
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'map', 'freq').entries.map((e) => [e.k, e.v]), [[5, 2], [1, 1]]);
  assert.deepEqual(find(last, 'map', 'cnt').entries.map((e) => [e.k, e.v]), [[1, 1], [5, 2]], 'numeric keys are numbers');
  assert.deepEqual(find(last, 'grid', 'dp').rows, [[0, 0], [0, 1]]);
  assert.ok(!last.structures.some((s) => s.id.endsWith(':fs')), 'an API object is not drawn');
});

test('JS BFS: the queue (shift/push), dist array, and u / v on the graph', async () => {
  const code = `const adj = [[1, 2], [3], [3], []];
const dist = [0, -1, -1, -1];
const queue = [0];
while (queue.length) {
  const u = queue.shift();
  for (const v of adj[u]) {
    if (dist[v] === -1) {
      dist[v] = dist[u] + 1;
      queue.push(v);
    }
  }
}
console.log(dist.join(','));
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '0,1,1,2\n');
  const step = frames.find((f) => f.line === 8 && find(f, 'graph'));
  assert.ok(step, 'adj is drawn as a graph');
  assert.ok(find(step, 'graph').pointers.u !== undefined);
  assert.ok(frames.some((f) => f.structures.some((s) => s.id.endsWith(':queue'))), 'the queue is drawn');
});

test('JS errors stop on the line that failed, with the real message, as the last step', async () => {
  const code = `const lines = ['3'];
function main() {
  const n = Number(lines[0]);
  const obj = null;
  return obj.size + n;
}
main();
`;
  const { events, frames, status } = await trace(code);
  assert.equal(status, 1);
  const exc = events.find((e) => e.e === 'exc');
  assert.equal(exc.l, 5);
  assert.match(exc.m, /^TypeError: Cannot read properties of null/);
  assert.equal(events.filter((e) => e.e === 'exc').length, 1, 'reported once');
  assert.ok(!events.slice(events.indexOf(exc) + 1).some((e) => e.e === 'line'), 'no step after the error');
  assert.ok(frames.some((f) => /Line 5 stops with an error/.test(f.note)));
});

test('JS readline programs: the close handler runs as its own call; input helpers are not traced', async () => {
  const code = `const rl = require('readline').createInterface({ input: process.stdin });
const lines = [];
rl.on('line', (l) => {
  lines.push(l);
});
rl.on('close', () => {
  let s = 0;
  for (const x of lines[1].split(' ')) s += Number(x);
  console.log(s);
});
`;
  const { events, stdout } = await trace(code, '2\n4 5\n');
  assert.equal(stdout, '9\n');
  assert.ok(events.some((e) => e.e === 'call' && e.f === "on('close')"));
  assert.ok(events.some((e) => e.e === 'line' && e.l === 8 && e.v && e.v.s !== undefined));
  assert.ok(!events.some((e) => e.e === 'call' && /line/.test(e.f)), 'the per-line reader is not traced');
});

test('JS labeled loops keep their label on the loop (continue outer still works)', async () => {
  const code = `let hits = 0;
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    hits++;
  }
}
console.log(hits);
`;
  const { stdout, status } = await trace(code);
  assert.equal(status, 0);
  assert.equal(stdout, '3\n');
});

test('TypeScript keeps its types and traces the same way (a class with fields, a typed recursion)', async () => {
  const code = `interface Item { v: number }
class Stack<T> {
  private items: T[] = [];
  push(x: T): void {
    this.items.push(x);
  }
}
function sum(xs: number[], i: number = 0): number {
  if (i === xs.length) return 0;
  return xs[i]! + sum(xs, i + 1);
}
const st = new Stack<number>();
st.push(4);
const it: Item = { v: sum([1, 2, 3]) };
console.log(it.v);
`;
  const { frames, events, stdout } = await trace(code, '', { typescript: true });
  assert.equal(stdout, '6\n');
  // Inside push, the field items is shown as the method's own array.
  const inPush = frames.find((f) => f.line === 5 && find(f, 'array', 'items'));
  assert.ok(inPush, 'this.items is drawn inside push');
  const t = find(frames[frames.length - 1], 'tree', 'recursion');
  assert.ok(t.nodes.some((n) => n.note === '= 6'));
  assert.ok(events.some((e) => e.e === 'ret'));
});

test('JS sort: each comparison shows its two values and its answer; only the first 40 are drawn', async () => {
  const code = `const a = [5, 2, 9, 1];
a.sort((x, y) => x - y);
const big = Array.from({ length: 200 }, (_, i) => (i * 37) % 200);
big.sort(function (p, q) {
  return p - q;
});
console.log(a.join(' '), big[0], big[199]);
`;
  const { events, frames, stdout } = await trace(code);
  assert.equal(stdout, '1 2 5 9 0 199\n', 'sorting still works');
  const first = events.find((e) => e.e === 'call' && e.f === 'compare');
  assert.ok(first, 'a comparison is a call');
  assert.deepEqual(Object.keys(first.v), ['x', 'y']);
  const ret = events.find((e) => e.e === 'ret' && e.k === first.k);
  assert.equal(ret.r, first.v.x - first.v.y, 'it returns what the comparator answered');
  const bigCalls = events.filter((e) => e.e === 'call' && e.f === 'compare' && e.l === 4);
  assert.equal(bigCalls.length, 40, 'a big sort draws its first 40 comparisons only');
  assert.ok(frames.some((f) => /compare returns/.test(f.note)), 'the step says what it returned');
});

test('JS async: an await steps off the call stack and back; lines stay in the order they ran', async () => {
  const code = `const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function load(n) {
  const got = [];
  for (let i = 0; i < n; i++) {
    await wait(1);
    got.push(i * i);
  }
  return got;
}
async function main() {
  const first = await load(3);
  console.log(first.reduce((s, x) => s + x, 0));
}
main();
console.log('started');
`;
  const { events, frames, stdout } = await trace(code);
  assert.equal(stdout, 'started\n5\n');
  assert.ok(events.some((e) => e.e === 'call' && e.f === 'load'), 'the async function is a call');
  const order = events.filter((e) => e.e === 'line' && [5, 6, 15].includes(e.l)).map((e) => e.l);
  assert.equal(order.indexOf(15) < order.indexOf(6), true, "'started' prints before load resumes");
  const top = frames.find((f) => f.line === 15);
  assert.ok(!top.structures.some((s) => s.kind === 'vars' && /in load/.test(s.label)), 'while the top level runs, load (waiting) is not the running call');
  const back = frames.find((f) => f.line === 6);
  assert.ok(back.structures.some((s) => s.kind === 'vars' && /in load/.test(s.label)), 'after the await, load runs again');
  const loadRet = events.find((e) => e.e === 'ret' && events.find((c) => c.e === 'call' && c.f === 'load' && c.k === e.k));
  assert.deepEqual(loadRet.r.i, [0, 1, 4], 'and returns its list');
});

test('JavaScript: a vector of 100 is drawn in part and says "first 40 of 100"', async () => {
  const { frames } = await trace('const a = Array.from({ length: 100 }, (_, i) => i);\nconsole.log(a.length);\n');
  const arr = [...frames].reverse().map((f) => find(f, 'array', 'a')).find(Boolean);
  assert.ok(arr, 'the array is drawn');
  assert.equal(arr.cells.length, 40);
  assert.match(arr.label, /first 40 of 100/);
});
