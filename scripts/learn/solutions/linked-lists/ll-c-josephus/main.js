// Josephus by the O(n) recurrence — a circular list would need O(n*k) hops.
// seat < m <= 1e5 and k <= 1e9, so seat + k <= ~1e9: Number stays exact (< 2^53).
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(s => s.length);
const T = Number(data[0]);
const out = [];
let pos = 1;
for (let t = 0; t < T; t++) {
  const n = Number(data[pos++]), k = Number(data[pos++]);
  // O(n) recurrence: seat(1)=0; seat(m) = (seat(m-1)+k) mod m
  let seat = 0;
  for (let m = 2; m <= n; m++) seat = (seat + k) % m;
  out.push(String(seat + 1));   // 1-based survivor
}
console.log(out.join('\n'));
