// Dummy head: walk with prev, unlink matching prev.next, do NOT advance prev.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const [n, x] = lines[0].trim().split(/\s+/).map(Number);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

const dummy = { v: 0, next: null };
let tail = dummy;
for (const v of vals) {
  tail.next = { v, next: null };
  tail = tail.next;
}

let prev = dummy;
while (prev.next) {
  if (prev.next.v === x) {
    prev.next = prev.next.next;   // unlink; prev stays put
  } else {
    prev = prev.next;             // only advance when we KEEP the node
  }
}

const head = dummy.next;          // never return the original head
const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
