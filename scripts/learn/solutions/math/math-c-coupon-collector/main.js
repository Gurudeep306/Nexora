const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007;
const mul = (a, b) => ((a * (b >>> 16)) % MOD * 65536 + a * (b & 65535)) % MOD;
const T = num();
const ms = [], cs = [];
let N = 1;
for (let i = 0; i < T; i++) { ms.push(num()); cs.push(num()); N = Math.max(N, ms[i]); }
const inv = new Float64Array(N + 1), H = new Float64Array(N + 1);
inv[1] = 1;
for (let i = 2; i <= N; i++) inv[i] = (MOD - mul(Math.floor(MOD / i), inv[MOD % i])) % MOD;
for (let i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % MOD;
const out = [];
for (let i = 0; i < T; i++) out.push(String(mul(ms[i], (H[ms[i]] - H[ms[i] - cs[i]] + MOD) % MOD)));
console.log(out.join('\n'));
