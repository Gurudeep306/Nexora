const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
// a * b mod m for 0 <= a, b < m < 2^30 without losing precision (a*b can reach 2^60)
const mulm = (a, b, m) => ((a * (b >>> 15)) % m * 32768 + a * (b & 32767)) % m;
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
function inverse(a, m) {                           // gcd(a, m) = 1, all values < 2^31
    let r0 = a % m, r1 = m, s0 = 1, s1 = 0;
    while (r1 !== 0) {
        const q = Math.floor(r0 / r1);
        [r0, r1] = [r1, r0 - q * r1];
        [s0, s1] = [s1, s0 - q * s1];
    }
    return ((s0 % m) + m) % m;
}

const n = num();
let X = 0n, M = 1n;                                // up to 1e18: BigInt
let ok = true;
for (let i = 0; i < n && ok; i++) {
    const a = num(), m = num(), bm = BigInt(m);
    const Mm = Number(M % bm);                     // M mod m, a small number
    const g = gcd(Mm, m);                          // gcd(M, m) = gcd(M mod m, m)
    const d = ((a - Number(X % bm)) % m + m) % m;
    if (d % g !== 0) { ok = false; break; }
    const mg = m / g;
    const Mg = Number((M / BigInt(g)) % BigInt(mg));
    const k = mulm((d / g) % mg, inverse(Mg, mg), mg);
    X += M * BigInt(k);
    M = M / BigInt(g) * bm;
}
console.log(ok ? String(X) : '-1');
