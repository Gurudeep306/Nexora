// Flatten a multilevel list given by index: iterative DFS with an explicit stack of return points.
const toks = require('fs').readFileSync(0, 'utf8').trim().split(/\s+/).map(Number);
let p = 0;
const n = toks[p++];
const v = new Array(n), nxt = new Array(n), chd = new Array(n);
for (let i = 0; i < n; i++) { v[i] = toks[p++]; nxt[i] = toks[p++]; chd[i] = toks[p++]; }

// the stack holds RETURN POINTS — what recursion holds on frames
const stk = [];
const out = [];
let cur = 0; // head is node 0
while (cur !== -1 || stk.length) {
  if (cur === -1) { cur = stk.pop(); continue; }
  out.push(v[cur]);              // preorder: settle THIS node first
  if (chd[cur] !== -1) {
    stk.push(nxt[cur]);          // resume here AFTER the child subtree
    nxt[cur] = chd[cur];         // splice the child in (explicit relink)
    chd[cur] = -1;               // detach: flattening destroys the hierarchy
  }
  cur = nxt[cur];                // dive into child, or advance along the level
}
console.log(out.join(' '));
