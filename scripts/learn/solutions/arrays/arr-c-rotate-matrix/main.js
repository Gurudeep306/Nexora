const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const N = num();
const a = [];
for (let i = 0; i < N; i++) {
  const row = [];
  for (let j = 0; j < N; j++) row.push(next());
  a.push(row);
}
for (let i = 0; i < N; i++)          // transpose
  for (let j = i + 1; j < N; j++) { const t = a[i][j]; a[i][j] = a[j][i]; a[j][i] = t; }
for (const row of a) row.reverse();  // mirror each row
console.log(a.map((row) => row.join(' ')).join('\n'));
