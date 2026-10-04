const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const MOD = 1000000007n;             // BigInt: 1e9 * 1e9 is beyond 2^53
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(BigInt(next()) % MOD);
const out = new Array(n);
let pre = 1n;
for (let i = 0; i < n; i++) { out[i] = pre; pre = (pre * a[i]) % MOD; }   // product left of i
let suf = 1n;
for (let i = n - 1; i >= 0; i--) {                                        // times product right of i
  out[i] = (out[i] * suf) % MOD;
  suf = (suf * a[i]) % MOD;
}
console.log(out.join(' '));
