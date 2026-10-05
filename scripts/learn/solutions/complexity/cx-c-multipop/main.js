const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const q = num();
const st = new Float64Array(q);
let top = 0;
const out = [];
for (let i = 0; i < q; i++) {
  const t = num(), x = num();
  if (t === 1) { st[top++] = x; continue; }
  let sum = 0;                                    // <= 2e14 < 2^53: exact
  let m = Math.min(x, top);
  while (m-- > 0) sum += st[--top];
  out.push(sum);
}
console.log(out.join('\n'));
