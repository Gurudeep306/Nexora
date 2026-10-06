const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const q = num();
const out = [];
for (let i = 0; i < q; i++) {
  const a = BigInt(next()), b = BigInt(next()), m = BigInt(next());
  const r = (((a % m) * (b % m)) % m + m) % m;   // BigInt is exact; fix the sign at the end
  out.push(r.toString());
}
console.log(out.join('\n'));
