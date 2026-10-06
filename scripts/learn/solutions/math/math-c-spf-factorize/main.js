const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const N = 1000000;
const spf = new Int32Array(N + 1);
for (let p = 2; p <= N; p++) {
  if (spf[p]) continue;
  spf[p] = p;
  for (let j = p * p; j <= N; j += p) if (!spf[j]) spf[j] = p;
}
const q = num();
const out = [];
for (let i = 0; i < q; i++) {
  let x = num();
  const f = [];
  while (x > 1) { f.push(spf[x]); x /= spf[x]; }
  out.push(f.join(' '));
}
console.log(out.join('\n'));
