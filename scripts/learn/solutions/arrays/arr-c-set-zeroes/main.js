const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const R = num(), C = num();
const M = [];
for (let i = 0; i < R; i++) {
  const row = [];
  for (let j = 0; j < C; j++) row.push(num());
  M.push(row);
}
const row0 = M[0].some((v) => v === 0);
const col0 = M.some((row) => row[0] === 0);
for (let i = 1; i < R; i++)
  for (let j = 1; j < C; j++) if (M[i][j] === 0) { M[i][0] = 0; M[0][j] = 0; }   // flags
for (let i = 1; i < R; i++)
  for (let j = 1; j < C; j++) if (M[i][0] === 0 || M[0][j] === 0) M[i][j] = 0;
if (row0) M[0].fill(0);              // the flag row/column last
if (col0) for (let i = 0; i < R; i++) M[i][0] = 0;
console.log(M.map((row) => row.join(' ')).join('\n'));
