const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const N = 200000;
const mu = new Int8Array(N + 1);
const comp = new Uint8Array(N + 1);
const primes = [];
mu[1] = 1;
for (let i = 2; i <= N; i++) {
  if (!comp[i]) { primes.push(i); mu[i] = -1; }
  for (const p of primes) {
    if (i * p > N) break;
    comp[i * p] = 1;
    if (i % p === 0) { mu[i * p] = 0; break; }
    mu[i * p] = -mu[i];
  }
}
const pre = new Int32Array(N + 1);
for (let i = 1; i <= N; i++) pre[i] = pre[i - 1] + mu[i];
const T = num();
const out = [];
for (let q = 0; q < T; q++) {
  const a = num(), b = num(), k = num();
  const A = Math.floor(a / k), B = Math.floor(b / k);
  let res = 0;                                     // < 4e10, exact as a Number
  for (let d = 1, lim = Math.min(A, B); d <= lim;) {
    const qa = Math.floor(A / d), qb = Math.floor(B / d);
    const e = Math.min(Math.floor(A / qa), Math.floor(B / qb));
    res += (pre[e] - pre[d - 1]) * qa * qb;
    d = e + 1;
  }
  out.push(String(res));
}
console.log(out.join('\n'));
