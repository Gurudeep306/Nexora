// Flatten a nested integer structure with an explicit stack: push list items in REVERSE
// so they pop left-to-right.
const s = require('fs').readFileSync(0, 'utf8').trim();

// ---- parse into nested arrays with an explicit parse stack (no recursion) ----
const root = [];
const parse = [root];
let i = 0;
while (i < s.length) {
  const c = s[i];
  if (c === '[') {
    const lst = [];
    parse[parse.length - 1].push(lst);
    parse.push(lst);
  } else if (c === ']') {
    parse.pop();
  } else if (c === ',' || /\s/.test(c)) {
    // separator
  } else {
    // start of an integer, possibly negative
    let j = i;
    while (j < s.length && (/[0-9]/.test(s[j]) || s[j] === '-')) j++;
    parse[parse.length - 1].push(Number(s.slice(i, j)));
    i = j - 1;
  }
  i++;
}

// ---- flatten: pop an item; integer -> output; list -> push children in reverse ----
const stack = [root];
const out = [];
while (stack.length) {
  const item = stack.pop();
  if (Array.isArray(item)) {
    for (let k = item.length - 1; k >= 0; k--) stack.push(item[k]);
  } else {
    out.push(item);
  }
}
console.log(out.length ? out.join(' ') : 'EMPTY');
