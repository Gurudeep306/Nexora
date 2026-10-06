const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const P = 1000000007;
const PB = 1000000007n;
const mulm = (a, b, m) => ((a * (b >>> 16)) % m * 65536 + a * (b & 65535)) % m;   // a, b < m < 2^30
const power = (b, e, m) => {          // e is a BigInt
  let r = 1 % m;
  for (const ch of e.toString(2)) {
    r = mulm(r, r, m);
    if (ch === '1') r = mulm(r, b, m);
  }
  return e === 0n ? 1 % m : r;
};
const q = num();
const out = [];
for (let i = 0; i < q; i++) {
  const a = BigInt(next()), b = BigInt(next()), c = BigInt(next());
  const r = Number(a % PB);
  if (r === 0) out.push(b === 0n && c > 0n ? 1 : 0);
  else {
    const x = power(Number(b % (PB - 1n)), c, P - 1);   // b^c mod (P-1)
    out.push(power(r, BigInt(x), P));
  }
}
console.log(out.join('\n'));
