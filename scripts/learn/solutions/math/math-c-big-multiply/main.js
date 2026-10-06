const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const a = next(), b = next();
const la = a.length, lb = b.length;
const col = new Int32Array(la + lb);
for (let i = 0; i < la; i++) {
  const x = a.charCodeAt(la - 1 - i) - 48;
  for (let j = 0; j < lb; j++) col[i + j] += x * (b.charCodeAt(lb - 1 - j) - 48);
}
for (let t = 0; t + 1 < la + lb; t++) { col[t + 1] += Math.floor(col[t] / 10); col[t] %= 10; }
let top = la + lb - 1;
while (top > 0 && col[top] === 0) top--;
const out = [];
for (let t = top; t >= 0; t--) out.push(col[t]);
console.log(out.join(''));
