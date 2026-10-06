const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
// a * b mod m for 0 <= a, b < m < 2^30 without losing precision (a*b can reach 2^60)
const mulm = (a, b, m) => ((a * (b >>> 15)) % m * 32768 + a * (b & 32767)) % m;
function inverse(a, m) {                           // gcd(a, m) = 1, values < 2^31
    let r0 = a % m, r1 = m, s0 = 1, s1 = 0;
    while (r1 !== 0) {
        const q = Math.floor(r0 / r1);
        [r0, r1] = [r1, r0 - q * r1];
        [s0, s1] = [s1, s0 - q * s1];
    }
    return ((s0 % m) + m) % m;
}
function power(b, e, m) {
    let r = 1 % m;
    for (b %= m; e > 0; e = Math.floor(e / 2), b = mulm(b, b, m)) if (e & 1) r = mulm(r, b, m);
    return r;
}

const n = num(), m = num(), q = num();
const ps = [];                                     // distinct primes of m
let mm = m;
for (let d = 2; d * d <= mm; d++)
    if (mm % d === 0) { ps.push(d); while (mm % d === 0) mm /= d; }
if (mm > 1) ps.push(mm);
const w = ps.length;
const unit = new Float64Array(n + 1);              // coprime part of C(n, k) mod m
const ex = ps.map(() => new Int32Array(n + 1));    // exponent of each prime in C(n, k)
const c = new Array(w).fill(0);
let u = 1 % m;
unit[0] = u;
for (let k = 1; k <= n; k++) {
    let a = n - k + 1, b = k;
    for (let j = 0; j < w; j++) {
        const p = ps[j];
        while (a % p === 0) { a /= p; c[j]++; }
        while (b % p === 0) { b /= p; c[j]--; }
        ex[j][k] = c[j];
    }
    u = mulm(mulm(u, a % m, m), inverse(b % m, m), m);   // b is now coprime to m
    unit[k] = u;
}
const out = [];
for (let i = 0; i < q; i++) {
    const k = num();
    let r = unit[k];
    for (let j = 0; j < w; j++) r = mulm(r, power(ps[j], ex[j][k], m), m);
    out.push(r);
}
console.log(out.join('\n'));
