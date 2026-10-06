const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007;
const mul = (a, b) => ((a * (b >>> 16)) % MOD * 65536 + a * (b & 65535)) % MOD;
const n = num();                                    // n <= 1e11 < 2^53
let total = 0;
for (let d = 1; d <= n;) {
  const q = Math.floor(n / d), e = Math.floor(n / q);
  let x = d + e, y = e - d + 1;
  if (x % 2 === 0) x /= 2; else y /= 2;             // halve the even factor first
  total = (total + mul(q % MOD, mul(x % MOD, y % MOD))) % MOD;
  d = e + 1;
}
console.log(String(total));
