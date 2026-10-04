const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let c1 = 0, c2 = 1, k1 = 0, k2 = 0;
for (const x of a) {
  if (x === c1) k1++;
  else if (x === c2) k2++;
  else if (k1 === 0) { c1 = x; k1 = 1; }
  else if (k2 === 0) { c2 = x; k2 = 1; }
  else { k1--; k2--; }               // discard a triple of different values
}
let n1 = 0, n2 = 0;
for (const x of a) { if (x === c1) n1++; else if (x === c2) n2++; }
const res = [];
if (3 * n1 > n) res.push(c1);        // verify both candidates
if (3 * n2 > n) res.push(c2);
res.sort((p, q) => p - q);
console.log(res.length ? res.join(' ') : '-1');
