const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
function powmod(a, b, m) {           // BigInt throughout
  let result = 1n % m, base = a % m;
  while (b > 0n) {
    if (b & 1n) result = (result * base) % m;   // this bit of b is set
    base = (base * base) % m;                   // a^(2^k) for the next bit
    b >>= 1n;
  }
  return result;
}
const q = num();
const out = [];
for (let i = 0; i < q; i++) out.push(powmod(BigInt(next()), BigInt(next()), BigInt(next())));
console.log(out.join('\n'));
