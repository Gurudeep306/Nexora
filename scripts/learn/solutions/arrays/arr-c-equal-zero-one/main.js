const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const first = new Int32Array(2 * n + 1).fill(-1);   // prefix value v stored at v + n
first[n] = 0;
let p = 0, best = 0;
for (let j = 1; j <= n; j++) {
  p += num() === 1 ? 1 : -1;         // count a 0 as -1
  if (first[p + n] >= 0) best = Math.max(best, j - first[p + n]);
  else first[p + n] = j;
}
console.log(String(best));
