const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const n = BigInt(next());                       // up to 1e18: needs BigInt
  let pc = 0n;
  for (const ch of n.toString(2)) if (ch === '1') pc++;
  out.push(2n * n - pc);                          // 2n - popcount(n)
}
console.log(out.join('\n'));
