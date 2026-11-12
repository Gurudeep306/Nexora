// Unified line diff (common prefix/suffix + LCS on the middle), for agents
// reviewing changes and for commit summaries.
function unifiedDiff(a, b, path, { context = 3, maxCells = 4_000_000 } = {}) {
  const A = a ? a.split("\n") : [];
  const B = b ? b.split("\n") : [];
  let pre = 0;
  while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
  let suf = 0;
  while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
  const a2 = A.slice(pre, A.length - suf);
  const b2 = B.slice(pre, B.length - suf);
  const ops = []; // [' '|'-'|'+', line, aIndex, bIndex]
  if (a2.length * b2.length > maxCells) {
    for (const l of a2) ops.push(["-", l]);
    for (const l of b2) ops.push(["+", l]);
  } else {
    const n = a2.length;
    const m = b2.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a2[i] === b2[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a2[i] === b2[j]) ops.push([" ", a2[i++], j++]);
      else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(["-", a2[i++]]);
      else ops.push(["+", b2[j++]]);
    }
    while (i < n) ops.push(["-", a2[i++]]);
    while (j < m) ops.push(["+", b2[j++]]);
  }
  const all = [...A.slice(0, pre).map((l) => [" ", l]), ...ops, ...A.slice(A.length - suf).map((l) => [" ", l])];
  // Hunks
  const lines = [`--- a/${path}`, `+++ b/${path}`];
  let ai = 1;
  let bi = 1;
  let k = 0;
  while (k < all.length) {
    if (all[k][0] === " ") {
      ai++;
      bi++;
      k++;
      continue;
    }
    const start = Math.max(0, k - context);
    let end = k;
    while (end < all.length) {
      if (all[end][0] !== " ") {
        end++;
        continue;
      }
      let run = 0;
      while (end + run < all.length && all[end + run][0] === " ") run++;
      if (end + run >= all.length || run > context * 2) {
        end = Math.min(all.length, end + context);
        break;
      }
      end += run;
    }
    const back = k - start;
    const hunk = all.slice(start, end);
    const aStart = ai - back;
    const bStart = bi - back;
    const aLen = hunk.filter((o) => o[0] !== "+").length;
    const bLen = hunk.filter((o) => o[0] !== "-").length;
    lines.push(`@@ -${aStart},${aLen} +${bStart},${bLen} @@`);
    for (const [op, l] of hunk) lines.push(op + l);
    for (let x = k; x < end; x++) {
      if (all[x][0] !== "+") ai++;
      if (all[x][0] !== "-") bi++;
    }
    k = end;
  }
  return lines.join("\n");
}

module.exports = { unifiedDiff };
