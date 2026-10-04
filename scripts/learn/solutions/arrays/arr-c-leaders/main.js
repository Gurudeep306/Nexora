const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
let pos = 0;
const next = () => data[pos++];
const num = () => Number(data[pos++]);
const n = num();
const a = [];
for (let i = 0; i < n; i++) a.push(num());
const leaders = [];
let mx = -Infinity;                  // max of everything to the right
for (let i = n - 1; i >= 0; i--) {
  if (a[i] > mx) { leaders.push(a[i]); mx = a[i]; }
}
console.log(leaders.reverse().join(' '));
