const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const f = [num(), num(), num()], g = [num(), num(), num()];
  let c = 0;
  for (let k = 0; k < 3 && c === 0; k++) c = Math.sign(f[k] - g[k]);   // p, then a, then b
  out.push(c < 0 ? '<' : c > 0 ? '>' : '=');
}
console.log(out.join('\n'));
