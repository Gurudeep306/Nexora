// One lap from H: insert into the FIRST qualifying pair; stop rule is a
// counter/identity against H, never a null test — the ring has no null.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const [n, x] = lines[0].trim().split(/\s+/).map(Number);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

let H = null, tail = null;
for (const v of vals) {
  const nd = { v, next: null };
  if (!H) H = nd; else tail.next = nd;
  tail = nd;
}

if (!H) {                            // empty ring: x alone
  console.log(String(x));
  process.exit(0);
}
tail.next = H;                       // close the ring

const nd = { v: x, next: null };
let a = H;
let done = false;
for (let step = 0; step < n && !done; step++) {
  const b = a.next;
  const seam = a.v > b.v;
  if ((a.v <= x && x <= b.v) || (seam && (x >= a.v || x <= b.v))) {
    nd.next = b;
    a.next = nd;
    done = true;
  }
  a = b;
}
if (!done) {                         // all values equal: insert after H
  nd.next = H.next;
  H.next = nd;
}

const out = [];
let t = H;
for (let i = 0; i < n + 1; i++) {
  out.push(t.v);
  t = t.next;
}
console.log(out.join(' '));
