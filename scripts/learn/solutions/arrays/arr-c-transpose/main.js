const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const R = num(), C = num();
const a = [];
for (let i = 0; i < R; i++) {
  const row = [];
  for (let j = 0; j < C; j++) row.push(next());
  a.push(row);
}
const out = [];
for (let i = 0; i < C; i++) {        // output row i = input column i
  const line = [];
  for (let j = 0; j < R; j++) line.push(a[j][i]);
  out.push(line.join(' '));
}
console.log(out.join('\n'));
