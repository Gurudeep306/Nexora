const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let mx = num(), mn = mx;            // start from a real element
for (let i = 1; i < n; i++) {
  const x = num();
  if (x > mx) mx = x;
  if (x < mn) mn = x;
}
console.log(mx + ' ' + mn);
