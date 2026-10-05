const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007n;
const power = (b, e) => {                            // O(log e) square-and-multiply
  let r = 1n;
  b %= MOD;
  while (e > 0n) {
    if (e & 1n) r = r * b % MOD;
    b = b * b % MOD;
    e >>= 1n;
  }
  return r;
};
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const rr = BigInt(next()) % MOD, k = BigInt(next());
  if (rr === 1n) out.push((k + 1n) % MOD);           // every term is 1 mod p
  else out.push((power(rr, k + 1n) - 1n + MOD) % MOD * power(rr - 1n + MOD, MOD - 2n) % MOD);
}
console.log(out.join('\n'));
