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
let top = 0, bottom = R - 1, left = 0, right = C - 1;
while (top <= bottom && left <= right) {
  for (let j = left; j <= right; j++) out.push(a[top][j]);
  top++;
  for (let i = top; i <= bottom; i++) out.push(a[i][right]);
  right--;
  if (top <= bottom) {               // a bottom row is left
    for (let j = right; j >= left; j--) out.push(a[bottom][j]);
    bottom--;
  }
  if (left <= right) {               // a left column is left
    for (let i = bottom; i >= top; i--) out.push(a[i][left]);
    left++;
  }
}
console.log(out.join(' '));
