// Josephus k=2 closed form: n = 2^m + l -> survivor 2l+1.
// n up to 1e18 exceeds 2^53, so BigInt is mandatory.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(s => s.length);
const T = Number(data[0]);
const out = [];
for (let i = 1; i <= T; i++) {
  const n = BigInt(data[i]);
  // largest power of two <= n: find the highest set bit
  let p = 1n;
  while (p * 2n <= n) p *= 2n;
  const l = n - p;
  out.push((2n * l + 1n).toString());
}
console.log(out.join('\n'));
