// Stable partition around x: two dummy-headed chains, seal, concatenate.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);
const x = Number(data[1]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[2 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

const lessD = { v: 0, next: null }, geqD = { v: 0, next: null };
let less = lessD, geq = geqD;
for (let cur = head; cur; cur = cur.next) {
  if (cur.v < x) { less.next = cur; less = cur; }
  else           { geq.next = cur; geq = cur; }
}
geq.next = null;          // SEAL the right chain
less.next = geqD.next;    // concatenate: one write

const out = [];
for (let t = lessD.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
