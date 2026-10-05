const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const isqrt = (m) => {                               // m: BigInt
  let r = BigInt(Math.floor(Math.sqrt(Number(m))));  // guess, may be off by one
  while (r * r > m) r--;
  while ((r + 1n) * (r + 1n) <= m) r++;              // now r^2 <= m < (r+1)^2
  return r;
};
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const a = BigInt(next()), b = BigInt(next());
  out.push(isqrt(b) - isqrt(a - 1n));
}
console.log(out.join('\n'));
