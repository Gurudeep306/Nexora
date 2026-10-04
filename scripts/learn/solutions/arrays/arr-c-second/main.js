const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
let first = -1, second = -1;        // values are >= 0, so -1 means "none"
for (let i = 0; i < n; i++) {
  const x = num();
  if (x > first) {
    second = first;
    first = x;
  } else if (x < first && x > second) {
    second = x;
  }
}
console.log(String(second));
