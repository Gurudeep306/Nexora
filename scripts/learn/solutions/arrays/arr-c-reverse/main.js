const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(next());
for (let i = 0, j = n - 1; i < j; i++, j--) {
  const t = a[i]; a[i] = a[j]; a[j] = t;
}
console.log(a.join(' '));
