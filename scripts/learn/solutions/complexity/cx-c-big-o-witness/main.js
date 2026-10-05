const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const a = num(), C = num(), b = num(), c = num();
  const d = C - a;
  const q = (n) => d * n * n - b * n - c;            // <= 4e15 < 2^53: exact
  const c0 = Math.max(1, b > 0 ? Math.floor(b / (2 * d)) : 0);
  const m = q(c0 + 1) < 0 ? c0 + 1 : q(c0) < 0 ? c0 : 0;
  if (m === 0) { out.push(1); continue; }           // q >= 0 for every n >= 1
  let lo = m, hi = 2000000;                          // q(lo) < 0, q(hi) >= 0
  while (lo < hi) {                                  // last n with q(n) < 0
    const mid = Math.floor((lo + hi + 1) / 2);
    if (q(mid) < 0) lo = mid; else hi = mid - 1;
  }
  out.push(lo + 1);
}
console.log(out.join('\n'));
