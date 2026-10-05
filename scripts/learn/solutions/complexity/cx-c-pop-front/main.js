const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
let q = num();
const a = [];
let head = 0;                           // index of the current front
const out = [];
while (q-- > 0) {
  if (next() === '1') a.push(next());
  else out.push(a[head++]);             // O(1): no shift(), nothing moves
}
if (out.length) console.log(out.join('\n'));
