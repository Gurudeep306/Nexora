const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const cnt = new Map();
let lo = 0, distinct = 0, best = 0;
for (let hi = 0; hi < n; hi++) {
  const c = cnt.get(a[hi]) || 0;
  if (c === 0) distinct++;           // a new value entered the window
  cnt.set(a[hi], c + 1);
  while (distinct > k) {
    const d = cnt.get(a[lo]) - 1;
    cnt.set(a[lo], d);
    if (d === 0) distinct--;         // a value left the window completely
    lo++;
  }
  best = Math.max(best, hi - lo + 1);
}
console.log(String(best));
