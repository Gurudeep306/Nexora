const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const have = new Set();
for (let i = 0; i < n; i++) have.add(num());   // O(1) expected lookups
const q = num();
const out = new Array(q);
for (let i = 0; i < q; i++) out[i] = have.has(num()) ? 'YES' : 'NO';
console.log(out.join('\n'));
