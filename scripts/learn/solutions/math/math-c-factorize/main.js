const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  let n = num();                                   // <= 1e12 < 2^53: exact
  const parts = [];
  for (let d = 2; d * d <= n; d++) {
    if (n % d !== 0) continue;
    let e = 0;
    while (n % d === 0) { n /= d; e++; }
    parts.push(`${d}^${e}`);
  }
  if (n > 1) parts.push(`${n}^1`);
  out.push(parts.join(' '));
}
console.log(out.join('\n'));
