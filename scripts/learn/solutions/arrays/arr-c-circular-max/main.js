const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let x = num();
let total = x, curMax = x, bestMax = x, curMin = x, bestMin = x;
for (let i = 1; i < n; i++) {
  x = num();
  total += x;
  curMax = Math.max(x, curMax + x); bestMax = Math.max(bestMax, curMax);   // best non-wrapping
  curMin = Math.min(x, curMin + x); bestMin = Math.min(bestMin, curMin);   // worst middle piece
}
console.log(String(bestMax < 0 ? bestMax : Math.max(bestMax, total - bestMin)));
