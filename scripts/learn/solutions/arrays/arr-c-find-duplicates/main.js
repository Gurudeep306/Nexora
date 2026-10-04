const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const dup = [];
for (let i = 0; i < n; i++) {
  const v = Math.abs(a[i]);          // the original value
  if (a[v - 1] < 0) dup.push(v);     // home slot already marked: seen before
  else a[v - 1] = -a[v - 1];         // mark v as seen
}
dup.sort((x, y) => x - y);
console.log(dup.length ? dup.join(' ') : '-1');
