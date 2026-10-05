const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  let n = BigInt(next());
  const b = BigInt(next());
  let d = 1;
  while (n >= b) { n /= b; d++; }                    // strip one base-b digit
  out.push(d);
}
console.log(out.join('\n'));
