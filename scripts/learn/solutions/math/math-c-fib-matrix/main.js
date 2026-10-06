const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const M = 1000000007;
const mul = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M;
const q = num();
const out = [];
for (let i = 0; i < q; i++) {
  const bits = BigInt(next()).toString(2);
  let a = 0, b = 1;                              // (F(k), F(k+1))
  for (const ch of bits) {
    const c = mul(a, (2 * b - a + M) % M);
    const d = (mul(a, a) + mul(b, b)) % M;
    if (ch === '1') { a = d; b = (c + d) % M; } else { a = c; b = d; }
  }
  out.push(a);
}
console.log(out.join('\n'));
