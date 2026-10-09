// Unsorted dedup: hash set of seen values + dummy-headed prev-walk; keep first occurrences.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[1 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

const seen = new Set();
const dummy = { v: 0, next: null };
dummy.next = head;
let prev = dummy;
while (prev.next) {
  const cur = prev.next;
  if (seen.has(cur.v)) {
    prev.next = cur.next; // unlink; prev stays
  } else {
    seen.add(cur.v);
    prev = cur;           // keep: cur becomes the new anchor
  }
}

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
