const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const h = [];
for (let k = 0; k < n; k++) h.push(num());
let i = 0, j = n - 1, best = 0;
while (i < j) {
  best = Math.max(best, (j - i) * Math.min(h[i], h[j]));
  if (h[i] < h[j]) i++;              // the shorter wall can never do better
  else j--;
}
console.log(String(best));
