const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), W = num();
const w = [], v = [];
let V = 0;
for (let i = 0; i < n; i++) { w.push(num()); v.push(num()); V += v[i]; }
const mw = new Float64Array(V + 1).fill(Infinity);   // weights <= 1e11: exact as doubles
mw[0] = 0;
for (let i = 0; i < n; i++)
  for (let t = V; t >= v[i]; t--) {                  // min weight for value exactly t
    const cand = mw[t - v[i]] + w[i];
    if (cand < mw[t]) mw[t] = cand;
  }
let ans = V;
while (mw[ans] > W) ans--;
console.log(String(ans));
