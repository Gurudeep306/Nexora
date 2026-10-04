const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const x = num();
let ans = -1;
for (let i = 0; i < n; i++) {
  if (a[i] === x) { ans = i; break; }   // first occurrence: stop here
}
console.log(String(ans));
