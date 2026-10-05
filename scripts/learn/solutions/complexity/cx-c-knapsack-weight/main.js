const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), W = num();
const best = new Float64Array(W + 1);   // values <= 1e11: exact as doubles
for (let i = 0; i < n; i++) {
  const w = num(), v = num();
  for (let c = W; c >= w; c--) {        // downwards: each item at most once
    const cand = best[c - w] + v;
    if (cand > best[c]) best[c] = cand;
  }
}
console.log(String(best[W]));
