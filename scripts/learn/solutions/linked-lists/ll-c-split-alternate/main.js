// Split into alternating chains: two dummy-headed chains threaded in one walk, seal BOTH tails.
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const n = toks[p++];
let head = null, inTail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: toks[p++], next: null };
  if (!head) head = nd; else inTail.next = nd;
  inTail = nd;
}

// thread two chains in one walk
const dA = { v: 0, next: null }, dB = { v: 0, next: null };
let tA = dA, tB = dB;
let cur = head;
let toA = true;
while (cur) {
  const nxt = cur.next;     // save BEFORE threading rewrites cur.next
  if (toA) { tA.next = cur; tA = cur; }
  else     { tB.next = cur; tB = cur; }
  toA = !toA;
  cur = nxt;
}
tA.next = null;             // SEAL both tails
tB.next = null;

function render(h) {
  const out = [];
  for (let t = h; t; t = t.next) out.push(t.v);
  return out.length ? out.join(' ') : 'EMPTY';
}
console.log(render(dA.next) + '\n' + render(dB.next));
