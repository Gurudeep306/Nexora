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
  assert.match(swap.note, /a\[0\] ↔ a\[1\]/, "the note names the two boxes that swapped");
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

/* ── every kind of data structure, named as in the code ── */

test('a heapq list is drawn as the array and as the heap tree, named after the variable', () => {
  const frames = framesOf('import heapq\npq = []\nfor x in [5, 3, 8, 1]:\n    heapq.heappush(pq, x)\n');
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'array', 'pq').cells.map((c) => c.v), [1, 3, 8, 5]);
  const t = last.structures.find((s) => s.kind === 'tree' && s.id.endsWith(':pq:tree'));
  assert.ok(t, 'heap tree present');
  assert.match(t.label, /^pq as a heap \(top = 1\)/);
  assert.equal(t.nodes.length, 4);
  assert.equal(t.roots.length, 1);
});

test('a union-find parent array becomes a forest of sets', () => {
  const frames = framesOf('parent = list(range(4))\ndef find(x):\n    while parent[x] != x:\n        x = parent[x]\n    return x\nparent[find(1)] = find(0)\nparent[find(3)] = find(2)\n');
  const f = frames[frames.length - 1].structures.find((s) => s.id.endsWith(':forest'));
  assert.ok(f, 'forest present');
  assert.equal(f.roots.length, 2, 'two sets: {0,1} and {2,3}');
  assert.match(f.label, /^parent as sets/);
});

test('an adjacency matrix named like a graph is drawn as the grid and as the graph', () => {
  const frames = framesOf('graph = [[0, 1, 1], [1, 0, 0], [1, 0, 0]]\nx = 0\n');
  const last = frames[frames.length - 1];
  assert.ok(find(last, 'grid', 'graph'));
  const g = last.structures.find((s) => s.kind === 'graph');
  assert.equal(g.label, 'graph as a graph');
  assert.equal(g.edges.length, 2);
  assert.equal(g.directed, false);
});

test('a BFS queue of (node, distance) pairs is a queue, not a grid', () => {
  const frames = framesOf('from collections import deque\nq = deque([(0, 0)])\nq.append((1, 1))\nq.popleft()\n');
  const f = frames.find((x) => x.line === 3);
  const q = find(f, 'queue', 'q');
  assert.ok(q, 'queue present');
  assert.deepEqual(q.items.map((c) => c.v), ['(0, 0)', '(1, 1)']);
});

test('a trie is drawn with its letters on the edges and ● on word ends', () => {
  const code = 'class T:\n    def __init__(self):\n        self.children = {}\n        self.end = False\nroot = T()\nfor w in ["at", "an"]:\n    node = root\n    for ch in w:\n        if ch not in node.children:\n            node.children[ch] = T()\n        node = node.children[ch]\n    node.end = True\n';
  const frames = framesOf(code);
  const t = frames[frames.length - 1].structures.find((s) => s.kind === 'tree');
  assert.match(t.label, /^root \(trie/);
  const r = t.nodes.find((n) => n.id === t.roots[0]);
  assert.deepEqual(r.edgeLabels, ['a']);
  assert.equal(t.nodes.filter((n) => n.v === '●').length, 2);
});

test('graph objects with neighbors are drawn as a graph named after the variable', () => {
  const code = 'class G:\n    def __init__(self, v):\n        self.val = v\n        self.neighbors = []\na, b = G(1), G(2)\na.neighbors.append(b)\nb.neighbors.append(a)\nstart = a\n';
  const frames = framesOf(code);
  const g = frames[frames.length - 1].structures.find((s) => s.kind === 'graph');
  assert.ok(g, 'graph present');
  assert.equal(g.nodes.length, 2);
  assert.equal(g.directed, false);
});

test('the list and the tree are named after the code\'s variables; a circular list says so', () => {
  const frames = framesOf('class N:\n    def __init__(s, v):\n        s.val = v\n        s.next = None\nhead = N(1)\nhead.next = N(2)\nhead.next.next = head\n');
  const l = find(frames[frames.length - 1], 'list');
  assert.match(l.label, /^head \(circular/);
});

test('a sliding window is drawn as a band between its bounds', () => {
  const frames = framesOf('a = [1, 2, 3, 4]\nl, r = 0, 0\ns = 0\nwhile r < len(a):\n    s += a[r]\n    while s > 5:\n        s -= a[l]\n        l += 1\n    r += 1\n');
  const withBand = frames.map((f) => find(f, 'array', 'a')).find((a) => a && a.ranges && a.ranges.length);
  assert.ok(withBand, 'a window band appears');
  assert.equal(withBand.ranges[0].label, 'l … r');
});

test('a bitmask is shown in binary; objects show their fields', () => {
  const frames = framesOf('mask = 0\nmask |= 1 << 2\nclass P:\n    def __init__(s):\n        s.x = 1\n        s.y = 2\np = P()\n');
  const last = frames[frames.length - 1];
  const vars = find(last, 'vars');
  assert.equal(vars.vars.mask, '4 = 0b100');
  assert.equal(vars.vars.p, 'P(x=1, y=2)');
});

test('__slots__ node classes are traced like any other', () => {
  const frames = framesOf('class N:\n    __slots__ = ("val", "next")\n    def __init__(s, v):\n        s.val = v\n        s.next = None\nhead = N(7)\nhead.next = N(8)\n');
  const l = find(frames[frames.length - 1], 'list');
  assert.deepEqual(l.nodes.map((n) => n.v), [7, 8]);
});

test('recursion is drawn as a tree of calls, with returned values under each call', () => {
  const frames = framesOf('def fib(k):\n    if k < 2:\n        return k\n    return fib(k - 1) + fib(k - 2)\nprint(fib(3))\n');
  const last = frames[frames.length - 1];
  const t = find(last, 'tree', 'recursion');
  assert.equal(t.label, 'Recursion tree');
  assert.deepEqual(t.nodes.map((n) => n.v).sort(), ['fib(0)', 'fib(1)', 'fib(1)', 'fib(2)', 'fib(3)']);
  const root = t.nodes.find((n) => n.v === 'fib(3)');
  assert.equal(root.children.length, 2);
  assert.equal(root.note, '= 2');
  const mid = frames.find((f) => f.kind === 'call' && find(f, 'tree', 'recursion')?.nodes.length === 3);
  const running = find(mid, 'tree', 'recursion');
  assert.equal(Object.values(running.roles).filter((r) => r === 'active').length, 1, 'only the running call is lit');
  // A function that does not call itself gets no recursion tree.
  const plain = framesOf('def sq(x):\n    return x * x\nprint(sq(2) + sq(3))\n');
  assert.ok(plain.every((f) => !find(f, 'tree', 'recursion')));
});

test('a trie written as a dict of dicts is a tree; the walking variable rides on its node', () => {
  const frames = framesOf('trie = {}\nfor word in ["cat", "car"]:\n    node = trie\n    for ch in word:\n        node = node.setdefault(ch, {})\n    node["$"] = True\nx = 0\n');
  const last = frames[frames.length - 1];
  const t = find(last, 'tree', 'trie');
  assert.match(t.label, /ends a word/);
  const ids = t.nodes.map((n) => n.id.split(':').pop());
  for (const p of ['/c', '/c/a', '/c/a/t', '/c/a/r']) assert.ok(ids.includes(p), p);
  assert.equal(t.nodes.find((n) => n.id.endsWith('/c/a/r')).v, '●');
  const walk = frames.filter((f) => f.line === 5).map((f) => find(f, 'tree', 'trie')?.pointers?.node?.split(':').pop());
  assert.deepEqual(walk.slice(3, 6), ['/c', '/c/a', '/c/a/r'], 'node follows the second word, not the equal "cat" branch');
  assert.ok(!find(last, 'map', 'node'), 'node is a pointer, not its own table');
});

test('an "infinity" the code uses is drawn as ∞; a weight w is not a node pointer', () => {
  const frames = framesOf('INF = 10**9\ndist = [0, INF, INF]\nadj = [[(1, 2)], [(2, 1)], []]\nu, w = 0, 1\nx = 0\n');
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'array', 'dist').cells.map((c) => c.v), [0, '∞', '∞']);
  const g = find(last, 'graph');
  assert.deepEqual(g.pointers, { u: 'n0' });
  // Without an infinity in the code, a big number stays a number.
  const plain = framesOf('a = [1000000000, 2]\nx = 0\n');
  assert.equal(find(plain[plain.length - 1], 'array', 'a').cells[0].v, 1000000000);
});

test('a plain object (no links) draws its lists as themselves, named obj.field; a union-find p becomes a forest', () => {
  const code = 'class UF:\n    def __init__(self, n):\n        self.p = list(range(n))\n        self.count = n\n    def find(self, x):\n        return x if self.p[x] == x else self.find(self.p[x])\nuf = UF(4)\nuf.p[0] = 1\nuf.count -= 1\nprint(uf.find(0))\n';
  const frames = framesOf(code);
  const last = frames.filter((f) => f.line === 10)[0] ?? frames[frames.length - 1];
  const arr = last.structures.find((s) => s.kind === 'array' && s.label === 'uf.p');
  assert.ok(arr, 'uf.p is an array');
  assert.deepEqual(arr.cells.map((c) => c.v), [1, 1, 2, 3]);
  assert.ok(last.structures.some((s) => s.kind === 'tree' && /^uf\.p as sets/.test(s.label)), 'and a forest of sets');
  assert.equal(find(last, 'vars').vars['uf.count'], 3, 'its number is a card named uf.count');
});

test('the step note says exactly what changed in a list or a map', () => {
  const frames = framesOf('a = [4, 5]\na[1] = 9\na.append(7)\na.pop(0)\ncnt = {}\ncnt["x"] = 1\ncnt["x"] += 1\n');
  const note = (line) => frames.find((f) => f.line === line).note;
  assert.match(note(2), /a\[1\]: 5 → 9/);
  assert.match(note(3), /a gets 7/);
  assert.match(note(4), /a loses 4 from the front/);
  assert.match(note(6), /cnt\["x"\] = 1/);
  assert.match(note(7), /cnt\["x"\]: 1 → 2/);
});

/* ── anything drawn in part says so ("first k of N") ── */

test('a grid wider than it is drawn says how many columns', () => {
  const frames = framesOf('grid = [[0] * 30 for _ in range(3)]\ngrid[0][0] = 1\n');
  const g = find(frames[frames.length - 1], 'grid', 'grid');
  assert.equal(g.rows[0].length, 20);
  assert.match(g.label, /first 20 of 30 columns/);
  assert.doesNotMatch(g.label, /rows/, 'all 3 rows fit, so rows are not mentioned');
});

test('a long stack shows its top, a long queue its front, and each says so', () => {
  const st = find(framesOf('stack = []\nfor i in range(50):\n    stack.append(i)\nstack.pop()\n').at(-1), 'stack');
  assert.match(st.label, /top 40 of 49/);
  assert.equal(st.items.at(-1).v, 48, 'the top is drawn');
  const q = find(framesOf('from collections import deque\nq = deque(range(50))\nq.popleft()\n').at(-1), 'queue');
  assert.match(q.label, /first 40 of 49/);
  assert.equal(q.items[0].v, 1, 'the front is drawn');
});

const NODES = (n) => `class Node:\n    def __init__(s, v, n=None):\n        s.val = v\n        s.next = n\nhead = None\nfor i in range(${n}):\n    head = Node(i, head)\nprint(1)\n`;
test('a linked list of 20 is drawn whole (the tracer no longer stops 7 nodes deep)', () => {
  const l = find(framesOf(NODES(20)).at(-1), 'list');
  assert.equal(l.nodes.length, 20);
  assert.doesNotMatch(l.label, /first/);
});
test('a linked list longer than is drawn says how many nodes it has', () => {
  const l = find(framesOf(NODES(50)).at(-1), 'list');
  assert.equal(l.nodes.length, 30);
  assert.match(l.label, /first 30 of 50 nodes/);
});

test('heaps, union-find and edge lists drawn in part say so', () => {
  const heap = framesOf('import heapq\nh = list(range(50, 0, -1))\nheapq.heapify(h)\nprint(h[0])\n').at(-1).structures.find((s) => s.kind === 'tree');
  assert.match(heap.label, /first 31 of 50 items/);
  const uf = framesOf('parent = list(range(40))\nparent[3] = 1\nprint(1)\n').at(-1).structures.find((s) => s.kind === 'tree');
  assert.match(uf.label, /first 30 of 40 items/);
  const g = framesOf('edges = [(i, j) for i in range(12) for j in range(i + 1, 12)]\nprint(len(edges))\n').at(-1).structures.find((s) => s.kind === 'graph');
  assert.equal(g.edges.length, 60);
  assert.match(g.label, /first 60 of 66 edges/);
});

test('nothing that fits whole carries a "first k of N" note', () => {
  const f = framesOf('a = list(range(10))\nstack = [1, 2]\ngrid = [[1, 2], [3, 4]]\nprint(a)\n').at(-1);
  for (const s of f.structures) assert.doesNotMatch(s.label ?? '', /first|top \d+ of/, `${s.kind} ${s.label}`);
});
