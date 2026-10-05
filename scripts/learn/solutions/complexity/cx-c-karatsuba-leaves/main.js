const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007n;
const t = num();
const out = [];
for (let q = 0; q < t; q++) {
  const n = BigInt(next());
  let k = n === 1n ? 0 : (n - 1n).toString(2).length;  // bit length of n-1 = ceil(log2 n)
  let r = 1n, b = 3n;
  for (; k > 0; k >>= 1, b = b * b % MOD) if (k & 1) r = r * b % MOD;
  out.push(r);
}
console.log(out.join('\n'));
