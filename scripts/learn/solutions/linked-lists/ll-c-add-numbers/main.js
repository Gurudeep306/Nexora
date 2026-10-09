// Add two ones-digit-first numbers by streaming digits with a carry on actual nodes.
// Never form the integer: up to 100 digits overflow every machine type (and BigInt is unneeded).
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

// stream the carry forward: a || b || carry absorbs ragged lengths and the final carry
let carry = 0;
const dummy = { v: 0, next: null };
let tail = dummy;
while (a || b || carry) {
  let sum = carry;
  if (a) { sum += a.v; a = a.next; }
  if (b) { sum += b.v; b = b.next; }
  carry = Math.floor(sum / 10);
  tail.next = { v: sum % 10, next: null };
  tail = tail.next;
}

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.join(' '));
