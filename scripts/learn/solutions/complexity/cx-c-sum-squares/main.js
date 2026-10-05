const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007n;
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const n = BigInt(next());                         // up to 1e18: needs BigInt
  out.push((n * (n + 1n) * (2n * n + 1n) / 6n) % MOD);
}
console.log(out.join('\n'));
