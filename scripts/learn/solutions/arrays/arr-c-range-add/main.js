const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), m = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const D = new Array(n + 1).fill(0);
for (let k = 0; k < m; k++) {
  const l = num(), r = num(), v = num();
  D[l] += v;                         // the addition starts at l
  D[r + 1] -= v;                     // ... and stops after r
}
let run = 0;
const out = [];
for (let i = 0; i < n; i++) {
  run += D[i];
  out.push(a[i] + run);
}
console.log(out.join(' '));
