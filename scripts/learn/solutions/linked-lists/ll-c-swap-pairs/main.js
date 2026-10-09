// Swap adjacent pairs by relinking NODES: dummy absorbs the head change.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[1 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

const dummy = { v: 0, next: null };
dummy.next = head;
let prev = dummy;
while (prev.next && prev.next.next) { // a full pair exists
  const a = prev.next;
  const b = a.next;
  a.next = b.next; // a adopts the rest
  b.next = a;      // b points back at a
  prev.next = b;   // chain enters the pair through b
  prev = a;        // a is the pair's new tail
}

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
