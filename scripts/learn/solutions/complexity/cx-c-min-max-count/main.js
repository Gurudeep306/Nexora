const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
let mn, mx, comps = 0, i;
if (n % 2) { mn = mx = a[0]; i = 1; }
else { comps++; mn = Math.min(a[0], a[1]); mx = Math.max(a[0], a[1]); i = 2; }
for (; i + 1 < n; i += 2) {
  let lo = a[i], hi = a[i + 1];
  comps++; if (hi < lo) { const t = lo; lo = hi; hi = t; }   // compare inside the pair
  comps++; if (lo < mn) mn = lo;                             // loser vs min
  comps++; if (hi > mx) mx = hi;                             // winner vs max
}
console.log(`${mn} ${mx} ${comps}`);
