// Reverse in k-groups: probe-then-flip, anchor-based, iterative.
const tokens = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const n = Number(tokens[0]);
const k = Number(tokens[1]);

let head = null, tail = null;
for (let i = 0; i < n; i++) {
  const nd = { v: Number(tokens[2 + i]), next: null };
  if (!head) head = nd; else tail.next = nd;
  tail = nd;
}

const dummy = { v: 0, next: head };
let groupPrev = dummy;
for (;;) {
  // PROBE: is there a full group of k after groupPrev?
  let probe = groupPrev;
  for (let i = 0; i < k && probe; i++) probe = probe.next;
  if (!probe) break;                    // partial group: leave as is
  const groupHead = groupPrev.next;     // bookmark: becomes the group's tail
  let prev = null;
  let cur = groupHead;
  for (let i = 0; i < k; i++) {         // exactly k flips
    const nxt = cur.next;
    cur.next = prev;
    prev = cur;
    cur = nxt;
  }
  groupPrev.next = prev;                // front stitch
  groupHead.next = cur;                 // back stitch
  groupPrev = groupHead;                // anchor -> this group's tail
}

const out = [];
for (let t = dummy.next; t; t = t.next) out.push(t.v);
console.log(out.length ? out.join(' ') : 'EMPTY');
