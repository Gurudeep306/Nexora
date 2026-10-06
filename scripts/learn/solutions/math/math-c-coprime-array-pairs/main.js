const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = new Int32Array(n);
let M = 1;
for (let i = 0; i < n; i++) { a[i] = num(); if (a[i] > M) M = a[i]; }
const mu = new Int8Array(M + 1);
const comp = new Uint8Array(M + 1);
const primes = [];
mu[1] = 1;
for (let i = 2; i <= M; i++) {
  if (!comp[i]) { primes.push(i); mu[i] = -1; }
  for (const p of primes) {
    if (i * p > M) break;
    comp[i * p] = 1;
    if (i % p === 0) { mu[i * p] = 0; break; }
    mu[i * p] = -mu[i];
  }
}
const freq = new Int32Array(M + 1);
for (const x of a) freq[x]++;
let ans = 0;                                        // stays below 2^53
for (let d = 1; d <= M; d++) {
  if (!mu[d]) continue;
  let c = 0;
  for (let v = d; v <= M; v += d) c += freq[v];
  ans += mu[d] * ((c * (c - 1)) / 2);
}
console.log(String(ans));
