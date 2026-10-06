const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007;
// a * b mod MOD without exceeding 2^53: split b into 16-bit halves
const mul = (a, b) => ((a * (b >>> 16)) % MOD * 65536 + a * (b & 65535)) % MOD;
const pw = (b, e) => {
  let r = 1;
  b %= MOD;
  while (e > 0) {
    if (e % 2 === 1) r = mul(r, b);
    b = mul(b, b);
    e = Math.floor(e / 2);
  }
  return r;
};
const n = num(), k = num();
const f = new Array(k + 1), inv = new Array(k + 1);
f[0] = 1;
for (let i = 1; i <= k; i++) f[i] = mul(f[i - 1], i);
inv[k] = pw(f[k], MOD - 2);
for (let i = k; i > 0; i--) inv[i - 1] = mul(inv[i], i);
let ans = 0;
for (let i = 0; i <= k; i++) {
  const term = mul(mul(mul(f[k], inv[i]), inv[k - i]), pw(k - i, n));
  ans = i % 2 ? (ans - term + MOD) % MOD : (ans + term) % MOD;
}
console.log(String(ans));
