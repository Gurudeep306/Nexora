const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = new Float64Array(n);
for (let i = 0; i < n; i++) a[i] = num();
a.sort();                            // equal values become neighbours
let distinct = 1;
for (let i = 1; i < n; i++) if (a[i] !== a[i - 1]) distinct++;
console.log(String(distinct));
