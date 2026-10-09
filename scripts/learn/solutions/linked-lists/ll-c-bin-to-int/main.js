// Fold the bits while walking the list: acc = acc*2n + bit (MSB first).
// 60 bits can exceed 2^53, so BigInt is mandatory.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const n = Number(lines[0]);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

const head = { v: 0, next: null };
let tail = head;
for (const v of vals) {
  tail.next = { v, next: null };
  tail = tail.next;
}

let acc = 0n;
for (let t = head.next; t; t = t.next) acc = acc * 2n + BigInt(t.v);
console.log(acc.toString());
