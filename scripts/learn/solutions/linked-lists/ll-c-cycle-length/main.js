// Cycle length: Floyd detect, then freeze one pointer and count one full lap.
const tokens = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const n = Number(tokens[0]);
const pos = Number(tokens[1]);

const nodes = [];
for (let i = 0; i < n; i++) nodes.push({ v: Number(tokens[2 + i]), next: null });
for (let i = 1; i < n; i++) nodes[i - 1].next = nodes[i];
const head = n ? nodes[0] : null;
if (n && pos >= 0) nodes[n - 1].next = nodes[pos];   // build the cycle

// Act 1: Floyd detect — tortoise 1, hare 2
let slow = head;
let fast = head;
let met = false;
while (fast && fast.next) {
  slow = slow.next;
  fast = fast.next.next;
  if (slow === fast) { met = true; break; }
}
if (!met) {
  console.log(0);
} else {
  // Act 2: freeze slow, walk p around one full lap
  let p = slow.next;
  let C = 1;
  while (p !== slow) {
    p = p.next;
    C++;
  }
  console.log(C);
}
