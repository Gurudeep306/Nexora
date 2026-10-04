const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
let w = 0;
for (let r = 0; r < n; r++) if (a[r] !== 0) a[w++] = a[r];   // keep non-zeros, in order
while (w < n) a[w++] = 0;                                     // the rest are zeros
console.log(a.join(' '));
