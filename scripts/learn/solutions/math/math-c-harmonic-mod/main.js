const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const P = 1000000007;
const mul = (a, b) => ((a * (b >>> 15)) % P * 32768 + a * (b & 32767)) % P;

const t = num();
const q = new Int32Array(t);
let N = 1;
for (let i = 0; i < t; i++) { q[i] = num(); if (q[i] > N) N = q[i]; }
const inv = new Int32Array(N + 1), H = new Int32Array(N + 1);
inv[1] = 1;
for (let i = 2; i <= N; i++) inv[i] = (P - mul(Math.floor(P / i), inv[P % i])) % P;
for (let i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % P;
const out = [];
for (let i = 0; i < t; i++) out.push(H[q[i]]);
console.log(out.join('\n'));
