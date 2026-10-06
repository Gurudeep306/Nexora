const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = BigInt(next());
const k = num();
const a = [];
for (let i = 0; i < k; i++) a.push(BigInt(next()));
const gcd = (x, y) => { while (y) { [x, y] = [y, x % y]; } return x; };
let total = 0n;
const stack = [[0, 1n, 0]];
while (stack.length) {
  const [i, l, sz] = stack.pop();
  if (i === k) {
    if (sz) total += sz % 2 ? n / l : -(n / l);   // BigInt division floors for positives
    continue;
  }
  stack.push([i + 1, l, sz]);
  const nl = l / gcd(l, a[i]) * a[i];
  if (nl <= n) stack.push([i + 1, nl, sz + 1]);
}
console.log(total.toString());
