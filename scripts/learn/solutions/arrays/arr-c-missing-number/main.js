const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let sum = 0;
for (let i = 0; i < n; i++) sum += num();
console.log(String((n * (n + 1)) / 2 - sum));       // expected total minus actual total
