const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const p = num(), t = num();
const F = new Array(p), IF = new Array(p);
F[0] = 1;
for (let i = 1; i < p; i++) F[i] = (F[i - 1] * i) % p;     // < 1e10: exact in a double
let b = F[p - 1], e = p - 2, inv = 1;
for (; e > 0; e = Math.floor(e / 2), b = (b * b) % p) if (e & 1) inv = (inv * b) % p;
IF[p - 1] = inv;
for (let i = p - 1; i > 0; i--) IF[i - 1] = (IF[i] * i) % p;
const bp = BigInt(p);
const out = [];
for (let i = 0; i < t; i++) {
    let n = BigInt(next()), r = BigInt(next());             // up to 1e18: BigInt
    let res = 1;
    while ((n > 0n || r > 0n) && res !== 0) {               // one base-p digit at a time
        const a = Number(n % bp), c = Number(r % bp);
        res = c > a ? 0 : (((res * F[a]) % p) * IF[c] % p) * IF[a - c] % p;
        n /= bp;
        r /= bp;
    }
    out.push(res);
}
console.log(out.join('\n'));
