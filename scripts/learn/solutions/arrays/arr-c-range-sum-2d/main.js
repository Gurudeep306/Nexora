const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const R = num(), C = num(), q = num();
const P = [];
for (let i = 0; i <= R; i++) P.push(new Array(C + 1).fill(0));
for (let i = 0; i < R; i++)
  for (let j = 0; j < C; j++) P[i + 1][j + 1] = num() + P[i][j + 1] + P[i + 1][j] - P[i][j];
const out = [];
for (let t = 0; t < q; t++) {
  const r1 = num(), c1 = num(), r2 = num(), c2 = num();
  out.push(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);   // |sum| <= 2.5e14: exact
}
console.log(out.join('\n'));
