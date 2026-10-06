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

const abs = (v) => (v < 0n ? -v : v);
const floorDiv = (p, q) => {                       // q > 0n
  const d = p / q;
  return p % q !== 0n && p < 0n ? d - 1n : d;
};
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const a = BigInt(next()), b = BigInt(next()), c = BigInt(next());
  const r = minX(a, b, c);
  if (r === null) { out.push('-1'); continue; }
  const [x1, y1, g] = r;
  const m = b / g, n = a / g;
  const q = floorDiv(y1, n);
  let best = null;
  for (const k of [-1n, 0n, q, q + 1n]) {
    const x = x1 + k * m, y = y1 - k * n;
    const cost = abs(x) + abs(y);
    if (best === null || cost < best[0] || (cost === best[0] && x < best[1])) best = [cost, x, y];
  }
  out.push(`${best[1]} ${best[2]}`);
}
console.log(out.join('\n'));
