// Add two most-significant-first numbers: reverse both, stream the carry, reverse the result.
// Never form the integer: up to 100 digits overflow every machine type.
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

function rev(head) { // save before you sever
  let prev = null, cur = head;
  while (cur) {
    const nxt = cur.next;
    cur.next = prev;
    prev = cur;
    cur = nxt;
  }
  return prev;
}

const headA = build(na);
const headB = build(nb);

// reverse both, stream the carry, reverse the result — all iterative
let a = rev(headA);
let b = rev(headB);
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

const res = rev(dummy.next);
const out = [];
for (let t = res; t; t = t.next) out.push(t.v);
console.log(out.join(' '));
