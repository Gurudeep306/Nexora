const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const first = new Map();
for (let i = 1; i <= n; i++) {
  const x = num();
  if (!first.has(x)) first.set(x, i);             // keep the earliest position
}
const q = num();
const out = new Array(q);
for (let k = 0; k < q; k++) {
  const p = first.get(num());
  out[k] = p === undefined ? n : p;
}
console.log(out.join('\n'));
