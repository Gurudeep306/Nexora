// Prefix sums with a last-occurrence map over a dummy head.
const tokens = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(s => s.length);
const n = tokens.length ? Number(tokens[0]) : 0;

const dummy = { v: 0, next: null };
let tail = dummy;
for (let i = 0; i < n; i++) {
  tail.next = { v: Number(tokens[1 + i]), next: null };
  tail = tail.next;
}

// Pass 1: store the LAST node reaching each prefix sum.
// Prefix 0 maps to the dummy, so a zero-sum prefix deletes from the head.
const seen = new Map();
let p = 0;
seen.set(0, dummy);
for (let t = dummy.next; t; t = t.next) {
  p += t.v;
  seen.set(p, t);            // LAST occurrence wins (overwrite)
}

// Pass 2: at each node with prefix p, jump over everything up to seen[p].
p = 0;
for (let t = dummy; t; t = t.next) {
  p += t.v;                  // dummy contributes 0
  t.next = seen.get(p).next;
}

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
