const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
function isPrime(n) {                // n <= 1e12 < 2^53: exact in doubles
  if (n < 2) return false;
  if (n < 4) return true;            // 2 and 3
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) if (n % i === 0 || n % (i + 2) === 0) return false;
  return true;
}
const t = num();
const out = [];
for (let i = 0; i < t; i++) out.push(isPrime(num()) ? 'YES' : 'NO');
console.log(out.join('\n'));
