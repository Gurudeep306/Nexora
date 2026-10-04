const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const dq = new Int32Array(n);        // deque of indices in an array (shift() would be O(n))
let head = 0, tail = 0;
const out = [];
for (let i = 0; i < n; i++) {
  while (tail > head && a[dq[tail - 1]] <= a[i]) tail--;   // dominated forever
  dq[tail++] = i;
  if (dq[head] <= i - k) head++;                           // slid out of the window
  if (i >= k - 1) out.push(a[dq[head]]);
}
console.log(out.join(' '));
