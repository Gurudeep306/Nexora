const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
a.sort();                                          // typed arrays sort numerically
let best = Infinity;
for (let i = 0; i + 1 < n; i++) best = Math.min(best, a[i + 1] - a[i]);
console.log(String(best));
