// Split into ceil(n/2) + floor(n/2): slow=head, fast=head.next, while(fast && fast.next).
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const n = Number(lines[0]);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

let head = null, tail = null;
for (const v of vals) {
  const nd = { v, next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

let slow = head;
let fast = head ? head.next : null;
while (fast && fast.next) {
  slow = slow.next;
  fast = fast.next.next;
}
const second = slow.next;
slow.next = null;                 // THE CUT

function render(h) {
  const out = [];
  for (let t = h; t; t = t.next) out.push(t.v);
  return out.length ? out.join(' ') : 'EMPTY';
}

console.log(render(head) + '\n' + render(second));
