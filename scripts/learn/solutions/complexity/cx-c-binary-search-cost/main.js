const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
const q = num();
const out = new Array(q);
for (let k = 0; k < q; k++) {
  const x = num();
  let lo = 0, hi = n - 1, probes = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    probes++;                                      // one read of a[mid]
    if (a[mid] === x) break;
    if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
  }
  out[k] = probes;
}
console.log(out.join('\n'));
