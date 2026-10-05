const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), T = num();
const seen = new Map();
let count = 0;
for (let j = 0; j < n; j++) {
  const x = num();
  count += seen.get(T - x) || 0;     // earlier partners of x
  seen.set(x, (seen.get(x) || 0) + 1);
}
console.log(String(count));
