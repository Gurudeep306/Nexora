const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
let n = num();                       // <= 1e12: exact as a double
let cnt = 1, sig = 1;
for (let d = 2; d * d <= n; d += (d === 2 ? 1 : 2)) {
  if (n % d !== 0) continue;
  let e = 0, pw = 1, term = 1;
  while (n % d === 0) { n /= d; e++; pw *= d; term += pw; }
  cnt *= e + 1;
  sig *= term;                       // stays below 5e12 < 2^53
}
if (n > 1) { cnt *= 2; sig *= n + 1; }
console.log(cnt + ' ' + sig);
