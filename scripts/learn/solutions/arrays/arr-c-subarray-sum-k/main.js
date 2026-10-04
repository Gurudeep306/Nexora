const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const seen = new Map([[0, 1]]);      // the empty prefix
let p = 0, count = 0;
for (let i = 0; i < n; i++) {
  p += num();
  count += seen.get(p - k) || 0;     // earlier prefixes P with p - P = k
  seen.set(p, (seen.get(p) || 0) + 1);
}
console.log(String(count));
