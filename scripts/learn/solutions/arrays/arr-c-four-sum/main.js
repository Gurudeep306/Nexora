const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), T = num();
const a = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
a.sort();
let count = 0;
for (let i = 0; i < n; i++) {
  if (i > 0 && a[i] === a[i - 1]) continue;
  for (let j = i + 1; j < n; j++) {
    if (j > i + 1 && a[j] === a[j - 1]) continue;
    let lo = j + 1, hi = n - 1;
    while (lo < hi) {
      const s = a[i] + a[j] + a[lo] + a[hi];          // up to 4e9: exact in doubles
      if (s < T) lo++;
      else if (s > T) hi--;
      else {
        count++;
        lo++;
        while (lo < hi && a[lo] === a[lo - 1]) lo++;
        hi--;
      }
    }
  }
}
console.log(String(count));
