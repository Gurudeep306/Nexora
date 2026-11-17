// Dry run for C: the student's program is instrumented (tree-sitter), with a
// type descriptor for each variable built from its declaration, compiled
// and run; its events become the same pictures as Python's and C++'s.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { instrumentC } = require('../src/dryrun/c');
const { parseTrace } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

async function trace(code, input = '', cc = 'cc') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-c-'));
  try {
    const { code: out } = await instrumentC(code);
    fs.writeFileSync(path.join(dir, 'main.c'), out);
    const c = spawnSync(cc, ['-std=c17', '-O1', '-o', path.join(dir, 'main'), path.join(dir, 'main.c'), '-lm'], { encoding: 'utf8' });
    assert.equal(c.status, 0, c.stderr);
    const r = spawnSync(path.join(dir, 'main'), [], { input, encoding: 'utf8' });
    const { events } = parseTrace(r.stderr);
    setLanguage('c');
    return { events, frames: toFrames(replay(events), code, r.stdout), stdout: r.stdout, status: r.status };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`) || s.id === id));

test('C bubble sort: the array (only the part in use), j and j+1 under it, the write on the right box', async () => {
  const code = `#include <stdio.h>
int a[1000];
int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++)
        for (int j = 0; j + 1 < n - i; j++)
            if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    return 0;
}
`;
  const { frames, stdout } = await trace(code, '3\n3 1 2\n');
  assert.equal(stdout, '1 2 3 ');
  const write = frames.find((f) => f.line === 9 && Object.values(find(f, 'array', 'a')?.roles ?? {}).includes('write'));
  const a = find(write, 'array', 'a');
  assert.deepEqual(a.cells.map((c) => c.v), [1, 1, 2], 'a[j] = a[j + 1] has just run');
  assert.deepEqual(a.pointers, { i: 0, j: 0, 'j+1': 1 });
  assert.match(a.label, /first 3 of 1000/, 'a big global array shows the part in use');
  // One-line loop bodies are one step per pass.
  assert.equal(frames.filter((f) => f.line === 6).length, 4);
});

test('C linked list from malloc, reversed: head / prev / cur ride on its nodes; a malloc’d int* is an array', async () => {
  const code = `#include <stdio.h>
#include <stdlib.h>
typedef struct Node { int val; struct Node *next; } Node;
int main(void) {
    int *vals = malloc(3 * sizeof(int));
    vals[0] = 1; vals[1] = 2; vals[2] = 3;
    Node *head = NULL;
    for (int i = 2; i >= 0; i--) { Node *n = malloc(sizeof(Node)); n->val = vals[i]; n->next = head; head = n; }
    Node *prev = NULL, *cur = head;
    while (cur) {
        Node *nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    printf("%d\\n", prev->val);
    return 0;
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '3\n');
  const mid = frames.find((f) => f.line === 13 && find(f, 'list'));
  const list = find(mid, 'list');
  assert.ok(list.pointers.cur && list.pointers.prev, 'cur and prev ride on nodes');
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'array', 'vals').cells.map((c) => c.v), [1, 2, 3]);
});

test('C recursion: a recursion tree with returned values; printf output is counted', async () => {
  const code = `#include <stdio.h>
long long fib(int k) {
    if (k < 2) return k;
    return fib(k - 1) + fib(k - 2);
}
int main(void) { printf("%lld\\n", fib(3)); return 0; }
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '2\n');
  const last = frames[frames.length - 1];
  const t = find(last, 'tree', 'recursion');
  assert.deepEqual(t.nodes.map((n) => n.v).sort(), ['fib(0)', 'fib(1)', 'fib(1)', 'fib(2)', 'fib(3)']);
  assert.equal(t.nodes.find((n) => n.v === 'fib(3)').note, '= 2');
  assert.deepEqual(find(last, 'output').lines, ['2']);
});

test('C 2D DP: a global grid shows the rows and columns in use; char arrays read as text', async () => {
  const code = `#include <stdio.h>
#include <string.h>
#define MAX(a, b) ((a) > (b) ? (a) : (b))
int dp[1005][1005];
char s[] = "abcb", t[] = "bcab";
int main(void) {
    int n = strlen(s), m = strlen(t);
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = s[i - 1] == t[j - 1] ? dp[i - 1][j - 1] + 1 : MAX(dp[i - 1][j], dp[i][j - 1]);
    printf("%d\\n", dp[n][m]);
    return 0;
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '3\n');
  const last = frames[frames.length - 1];
  const g = find(last, 'grid', 'dp');
  assert.deepEqual(g.rows, [[0, 0, 0, 0, 0], [0, 0, 0, 1, 1], [0, 1, 1, 1, 2], [0, 1, 2, 2, 2], [0, 1, 2, 2, 3]]);
  assert.deepEqual(find(last, 'array', 's').cells.map((c) => c.v), ['a', 'b', 'c', 'b']);
});

test('C crashes stop on the line that crashed, with a plain reason', async () => {
  const code = `#include <stdio.h>
int main(void) {
    int z = 0;
    int x = 7;
    printf("%d\\n", x / z);
    return 0;
}
`;
  const { events, frames } = await trace(code);
  const exc = events.find((e) => e.e === 'exc');
  assert.equal(exc.l, 5);
  assert.match(exc.m, /division by zero/);
  assert.match(frames[frames.length - 1].note, /Line 5 stops with an error/);
});

test('C structs, typedefs, array parameters and pointers built with calloc; GCC and Clang alike', async () => {
  const code = `#include <stdio.h>
#include <stdlib.h>
typedef struct { int x, y; unsigned flag : 3; } Point;
typedef struct TreeNode TreeNode;
struct TreeNode { int key; TreeNode *left, *right; };
TreeNode *insert(TreeNode *root, int key) {
    if (!root) { TreeNode *t = calloc(1, sizeof *t); t->key = key; return t; }
    if (key < root->key) root->left = insert(root->left, key);
    else root->right = insert(root->right, key);
    return root;
}
void fill(int a[], int n) { for (int i = 0; i < n; i++) a[i] = i * i; }
int main(void) {
    Point pts[2] = {{1, 2, 1}, {3, 4, 2}};
    int sq[4];
    fill(sq, 4);
    TreeNode *root = NULL;
    int keys[] = {5, 1, 8};
    for (int i = 0; i < 3; i++) root = insert(root, keys[i]);
    printf("%d %d %d\\n", pts[1].y, sq[3], root->right->key);
    return 0;
}
`;
  for (const cc of ['gcc', 'clang']) {
    const { frames, stdout } = await trace(code, '', cc);
    assert.equal(stdout, '4 9 8\n', cc);
    const last = frames[frames.length - 1];
    assert.deepEqual(find(last, 'array', 'pts').cells.map((c) => c.v), ['Point(x=1, y=2)', 'Point(x=3, y=4)'], cc);
    assert.deepEqual(find(last, 'array', 'sq').cells.map((c) => c.v), [0, 1, 4, 9], cc);
    assert.deepEqual(find(last, 'tree', 'tree').nodes.map((n) => n.v).sort(), [1, 5, 8], cc);
    const inFill = frames.find((f) => f.line === 12 && find(f, 'array', 'a'));
    assert.ok(inFill, `${cc}: inside fill, the parameter a[] is drawn as the caller's array`);
  }
});

test('C Learn solutions still print exactly the same answers when traced (one per topic)', async () => {
  const dir = path.join(__dirname, '..', 'src', 'learn', 'problems');
  for (const f of fs.readdirSync(dir).sort()) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).problems.find((x) => x.solutions && x.solutions.c && x.samples && x.samples[0]);
    if (!p) continue;
    const { stdout, events, status } = await trace(p.solutions.c, p.samples[0].input);
    assert.equal(status, 0, p.slug);
    assert.equal(stdout.replace(/\s+$/gm, '').trim(), String(p.samples[0].output).replace(/\s+$/gm, '').trim(), p.slug);
    assert.ok(events.length > 0, p.slug);
  }
});

test('C/C++ local arrays declared without a value show only the part the program has written', async () => {
  const code = '#include <stdio.h>\nint main(void) {\n    int n = 3;\n    int a[100];\n    for (int i = 0; i < n; i++) a[i] = 7 * (i + 1);\n    printf("%d\\n", a[2]);\n    return 0;\n}\n';
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '21\n');
  const declared = frames.find((f) => find(f, 'array', 'a'));
  assert.equal(find(declared, 'array', 'a').cells.length, 0, 'nothing written yet: no leftover memory drawn');
  const last = find(frames[frames.length - 1], 'array', 'a');
  assert.deepEqual(last.cells.map((c) => c.v), [7, 14, 21]);
  assert.match(last.label, /3 of 100 set/);
});

test('C pointers walked along an array ride its cells as &a[i]; a pointer used with [] stays an array', async () => {
  const code = `#include <stdio.h>
#include <stdlib.h>
int main(void) {
    int a[5] = {4, 8, 15, 16, 23};
    int *lo = a, *hi = a + 4;
    while (lo < hi) {
        int t = *lo; *lo = *hi; *hi = t;
        lo++; hi--;
    }
    int *b = malloc(3 * sizeof(int));
    for (int i = 0; i < 3; i++) b[i] = i * 10;
    int *q = b + 1;
    *q = 99;
    printf("%d %d %d\\n", a[0], a[4], b[1]);
    free(b);
    return 0;
}
`;
  const { frames, events, stdout } = await trace(code);
  assert.equal(stdout, '23 4 99\n');
  const first = events.find((e) => e.e === 'line' && e.v && e.v.lo);
  assert.deepEqual(first.v.lo, { t: 'at', a: 'a', i: 0 });
  assert.deepEqual(first.v.hi, { t: 'at', a: 'a', i: 4 });
  const swap = frames.find((f) => f.line === 7 && find(f, 'array', 'a')?.cells[0].v === 23);
  assert.ok(swap, 'the swap through *lo and *hi');
  assert.deepEqual(find(swap, 'array', 'a').pointers, { lo: 0, hi: 4 }, 'lo and hi under their cells');
  const vars = swap.structures.find((s) => s.kind === 'vars');
  assert.equal(vars.vars.lo, '&a[0]');
  const qStep = frames.find((f) => f.line === 12 && find(f, 'array', 'b'));
  assert.deepEqual(find(qStep, 'array', 'b').pointers, { q: 1 }, 'a pointer into a malloc block, named after b');
  assert.ok(Array.isArray(events.find((e) => e.e === 'line' && e.v && e.v.b)?.v.b.i), 'b (used with []) is still drawn as an array');
});
