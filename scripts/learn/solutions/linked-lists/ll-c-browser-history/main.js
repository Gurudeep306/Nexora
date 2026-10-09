// Cursor inside a DOUBLY linked list: back/forward are prev/next hops,
// and visit-unlinks-forward is O(1) with prev+next in hand.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
let cur = { url: lines[0].trim(), prev: null, next: null };
const q = Number(lines[1]);

const out = [];
for (let i = 2; i < 2 + q; i++) {
  const parts = lines[i].trim().split(/\s+/);
  if (parts[0] === 'visit') {
    const nd = { url: parts[1], prev: cur, next: null };
    cur.next = nd;              // forward history is simply dropped
    cur = nd;                   // (unreachable, no unlinking needed)
  } else if (parts[0] === 'back') {
    let k = Number(parts[1]);
    while (k-- > 0 && cur.prev) cur = cur.prev;
    out.push(cur.url);
  } else {                      // forward
    let k = Number(parts[1]);
    while (k-- > 0 && cur.next) cur = cur.next;
    out.push(cur.url);
  }
}
console.log(out.join('\n'));
