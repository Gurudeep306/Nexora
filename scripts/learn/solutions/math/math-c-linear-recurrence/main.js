const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const M = 1000000007;
const mm = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M;
const k = num();
let e = BigInt(next());
const n = e;
const c = [], a = [];
for (let i = 0; i < k; i++) c.push(num());
for (let i = 0; i < k; i++) a.push(num());
const mul = (A, B) => {
  const C = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++)
    for (let t = 0; t < k; t++) {
      if (!A[i][t]) continue;
      for (let j = 0; j < k; j++) C[i][j] = (C[i][j] + mm(A[i][t], B[t][j])) % M;
    }
  return C;
};
if (n < BigInt(k)) {
  console.log(String(a[Number(n)]));
} else {
  let C = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === 0 ? c[j] : (j === i - 1 ? 1 : 0))));
  let R = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
  e = n - BigInt(k) + 1n;
  while (e > 0n) {
    if (e & 1n) R = mul(R, C);
    C = mul(C, C);
    e >>= 1n;
  }
  let ans = 0;
  for (let j = 0; j < k; j++) ans = (ans + mm(R[0][j], a[k - 1 - j])) % M;
  console.log(String(ans));
}
