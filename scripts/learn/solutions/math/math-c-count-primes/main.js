const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const q = num();
const N = 5000000;
const comp = new Uint8Array(N + 1);
comp[0] = comp[1] = 1;
for (let p = 2; p * p <= N; p++)
  if (!comp[p]) for (let j = p * p; j <= N; j += p) comp[j] = 1;
const pi = new Int32Array(N + 1);
for (let v = 1; v <= N; v++) pi[v] = pi[v - 1] + (comp[v] ? 0 : 1);   // prefix count
const out = [];
for (let i = 0; i < q; i++) out.push(pi[num()]);
console.log(out.join('\n'));
