const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
// sums stay below 4e13 < 2^53, so Numbers are exact
function sortedSums(a) {
  let s = new Float64Array(1 << a.length), t = new Float64Array(s.length);
  let m = 1;
  for (const x of a) {
    let p = 0, q = 0, k = 0;
    while (p < m || q < m) {                    // merge s with s + x
      if (q === m || (p < m && s[p] <= s[q] + x)) t[k++] = s[p++];
      else t[k++] = s[q++] + x;
    }
    const tmp = s; s = t; t = tmp;
    m *= 2;
  }
  return s;
}
const n = num(), T = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const L = sortedSums(a.slice(0, n >> 1)), R = sortedSums(a.slice(n >> 1));
let cnt = 0, i = 0, j = R.length - 1;
while (i < L.length && j >= 0) {
  const s = L[i] + R[j];
  if (s < T) i++;
  else if (s > T) j--;
  else {                                        // multiply the runs of equal values
    let ci = 0, cj = 0;
    const x = L[i], y = R[j];
    while (i < L.length && L[i] === x) { i++; ci++; }
    while (j >= 0 && R[j] === y) { j--; cj++; }
    cnt += ci * cj;
  }
}
console.log(String(cnt));
