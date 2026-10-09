// Hashmap key->node plus a DOUBLY linked list ordered by recency:
// head side = most recent, tail side = least recent. Both ops O(1).
// Keys and values are tiny (<= 100 / <= 1e4): Number is exact, no BigInt needed.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(s => s.length);
let pos = 0;
const C = Number(data[pos++]);
const q = Number(data[pos++]);

const head = { k: 0, v: 0, prev: null, next: null };   // sentinels
const tail = { k: 0, v: 0, prev: null, next: null };
head.next = tail;
tail.prev = head;
const mp = new Map();

function unlink(nd) {
  nd.prev.next = nd.next;
  nd.next.prev = nd.prev;
}
function pushFront(nd) {        // mark most recently used
  nd.next = head.next;
  nd.prev = head;
  head.next.prev = nd;
  head.next = nd;
}

const out = [];
for (let t = 0; t < q; t++) {
  const op = data[pos++];
  if (op === 'get') {
    const k = Number(data[pos++]);
    const nd = mp.get(k);
    if (nd === undefined) {
      out.push('-1');
    } else {
      unlink(nd);               // two writes — why the list is doubly
      pushFront(nd);
      out.push(String(nd.v));
    }
  } else {                      // put k v
    const k = Number(data[pos++]), v = Number(data[pos++]);
    let nd = mp.get(k);
    if (nd !== undefined) {     // update existing, mark recent
      nd.v = v;
      unlink(nd);
      pushFront(nd);
    } else {
      nd = { k, v, prev: null, next: null };
      mp.set(k, nd);
      pushFront(nd);
      if (mp.size > C) {        // evict LEAST recently used = tail side
        const lru = tail.prev;
        unlink(lru);
        mp.delete(lru.k);
      }
    }
  }
}
console.log(out.join('\n'));
