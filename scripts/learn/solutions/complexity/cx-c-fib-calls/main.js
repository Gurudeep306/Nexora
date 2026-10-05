const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let q = 0; q < t; q++) {
  const n = num();
  let a = 0n, b = 1n;                             // BigInt: 2F(86) > 2^53
  for (let i = 0; i <= n; i++) { const c = a + b; a = b; b = c; }
  out.push(2n * a - 1n);                          // C(n) = 2F(n + 1) - 1
}
console.log(out.join('\n'));
