const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007;
const mul = (a, b) => ((a * (b >>> 16)) % MOD * 65536 + a * (b & 65535)) % MOD;
const pw = (b, e) => {
  let r = 1;
  while (e > 0) { if (e & 1) r = mul(r, b); b = mul(b, b); e = Math.floor(e / 2); }
  return r;
};
const T = num();
const q = [];
let N = 1;
for (let i = 0; i < T; i++) { q.push(num()); N = Math.max(N, q[i]); }
const D = new Float64Array(N + 1), F = new Float64Array(N + 1);
D[0] = 1; F[0] = 1;
for (let i = 1; i <= N; i++) {
  D[i] = (mul(i, D[i - 1]) + (i % 2 ? MOD - 1 : 1)) % MOD;
  F[i] = mul(F[i - 1], i);
}
console.log(q.map(n => String(mul(D[n], pw(F[n], MOD - 2)))).join('\n'));
