const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const a = num(), b = num(), t = next();
const d = [];
for (const ch of t) d.push(parseInt(ch, 36));
const out = [];
let start = 0;
while (start < d.length && d[start] === 0) start++;
while (start < d.length) {
  let rem = 0;
  for (let i = start; i < d.length; i++) {         // long division by b in base a
    const cur = rem * a + d[i];
    d[i] = Math.floor(cur / b);
    rem = cur % b;
  }
  out.push(rem.toString(36).toUpperCase());
  while (start < d.length && d[start] === 0) start++;
}
console.log(out.length ? out.reverse().join('') : '0');
