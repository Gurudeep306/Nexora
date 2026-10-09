// Happy number: Floyd on the implicit digit-square chain, O(1) space — no hash set.
const lines = require('fs').readFileSync(0, 'utf8').split(/\n+/).filter(Boolean);
const T = Number(lines[0]);

function f(x) { // sum of squares of digits
  let s = 0;
  while (x > 0) {
    const d = x % 10;
    s += d * d;
    x = Math.floor(x / 10);
  }
  return s;
}

const out = [];
for (let i = 1; i <= T; i++) {
  const x = Number(lines[i]);   // x <= 1e9, far below 2^53: plain numbers are exact
  let slow = x;
  let fast = f(x);
  while (fast !== 1 && slow !== fast) {
    slow = f(slow);
    fast = f(f(fast));
  }
  out.push(fast === 1 ? '1' : '0');
}
console.log(out.join('\n'));
