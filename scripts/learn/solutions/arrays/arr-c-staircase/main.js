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
const q = num();
const out = [];
for (let t = 0; t < q; t++) {
  const x = num();
  let i = 0, j = C - 1, found = false;   // top-right corner
  while (i < R && j >= 0) {
    if (M[i][j] === x) { found = true; break; }
    if (M[i][j] > x) j--;                // the whole column is too big
    else i++;                            // the whole row is too small
  }
  out.push(found ? 'YES' : 'NO');
}
console.log(out.join('\n'));
