const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const h = [];
for (let k = 0; k < n; k++) h.push(num());
let i = 0, j = n - 1, lmax = 0, rmax = 0, water = 0;
while (i <= j) {
  if (lmax <= rmax) {                // the left side's level is already certain
    lmax = Math.max(lmax, h[i]);
    water += lmax - h[i++];
  } else {
    rmax = Math.max(rmax, h[j]);
    water += rmax - h[j--];
  }
}
console.log(String(water));
