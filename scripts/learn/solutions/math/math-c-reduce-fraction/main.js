const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const gcd = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a;
};
const abs = (x) => (x < 0n ? -x : x);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  let p = BigInt(next()), q = BigInt(next());       // up to 1e18: needs BigInt
  const g = gcd(abs(p), abs(q));
  p /= g; q /= g;
  if (q < 0n) { p = -p; q = -q; }
  out.push(`${p}/${q}`);
}
console.log(out.join('\n'));
