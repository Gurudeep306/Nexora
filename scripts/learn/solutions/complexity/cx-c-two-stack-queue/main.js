const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const q = num();
const ins = [], outs = [], res = [];
let moves = 0;
for (let i = 0; i < q; i++) {
  if (next() === '1') {
    ins.push(next());
  } else {
    if (outs.length === 0)                        // each element moves at most once
      while (ins.length) { outs.push(ins.pop()); moves++; }
    res.push(outs.pop());
  }
}
res.push(moves);
console.log(res.join('\n'));
