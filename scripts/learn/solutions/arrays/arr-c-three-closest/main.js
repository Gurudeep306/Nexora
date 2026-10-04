const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), T = num();
const a = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
a.sort();
let best = a[0] + a[1] + a[2];
outer:
for (let i = 0; i < n; i++) {
  let lo = i + 1, hi = n - 1;
  while (lo < hi) {
    const s = a[i] + a[lo] + a[hi];
    const d = Math.abs(s - T), bd = Math.abs(best - T);
    if (d < bd || (d === bd && s < best)) best = s;  // closer, or tie and smaller
    if (s < T) lo++;
    else if (s > T) hi--;
    else break outer;                                // exact hit
  }
}
console.log(String(best));
