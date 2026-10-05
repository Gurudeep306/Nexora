const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const t = num();
const q = new Int32Array(t);
let N = 2;
for (let i = 0; i < t; i++) { q[i] = num(); if (q[i] > N) N = q[i]; }
const composite = new Uint8Array(N + 1);
composite[0] = composite[1] = 1;
for (let i = 2; i * i <= N; i++)
  if (!composite[i])
    for (let j = i * i; j <= N; j += i) composite[j] = 1;   // O(N log log N)
const pi = new Int32Array(N + 1);
for (let x = 1; x <= N; x++) pi[x] = pi[x - 1] + (composite[x] ^ 1);   // prefix counts
const out = new Array(t);
for (let i = 0; i < t; i++) out[i] = pi[q[i]];
console.log(out.join('\n'));
