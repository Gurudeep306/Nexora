const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
let total = 0;
for (let i = 0; i < n; i++) { const x = num(); a.push(x); total += x; }
let left = 0, ans = -1;               // left = sum of a[0..i-1]
for (let i = 0; i < n; i++) {
  if (left === total - left - a[i]) { ans = i; break; }
  left += a[i];
}
console.log(String(ans));
