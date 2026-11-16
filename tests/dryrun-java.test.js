// Dry run for Java: the student's program is instrumented (tree-sitter),
// compiled with javac and run; its events become the same pictures as
// Python's — arrays with pointers, linked objects, recursion, exceptions.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { instrumentJava } = require('../src/dryrun/java');
const { parseTrace } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

async function trace(code, input = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-java-'));
  try {
    const { code: out } = await instrumentJava(code);
    fs.writeFileSync(path.join(dir, 'Main.java'), out);
    const c = spawnSync('javac', ['-nowarn', path.join(dir, 'Main.java')], { encoding: 'utf8' });
    assert.equal(c.status, 0, c.stderr);
    const r = spawnSync('java', ['-cp', dir, 'Main'], { input, encoding: 'utf8' });
    const { events } = parseTrace(r.stderr);
    setLanguage('java');
    return { events, frames: toFrames(replay(events), code, r.stdout), stdout: r.stdout };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`) || s.id === id));

test('Java bubble sort: the array, j and j+1 under it, and the swap on the right boxes', async () => {
  const code = `import java.util.*;
public class Main {
    public static void main(String[] args) {
        int[] a = {3, 1, 2};
        int n = a.length;
        for (int i = 0; i < n; i++)
            for (int j = 0; j + 1 < n - i; j++)
                if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
        System.out.println(Arrays.toString(a));
    }
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '[1, 2, 3]\n');
  const done = frames.find((f) => f.line === 8 && find(f, 'array', 'a')?.cells.map((c) => c.v).join() === '1,3,2');
  assert.ok(done, 'the swap finishes on line 8');
  assert.equal(find(done, 'array', 'a').pointers.j, 0, 'j is still where the swap happened');
  assert.ok(!find(frames[0], 'array', 'args'), "main's empty args is not drawn");
});

test('Java objects: a linked list reversed rides prev / cur; a BST insert has a recursion tree', async () => {
  const code = `public class Main {
    static class Node { int val; Node next; Node(int v, Node n) { val = v; next = n; } }
    static class T { int key; T left, right; T(int k) { key = k; } }
    static T insert(T root, int key) {
        if (root == null) return new T(key);
        if (key < root.key) root.left = insert(root.left, key);
        else root.right = insert(root.right, key);
        return root;
    }
    public static void main(String[] args) {
        Node head = null;
        for (int x : new int[]{3, 2, 1}) head = new Node(x, head);
        Node prev = null, cur = head;
        while (cur != null) { Node nxt = cur.next; cur.next = prev; prev = cur; cur = nxt; }
        T root = null;
        for (int x : new int[]{2, 1, 3}) root = insert(root, x);
        System.out.println(prev.val + " " + root.left.key);
    }
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '3 1\n');
  const mid = frames.find((f) => f.line === 14 && find(f, 'list')?.pointers?.prev);
  assert.ok(mid, 'prev rides on a node');
  const ins = frames.find((f) => find(f, 'tree', 'recursion')?.nodes.length >= 2);
  assert.match(find(ins, 'tree', 'recursion').nodes[0].v, /^insert\(/);
  const last = frames[frames.length - 1];
  assert.ok(find(last, 'tree'), 'the BST is drawn');
});

test('Java: an exception stops on its line with its message; strict Java still compiles', async () => {
  const code = `public class Main {
    static char grade(int s) { return s > 5 ? 'A' : 'B'; }
    public static void main(String[] args) {
        int total;
        total = 7;
        outer:
        for (int i = 0, j; i < 3; i = j) {
            for (j = i; j < 3; j++) if (j == 2) break outer;
        }
        System.out.println(grade(total));
        int[] small = new int[2];
        System.out.println(small[total]);
    }
}
`;
  const { events, frames, stdout } = await trace(code);
  assert.equal(stdout, 'A\n');
  const exc = events.find((e) => e.e === 'exc');
  assert.equal(exc.l, 12);
  assert.match(exc.m, /ArrayIndexOutOfBoundsException/);
  assert.match(frames[frames.length - 1].note, /Line 12 stops with an error/);
});

test('Java instance methods see their fields (a DSU parent array inside find)', async () => {
  const code = `public class Main {
    static class DSU {
        int[] parent = {1, 1, 2};
        int find(int x) { return parent[x] == x ? x : (parent[x] = find(parent[x])); }
    }
    public static void main(String[] args) { System.out.println(new DSU().find(0)); }
}
`;
  const { frames } = await trace(code);
  const inFind = frames.find((f) => f.line === 4 && find(f, 'array', 'parent'));
  assert.deepEqual(find(inFind, 'array', 'parent').cells.map((c) => c.v), [1, 1, 2]);
});
