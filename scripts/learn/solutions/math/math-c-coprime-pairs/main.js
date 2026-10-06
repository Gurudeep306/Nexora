const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const N = 1000000;
const phi = new Int32Array(N + 1);
for (let v = 0; v <= N; v++) phi[v] = v;
for (let p = 2; p <= N; p++)
  if (phi[p] === p) for (let j = p; j <= N; j += p) phi[j] -= (phi[j] / p) | 0;
const pre = new Float64Array(N + 1);           // sums stay below 2^53
for (let v = 1; v <= N; v++) pre[v] = pre[v - 1] + phi[v];
const q = num();
const out = [];
for (let i = 0; i < q; i++) out.push(String(2 * pre[num()] - 1));
console.log(out.join('\n'));
