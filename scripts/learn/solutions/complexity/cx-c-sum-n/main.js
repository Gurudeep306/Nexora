const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007n;            // BigInt: n goes up to 1e18
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const n = BigInt(next());
  out.push(((n * (n + 1n)) / 2n) % MOD);   // BigInt has no overflow
}
console.log(out.join('\n'));
