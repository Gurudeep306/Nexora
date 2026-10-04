const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = BigInt(next());            // up to 1e18: BigInt
let cap = 1n, copies = 0n;
while (cap < n) {                    // full before a push: copy everything, double
  copies += cap;
  cap *= 2n;
}
console.log(copies + ' ' + cap);
