const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let mx1 = -Infinity, mx2 = -Infinity, mn1 = Infinity, mn2 = Infinity;
for (let i = 0; i < n; i++) {
  const x = num();
  if (x > mx1) { mx2 = mx1; mx1 = x; } else if (x > mx2) mx2 = x;
  if (x < mn1) { mn2 = mn1; mn1 = x; } else if (x < mn2) mn2 = x;
}
const p = BigInt(mx1) * BigInt(mx2), r = BigInt(mn1) * BigInt(mn2);   // up to 1e18: BigInt
console.log(String(p > r ? p : r));
