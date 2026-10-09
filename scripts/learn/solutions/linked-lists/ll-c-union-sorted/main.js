// Union of two sorted lists: merge-walk with dedup against the RESULT tail.
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const na = toks[p++], nb = toks[p++];

function build(count) {
  let head = null, tail = null;
  for (let i = 0; i < count; i++) {
    const nd = { v: toks[p++], next: null };
    if (!head) head = nd; else tail.next = nd;
    tail = nd;
  }
  return head;
}

let a = build(na);
let b = build(nb);

// merge-walk with dedup against the RESULT tail
const dummy = { v: 0, next: null };
let tail = dummy;
let any = false;
function take(v) {
  if (any && tail.v === v) return;   // dedup vs result tail
  tail.next = { v, next: null };
  tail = tail.next;
  any = true;
}
while (a && b) {
  if (a.v <= b.v) { take(a.v); a = a.next; }
  else            { take(b.v); b = b.next; }
}
while (a) { take(a.v); a = a.next; }
while (b) { take(b.v); b = b.next; }

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
