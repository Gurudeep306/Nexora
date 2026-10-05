const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let first = -Infinity, second = -Infinity;
for (let i = 0; i < n; i++) {
  const x = num();
  if (x > first) { second = first; first = x; }
  else if (x > second) second = x;
}
let lg = 0;                                   // ceil(log2 n), computed exactly
while (2 ** lg < n) lg++;
console.log(`${second} ${n + lg - 2}`);
