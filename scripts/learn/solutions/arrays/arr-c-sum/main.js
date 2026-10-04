const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let total = 0;                 // exact: |sum| <= 2e14 < 2^53
for (let i = 0; i < n; i++) total += num();
console.log(String(total));
