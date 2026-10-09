// Sort a 0/1/2 list by relinking: three dummy-headed chains threaded in one walk.
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const n = toks[p++];
let head = null, inTail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: toks[p++], next: null };
  if (!head) head = nd; else inTail.next = nd;
  inTail = nd;
}

// thread three dummy-headed chains in one walk
const d = [{ v: 0, next: null }, { v: 0, next: null }, { v: 0, next: null }];
const t = [d[0], d[1], d[2]];
let cur = head;
while (cur) {
  const nxt = cur.next;   // save: cur is about to leave the input
  const b = cur.v;
  t[b].next = cur;        // route to its chain's tail
  t[b] = cur;
  cur = nxt;
}
t[2].next = null;         // SEAL the last tail

// concatenate the non-empty chains 0 -> 1 -> 2
let res = null, resTail = null;
for (let b = 0; b < 3; b++) {
  if (!d[b].next) continue;
  if (!res) res = d[b].next;
  else resTail.next = d[b].next;
  resTail = t[b];
}
if (!res) { console.log('EMPTY'); return; }
resTail.next = null;      // belt-and-braces seal on the true last chain

const out = [];
for (let x = res; x; x = x.next) out.push(x.v);
console.log(out.join(' '));
