const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

function powmod(a, e, m) {
  let r = 1n;
  a %= m;
  while (e > 0n) {
    if (e & 1n) r = (r * a) % m;
    a = (a * a) % m;
    e >>= 1n;
  }
  return r;
}

function isPrime(n) {
  if (n < 2n) return false;
  for (const p of BASES) if (n % p === 0n) return n === p;
  let d = n - 1n, r = 0;
  while ((d & 1n) === 0n) { d >>= 1n; r++; }      // n - 1 = d * 2^r
  for (const a of BASES) {
    let x = powmod(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let witness = true;
    for (let i = 1; i < r && witness; i++) {
      x = (x * x) % n;
      if (x === n - 1n) witness = false;
    }
    if (witness) return false;
  }
  return true;
}

const t = num();
const out = [];
for (let i = 0; i < t; i++) out.push(isPrime(BigInt(next())) ? 'YES' : 'NO');
console.log(out.join('\n'));
