const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const first = new Map([[0, 0]]);     // prefix 0 before the first element
let p = 0, best = 0;
for (let j = 1; j <= n; j++) {
  p += num();
  const i = first.get(p - k);
  if (i !== undefined && j - i > best) best = j - i;
  if (!first.has(p)) first.set(p, j); // keep the earliest position
}
console.log(String(best));
