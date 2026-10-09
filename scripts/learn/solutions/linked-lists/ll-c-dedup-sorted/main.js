// Sorted-list dedup: adjacency replaces the seen-set; keep first occurrences.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[1 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

let cur = head;
while (cur && cur.next) {
  if (cur.v === cur.next.v) cur.next = cur.next.next; // unlink the repeat; cur stays
  else cur = cur.next;                                // first occurrence of a new value
}

const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
