const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
a.sort();                            // typed arrays sort numerically
let count = 0;
for (let i = 0; i < n; i++) {
  if (i > 0 && a[i] === a[i - 1]) continue;          // each first value once
  let lo = i + 1, hi = n - 1;
  while (lo < hi) {
    const s = a[i] + a[lo] + a[hi];
    if (s < 0) lo++;
    else if (s > 0) hi--;
    else {
      count++;
      lo++;
      while (lo < hi && a[lo] === a[lo - 1]) lo++;   // each second value once
      hi--;
    }
  }
}
console.log(String(count));
