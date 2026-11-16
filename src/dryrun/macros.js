/**
 * Expand the student's own #define macros (C and C++), so the instrumenter
 * sees the real code: `rep(i, 0, n) x += a[i];` is a for loop. Only the
 * program's own macros are expanded (headers are left alone), every line
 * stays on its line (a #define becomes a blank line; an invocation spread
 * over several lines is followed by the same number of newlines), and
 * strings, characters and comments are never touched.
 */

/** Index just past the quoted literal starting at i. */
function skipQuoted(s, i) {
  const q = s[i];
  let j = i + 1;
  while (j < s.length && s[j] !== q && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1;
  return Math.min(s.length, j + 1);
}

/** Collect #define / #undef (with \ continuations); the directive lines become blank. */
function collect(code) {
  const lines = code.split('\n');
  const macros = new Map();
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*#\s*(define|undef)\b(.*)$/.exec(lines[i]);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    let text = m[2];
    let used = 1;
    while (/\\\s*$/.test(text) && i + used < lines.length) text = text.replace(/\\\s*$/, ' ') + lines[i + used++];
    for (let k = 0; k < used; k++) out.push('');
    i += used - 1;
    text = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/, '');
    const d = /^\s+([A-Za-z_]\w*)(\(([^)]*)\))?\s?(.*)$/.exec(text);
    if (!d) continue;
    if (m[1] === 'undef') macros.delete(d[1]);
    else {
      const params = d[2] ? d[3].split(',').map((p) => p.trim()).filter(Boolean) : null;
      macros.set(d[1], { params, body: d[4].trim() });
    }
  }
  return { code: out.join('\n'), macros };
}

/** Split `(a, f(b, c), "x,y")` into raw arguments; returns [args, index after ')'] or null. */
function readArgs(s, open) {
  const args = [];
  let depth = 0;
  let cur = '';
  for (let j = open; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'") {
      const e = skipQuoted(s, j);
      cur += s.slice(j, e);
      j = e - 1;
      continue;
    }
    if (c === '(') {
      if (depth++ === 0) continue;
    } else if (c === ')') {
      if (--depth === 0) {
        args.push(cur);
        return [args, j + 1];
      }
    } else if (c === ',' && depth === 1) {
      args.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  return null;
}

function substitute(m, rawArgs, expandArg) {
  const params = m.params;
  const va = params.length && params[params.length - 1] === '...';
  const names = va ? [...params.slice(0, -1), '__VA_ARGS__'] : params;
  const raw = new Map();
  names.forEach((p, k) => raw.set(p, (va && k === names.length - 1 ? rawArgs.slice(k).join(',') : rawArgs[k] ?? '').trim()));
  const body = m.body
    // #x → "x"
    .replace(/(^|[^#])#\s*([A-Za-z_]\w*)/g, (all, pre, p) => (raw.has(p) ? `${pre}${JSON.stringify(raw.get(p))}` : all))
    // a ## b → ab (operands are not expanded first)
    .replace(/([A-Za-z_]\w*)?\s*##\s*([A-Za-z_]\w*)?/g, (all, a, b) => `${a ? (raw.has(a) ? raw.get(a) : a) : ''}\u0001${b ? (raw.has(b) ? raw.get(b) : b) : ''}`);
  // Other parameters take their fully expanded argument.
  return body.replace(/[A-Za-z_]\w*/g, (id) => (raw.has(id) ? expandArg(raw.get(id)) : id)).replace(/\u0001/g, '');
}

function expand(text, macros, hide) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const e = skipQuoted(text, i);
      out += text.slice(i, e);
      i = e;
      continue;
    }
    if (text.startsWith('//', i)) {
      let e = text.indexOf('\n', i);
      if (e < 0) e = text.length;
      out += text.slice(i, e);
      i = e;
      continue;
    }
    if (text.startsWith('/*', i)) {
      let e = text.indexOf('*/', i + 2);
      e = e < 0 ? text.length : e + 2;
      out += text.slice(i, e);
      i = e;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] ?? ''))) {
      const m = /^\.?[0-9](?:[eEpP][+-]|[\w.'])*/.exec(text.slice(i));
      out += m[0];
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const id = /^[A-Za-z_]\w*/.exec(text.slice(i))[0];
      const m = macros.get(id);
      if (!m || hide.has(id)) {
        out += id;
        i += id.length;
        continue;
      }
      const inner = new Set(hide).add(id);
      if (m.params === null) {
        out += expand(m.body, macros, inner);
        i += id.length;
        continue;
      }
      let k = i + id.length;
      while (k < text.length && /\s/.test(text[k])) k++;
      const call = text[k] === '(' ? readArgs(text, k) : null;
      if (!call) {
        out += id;
        i += id.length;
        continue;
      }
      const [args, end] = call;
      const lines = (text.slice(i, end).match(/\n/g) || []).length;
      out += expand(substitute(m, args, (a) => expand(a, macros, hide)), macros, inner) + '\n'.repeat(lines);
      i = end;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** The program with its own macros expanded, line for line; unchanged when it has none. */
function expandMacros(code) {
  if (!/^\s*#\s*define\b/m.test(code)) return code;
  const { code: rest, macros } = collect(code);
  // Directive lines (#include, #if…) stay as they are; the text between them
  // is expanded as one piece, since an invocation can span lines.
  return rest
    .split(/(^[ \t]*#.*$)/m)
    .map((p) => (/^[ \t]*#/.test(p) ? p : expand(p, macros, new Set())))
    .join('');
}

module.exports = { expandMacros };
