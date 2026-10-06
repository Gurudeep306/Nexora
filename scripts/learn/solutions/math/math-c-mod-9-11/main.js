const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const out = [];
for (let q = 0; q < t; q++) {
  const s = next();
  const n = s.length;
  let sum = 0, alt = 0;
  for (let i = 0; i < n; i++) {
    const d = s.charCodeAt(n - 1 - i) - 48;
    sum += d;
    alt += i % 2 === 0 ? d : -d;                  // 10 ≡ -1 (mod 11)
  }
  out.push(`${sum % 9} ${((alt % 11) + 11) % 11}`);
}
console.log(out.join('\n'));
