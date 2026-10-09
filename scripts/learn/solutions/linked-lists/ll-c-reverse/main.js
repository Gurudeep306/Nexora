// Reverse a singly linked list iteratively: save before you sever.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const n = Number(lines[0]);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

const head = { v: 0, next: null };
let tail = head;
for (const v of vals) {
  tail.next = { v, next: null };
  tail = tail.next;
}
const realHead = head.next;

let prev = null;
let cur = realHead;
while (cur) {
  const nxt = cur.next;
  cur.next = prev;
  prev = cur;
  cur = nxt;
}

const out = [];
for (let t = prev; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
