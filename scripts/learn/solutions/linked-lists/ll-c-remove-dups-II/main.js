// Delete EVERY value that repeats: skip whole runs, prev never enters a run.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const n = Number(lines[0]);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

const dummy = { v: 0, next: null };
let tail = dummy;
for (const v of vals) {
  tail.next = { v, next: null };
  tail = tail.next;
}

let prev = dummy;
while (prev.next && prev.next.next) {
  if (prev.next.v === prev.next.next.v) {
    const dup = prev.next.v;                    // remember the run's value
    while (prev.next && prev.next.v === dup) {
      prev.next = prev.next.next;               // unlink the WHOLE run
    }
    // prev stays put: the new prev.next is unexamined
  } else {
    prev = prev.next;                           // unique so far, keep it
  }
}

const head = dummy.next;
const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
