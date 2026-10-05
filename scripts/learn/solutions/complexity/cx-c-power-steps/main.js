const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const n = BigInt(next()), c = BigInt(next());
  let p = 1n, k = 0;
  while (p < n) { p *= c; k++; }                     // BigInt cannot overflow
  out.push(k);
}
console.log(out.join('\n'));
