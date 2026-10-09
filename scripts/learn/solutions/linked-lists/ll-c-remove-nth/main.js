// Delete nth from the end in one pass: dummy head + gap n+1.
const tokens = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const len = Number(tokens[0]);
const nth = Number(tokens[1]);

let head = null, tail = null;
for (let i = 0; i < len; i++) {
  const nd = { v: Number(tokens[2 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

// dummy head + gap n+1: second lands on the victim's predecessor
const dummy = { v: 0, next: head };
let first = dummy;
let second = dummy;
for (let i = 0; i < nth + 1; i++) first = first.next;
while (first) {
  first = first.next;
  second = second.next;
}
second.next = second.next.next;   // skip over the victim

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
