const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), T = num();
const a = [];
for (let k = 0; k < n; k++) a.push(num());
let i = 0, j = n - 1, found = false;
while (i < j) {
  const s = a[i] + a[j];
  if (s === T) { found = true; break; }
  if (s < T) i++;                    // a[i] too small for every remaining partner
  else j--;                          // a[j] too large for every remaining partner
}
console.log(found ? 'YES' : 'NO');
