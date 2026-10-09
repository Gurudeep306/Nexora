// Cycle entrance: Floyd phase 1 (detect) + phase 2 (entrance walk). Compare nodes, not values.
const tokens = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const n = Number(tokens[0]);
const pos = Number(tokens[1]);

const nodes = [];
for (let i = 0; i < n; i++) nodes.push({ v: Number(tokens[2 + i]), next: null });
for (let i = 1; i < n; i++) nodes[i - 1].next = nodes[i];
const head = n ? nodes[0] : null;
if (n && pos >= 0) nodes[n - 1].next = nodes[pos];   // build the cycle

// Phase 1: Floyd detect — tortoise 1, hare 2
let slow = head;
let fast = head;
let met = false;
while (fast && fast.next) {
  slow = slow.next;
  fast = fast.next.next;
  if (slow === fast) { met = true; break; }
}
if (!met) {
  console.log(-1);
} else {
  // Phase 2: restart at head, both walk 1 step — they meet at the entrance
  let p = head;
  while (p !== slow) {
    p = p.next;
    slow = slow.next;
  }

  let idx = -1;
  for (let i = 0; i < n; i++) {
    if (nodes[i] === p) { idx = i; break; }
  }
  console.log(idx);
}
