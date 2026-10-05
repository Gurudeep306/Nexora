const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();                     // n <= 1e12 < 2^53: exact
let cnt = 0;
for (let i = 1; i * i <= n; i++) if (n % i === 0) cnt += i * i === n ? 1 : 2;
console.log(String(cnt));
