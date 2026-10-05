const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let a = new Float64Array(n), buf = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
let inv = 0;                                        // <= 2e10 < 2^53: exact
for (let w = 1; w < n; w *= 2) {                    // bottom-up merge sort
  let lo = 0;
  for (; lo < n - w; lo += 2 * w) {
    const mid = lo + w, hi = Math.min(lo + 2 * w, n);
    let i = lo, j = mid, k = lo;
    while (i < mid && j < hi) {
      if (a[i] <= a[j]) buf[k++] = a[i++];
      else { inv += mid - i; buf[k++] = a[j++]; }   // a[j] jumps over the rest of the left run
    }
    while (i < mid) buf[k++] = a[i++];
    while (j < hi) buf[k++] = a[j++];
  }
  for (; lo < n; lo++) buf[lo] = a[lo];              // a lone tail run is copied unmerged
  [a, buf] = [buf, a];
}
console.log(String(inv));
