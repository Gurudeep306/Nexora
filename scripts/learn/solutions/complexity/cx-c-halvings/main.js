const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  let n = BigInt(next());            // up to 1e18: beyond 2^53, so BigInt
  let steps = 0;
  while (n > 1n) { n /= 2n; steps++; }
  out.push(steps);
}
console.log(out.join('\n'));
