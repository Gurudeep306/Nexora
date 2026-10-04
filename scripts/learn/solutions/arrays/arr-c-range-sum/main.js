const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), q = num();
const P = new Array(n + 1).fill(0);  // P[i] = a[0] + ... + a[i-1]; |P| <= 2e14 is exact
for (let i = 0; i < n; i++) P[i + 1] = P[i] + num();
const out = [];
for (let i = 0; i < q; i++) {
  const l = num(), r = num();
  out.push(P[r + 1] - P[l]);
}
console.log(out.join('\n'));
