const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();                     // all values stay below 2^53
let S = 0;
for (let i = 1; i <= n;) {
  const q = Math.floor(n / i);
  const last = Math.floor(n / q);    // every i' in [i, last] has quotient q
  S += q * (last - i + 1);
  i = last + 1;
}
console.log(String(S));
