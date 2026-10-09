// Dummy head so add/delete never special-case the head, tail pointer so
// addAtTail is two writes, size counter so bad indexes die in O(1).
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const q = Number(lines[0]);

const dummy = { v: 0, next: null };
let tail = dummy;   // tail === dummy means the list is empty
let size = 0;

function nodeBefore(i) {   // node whose next is position i
  let cur = dummy;
  for (let s = 0; s < i; s++) cur = cur.next;
  return cur;
}

const out = [];
for (let t = 1; t <= q; t++) {
  const parts = lines[t].trim().split(/\s+/);
  const op = parts[0];
  if (op === 'get') {
    const i = Number(parts[1]);
    let r = -1;
    if (i >= 0 && i < size) {
      let cur = dummy;
      for (let s = 0; s <= i; s++) cur = cur.next;
      r = cur.v;
    }
    out.push(String(r));
  } else if (op === 'addAtHead') {
    const v = Number(parts[1]);
    dummy.next = { v, next: dummy.next };
    if (size === 0) tail = dummy.next;
    size++;
  } else if (op === 'addAtTail') {
    const v = Number(parts[1]);
    tail.next = { v, next: null };
    tail = tail.next;
    size++;
  } else if (op === 'addAtIndex') {
    const i = Number(parts[1]), v = Number(parts[2]);
    if (i <= 0) {                 // front (also covers negatives)
      dummy.next = { v, next: dummy.next };
      if (size === 0) tail = dummy.next;
      size++;
    } else if (i === size) {      // append
      tail.next = { v, next: null };
      tail = tail.next;
      size++;
    } else if (i < size) {        // interior splice after node i-1
      const prev = nodeBefore(i);
      prev.next = { v, next: prev.next };
      size++;
    }                             // i > size: ignored
  } else {                        // deleteAtIndex
    const i = Number(parts[1]);
    if (i >= 0 && i < size) {
      const prev = nodeBefore(i);
      const victim = prev.next;
      prev.next = victim.next;
      if (victim === tail) tail = prev;
      size--;
    }
  }
}
console.log(out.join('\n'));
