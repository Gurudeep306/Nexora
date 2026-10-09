// Palindrome check: split with the next-next guard, reverse half 2, compare, restore.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const n = Number(lines[0]);
const vals = n > 0 ? lines[1].trim().split(/\s+/).map(Number) : [];

let head = null, tail = null;
for (const v of vals) {
  const nd = { v, next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

function reverseList(h) {
  let prev = null;
  let cur = h;
  while (cur) {
    const nxt = cur.next;
    cur.next = prev;
    prev = cur;
    cur = nxt;
  }
  return prev;
}

let ok = true;
if (head) {
  // split: next-next guard leaves slow at the LAST node of the first half
  let slow = head;
  let fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  let secondHead = slow.next;   // floor(n/2) nodes AFTER slow
  slow.next = null;             // cut
  secondHead = reverseList(secondHead);

  let p = head;
  for (let q = secondHead; q; q = q.next, p = p.next) {
    if (p.v !== q.v) { ok = false; break; }
  }

  slow.next = reverseList(secondHead);   // RESTORE on both exits
}

console.log(ok ? 1 : 0);
