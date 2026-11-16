// Dry run for Go: the student's program is instrumented (tree-sitter),
// built with the Go compiler and run. It must print exactly what the plain
// program prints, and its events become the same pictures as the other
// languages: arrays with pointers, stacks, queues, maps, linked objects,
// recursion, and a panic stopped on its line.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { instrumentGo } = require('../src/dryrun/go');
const { parseTrace } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

const ENV = { ...process.env, GO111MODULE: 'off', GOFLAGS: '' };

function build(src, dir) {
  const f = path.join(dir, 'main.go');
  fs.writeFileSync(f, src);
  const c = spawnSync('go', ['build', '-o', path.join(dir, 'm'), f], { encoding: 'utf8', env: ENV });
  assert.equal(c.status, 0, c.stderr);
  return path.join(dir, 'm');
}

/** Runs the plain and the traced program; both must print the same. */
async function trace(code, input = '') {
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-go-'));
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-go-'));
  try {
    const plain = spawnSync(build(code, d1), [], { input, encoding: 'utf8' });
    const { code: out } = await instrumentGo(code);
    const r = spawnSync(build(out, d2), [], { input, encoding: 'utf8' });
    assert.equal(r.stdout, plain.stdout, 'tracing does not change the output');
    assert.equal(r.status, plain.status, 'tracing does not change the exit code');
    const { events } = parseTrace(r.stderr);
    setLanguage('go');
    return { events, frames: toFrames(replay(events), code, r.stdout), stdout: r.stdout, stderr: r.stderr };
  } finally {
    fs.rmSync(d1, { recursive: true, force: true });
    fs.rmSync(d2, { recursive: true, force: true });
  }
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`) || s.id === id));

test('Go bubble sort: the slice, j and j+1 under it, and the swap', async () => {
  const code = `package main

import "fmt"

func main() {
	a := []int{3, 1, 2}
	n := len(a)
	for i := 0; i < n; i++ {
		for j := 0; j+1 < n-i; j++ {
			if a[j] > a[j+1] {
				a[j], a[j+1] = a[j+1], a[j]
			}
		}
	}
	fmt.Println(a)
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '[1 2 3]\n');
  const swap = frames.find((f) => f.line === 11 && find(f, 'array', 'a')?.cells.map((c) => c.v).join() === '1,3,2');
  assert.ok(swap, 'the swap finishes on line 11');
  assert.deepEqual(find(swap, 'array', 'a').pointers, { j: 0, 'j+1': 1 });
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'output').lines, ['[1 2 3]']);
});

test('Go reads input through bufio and writes through a buffered writer: output is unchanged and counted', async () => {
  const code = `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()
	var n int
	fmt.Fscan(in, &n)
	s := 0
	for i := 1; i <= n; i++ {
		s += i
	}
	fmt.Fprintln(out, s)
}
`;
  const { frames, events, stdout } = await trace(code, '4\n');
  assert.equal(stdout, '10\n');
  assert.ok(!frames.some((f) => f.structures.some((s) => /Reader|Writer/.test(s.label ?? ''))), 'library objects are not drawn');
  assert.equal(events[events.length - 1].o, 3, 'the printed characters are counted');
});

test('Go stacks (append / slice off the end), queues (q[1:]) and maps are drawn as such', async () => {
  const code = `package main

import "fmt"

func main() {
	st := []byte{}
	for _, c := range "(()" {
		if c == '(' {
			st = append(st, byte(c))
		} else {
			st = st[:len(st)-1]
		}
	}
	q := []int{1}
	q = append(q, 2)
	q = q[1:]
	cnt := map[string]int{}
	cnt["b"]++
	cnt["a"] += 2
	fmt.Println(len(st), q, cnt)
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '1 [2] map[a:2 b:1]\n');
  const pushed = frames.find((f) => find(f, 'stack', 'st')?.items.length === 2);
  assert.deepEqual(find(pushed, 'stack', 'st').items.map((c) => c.v), ['(', '('], 'bytes are shown as characters');
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'queue', 'q').items.map((c) => c.v), [2]);
  assert.deepEqual(find(last, 'map', 'cnt').entries.map((e) => [e.k, e.v]), [['a', 2], ['b', 1]], 'a map is drawn sorted, not in Go’s random order');
});

test('Go pointers to structs: a reversed list named after its variables, a BST with a recursion tree', async () => {
  const code = `package main

import "fmt"

type ListNode struct {
	Val  int
	Next *ListNode
}

type Node struct {
	key         int
	left, right *Node
}

func insert(r *Node, k int) *Node {
	if r == nil {
		return &Node{key: k}
	}
	if k < r.key {
		r.left = insert(r.left, k)
	} else {
		r.right = insert(r.right, k)
	}
	return r
}

func main() {
	var head *ListNode
	for i := 3; i >= 1; i-- {
		head = &ListNode{Val: i, Next: head}
	}
	var prev *ListNode
	for cur := head; cur != nil; {
		nxt := cur.Next
		cur.Next = prev
		prev, cur = cur, nxt
	}
	var root *Node
	for _, k := range []int{5, 3, 8} {
		root = insert(root, k)
	}
	fmt.Println(prev.Val, root.left.key, root.right.key)
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '3 3 8\n');
  const list = frames.map((f) => find(f, 'list')).filter(Boolean).pop();
  assert.deepEqual(list.nodes.map((n) => n.v), [3, 2, 1], 'Val / Next are found whatever their case');
  const tree = frames.map((f) => find(f, 'tree')).filter((t) => t && /root|r$/.test(t.label)).pop();
  assert.ok(tree, 'the BST is drawn');
  assert.equal(tree.nodes.length, 3);
  assert.ok(frames.some((f) => f.kind === 'call' && /^Call insert\(/.test(f.note)), 'each insert is a call');
});

test('a Go panic stops on its line with Go’s own message; the program still crashes as before', async () => {
  const code = `package main

import "fmt"

func get(a []int, i int) int {
	return a[i]
}

func main() {
	a := []int{1, 2, 3}
	fmt.Println(get(a, 1))
	fmt.Println(get(a, 5))
}
`;
  const { frames, stdout, stderr } = await trace(code);
  assert.equal(stdout, '2\n');
  const exc = frames.find((f) => f.kind === 'exc');
  assert.equal(exc.line, 6);
  assert.match(exc.note, /index out of range \[5\] with length 3/);
  assert.match(stderr, /panic: runtime error/, 'the panic still reaches the program’s stderr');
});

test('closures, named results, generics, labels, type switches and container/heap all build and trace', async () => {
  const code = `package main

import (
	"container/heap"
	"fmt"
)

type IntHeap []int

func (h IntHeap) Len() int           { return len(h) }
func (h IntHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h IntHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *IntHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *IntHeap) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}

func divmod(a, b int) (q, r int) {
	q, r = a/b, a%b
	return
}

func Max[T int | float64](a, b T) T {
	if a > b {
		return a
	}
	return b
}

func kind(x any) string {
	switch v := x.(type) {
	case int:
		return fmt.Sprint("int ", v)
	default:
		return "other"
	}
}

func main() {
	var fib func(int) int
	fib = func(n int) int {
		if n < 2 {
			return n
		}
		return fib(n-1) + fib(n-2)
	}
	h := &IntHeap{5, 2, 8}
	heap.Init(h)
	heap.Push(h, 1)
	q, r := divmod(17, 5)
	t := 0
outer:
	for i := 0; i < 4; i++ {
		for j := 0; j < 4; j++ {
			if i*j > 3 {
				break outer
			}
			t += i * j
		}
	}
	fmt.Println(fib(6), heap.Pop(h), q, r, Max(2, 7), kind(3), t)
}
`;
  const { frames, events, stdout } = await trace(code);
  assert.equal(stdout, '8 1 3 2 7 int 3 8\n');
  assert.ok(!events.some((e) => e.e === 'call' && /^(Len|Less|Swap)$/.test(e.f)), 'sort / heap boilerplate is not traced');
  assert.ok(events.some((e) => e.e === 'call' && e.f === 'fib'), 'the closure is traced under its variable name');
  const last = frames[frames.length - 1];
  assert.ok(frames.some((f) => f.structures.some((s) => s.kind === 'tree' && /^h as a heap/.test(s.label))), 'the heap is drawn as a tree too');
  assert.ok(last);
});
