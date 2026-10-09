// Reverse alternate k-groups: probe each group, flip in reverse phases, walk past in skip phases.
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const n = toks[p++], k = toks[p++];
const dummy = { v: 0, next: null };
let tail = dummy;
for (let i = 0; i < n; i++) {
  tail.next = { v: toks[p++], next: null };
  tail = tail.next;
}

let anchor = dummy;
let doReverse = true;
while (anchor.next) {
  // PROBE: count min(k, remaining) nodes of this group
  let probe = anchor.next;
  let cnt = 1;
  while (cnt < k && probe.next) { probe = probe.next; cnt++; }
  if (doReverse) {
    const groupHead = anchor.next;
    const after = probe.next;       // first node past the group
    let prev = after;               // seed: tail links onward directly
    let cur = groupHead;
    while (cur !== after) {
      const nxt = cur.next;
      cur.next = prev;
      prev = cur;
      cur = nxt;
    }
    anchor.next = prev;             // prev == probe: group's new head
    anchor = groupHead;             // original head is now the group's TAIL
  } else {
    anchor = probe;                 // skipped group's LAST node
  }
  doReverse = !doReverse;
}

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.join(' '));
