const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const L = BigInt(BigInt(next()).toString(2).length);   // bit length of n
  out.push((1n << L) - 1n);                              // 1 + 2 + ... + 2^(L-1)
}
console.log(out.join('\n'));
