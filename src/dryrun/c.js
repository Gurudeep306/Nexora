/**
 * Dry run for C: parse the student's program (tree-sitter) and add, on the
 * same lines so compiler messages keep their line numbers:
 *   - at the top of each function, a frame (`call`), and before every way
 *     out of it (each `return`, the closing brace) its `ret`;
 *   - before each statement, a step that sends the variables in scope;
 *   - for each struct, a descriptor of its fields, so linked nodes and trees
 *     can be drawn.
 * C has no overloading, so each variable is sent with a type descriptor
 * built from its declaration: arrays by sizeof, structs by offsetof, number
 * leaves by _Generic. Pointers are followed only into blocks from malloc /
 * calloc / realloc or arrays the program declared (c-runtime.h). The
 * student's own macros are expanded first, line for line.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');
const { expandMacros } = require('./macros');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'c-runtime.h'), 'utf8');

const named = (n) => (n ? n.namedChildren : []);
const field = (n, f) => (n ? n.childForFieldName(f) : null);
const fields = (n, f) => (n ? n.childrenForFieldName(f).filter(Boolean) : []);
const lineOf = (n) => n.startPosition.row + 1;

/** Fast-input helpers are called once per number read; tracing them would only use up the step budget. */
const IO_HELPERS = /^(read|readInt|readint|read_int|readLong|readll|readLL|fastRead|fastread|fast_read|getInt|getint|scanInt|scanint|nextInt|ri|rl|rd|in|input|gc)$/;

/** A declarator's name and shape: pointer levels and array dimensions. Null for functions and odd shapes. */
function declInfo(d) {
  let p = 0;
  let dims = 0;
  while (d) {
    switch (d.type) {
      case 'identifier':
      case 'field_identifier':
        return { n: d.text, p, d: dims };
      case 'init_declarator':
        d = field(d, 'declarator');
        break;
      case 'pointer_declarator':
        p++;
        d = field(d, 'declarator');
        break;
      case 'array_declarator':
        // `int *a[10]` nests as pointer(array(a)); `int (*a)[10]` (a pointer to an array) is left out.
        dims++;
        d = field(d, 'declarator');
        break;
      case 'attributed_declarator':
        d = named(d).find((c) => c.type !== 'attribute_declaration');
        break;
      default:
        return null;
    }
  }
  return null;
}

const isConstDecl = (decl) => named(decl).some((c) => c.type === 'type_qualifier' && /^(const|constexpr)$/.test(c.text));
const hasStorage = (decl, re) => named(decl).some((c) => c.type === 'storage_class_specifier' && re.test(c.text));
const insideFunction = (n) => {
  for (let p = n.parent; p; p = p.parent) if (p.type === 'function_definition' || p.type === 'compound_statement') return true;
  return false;
};

async function instrumentC(source) {
  const code = expandMacros(source);
  const parser = await parserFor('c');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });

  /* ── structs: a descriptor function each ── */
  const structs = new Map(); // 'struct Node' / 'Node' → { fn, T, label }
  const aliases = new Map(); // typedef name → 'struct tag' (typedef struct Node Node;)
  const lookup = (key) => structs.get(key) || (aliases.has(key) ? structs.get(aliases.get(key)) : null);
  const defs = [];
  const safe = (s) => s.replace(/\W/g, '_');

  function noteStruct(spec, typedefNames, after) {
    const tag = field(spec, 'name');
    const body = field(spec, 'body');
    if (spec.type !== 'struct_specifier') return;
    if (!body) {
      if (tag) for (const t of typedefNames) aliases.set(t, `struct ${tag.text}`);
      return;
    }
    const first = tag ? tag.text : typedefNames[0];
    if (!first) return;
    const entry = { fn: `__nx_sd_${safe(first)}`, T: tag ? `struct ${tag.text}` : typedefNames[0], label: typedefNames[0] || tag.text, body, after };
    if (tag) structs.set(`struct ${tag.text}`, entry);
    for (const t of typedefNames) structs.set(t, entry);
    defs.push(entry);
  }
  for (const c of named(root)) {
    if (c.type === 'struct_specifier') noteStruct(c, [], c);
    else if (c.type === 'type_definition') {
      const t = field(c, 'type');
      const names = fields(c, 'declarator').filter((d) => d.type === 'type_identifier').map((d) => d.text);
      if (t) noteStruct(t, names, c);
    } else if (c.type === 'declaration') {
      const t = field(c, 'type');
      if (t && t.type === 'struct_specifier' && field(t, 'body')) noteStruct(t, [], c);
    }
  }

  /** What a declaration's type is: a known struct, char, void or a number. */
  function baseOf(t) {
    if (!t) return {};
    if (t.type === 'struct_specifier') {
      const tag = field(t, 'name');
      return { struct: tag ? lookup(`struct ${tag.text}`) : null, other: !tag };
    }
    if (t.type === 'union_specifier') return { other: true };
    if (t.type === 'type_identifier') return { struct: lookup(t.text) };
    if (t.type === 'primitive_type') return { char: t.text === 'char', void: t.text === 'void' };
    return {};
  }

  /**
   * A descriptor expression for a value of this shape, read through E.
   * `mk(fields)` makes one descriptor: a compound literal at a step, a
   * static inside a struct's descriptor function.
   */
  function desc(E, info, base, mk) {
    const { p, d } = info;
    if (d > 0) {
      const n = `sizeof(${E})/sizeof((${E})[0])`;
      if (d === 1 && p === 0 && base.char) return mk(`.k=__NX_STR,.n=${n},.esz=sizeof(${E})`);
      return mk(`.k=__NX_ARR,.n=${n},.esz=sizeof(${E}),.elem=${desc(`(${E})[0]`, { p, d: d - 1 }, base, mk)}`);
    }
    if (p > 0) {
      if (base.void || base.other) return '&__nx_t_skip';
      if (p === 1 && base.struct) return mk(`.k=__NX_PTR,.esz=sizeof(${E}),.lazy=${base.struct.fn}`);
      if (p === 1 && base.char) return mk(`.k=__NX_CSTR,.esz=sizeof(${E})`);
      return mk(`.k=__NX_PARR,.esz=sizeof(${E}),.elem=${desc(`(*(${E}))`, { p: p - 1, d: 0 }, base, mk)}`);
    }
    if (base.struct) return `${base.struct.fn}()`;
    if (base.other || base.void) return '&__nx_t_skip';
    return `__NX_SC(${E})`;
  }
  const siteMk = (f) => `&(__nx_ty){${f}}`;
  /**
   * A pointer to numbers that the program never subscripts (p++, *p, *(p + 1))
   * walks along an array: it is drawn as a pointer under that array's cell,
   * not as an array of its own. One the program writes p[i] with stays an array.
   */
  const subscripted = new Set([...code.matchAll(/\b([A-Za-z_]\w*)\s*\[/g)].map((m) => m[1]));
  const walker = (v) => v.p === 1 && v.d === 0 && !v.base.struct && !v.base.char && !v.base.void && !v.base.other && !subscripted.has(v.n);
  const walkerDesc = (v) => siteMk(`.k=__NX_PAT,.esz=sizeof(${v.n}),.elem=__NX_SC(*(${v.n}))`);

  for (const s of defs) {
    const decls = [];
    const inits = [];
    let k = 0;
    const staticMk = (f) => {
      const nm = `__nx_d${k++}`;
      decls.push(`static __nx_ty ${nm};`);
      inits.push(`${nm} = (__nx_ty){${f}};`);
      return `&${nm}`;
    };
    const fds = [];
    for (const f of named(s.body)) {
      if (f.type !== 'field_declaration' || named(f).some((c) => c.type === 'bitfield_clause')) continue;
      const base = baseOf(field(f, 'type'));
      for (const d of fields(f, 'declarator')) {
        const info = declInfo(d);
        if (!info) continue;
        fds.push(`(__nx_fd){"${info.n}", offsetof(${s.T}, ${info.n}), ${desc(`((${s.T}*)0)->${info.n}`, info, base, staticMk)}}`);
      }
    }
    s.fields = fds.length;
    if (!fds.length) continue;
    const text = ` static const __nx_ty* ${s.fn}(void) { static __nx_fd f[${fds.length}]; static __nx_ty t; ${decls.join(' ')} static int init = 0; if (!init) { init = 1; ${inits.join(' ')}${fds.map((x, i) => ` f[${i}] = ${x};`).join('')} t = (__nx_ty){.k=__NX_STRUCT,.esz=sizeof(${s.T}),.name="${s.label}",.nf=${fds.length},.f=f}; } return &t; }`;
    // After the definition's closing `;`, on the same line.
    const semi = code.indexOf(';', s.after.endIndex - 1);
    add(semi >= 0 ? semi + 1 : s.after.endIndex, text);
  }
  // Structs with nothing to show are not described at all.
  for (const [key, s] of [...structs]) if (!s.fields) structs.delete(key);
  const protos = [...new Set([...structs.values()].map((s) => s.fn))].map((fn) => `static const __nx_ty* ${fn}(void);`).join('\n');

  /* ── variables ── */
  function varsOfDeclaration(decl) {
    if (hasStorage(decl, /^(register|extern|typedef)$/)) return [];
    const base = baseOf(field(decl, 'type'));
    return fields(decl, 'declarator')
      .map(declInfo)
      .filter(Boolean)
      .map((v) => ({ ...v, base }));
  }
  function paramsOf(fd) {
    const out = [];
    for (const p of named(field(fd, 'parameters'))) {
      if (p.type !== 'parameter_declaration') continue;
      const info = declInfo(field(p, 'declarator'));
      if (!info) continue;
      // `int a[]` is a pointer; `int g[][5]` (a pointer to arrays) is left out.
      const v = info.d > 0 ? { ...info, p: info.p + 1, d: info.d - 1 } : info;
      if (v.d > 0) continue;
      out.push({ ...v, base: baseOf(field(p, 'type')) });
    }
    return out;
  }

  const globals = [];
  for (const c of named(root)) if (c.type === 'declaration' && !isConstDecl(c)) for (const v of varsOfDeclaration(c)) globals.push({ ...v, end: c.endIndex });
  const globalsBefore = (at) => globals.filter((g) => g.end <= at);

  /** `__nx_v("a", &a, …);` for each variable in scope — inner names shadow outer ones. */
  function collect(scope, sep = ';') {
    const seen = new Set();
    const list = [];
    for (let i = scope.length - 1; i >= 0; i--) if (!seen.has(scope[i].n)) seen.add(scope[i].n) && list.unshift(scope[i]);
    return list.map((v) => ` __nx_v("${v.n}", &${v.n}, ${walker(v) ? walkerDesc(v) : desc(v.n, v, v.base, siteMk)})${sep}`).join('');
  }
  const flushStmt = (scope) => `if (__nx_go(&__nx_f)) {${collect(scope)} __nx_send(&__nx_f); }`;
  const stepText = (line, scope) => `${flushStmt(scope)} __nx_f.pend = ${line}; `;

  /* ── statements ── */
  const lastNamed = (block) => named(block).filter((c) => c.type !== 'comment').pop();
  let fn = null; // the function being instrumented: { void, rinfo, rbase }

  function block(node, scope) {
    let local = [...scope];
    for (const c of named(node)) {
      if (c.type === 'case_statement') {
        const value = field(c, 'value');
        for (const s of named(c)) if (!(value && s.startIndex === value.startIndex)) local = stmt(s, local);
      } else local = stmt(c, local);
    }
    return local;
  }

  /**
   * A loop or branch body. For a loop each pass starts by sending the loop
   * line (its update, like j++, has just run) and ends by marking the loop
   * line as next — so the last line of a pass is sent before the update.
   */
  function body(node, scope, loopLine, ownerLine) {
    if (!node) return;
    const head = loopLine ? ` ${flushStmt(scope)}` : '';
    const tail = loopLine ? ` ${stepText(loopLine, scope)}` : '';
    if (node.type === 'compound_statement') {
      if (head) add(node.startIndex + 1, head);
      block(node, scope);
      if (tail) add(node.endIndex - 1, tail);
    } else {
      add(node.startIndex, `{${head}`);
      stmt(node, scope, lineOf(node) === ownerLine);
      add(node.endIndex, `${tail} }`);
    }
  }

  function stmt(node, scope, quiet = false) {
    const step = (n, sc) => {
      if (!quiet) add(n.startIndex, stepText(lineOf(n), sc));
    };
    switch (node.type) {
      case 'declaration':
        step(node, scope);
        return [...scope, ...varsOfDeclaration(node)];
      case 'expression_statement':
      case 'break_statement':
      case 'continue_statement':
      case 'goto_statement':
        if (node.text.trim() !== ';') step(node, scope);
        return scope;
      case 'return_statement': {
        step(node, scope);
        const v = named(node).find((c) => c.type !== 'comment');
        if (v && !fn.void) {
          const rdesc = desc('__nx_r', fn.rinfo, fn.rbase, siteMk);
          add(v.startIndex, '(__nx_r = (');
          add(v.endIndex, `), (__nx_on ? __nx_retv(&__nx_f, &__nx_r, ${rdesc}) : 0), (__nx_go(&__nx_f) ? (${collect(scope, ',')} __nx_send(&__nx_f)) : 0), __nx_exit(&__nx_f), __nx_r)`);
        } else {
          add(node.startIndex, `{ ${flushStmt(scope)} __nx_exit(&__nx_f); `);
          add(node.endIndex, ' }');
        }
        return scope;
      }
      case 'if_statement': {
        step(node, scope);
        body(field(node, 'consequence'), scope, null, lineOf(node));
        const alt = field(node, 'alternative');
        if (alt) body(alt.type === 'else_clause' ? named(alt)[0] : alt, scope, null, lineOf(alt));
        return scope;
      }
      case 'for_statement': {
        step(node, scope);
        const init = field(node, 'initializer');
        const inner = init && init.type === 'declaration' ? [...scope, ...varsOfDeclaration(init)] : scope;
        body(field(node, 'body'), inner, lineOf(node), lineOf(node));
        return scope;
      }
      case 'while_statement':
      case 'do_statement':
        step(node, scope);
        body(field(node, 'body'), scope, lineOf(node), lineOf(node));
        return scope;
      case 'switch_statement': {
        step(node, scope);
        const b = field(node, 'body');
        if (b) block(b, scope);
        return scope;
      }
      case 'compound_statement':
        block(node, scope);
        return scope;
      case 'labeled_statement': {
        const s = named(node).find((c) => c.type !== 'statement_identifier');
        return s ? stmt(s, scope) : scope;
      }
      default:
        return scope;
    }
  }

  /* ── functions ── */
  for (const n of named(root)) {
    if (n.type !== 'function_definition' || insideFunction(n)) continue;
    const b = field(n, 'body');
    if (!b || b.type !== 'compound_statement') continue;
    let d = field(n, 'declarator');
    let rp = 0;
    while (d && d.type === 'pointer_declarator') {
      rp++;
      d = field(d, 'declarator');
    }
    if (!d || d.type !== 'function_declarator') continue;
    const id = field(d, 'declarator');
    if (!id || id.type !== 'identifier' || IO_HELPERS.test(id.text)) continue;
    const type = field(n, 'type');
    const rbase = baseOf(type);
    const isVoid = rp === 0 && rbase.void;
    fn = { void: isVoid, rinfo: { p: rp, d: 0 }, rbase };
    const params = paramsOf(d);
    const scope0 = [...globalsBefore(n.startIndex), ...params];
    const rdecl = isVoid ? '' : ` ${type.text} ${'*'.repeat(rp)}__nx_r;`;
    add(b.startIndex + 1, ` __nx_frame __nx_f;${rdecl} __nx_enter(&__nx_f, ${lineOf(n)}); if (__nx_on) {${collect(params)} } __nx_called(&__nx_f, "${id.text}");`);
    const end = block(b, scope0);
    const last = lastNamed(b);
    if (!last || last.type !== 'return_statement') add(b.endIndex - 1, ` ${flushStmt(end)} __nx_exit(&__nx_f); `);
  }

  return { code: `${RUNTIME}${protos}\n#line 1\n${applyEdits(code, edits)}` };
}

module.exports = { instrumentC };
