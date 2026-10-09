// Merge sort ON the list: split at middle + cut, recurse, stable-merge by relinking.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter((s) => s.length);
const n = Number(data[0]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(data[1 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

// slow ends at index ceil(n/2)-1; guard makes a 2-node list split 1+1
function splitMiddle(h) {
  let slow = h, fast = h.next;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  const second = slow.next;
  slow.next = null; // the cut
  return second;
}

function merge(a, b) {
  const dummy = { v: 0, next: null };
  let t = dummy;
  while (a && b) {
    if (a.v <= b.v) { t.next = a; a = a.next; }
    else            { t.next = b; b = b.next; }
    t = t.next;
  }
  t.next = a || b;
  return dummy.next;
}

function mergeSort(h) {
  if (!h || !h.next) return h;
  const second = splitMiddle(h);
  return merge(mergeSort(h), mergeSort(second));
}

head = mergeSort(head);

const out = [];
for (let t = head; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
