const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const P = 1000000007;
// a*b mod P for a, b < P without exceeding 2^53: split b into 15-bit halves
const mulmod = (a, b) => ((a * (b >>> 15)) % P * 32768 + a * (b & 32767)) % P;
const t = num();
const q = new Int32Array(t);
let mx = 1;
for (let i = 0; i < t; i++) { q[i] = num(); if (q[i] > mx) mx = q[i]; }
const inv = new Float64Array(mx + 1), H = new Float64Array(mx + 1);
inv[1] = 1;
for (let i = 2; i <= mx; i++) inv[i] = (P - mulmod(Math.floor(P / i), inv[P % i])) % P;
for (let i = 1; i <= mx; i++) H[i] = (H[i - 1] + inv[i]) % P;
const out = new Array(t);
for (let i = 0; i < t; i++) {
  const n = q[i];
  out[i] = (mulmod((2 * (n + 1)) % P, H[n]) - (4 * n) % P + P) % P;   // 2(n+1)H_n - 4n
}
console.log(out.join('\n'));
