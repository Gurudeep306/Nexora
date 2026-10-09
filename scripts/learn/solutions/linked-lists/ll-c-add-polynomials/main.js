// Add two polynomials stored as descending-exponent term lists: merge-walk with cancel-and-drop.
// Coefficients up to 1e9, sums up to 2e9 — exact in JS Number (< 2^53), so Number is safe here.
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const na = toks[p++], nb = toks[p++];

function build(count) {
  let head = null, tail = null;
  for (let i = 0; i < count; i++) {
    const nd = { c: toks[p++], e: toks[p++], next: null };
    if (!head) head = nd; else tail.next = nd;
    tail = nd;
  }
  return head;
}

let a = build(na);
let b = build(nb);

// merge-walk on DESCENDING exponents; tie -> sum, drop if zero
const dummy = { c: 0, e: 0, next: null };
let tail = dummy;
while (a && b) {
  if (a.e > b.e) { tail.next = { c: a.c, e: a.e, next: null }; tail = tail.next; a = a.next; }
  else if (b.e > a.e) { tail.next = { c: b.c, e: b.e, next: null }; tail = tail.next; b = b.next; }
  else {
    const s = a.c + b.c;
    if (s !== 0) { tail.next = { c: s, e: a.e, next: null }; tail = tail.next; } // cancel-and-drop
    a = a.next;
    b = b.next;
  }
}
while (a) { tail.next = { c: a.c, e: a.e, next: null }; tail = tail.next; a = a.next; }
while (b) { tail.next = { c: b.c, e: b.e, next: null }; tail = tail.next; b = b.next; }

const out = [];
for (let t = dummy.next; t; t = t.next) { out.push(t.c); out.push(t.e); }
console.log(out.length ? out.join(' ') : 'EMPTY');
