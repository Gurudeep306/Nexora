const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
let n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const p = num();
for (let i = p; i + 1 < n; i++) a[i] = a[i + 1];   // shift left, from the hole
a.length = --n;
console.log(n ? a.join(' ') : 'EMPTY');
