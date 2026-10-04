const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let low = num(), best = 0;
for (let i = 1; i < n; i++) {
  const x = num();
  best = Math.max(best, x - low);    // sell today, bought at the cheapest day so far
  low = Math.min(low, x);
}
console.log(String(best));
