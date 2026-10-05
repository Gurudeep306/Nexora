const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const gcd = (a, b) => { while (b) { [a, b] = [b, a % b]; } return a; };
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
  const n = BigInt(next()), a = BigInt(next()), b = BigInt(next());
  const l = a / gcd(a, b) * b;                       // lcm
  out.push(n / a + n / b - n / l);                   // BigInt division floors for positives
}
console.log(out.join('\n'));
