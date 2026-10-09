// Odd/even POSITIONS: two chains grow inside one walk, then one write concatenates.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[1 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

if (head) {
  let odd = head;
  let even = head.next;
  const evenHead = even;            // save: even strides away
  while (even && even.next) {       // even runs out first — guard it
    odd.next = even.next;
    odd = odd.next;
    even.next = odd.next;
    even = even.next;
  }
  odd.next = evenHead;              // one write concatenates
}

const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
