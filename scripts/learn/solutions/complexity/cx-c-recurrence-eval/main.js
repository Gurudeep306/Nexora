const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007n;
const t = num();
const out = [];
for (let q = 0; q < t; q++) {
  const a = BigInt(next()), b = BigInt(next());
  let n = BigInt(next());                         // up to 1e18: BigInt
  const chain = [];
  while (n > 0n) { chain.push(n); n /= b; }       // n, n/b, n/b^2, ...
  let v = 0n;
  for (let i = chain.length - 1; i >= 0; i--) v = (a * v + chain[i]) % MOD;
  out.push(v);
}
console.log(out.join('\n'));
