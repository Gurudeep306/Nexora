// Insertion sort on a list: dummy-headed sorted result, detach + scan + splice.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[1 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

const dummy = { v: 0, next: null };
let cur = head;
while (cur) {
  const nxt = cur.next; // save before cur leaves the input
  let p = dummy;
  while (p.next && p.next.v < cur.v) p = p.next; // strict < keeps it stable
  cur.next = p.next; // splice: two writes
  p.next = cur;
  cur = nxt;
}

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
