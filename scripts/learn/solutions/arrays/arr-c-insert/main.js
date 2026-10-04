const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = new Array(n + 1);
for (let i = 0; i < n; i++) a[i] = num();
const p = num(), x = num();
for (let i = n; i > p; i--) a[i] = a[i - 1];   // shift right, from the end
a[p] = x;
console.log(a.join(' '));
