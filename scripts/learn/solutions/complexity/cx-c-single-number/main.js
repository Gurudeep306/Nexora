const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let acc = 0;                                       // 0 is the XOR identity
for (let i = 0; i < n; i++) acc ^= num();          // values < 2^31: int32 XOR is exact
console.log(String(acc));
