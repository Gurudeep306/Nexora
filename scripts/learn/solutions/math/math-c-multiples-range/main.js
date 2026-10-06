const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
// floor(a / b) for b > 0n; BigInt '/' truncates toward zero
const floorDiv = (a, b) => {
  const q = a / b;
  return a % b !== 0n && a < 0n ? q - 1n : q;
};
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const L = BigInt(next()), R = BigInt(next()), k = BigInt(next());
  out.push(String(floorDiv(R, k) - floorDiv(L - 1n, k)));
}
console.log(out.join('\n'));
