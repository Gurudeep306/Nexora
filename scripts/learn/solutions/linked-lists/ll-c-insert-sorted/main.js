// Walk to the first node NOT <= x and splice before it (equals: x goes AFTER).
// A -Infinity dummy makes "x is the new head" fall out of the same loop.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const [n, x] = lines[0].trim().split(/\s+/).map(Number);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

const dummy = { v: -Infinity, next: null };
let tail = dummy;
for (const v of vals) {
  tail.next = { v, next: null };
  tail = tail.next;
}

let prev = dummy;
while (prev.next && prev.next.v <= x) prev = prev.next;
prev.next = { v: x, next: prev.next };

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.join(' '));
