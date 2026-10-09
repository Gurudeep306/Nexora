// Merge K sorted lists: divide & conquer pairwise merge, O(N log K), relinking only.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
let idx = 0;

function readList(n) {
  const dummy = { v: 0, next: null };
  let tail = dummy;
  for (let i = 0; i < n; i++) {
    tail.next = { v: Number(data[idx++]), next: null };
    tail = tail.next;
  }
  return dummy.next;
}

function merge(a, b) {
  const dummy = { v: 0, next: null };
  let t = dummy;
  while (a && b) {
    if (a.v <= b.v) { t.next = a; a = a.next; }
    else            { t.next = b; b = b.next; }
    t = t.next;
  }
  t.next = a || b;
  return dummy.next;
}

const k = Number(data[idx++]);
let lists = [];
for (let i = 0; i < k; i++) {
  const ni = Number(data[idx++]);
  const h = readList(ni);
  if (h) lists.push(h);
}

// log K rounds; each round touches every node once -> O(N log K)
while (lists.length > 1) {
  const next = [];
  for (let i = 0; i < lists.length; i += 2) {
    next.push(i + 1 < lists.length ? merge(lists[i], lists[i + 1]) : lists[i]);
  }
  lists = next;
}

const head = lists.length ? lists[0] : null;
const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
