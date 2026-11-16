// Dry run for C++: the student's program is instrumented (tree-sitter),
// compiled and run unchanged otherwise; its events become the same pictures
// as Python's — arrays with pointers, linked lists, trees, recursion, crashes.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { instrumentCpp } = require('../src/dryrun/cpp');
const { parseTrace, dryRun } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

async function trace(code, input = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-cpp-'));
  try {
    const { code: out } = await instrumentCpp(code);
    fs.writeFileSync(path.join(dir, 'main.cpp'), out);
    const c = spawnSync('g++', ['-std=c++20', '-O1', '-o', path.join(dir, 'main'), path.join(dir, 'main.cpp')], { encoding: 'utf8' });
    assert.equal(c.status, 0, c.stderr);
    const r = spawnSync(path.join(dir, 'main'), [], { input, encoding: 'utf8' });
    const { events } = parseTrace(r.stderr);
    setLanguage('cpp');
    return { events, frames: toFrames(replay(events), code, r.stdout), stdout: r.stdout, status: r.status };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`) || s.id === id));

const BUBBLE = `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    for (int i = 0; i < n; i++)
        for (int j = 0; j + 1 < n - i; j++)
            if (a[j] > a[j + 1]) swap(a[j], a[j + 1]);
    for (int x : a) cout << x << ' ';
}
`;

test('C++ bubble sort: the vector, j and j+1 under it, and the swap on the right boxes', async () => {
  const { frames, stdout } = await trace(BUBBLE, '3\n3 1 2\n');
  assert.equal(stdout, '1 2 3 ');
  const swap = frames.find((f) => f.line === 9 && Object.values(find(f, 'array', 'a')?.roles ?? {}).includes('swap'));
  assert.ok(swap, 'a swap step');
  const a = find(swap, 'array', 'a');
  assert.deepEqual(a.cells.map((c) => c.v), [1, 3, 2]);
  assert.deepEqual(a.pointers, { i: 0, j: 0, 'j+1': 1 }, 'j is still where the swap happened');
  assert.equal(a.roles[0], 'swap');
  // `vector<int> a(n);` is a variable (not a prototype), and a one-line body is one step per pass.
  const reads = frames.filter((f) => f.line === 6);
  assert.equal(reads.length, 4, 'the loop line once per pass (3) plus once when it ends');
});

test('C++ structs: a linked list built with new, reversed, rides head / prev / cur', async () => {
  const code = `#include <bits/stdc++.h>
using namespace std;
struct Node { int val; Node* next; Node(int v, Node* n) : val(v), next(n) {} };
int main() {
    Node* head = nullptr;
    for (int x : {3, 2, 1}) head = new Node(x, head);
    Node* prev = nullptr;
    Node* cur = head;
    while (cur) {
        Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    cout << prev->val;
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '3');
  const mid = frames.find((f) => f.line === 12 && find(f, 'list'));
  const list = find(mid, 'list');
  assert.ok(list.pointers.cur && list.pointers.prev, 'cur and prev ride on nodes');
  assert.doesNotMatch(list.label, /circular/, 'two walks meeting mid-reversal is not a loop');
  const names = frames.flatMap((f) => (f.kind === 'call' ? [f.note] : []));
  assert.ok(names.some((n) => /Call Node\(/.test(n)), 'the constructor is a call, named Node');
});

test('C++ recursion: a recursion tree with returned values; values read nullptr/true like C++', async () => {
  const code = `#include <iostream>
int fib(int k) {
    if (k < 2) return k;
    return fib(k - 1) + fib(k - 2);
}
int main() { int* p = nullptr; bool ok = true; printf("%d\\n", fib(3)); }
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '2\n');
  const last = frames[frames.length - 1];
  const t = find(last, 'tree', 'recursion');
  assert.deepEqual(t.nodes.map((n) => n.v).sort(), ['fib(0)', 'fib(1)', 'fib(1)', 'fib(2)', 'fib(3)']);
  assert.equal(t.nodes.find((n) => n.v === 'fib(3)').note, '= 2');
  // printf output is counted, so the output panel fills at the right step.
  assert.deepEqual(find(last, 'output').lines, ['2']);
});

test('C++ crashes stop on the line that crashed, with a plain reason', async () => {
  const code = `#include <bits/stdc++.h>
int main() {
    int z = 0;
    int x = 7;
    std::cout << x / z;
}
`;
  const { events, frames } = await trace(code);
  const exc = events.find((e) => e.e === 'exc');
  assert.equal(exc.l, 5);
  assert.match(exc.m, /division by zero/);
  assert.match(frames[frames.length - 1].note, /Line 5 stops with an error/);
});

test('C++ member functions see their fields (a DSU parent array inside find)', async () => {
  const code = `#include <bits/stdc++.h>
using namespace std;
struct DSU {
    vector<int> parent;
    DSU(int n) : parent(n) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }
};
int main() { DSU d(3); d.parent[0] = 1; cout << d.find(0); }
`;
  const { frames } = await trace(code);
  const inFind = frames.find((f) => f.line === 6 && find(f, 'array', 'parent'));
  assert.deepEqual(find(inFind, 'array', 'parent').cells.map((c) => c.v), [1, 1, 2]);
});

test('dry run: a C++ compile error is the student’s own message; our failure is said honestly', async () => {
  const calls = [];
  const fake = (verdicts) => async (code) => {
    calls.push(code);
    return verdicts.shift();
  };
  const own = await dryRun('int main() { return x; }', 'cpp', '', fake([{ verdict: 'CE', error: 'x was not declared' }, { verdict: 'CE', error: 'x was not declared' }]));
  assert.equal(own.verdict, 'CE');
  assert.match(own.error, /does not compile yet/);
  assert.match(own.stderr, /x was not declared/);
  assert.equal(calls[1], 'int main() { return x; }', 'the second run is the student’s own code');
  const ours = await dryRun('int main() {}', 'cpp', '', fake([{ verdict: 'CE', error: 'odd' }, { verdict: 'OK', ok: true, output: '' }]));
  assert.equal(ours.ok, false);
  assert.match(ours.error, /can't follow this program yet/);
});

test('C++ macros are expanded line for line, so rep(i, 0, n) is a real loop', async () => {
  const { expandMacros } = require('../src/dryrun/macros');
  const src = '#define rep(i, a, b) for (int i = (a); i < (b); i++)\n#define int long long\n#define S(x) #x\nint main() {\n  rep(i, 0,\n      3) x += i;\n  puts(S(int)); // int\n}\n';
  const out = expandMacros(src);
  assert.equal(out.split('\n').length, src.split('\n').length, 'every line stays on its line');
  assert.match(out, /for \(long long i = \(0\); i < \(3\); i\+\+\)\n x \+= i;/, 'the call spanned two lines, so a newline follows it');
  assert.match(out, /puts\("int"\); \/\/ int/, 'strings and comments are left alone');
  const { frames, stdout } = await trace('#include <bits/stdc++.h>\n#define rep(i, n) for (int i = 0; i < (n); i++)\nint main() {\n  int s = 0;\n  rep(i, 3) s += i;\n  std::cout << s;\n}\n');
  assert.equal(stdout, '3');
  assert.ok(frames.some((f) => f.line === 5 && /i/.test(JSON.stringify(f.structures))), 'the loop variable is seen');
});
