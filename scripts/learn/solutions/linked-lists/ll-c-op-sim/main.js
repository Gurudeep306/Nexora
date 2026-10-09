// Doubly linked list with head AND tail pointers: end ops are O(1),
// middle insert/erase walk from the closer end. Values |v| <= 1e9 fit Number.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/);
let pos = 0;
const q = Number(data[pos++]);

let head = null, tail = null, len = 0;

function pushFront(v) {
  const nd = { v, prev: null, next: head };
  if (head) head.prev = nd; else tail = nd;
  head = nd;
  len++;
}
function pushBack(v) {
  const nd = { v, prev: tail, next: null };
  if (tail) tail.next = nd; else head = nd;
  tail = nd;
  len++;
}
function popFront() {
  head = head.next;
  if (head) head.prev = null; else tail = null;
  len--;
}
function popBack() {
  tail = tail.prev;
  if (tail) tail.next = null; else head = null;
  len--;
}
function at(i) {
  let cur;
  if (i <= len >> 1) {
    cur = head;
    for (let s = 0; s < i; s++) cur = cur.next;
  } else {
    cur = tail;
    for (let s = len - 1; s > i; s--) cur = cur.prev;
  }
  return cur;
}

for (let t = 0; t < q; t++) {
  const op = data[pos++];
  if (op === 'push_front') pushFront(Number(data[pos++]));
  else if (op === 'push_back') pushBack(Number(data[pos++]));
  else if (op === 'pop_front') popFront();
  else if (op === 'pop_back') popBack();
  else if (op === 'insert') {
    const i = Number(data[pos++]), v = Number(data[pos++]);
    if (i === 0) { pushFront(v); continue; }
    if (i === len) { pushBack(v); continue; }
    const cur = at(i);
    const nd = { v, prev: cur.prev, next: cur };
    cur.prev.next = nd;
    cur.prev = nd;
    len++;
  } else { // erase
    const i = Number(data[pos++]);
    if (i === 0) { popFront(); continue; }
    if (i === len - 1) { popBack(); continue; }
    const cur = at(i);
    cur.prev.next = cur.next;
    cur.next.prev = cur.prev;
    len--;
  }
}

const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
