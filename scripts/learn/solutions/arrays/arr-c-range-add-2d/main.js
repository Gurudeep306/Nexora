const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const R = num(), C = num();
let m = num();
const M = [];
for (let i = 0; i < R; i++) {
  const row = [];
  for (let j = 0; j < C; j++) row.push(num());
  M.push(row);
}
const D = [];
for (let i = 0; i <= R; i++) D.push(new Array(C + 1).fill(0));
while (m-- > 0) {
  const r1 = num(), c1 = num(), r2 = num(), c2 = num(), v = num();
  D[r1][c1] += v;                    // four corner marks
  D[r1][c2 + 1] -= v;
  D[r2 + 1][c1] -= v;
  D[r2 + 1][c2 + 1] += v;
}
const out = [];
for (let i = 0; i < R; i++) {
  const row = [];
  for (let j = 0; j < C; j++) {      // 2D prefix sum of the marks
    if (i) D[i][j] += D[i - 1][j];
    if (j) D[i][j] += D[i][j - 1];
    if (i && j) D[i][j] -= D[i - 1][j - 1];
    row.push(M[i][j] + D[i][j]);
  }
  out.push(row.join(' '));
}
console.log(out.join('\n'));
