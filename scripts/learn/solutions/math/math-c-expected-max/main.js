const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007;
const mul = (a, b) => ((a * (b >>> 16)) % MOD * 65536 + a * (b & 65535)) % MOD;
const pw = (b, e) => {
  let r = 1;
  b %= MOD;
  while (e > 0) { if (e % 2 === 1) r = mul(r, b); b = mul(b, b); e = Math.floor(e / 2); }
  return r;
};
const m = num();
const e = Number(BigInt(next()) % BigInt(MOD - 1));   // k up to 1e18: reduce with BigInt
let S = 0;
for (let y = 1; y < m; y++) S = (S + pw(y, e)) % MOD;
console.log(String((m - mul(S, pw(pw(m, e), MOD - 2)) + MOD) % MOD));
