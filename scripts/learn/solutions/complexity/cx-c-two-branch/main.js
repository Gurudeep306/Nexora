const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const memo = new Map([['0', 0n]]);               // key: decimal string of the argument
const out = [];
for (let q = 0; q < t; q++) {
  const n = BigInt(next());                       // up to 1e18: BigInt
  const stack = [n];
  while (stack.length) {                          // iterative memoised DFS
    const m = stack[stack.length - 1], km = m.toString();
    if (memo.has(km)) { stack.pop(); continue; }
    const x = m / 2n, y = m / 3n, kx = x.toString(), ky = y.toString();
    if (memo.has(kx) && memo.has(ky)) {
      memo.set(km, memo.get(kx) + memo.get(ky) + 1n);
      stack.pop();
    } else {
      if (!memo.has(kx)) stack.push(x);
      if (!memo.has(ky)) stack.push(y);
    }
  }
  out.push(memo.get(n.toString()));
}
console.log(out.join('\n'));
