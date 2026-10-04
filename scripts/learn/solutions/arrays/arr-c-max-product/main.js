const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let x = BigInt(next());              // products reach 2^62: BigInt
let hi = x, lo = x, best = x;        // max / min product ending here
const max = (p, q) => (p > q ? p : q), min = (p, q) => (p < q ? p : q);
for (let i = 1; i < n; i++) {
  x = BigInt(next());
  if (x < 0n) [hi, lo] = [lo, hi];   // a negative flips max and min
  hi = max(x, hi * x);
  lo = min(x, lo * x);
  best = max(best, hi);
}
console.log(best.toString());
