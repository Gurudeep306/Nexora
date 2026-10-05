const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), T = num();             // sums stay below 2^53: Number is exact
const sums = new Float64Array(1 << n);
let k = 1;                              // sums[0] = 0: the empty subset
for (let i = 0; i < n; i++) {
  const x = num();
  for (let j = 0; j < k; j++) sums[k + j] = sums[j] + x;   // subsets that take x
  k *= 2;
}
let cnt = 0;
for (let j = 0; j < k; j++) if (sums[j] === T) cnt++;
console.log(String(cnt));
