// Merge two sorted lists by relinking: dummy + tail pointer.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
let idx = 0;

function readList(n) {
  const dummy = { v: 0, next: null };
  let tail = dummy;
  for (let i = 0; i < n; i++) {
    tail.next = { v: Number(data[idx++]), next: null };
    tail = tail.next;
  }
  return dummy.next;
}

const na = Number(data[idx++]);
const nb = Number(data[idx++]);
let a = readList(na);
let b = readList(nb);

const dummy = { v: 0, next: null };
let tail = dummy;
while (a && b) {
  if (a.v <= b.v) { tail.next = a; a = a.next; }
  else            { tail.next = b; b = b.next; }
  tail = tail.next;
}
tail.next = a || b; // attach remainder whole

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
