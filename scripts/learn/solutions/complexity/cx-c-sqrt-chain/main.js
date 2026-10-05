const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const isqrt = (n) => {                               // n: BigInt
  let r = BigInt(Math.floor(Math.sqrt(Number(n))));  // guess, may be off by one
  while (r * r > n) r--;
  while ((r + 1n) * (r + 1n) <= n) r++;              // now r^2 <= n < (r+1)^2
  return r;
};
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  let n = BigInt(next()), c = 0;
  while (n >= 2n) { n = isqrt(n); c++; }
  out.push(c);
}
console.log(out.join('\n'));
