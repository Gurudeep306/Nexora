const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let cand = 0, count = 0;
for (const x of a) {                 // pair off different values
  if (count === 0) cand = x;
  count += x === cand ? 1 : -1;
}
let occ = 0;
for (const x of a) if (x === cand) occ++;   // verify the survivor
console.log(String(2 * occ > n ? cand : -1));
