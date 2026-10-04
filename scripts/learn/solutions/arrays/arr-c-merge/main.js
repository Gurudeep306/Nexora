const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num(), m = num();
const A = [], B = [];
for (let k = 0; k < n; k++) A.push(num());
for (let k = 0; k < m; k++) B.push(num());
const out = [];
let i = 0, j = 0;
while (i < n && j < m) out.push(A[i] <= B[j] ? A[i++] : B[j++]);   // ties: A first
while (i < n) out.push(A[i++]);
while (j < m) out.push(B[j++]);
console.log(out.join(' '));
