const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
// a * b mod m for 0 <= a, b < m < 2^30 without losing precision (a*b can reach 2^60)
const mulm = (a, b, m) => ((a * (b >>> 15)) % m * 32768 + a * (b & 32767)) % m;
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
// inverse of a modulo m (gcd(a, m) = 1), extended Euclid
function inverse(a, m) {
    let r0 = a % m, r1 = m, s0 = 1, s1 = 0;
    while (r1 !== 0) {
        const q = Math.floor(r0 / r1);
        [r0, r1] = [r1, r0 - q * r1];
        [s0, s1] = [s1, s0 - q * s1];
    }
    return ((s0 % m) + m) % m;
}

const t = num();
const out = [];
for (let i = 0; i < t; i++) {
    const a1 = num(), m1 = num(), a2 = num(), m2 = num();
    const g = gcd(m1, m2);
    const d = (((a2 - a1) % m2) + m2) % m2;
    if (d % g !== 0) { out.push('-1'); continue; }
    const mg = m2 / g;
    const k = mulm((d / g) % mg, inverse((m1 / g) % mg, mg), mg);   // m1 * k ≡ d (mod m2)
    out.push(String(BigInt(a1) + BigInt(m1) * BigInt(k)));          // up to 1e18: BigInt
}
console.log(out.join('\n'));
