// The classic trick: given ONLY a pointer to the victim (never the tail),
// copy the successor's value forward and bypass the successor.
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const [n, idx] = lines[0].trim().split(/\s+/).map(Number);
const vals = lines[1].trim().split(/\s+/).map(Number);

const head = { v: 0, next: null };
let tail = head;
for (const v of vals) {
  tail.next = { v, next: null };
  tail = tail.next;
}

// walk to position idx — in the interview you are HANDED this pointer
let node = head.next;
for (let i = 0; i < idx; i++) node = node.next;

function deleteNode(node) {
  node.v = node.next.v;       // steal the successor's contents
  node.next = node.next.next; // bypass it
}
deleteNode(node);

const out = [];
for (let t = head.next; t; t = t.next) out.push(t.v);
console.log(out.join(' '));
