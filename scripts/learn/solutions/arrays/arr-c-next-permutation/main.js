const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let k = 0; k < n; k++) a.push(num());
let i = n - 2;
while (i >= 0 && a[i] >= a[i + 1]) i--;   // pivot: last ascent
if (i >= 0) {
  let j = n - 1;
  while (a[j] <= a[i]) j--;               // rightmost value bigger than the pivot
  [a[i], a[j]] = [a[j], a[i]];
}
for (let l = i + 1, r = n - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
console.log(a.join(' '));
