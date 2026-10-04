const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), k = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let s = 0;
for (let i = 0; i < k; i++) s += a[i];
let best = s;                        // the first window, not 0
for (let i = k; i < n; i++) {
  s += a[i] - a[i - k];              // one enters, one leaves
  if (s > best) best = s;
}
console.log(String(best));
