const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const M = 1000000007;
const mm = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M;
const tri = (x) => {                        // x(x+1)/2 mod M, x <= 1e12 (exact double)
  let a = x, b = x + 1;
  if (a % 2 === 0) a /= 2; else b /= 2;
  return mm(a % M, b % M);
};
const n = num();
let r = Math.floor(Math.sqrt(n));
while (r * r > n) r--;
while ((r + 1) * (r + 1) <= n) r++;
let s = 0;
for (let i = 1; i <= r; i++) {
  const q = Math.floor(n / i);
  s = (s + (i * (q % M)) % M + tri(q)) % M;   // i <= 1e6, q % M < 2^30: product < 2^53
}
s = ((s - mm(r % M, tri(r))) % M + M) % M;
console.log(String(s));
