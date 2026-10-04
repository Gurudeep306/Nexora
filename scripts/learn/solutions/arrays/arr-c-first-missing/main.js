const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
for (let i = 0; i < n; i++) {
  while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] !== a[i]) {
    const h = a[i] - 1;              // send a[i] to its home index
    const t = a[h]; a[h] = a[i]; a[i] = t;
  }
}
let ans = n + 1;
for (let i = 0; i < n; i++) if (a[i] !== i + 1) { ans = i + 1; break; }
console.log(String(ans));
