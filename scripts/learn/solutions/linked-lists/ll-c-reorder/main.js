// Reorder L0 -> Ln -> L1 -> Ln-1 ...: middle + cut, reverse half, zipper.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[1 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

if (head && head.next) {
  // Phase 1: middle (next-next guard: slow = last node of first half) + cut
  let slow = head, fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  let second = slow.next;
  slow.next = null; // cut

  // Phase 2: reverse the second half — save before you sever
  let prev = null, cur = second;
  while (cur) {
    const nxt = cur.next;
    cur.next = prev;
    prev = cur;
    cur = nxt;
  }
  second = prev;

  // Phase 3: zip; the shorter-or-equal second chain drives the loop
  let first = head;
  while (second) {
    const t1 = first.next;
    const t2 = second.next; // save BOTH before any write
    first.next = second;
    second.next = t1;
    first = t1;
    second = t2;
  }
}

const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
