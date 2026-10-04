const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let lo = 0, zeros = 0, best = 0;
for (let hi = 0; hi < n; hi++) {
  if (a[hi] === 0) zeros++;
  while (zeros > k) {                // too many zeros to flip: shrink
    if (a[lo] === 0) zeros--;
    lo++;
  }
  best = Math.max(best, hi - lo + 1);
}
console.log(String(best));
