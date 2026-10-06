const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const CAP = 10n ** 18n;
const gcdN = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const gcdB = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const n = num();
let g = 0, l = 1n, over = false;
for (let i = 0; i < n; i++) {
  const x = num();
  g = gcdN(g, x);                                   // values <= 1e9: Number is exact
  if (!over) {
    const xb = BigInt(x);
    const q = l / gcdB(l, xb);
    if (q > CAP / xb) over = true;
    else l = q * xb;
  }
}
console.log(`${g}\n${over ? -1 : l}`);
