const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const k = BigInt(next());              // k can be 1e18: use BigInt for the mod
const a = [];
for (let i = 0; i < n; i++) a.push(next());
const r = Number(k % BigInt(n));
const rev = (i, j) => { for (; i < j; i++, j--) { const t = a[i]; a[i] = a[j]; a[j] = t; } };
rev(0, n - 1);
rev(0, r - 1);
rev(r, n - 1);
console.log(a.join(' '));
