const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);

// inverse of a modulo m, or -1 if gcd(a, m) != 1 (all values stay below 2^31 in size)
function inverse(a, m) {
    let r0 = a % m, r1 = m, s0 = 1, s1 = 0;            // invariant: r_i ≡ a * s_i (mod m)
    while (r1 !== 0) {
        const q = Math.floor(r0 / r1);
        [r0, r1] = [r1, r0 - q * r1];
        [s0, s1] = [s1, s0 - q * s1];
    }
    if (r0 !== 1) return -1;
    return ((s0 % m) + m) % m;
}

const t = num();
const out = [];
for (let i = 0; i < t; i++) {
    const a = num(), m = num();
    out.push(inverse(a, m));
}
console.log(out.join('\n'));
