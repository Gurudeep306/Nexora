// Middle in one pass: fast/slow, second middle on even n.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const n = Number(lines[0]);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

let head = null, tail = null;
for (const v of vals) {
  const nd = { v, next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

// guard (fast && fast.next) => second middle on even n
let slow = head;
let fast = head;
while (fast && fast.next) {
  slow = slow.next;
  fast = fast.next.next;
}

console.log(slow.v);
