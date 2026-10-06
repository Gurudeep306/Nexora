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

const n = num();
let total = 0;
for (let i = 0; i < n; i++) {
    const a = ((num() % P) + P) % P;                     // negative numerators
    const b = num();
    total = (total + mul(a, power(b, P - 2))) % P;
}
console.log(String(total));
