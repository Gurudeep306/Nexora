// Dry run for Rust: the student's program is instrumented (tree-sitter) and
// built with rustc. The tracer only reads a variable where the borrow checker
// allows it (not after a move, not while it is lent out as &mut, not before a
// `let x;` gets its value), so the traced copy builds wherever the program
// does. It must print exactly what the plain program prints.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { instrumentRust } = require('../src/dryrun/rust');
const { parseTrace } = require('../src/dryrun');

const DIR = path.join(__dirname, '..', 'client', 'src', 'components', 'solve', 'dryrun');
let replay, toFrames, setLanguage;
test.before(async () => {
  ({ replay, setLanguage } = await import(path.join(DIR, 'replay.ts')));
  ({ toFrames } = await import(path.join(DIR, 'toFrames.ts')));
});

function build(src, dir) {
  const f = path.join(dir, 'main.rs');
  fs.writeFileSync(f, src);
  const c = spawnSync('rustc', ['--edition', '2021', '-O', '-A', 'warnings', '-o', path.join(dir, 'm'), f], { encoding: 'utf8' });
  assert.equal(c.status, 0, c.stderr);
  return path.join(dir, 'm');
}

async function trace(code, input = '') {
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-rs-'));
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-rs-'));
  try {
    const plain = spawnSync(build(code, d1), [], { input, encoding: 'utf8' });
    const { code: out } = await instrumentRust(code);
    const r = spawnSync(build(out, d2), [], { input, encoding: 'utf8' });
    assert.equal(r.stdout, plain.stdout, 'tracing does not change the output');
    assert.equal(r.status, plain.status, 'tracing does not change the exit code');
    const { events } = parseTrace(r.stderr);
    setLanguage('rust');
    return { events, frames: toFrames(replay(events), code, r.stdout), stdout: r.stdout, stderr: r.stderr };
  } finally {
    fs.rmSync(d1, { recursive: true, force: true });
    fs.rmSync(d2, { recursive: true, force: true });
  }
}
const find = (frame, kind, id) => frame.structures.find((s) => s.kind === kind && (!id || s.id.endsWith(`:${id}`) || s.id === id));

test('Rust bubble sort: the vector, j and j+1 under it, and the swap', async () => {
  const code = `fn main() {
    let mut a = vec![3, 1, 2];
    let n = a.len();
    for i in 0..n {
        for j in 0..n - 1 - i {
            if a[j] > a[j + 1] {
                a.swap(j, j + 1);
            }
        }
    }
    println!("{:?}", a);
}
`;
  const { frames, stdout, events } = await trace(code);
  assert.equal(stdout, '[1, 2, 3]\n');
  const swap = frames.find((f) => f.line === 7 && find(f, 'array', 'a')?.cells.map((c) => c.v).join() === '1,3,2');
  assert.ok(swap, 'the swap finishes on line 7');
  assert.deepEqual(find(swap, 'array', 'a').pointers, { j: 0, 'j+1': 1 });
  assert.equal(events[events.length - 1].o, '[1, 2, 3]\n'.length, 'println! output is counted');
});

test('moves, &mut loans and unset lets are respected: the traced copy builds and runs', async () => {
  const code = `use std::collections::HashMap;
fn consume(v: Vec<i32>) -> usize { v.len() }
fn main() {
    let s = String::from("hi");
    let t = s;
    let v = vec![1, 2, 3];
    let n = consume(v);
    let mut m: HashMap<&str, i32> = HashMap::new();
    let e = m.entry("a").or_insert(0);
    *e += 5;
    let x;
    if n > 2 { x = 1; } else { x = 2; }
    let mut w = vec![1, 2];
    for y in w.iter_mut() { *y *= 10; }
    println!("{} {} {} {} {:?}", t, n, m["a"], x, w);
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, 'hi 3 5 1 [10, 20]\n');
  const last = frames[frames.length - 1];
  const vars = find(last, 'vars');
  assert.ok(!('s' in (vars?.vars ?? {})), 's was moved into t: it is not read again');
  assert.equal(vars.vars.t, 'hi');
});

test('Rust linked lists (Option<Box<…>>) and Rc<RefCell<…>> trees are drawn', async () => {
  const code = `use std::cell::RefCell;
use std::rc::Rc;
struct ListNode { val: i32, next: Option<Box<ListNode>> }
struct TreeNode { val: i32, left: Option<Rc<RefCell<TreeNode>>>, right: Option<Rc<RefCell<TreeNode>>> }
fn main() {
    let mut head = None;
    for v in (1..=3).rev() {
        head = Some(Box::new(ListNode { val: v, next: head }));
    }
    let leaf = Rc::new(RefCell::new(TreeNode { val: 1, left: None, right: None }));
    let root = Rc::new(RefCell::new(TreeNode { val: 2, left: Some(leaf.clone()), right: None }));
    let mut sum = 0;
    let mut p = &head;
    while let Some(node) = p {
        sum += node.val;
        p = &node.next;
    }
    println!("{} {}", sum, root.borrow().left.as_ref().unwrap().borrow().val);
}
`;
  const { frames, stdout } = await trace(code);
  assert.equal(stdout, '6 1\n');
  const list = frames.map((f) => find(f, 'list')).filter(Boolean).pop();
  assert.deepEqual(list.nodes.map((n) => n.v), [1, 2, 3]);
  const tree = frames.map((f) => find(f, 'tree')).filter(Boolean).pop();
  assert.ok(tree && tree.nodes.length === 2, 'the Rc<RefCell<TreeNode>> tree is drawn');
});

test('a Rust panic stops on its line with Rust’s own message; the program still fails as before', async () => {
  const code = `fn get(a: &[i32], i: usize) -> i32 {
    a[i]
}
fn main() {
    let a = vec![1, 2, 3];
    println!("{}", get(&a, 1));
    println!("{}", get(&a, 5));
}
`;
  const { frames, stdout, stderr } = await trace(code);
  assert.equal(stdout, '2\n');
  const exc = frames.find((f) => f.kind === 'exc');
  assert.equal(exc.line, 2);
  assert.match(exc.note, /index out of bounds: the len is 3 but the index is 5/);
  assert.match(stderr, /panicked at/, 'Rust still prints its own panic message');
});

test('BinaryHeap, VecDeque, HashMap and writeln! to a BufWriter', async () => {
  const code = `use std::collections::{BinaryHeap, HashMap, VecDeque};
use std::io::{self, BufWriter, Write};
fn main() {
    let out = io::stdout();
    let mut w = BufWriter::new(out.lock());
    let mut pq = BinaryHeap::new();
    for x in [5, 2, 8] { pq.push(x); }
    let mut q = VecDeque::new();
    q.push_back(1);
    q.push_back(2);
    q.pop_front();
    let mut cnt: HashMap<char, usize> = HashMap::new();
    for c in "aba".chars() { *cnt.entry(c).or_insert(0) += 1; }
    writeln!(w, "{} {:?} {}", pq.peek().unwrap(), q, cnt[&'a']).unwrap();
}
`;
  const { frames, stdout, events } = await trace(code);
  assert.equal(stdout, '8 [2] 2\n');
  const last = frames[frames.length - 1];
  assert.deepEqual(find(last, 'queue', 'q').items.map((c) => c.v), [2]);
  assert.deepEqual(find(last, 'map', 'cnt').entries.map((e) => [e.k, e.v]), [['a', 2], ['b', 1]]);
  assert.ok(frames.some((f) => f.structures.some((s) => s.kind === 'tree' && /^pq as a heap/.test(s.label))));
  assert.equal(events[events.length - 1].o, 8, 'writeln! output is counted');
  assert.ok(!frames.some((f) => f.structures.some((s) => s.kind === 'vars' && 'w' in s.vars)), 'the BufWriter is not drawn');
});
