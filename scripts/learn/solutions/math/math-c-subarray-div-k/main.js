const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const r = new Int32Array(n + 1);                  // residues < 1e9 fit in int32
let p = 0;
for (let i = 1; i <= n; i++) {
  p = (((p + num()) % k) + k) % k;                // exact: |p + x| < 2^53
  r[i] = p;
}
r.sort();
let ans = 0;
for (let i = 0, j; i <= n; i = j) {
  for (j = i; j <= n && r[j] === r[i]; j++) {}
  const c = j - i;
  ans += (c * (c - 1)) / 2;
}
console.log(String(ans));
