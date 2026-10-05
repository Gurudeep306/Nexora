const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007;
// (a * b) % MOD without exceeding 2^53: split b into 16-bit halves
function mulmod(a, b) {
  const hi = Math.floor(b / 65536), lo = b % 65536;
  return ((a * hi % MOD) * 65536 + a * lo) % MOD;
}
const t = num();
const qs = new Int32Array(t);
let N = 1;
for (let i = 0; i < t; i++) { qs[i] = num(); if (qs[i] > N) N = qs[i]; }
const inv = new Float64Array(N + 1), H = new Float64Array(N + 1);
inv[1] = 1;
for (let i = 2; i <= N; i++) inv[i] = (MOD - mulmod(Math.floor(MOD / i), inv[MOD % i])) % MOD;  // linear inverses
for (let i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % MOD;                                  // H_i mod p
const out = new Array(t);
for (let i = 0; i < t; i++) { const n = qs[i]; out[i] = mulmod(n, H[n]); }
console.log(out.join('\n'));
