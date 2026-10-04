const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const cnt = new Array(101).fill(0);
for (let i = 0; i < n; i++) cnt[num()]++;   // count every value once
const q = num();
const out = [];
for (let i = 0; i < q; i++) out.push(cnt[num()]);
console.log(out.join('\n'));
