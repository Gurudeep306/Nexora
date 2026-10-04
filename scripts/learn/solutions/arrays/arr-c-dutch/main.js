const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let lo = 0, mid = 0, hi = n - 1;     // [0,lo)=0  [lo,mid)=1  [mid,hi]=?  (hi,n)=2
while (mid <= hi) {
  if (a[mid] === 0) { [a[lo], a[mid]] = [a[mid], a[lo]]; lo++; mid++; }
  else if (a[mid] === 1) mid++;
  else { [a[mid], a[hi]] = [a[hi], a[mid]]; hi--; }   // a[mid] is still unknown
}
console.log(a.join(' '));
