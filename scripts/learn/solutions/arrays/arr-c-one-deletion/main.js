const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let x = num();
let keep = x, del = -Infinity, best = x;
for (let i = 1; i < n; i++) {
  x = num();
  del = Math.max(del + x, keep);     // deleted earlier, or delete x now
  keep = Math.max(keep + x, x);      // plain Kadane
  best = Math.max(best, keep, del);
}
console.log(String(best));
