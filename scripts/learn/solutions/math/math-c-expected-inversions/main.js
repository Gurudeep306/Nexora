const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007n, INV4 = 250000002n;
const T = num();
const out = [];
for (let i = 0; i < T; i++) {
  const n = BigInt(next());                        // up to 1e18: needs BigInt
  out.push((n % MOD * ((n - 1n) % MOD) % MOD * INV4 % MOD).toString());
}
console.log(out.join('\n'));
