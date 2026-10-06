const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const T = num();
const out = [];
for (let q = 0; q < T; q++) {
  const n = num();                    // n <= 1e12 < 2^53: exact as a Number
  let m = num();
  const ps = [];
  for (let d = 2; d * d <= m; d++) {
    if (m % d === 0) {
      ps.push(d);
      while (m % d === 0) m /= d;
    }
  }
  if (m > 1) ps.push(m);
  let total = 0;
  for (let mask = 0; mask < (1 << ps.length); mask++) {
    let d = 1, bits = 0;
    for (let i = 0; i < ps.length; i++) if (mask >> i & 1) { d *= ps[i]; bits++; }
    const cnt = (n - n % d) / d;      // exact floor division
    total += bits % 2 ? -cnt : cnt;
  }
  out.push(String(total));
}
console.log(out.join('\n'));
