const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const M = 1000000007;
const MB = 1000000007n;
const mul = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M;
const power = (b, e) => {               // b < M, e a non-negative Number < 2^31
  let r = 1;
  while (e > 0) {
    if (e & 1) r = mul(r, b);
    b = mul(b, b);
    e = Math.floor(e / 2);
  }
  return r;
};
const k = num();
let d = 1, s = 1;
for (let i = 0; i < k; i++) {
  const p = BigInt(next()), e1 = BigInt(next()) + 1n;    // exponent e + 1
  d = mul(d, Number(e1 % MB));
  const r = Number(p % MB);
  let term;
  if (r === 1) term = Number(e1 % MB);
  else if (r === 0) term = 1;                            // p = M: 1 + M + ... = 1
  else {
    const ex = Number(e1 % (MB - 1n));                   // Fermat: r^(M-1) = 1
    term = mul((power(r, ex) - 1 + M) % M, power(r - 1, M - 2));
  }
  s = mul(s, term);
}
console.log(d + ' ' + s);
