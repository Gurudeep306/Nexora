// Reverse positions m..k in one pass: dummy head, anchor, bookmark, bounded flip, two stitches.
const tokens = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const n = Number(tokens[0]);
const m = Number(tokens[1]);
const k = Number(tokens[2]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(tokens[3 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

// dummy head absorbs m == 1
const dummy = { v: 0, next: head };
let anchor = dummy;
for (let i = 1; i < m; i++) anchor = anchor.next;   // position m-1
const rangeHead = anchor.next;                       // bookmark BEFORE flipping
let prev = null;
let cur = rangeHead;
for (let i = 0; i < k - m + 1; i++) {                // exactly k-m+1 flips
  const nxt = cur.next;
  cur.next = prev;
  prev = cur;
  cur = nxt;
}
anchor.next = prev;        // front stitch
rangeHead.next = cur;      // back stitch

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
