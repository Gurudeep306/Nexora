// Rotate right by k: reduce mod n, close the ring, walk to the new tail, cut.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);
const kBig = BigInt(data[1]); // k up to 1e9 — safe either way, but be explicit

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[2 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

if (head && n > 0) {
  const k = Number(kBig % BigInt(n)); // rotating by n is a no-op
  if (k !== 0) {
    tail.next = head;                 // close the ring
    let newTail = head;
    for (let i = 0; i < n - k - 1; i++) newTail = newTail.next;
    head = newTail.next;              // old next is the new head
    newTail.next = null;              // cut
  }
}

const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
