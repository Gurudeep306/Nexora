// nth from the end in one pass: fixed-gap two pointers.
const tokens = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const len = Number(tokens[0]);
const nth = Number(tokens[1]);

let head = null, tail = null;
for (let i = 0; i < len; i++) {
  const nd = { v: Number(tokens[2 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

// fixed gap of n: send first ahead, then slide both
let first = head;
let second = head;
for (let i = 0; i < nth; i++) first = first.next;
while (first) {
  first = first.next;
  second = second.next;
}

console.log(second.v);
