// Delete the middle node in one pass: dummy head + fast/slow, slow ends on the predecessor.
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const n = toks[p++];
const dummy = { v: 0, next: null };
let tail = dummy;
for (let i = 0; i < n; i++) {
  tail.next = { v: toks[p++], next: null };
  tail = tail.next;
}

// one pass: slow trails fast, ending on the victim's PREDECESSOR
let slow = dummy, fast = dummy;
while (fast.next && fast.next.next) {
  slow = slow.next;
  fast = fast.next.next;
}
const victim = slow.next;   // floor(n/2): second middle on even n
slow.next = victim.next;    // bypass

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
