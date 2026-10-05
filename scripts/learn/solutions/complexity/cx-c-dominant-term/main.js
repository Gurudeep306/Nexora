const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
let t = num();
const out = [];
while (t-- > 0) {
  const d = num();
  let top = -1;
  for (let i = 0; i <= d; i++) {        // coefficient i belongs to n^(d - i)
    const c = num();
    if (c !== 0 && top < 0) top = d - i;
  }
  out.push(top === 0 ? 'Theta(1)' : top === 1 ? 'Theta(n)' : `Theta(n^${top})`);
}
console.log(out.join('\n'));
