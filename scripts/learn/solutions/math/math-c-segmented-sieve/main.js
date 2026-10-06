const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const L = num(), R = num();                      // <= 1e12: exact doubles
let lim = Math.floor(Math.sqrt(R));
while (lim * lim > R) lim--;
while ((lim + 1) * (lim + 1) <= R) lim++;
const comp = new Uint8Array(lim + 1);
const primes = [];
for (let p = 2; p <= lim; p++) {
  if (comp[p]) continue;
  primes.push(p);
  for (let j = p * p; j <= lim; j += p) comp[j] = 1;
}
const size = R - L + 1;
const cross = new Uint8Array(size);              // cross[i] <-> L + i
for (const p of primes) {
  const s = Math.max(p * p, L % p === 0 ? L : L + p - (L % p));   // integer ceil to a multiple
  for (let i = s - L; i < size; i += p) cross[i] = 1;
}
if (L === 1) cross[0] = 1;
let cnt = 0;
for (let i = 0; i < size; i++) if (!cross[i]) cnt++;
console.log(String(cnt));
