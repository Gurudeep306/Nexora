const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let cur = num(), best = cur;         // best subarray ending here / anywhere
for (let i = 1; i < n; i++) {
  const x = num();
  cur = Math.max(x, cur + x);        // extend, or start fresh at x
  if (cur > best) best = cur;
}
console.log(String(best));
