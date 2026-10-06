const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);

const mod = (a, m) => ((a % m) + m) % m;
// smallest x >= 0 with a*x + b*y = c (BigInt), as [x, y, g]; null if impossible
function minX(a, b, c) {
  let aa = a, bb = b, x0 = 1n, x1 = 0n;
  while (bb) {                                     // iterative extended Euclid
    const q = aa / bb;
    [aa, bb] = [bb, aa - q * bb];
    [x0, x1] = [x1, x0 - q * x1];
  }
  const g = aa;
  if (c % g !== 0n) return null;
  const m = b / g;
  const x = (mod(x0, m) * mod(c / g, m)) % m;
  return [x, (c - a * x) / b, g];
}

const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const a = BigInt(next()), b = BigInt(next()), c = BigInt(next());
  const r = minX(a, b, c);
  out.push(r === null ? '-1' : `${r[0]} ${r[1]}`);
}
console.log(out.join('\n'));
