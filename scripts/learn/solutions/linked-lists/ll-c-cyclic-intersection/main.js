// Intersection when cycles may exist: Floyd twice + case analysis. Compare NODE references.
// Counts up to 2e4 and indexes up to 2e4 — well within Number's exact range (2^53).
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const na = toks[p++], nb = toks[p++], nc = toks[p++], pos = toks[p++];

function readChain(n) {
  const arr = [];
  let head = null, tail = null;
  for (let i = 0; i < n; i++) {
    const nd = { v: toks[p++], next: null };
    arr.push(nd);
    if (!head) head = nd; else tail.next = nd;
    tail = nd;
  }
  return { arr, head };
}

// Floyd: returns {cyc, ent} — cyclicity and cycle entrance (null when acyclic).
function floyd(head) {
  if (!head) return { cyc: false, ent: null };
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {                 // meeting point
      let q = head;
      while (q !== slow) { q = q.next; slow = slow.next; }
      return { cyc: true, ent: q };      // entrance
    }
  }
  return { cyc: false, ent: null };
}

function distTo(head, target) {          // target reachable without looping
  let d = 0;
  for (let q = head; q !== target; q = q.next) d++;
  return d;
}

const A = readChain(na);
const B = readChain(nb);
const S = readChain(nc);                 // shared nodes built ONCE
// head of each list: its own part, or the shared part when it has no own nodes
A.head = na > 0 ? A.head : S.head;
B.head = nb > 0 ? B.head : S.head;
// join: each list = own part followed by the shared part
if (na > 0 && nc > 0) A.arr[na - 1].next = S.head;
if (nb > 0 && nc > 0) B.arr[nb - 1].next = S.head;
if (nc > 0 && pos >= 0) S.arr[nc - 1].next = S.arr[pos];   // cycle

const fa = floyd(A.head);
const fb = floyd(B.head);

let answer = -1;
if (fa.cyc !== fb.cyc) {
  answer = -1;                           // exactly one cyclic: cannot intersect
} else if (!fa.cyc) {
  // both acyclic: length-align, walk in lockstep, compare NODES
  const lenA = distTo(A.head, null), lenB = distTo(B.head, null);
  let a = A.head, b = B.head, idx = 0;
  for (let d = lenA - lenB; d > 0; d--) { a = a.next; idx++; }
  for (let d = lenB - lenA; d > 0; d--) b = b.next;
  while (a !== b) { a = a.next; b = b.next; idx++; }
  if (a !== null) answer = idx;          // both null -> -1
} else if (fa.ent === fb.ent) {
  // same entrance: the Y happens BEFORE the cycle — aligned walk bounded by it
  const dA = distTo(A.head, fa.ent), dB = distTo(B.head, fb.ent);
  let a = A.head, b = B.head, idx = 0;
  for (let d = dA - dB; d > 0; d--) { a = a.next; idx++; }
  for (let d = dB - dA; d > 0; d--) b = b.next;
  while (a !== b && a !== fa.ent) { a = a.next; b = b.next; idx++; }
  answer = (a === b) ? idx : dA;
} else {
  // different entrances: intersect iff B's entrance lies on A's cycle
  let q = fa.ent, found = false;
  do {
    if (q === fb.ent) { found = true; break; }
    q = q.next;
  } while (q !== fa.ent);
  if (found) answer = distTo(A.head, fa.ent);   // first shared node IS A's entrance
}
console.log(answer);
