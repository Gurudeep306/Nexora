const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const iroot = (n, k) => {
  let r = BigInt(Math.max(1, Math.round(Math.pow(Number(n), 1 / k))));   // estimate
  const K = BigInt(k);
  while (r > 1n && r ** K > n) r--;                                      // exact fix-up
  while ((r + 1n) ** K <= n) r++;
  return r;
};
const T = num();
const out = [];
for (let i = 0; i < T; i++) {
  const n = BigInt(next());
  let ans = `${n} 1`;
  for (let k = 59; k >= 2; k--) {
    const r = iroot(n, k);
    if (r >= 2n && r ** BigInt(k) === n) { ans = `${r} ${k}`; break; }
  }
  out.push(ans);
}
console.log(out.join('\n'));
