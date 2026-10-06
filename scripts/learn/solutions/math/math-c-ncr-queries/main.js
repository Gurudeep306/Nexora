const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const P = 1000000007;
const mul = (a, b) => ((a * (b >>> 15)) % P * 32768 + a * (b & 32767)) % P;
function power(b, e) {
    let r = 1;
    b %= P;
    while (e > 0) {
        if (e & 1) r = mul(r, b);
        b = mul(b, b);
        e = Math.floor(e / 2);
    }
    return r;
}
// factorials and inverse factorials up to N
function buildFact(N) {
    const F = new Int32Array(N + 1), IF = new Int32Array(N + 1);
    F[0] = 1;
    for (let i = 1; i <= N; i++) F[i] = mul(F[i - 1], i);
    IF[N] = power(F[N], P - 2);
    for (let i = N; i > 0; i--) IF[i - 1] = mul(IF[i], i);
    return [F, IF];
}

const [F, IF] = buildFact(1000000);
const t = num();
const out = [];
for (let i = 0; i < t; i++) {
    const n = num(), r = num();
    out.push(r > n ? 0 : mul(mul(F[n], IF[r]), IF[n - r]));
}
console.log(out.join('\n'));
