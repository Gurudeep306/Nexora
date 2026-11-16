// Dry run, layer 2: real Python traces become the right pictures — arrays
// with pointers and gliding swaps, stacks, queues, maps, grids, graphs,
// linked lists, trees, the call stack, variable cards and the output.
// Runs the client's TypeScript directly (Node strips the types).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { wrapPython } = require('../src/dryrun/python');
const { parseTrace } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames;
test.before(async () => {
  ({ replay } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

function framesOf(code, input = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-dry-'));
  const file = path.join(dir, 'main.py');
  fs.writeFileSync(file, wrapPython(code));
  const r = spawnSync('python3', [file], { input, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  const { events } = parseTrace(r.stderr);
  return toFrames(replay(events), code, r.stdout);
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`) || s.id === id));

test('bubble sort: the array, its index pointers, compares and gliding swaps', () => {
  const code = 'a = [3, 1, 2]\nn = len(a)\nfor i in range(n):\n    for j in range(n - 1 - i):\n        if a[j] > a[j + 1]:\n            a[j], a[j + 1] = a[j + 1], a[j]\nprint(a)\n';
  const frames = framesOf(code);
  const cmp = frames.find((f) => f.line === 5);
  const arr = find(cmp, 'array', 'a');
  assert.deepEqual(arr.cells.map((c) => c.v), [3, 1, 2]);
  assert.deepEqual(arr.pointers, { j: 0, 'j+1': 1 });
  assert.equal(arr.roles[0], 'compare');
  assert.equal(arr.roles[1], 'compare');
  const swap = frames.find((f) => f.line === 6);
  const after = find(swap, 'array', 'a');
  assert.deepEqual(after.cells.map((c) => c.v), [1, 3, 2]);
  assert.equal(after.roles[0], 'swap');
  assert.equal(after.cells[1].id, arr.cells[0].id, 'the 3 keeps its id, so it glides');
  assert.match(swap.note, /two values swap/);
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'output').lines, ['[1, 2, 3]']);
});

test('variables show what they were before', () => {
  const frames = framesOf('s = 0\nfor x in [4, 5]:\n    s += x\n');
  const step = frames.filter((f) => f.line === 3)[1];
  const vars = find(step, 'vars');
  assert.equal(vars.vars.s, 9);
  assert.deepEqual(vars.changed, ['s']);
  assert.equal(vars.prev.s, 4);
  assert.match(step.note, /s: 4 → 9/);
});

test('a list used with append and pop() is a stack; popleft makes a queue', () => {
  const frames = framesOf('from collections import deque\nst = []\nst.append(1)\nst.append(2)\nst.pop()\nq = deque([1])\nq.append(2)\nq.popleft()\n');
  const f = frames.find((x) => x.line === 4);
  assert.deepEqual(find(f, 'stack', 'st').items.map((c) => c.v), [1, 2]);
  const g = frames.find((x) => x.line === 7);
  assert.deepEqual(find(g, 'queue', 'q').items.map((c) => c.v), [1, 2]);
});

test('a dict is a map that marks new and changed keys', () => {
  const frames = framesOf('cnt = {}\nfor ch in "aba":\n    cnt[ch] = cnt.get(ch, 0) + 1\n');
  const steps = frames.filter((f) => f.line === 3)
  const m3 = find(steps[2], 'map', 'cnt');
  assert.deepEqual(m3.entries.map((e) => [e.k, e.v]), [['a', 2], ['b', 1]]);
  assert.equal(Object.values(m3.roles)[0], 'write');
  assert.equal(Object.values(find(steps[1], 'map', 'cnt').roles)[0], 'new');
});

test('a 2D list is a grid; an adjacency list is a graph', () => {
  const frames = framesOf('dp = [[0] * 3 for _ in range(2)]\ni, j = 1, 2\ndp[i][j] = 5\nadj = [[1, 2], [0], [0]]\nx = 1\n');
  const f = frames.find((x) => x.line === 3);
  const g = find(f, 'grid', 'dp');
  assert.equal(g.rows[1][2], 5);
  assert.equal(g.roles['1,2'], 'write');
  const last = frames[frames.length - 1];
  const graph = find(last, 'graph', 'adj');
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.directed, false);
  assert.equal(graph.edges.length, 2);
});

test('nodes with next form a linked list; left/right form a tree', () => {
  const ll = framesOf('class N:\n    def __init__(s, v):\n        s.val = v\n        s.next = None\nhead = N(1)\nhead.next = N(2)\ncur = head.next\n');
  const list = find(ll[ll.length - 1], 'list');
  assert.deepEqual(list.nodes.map((n) => n.v), [1, 2]);
  assert.equal(list.nodes[0].next, list.nodes[1].id);
  assert.equal(list.pointers.cur, list.nodes[1].id);
  const tr = framesOf('class T:\n    def __init__(s, v):\n        s.val = v\n        s.left = s.right = None\nroot = T(2)\nroot.left = T(1)\nroot.right = T(3)\n');
  const tree = find(tr[tr.length - 1], 'tree');
  assert.equal(tree.roots.length, 1);
  assert.equal(tree.nodes.length, 3);
});

test('recursion shows the call stack and what each call returns', () => {
  const frames = framesOf('def f(n):\n    if n < 2:\n        return n\n    return f(n - 1) + f(n - 2)\nprint(f(3))\n');
  const deepest = frames.reduce((m, f) => Math.max(m, find(f, 'calls')?.frames.length ?? 0), 0);
  assert.equal(deepest, 4, 'main + f(3) + f(2) + f(1)');
  const ret = frames.find((f) => f.kind === 'ret');
  assert.match(ret.note, /^f returns 1\.$/);
  assert.equal(find(ret, 'calls').frames.at(-1).ret, '1');
  assert.ok(frames.some((f) => f.kind === 'call' && /^Call f\(n=3\)/.test(f.note)));
});

test('an error stops the animation on its line with the real message', () => {
  const frames = framesOf('a = [1, 2]\nprint(a[5])\n');
  const last = frames[frames.length - 1];
  assert.equal(last.kind, 'exc');
  assert.equal(last.line, 2);
  assert.match(last.note, /IndexError/);
});

test('huge lists are drawn in part and say so', () => {
  const frames = framesOf('a = list(range(100))\n');
  const arr = find(frames[frames.length - 1], 'array', 'a');
  assert.equal(arr.cells.length, 40);
  assert.match(arr.label, /first 40 of 100/);
});
