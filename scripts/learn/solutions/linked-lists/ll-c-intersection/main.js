// Intersection via the switch-partners walk: compare POINTERS, not values.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
let idx = 0;

function readChain(n) {
  let head = null, tail = null;
  for (let i = 0; i < n; i++) {
    const nd = { v: Number(data[idx++]), next: null };
    if (!head) head = nd; else tail.next = nd;
    tail = nd;
  }
  return { head, tail };
}

const na = Number(data[idx++]);
const nb = Number(data[idx++]);
const nc = Number(data[idx++]);

const a = readChain(na); // A's own part
const b = readChain(nb); // B's own part
const c = readChain(nc); // shared tail (SAME nodes for both lists)
if (a.tail) a.tail.next = c.head; // A = own + shared
if (b.tail) b.tail.next = c.head; // B = own + shared
const A = a.head || c.head; // A's full head (na = 0 -> shared head IS A)
const B = b.head || c.head;

// switch-partners walk: both routes reach the join after na + nb steps
let p = A, q = B;
while (p !== q) {
  p = p ? p.next : B;
  q = q ? q.next : A;
}

let ans = -1;
if (p) { // met on a real node: find its index along A
  ans = 0;
  for (let t = A; t !== p; t = t.next) ans++;
}
console.log(ans);
