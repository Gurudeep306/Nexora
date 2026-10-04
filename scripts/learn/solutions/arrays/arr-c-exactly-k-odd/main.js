const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const odd = new Int8Array(n);
for (let i = 0; i < n; i++) odd[i] = num() & 1;
const atMost = (K) => {              // subarrays with at most K odd numbers
  let total = 0, lo = 0, cnt = 0;
  for (let hi = 0; hi < n; hi++) {
    cnt += odd[hi];
    while (cnt > K) cnt -= odd[lo++];
    total += hi - lo + 1;            // every start in [lo, hi]
  }
  return total;
};
console.log(String(atMost(k) - atMost(k - 1)));
