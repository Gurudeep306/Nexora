const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const M = 1000000007;
const MB = 1000000007n;
// a * b mod M for a, b < M without exceeding 2^53: split b into 16-bit halves
const mul = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M;
const n = num();
let s = 0, p = 1;
for (let i = 0; i < n; i++) {
  const r = Number(((BigInt(next()) % MB) + MB) % MB);   // exact for |x| up to 1e18
  s = (s + r) % M;
  p = mul(p, r);
}
console.log(s + ' ' + p);
