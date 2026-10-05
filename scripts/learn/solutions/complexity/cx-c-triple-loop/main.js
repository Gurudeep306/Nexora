const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const n = BigInt(next());
  out.push(n * (n + 1n) * (n + 2n) / 6n);            // ~8e18 > 2^53: BigInt
}
console.log(out.join('\n'));
