const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), S = num();          // S <= 1e15 and sums <= 2e14: exact as numbers
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let s = 0, lo = 0, best = Infinity;
for (let hi = 0; hi < n; hi++) {
  s += a[hi];                        // extend to the right
  while (s >= S) {                   // big enough: record, then shrink
    best = Math.min(best, hi - lo + 1);
    s -= a[lo++];
  }
}
console.log(String(best === Infinity ? 0 : best));
