const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const head = new Int32Array(n + 1).fill(-1), nxt = new Int32Array(n + 1);
for (let i = 2; i <= n; i++) {
  const p = num();
  nxt[i] = head[p];                                // prepend i to p's child list
  head[p] = i;
}
const depth = new Int32Array(n + 1), stack = new Int32Array(n);
let top = 0, best = 0;
stack[top++] = 1;                                  // explicit stack: no recursion
while (top > 0) {
  const u = stack[--top];
  if (depth[u] > best) best = depth[u];
  for (let w = head[u]; w !== -1; w = nxt[w]) {
    depth[w] = depth[u] + 1;
    stack[top++] = w;
  }
}
console.log(String(best));
