const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let w = 1;                           // a[0..w-1] = distinct values so far
for (let r = 1; r < n; r++) if (a[r] !== a[w - 1]) a[w++] = a[r];
console.log(w + '\n' + a.slice(0, w).join(' '));
