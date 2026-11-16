/**
 * Dry run for C#: parse the student's program (tree-sitter) and add, on the
 * same lines so compiler messages keep their line numbers:
 *   - at the top of each method and local function, a frame (`call`), with
 *     the body inside try / finally so `ret` is always sent, and an
 *     exception filter that reports an exception on its line without ever
 *     catching it;
 *   - before each statement, a step with the variables that are surely
 *     assigned there (C#, like Java, will not read one before that);
 *   - around each returned value, a note of what is returned.
 * Top-level programs (no Main) get one frame for the program. The runtime
 * (csharp-runtime.cs) is appended after the program.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'csharp-runtime.cs'), 'utf8');

const named = (n) => (n ? n.namedChildren : []);
const field = (n, f) => (n ? n.childForFieldName(f) : null);
const lineOf = (n) => n.startPosition.row + 1;
const mods = (n) => named(n).filter((c) => c.type === 'modifier').map((c) => c.text);

/** Input / output helpers are called once per number read: tracing them would use up the steps. */
const IO_METHOD = /^(Next|NextInt|NextLong|NextDouble|NextString|ReadInt|ReadLong|ReadLine|ReadInts|ReadLongs|Read|Ni|Nl|Ns|Scan|Print|Println|Write|WriteLine|Flush|Dispose)$/;
// Called by the runtime, sorting and hashing, not by the student's steps: not traced.
const BOILERPLATE = /^(ToString|Equals|GetHashCode|CompareTo|Compare|Deconstruct)$/;
const IO_CLASS = /(Reader|Scanner|Input|Output|Writer|FastIO|^IO$|Printer)/i;
/** Types that cannot be boxed to object (ref structs): never read in a step. */
const UNBOXABLE = /\b(Span|ReadOnlySpan|Memory|stackalloc|TypedReference)\b/;

/** The variables argument: built only while tracing is on. */
function vars(names) {
  const seen = new Set();
  const list = [];
  for (let i = names.length - 1; i >= 0; i--) if (!seen.has(names[i])) seen.add(names[i]) && list.unshift(names[i]);
  return list.length ? `__Nx.on ? new object[]{${list.map((n) => `"${n}", ${n}`).join(', ')}} : null` : 'null';
}

/** Names declared by a variable_declaration: [with a value], [without]. */
function declarators(decl) {
  const typeText = field(decl, 'type')?.text ?? '';
  const withV = [];
  const without = [];
  for (const d of named(decl)) {
    if (d.type !== 'variable_declarator') continue;
    const name = named(d).find((c) => c.type === 'identifier')?.text;
    if (!name) continue;
    if (UNBOXABLE.test(typeText) || UNBOXABLE.test(d.text)) continue;
    (named(d).some((c) => c.type === 'equals_value_clause') ? withV : without).push(name);
  }
  return [withV, without];
}

async function instrumentCSharp(code) {
  const parser = await parserFor('c_sharp');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });

  /** Field names of a type body: [static ones, instance ones]. */
  function classFields(body) {
    const st = [];
    const inst = [];
    for (const f of named(body)) {
      if (f.type !== 'field_declaration') continue;
      const isConst = mods(f).includes('const');
      const decl = named(f).find((c) => c.type === 'variable_declaration');
      if (!decl || isConst) continue;
      const [a, b] = declarators(decl);
      (mods(f).includes('static') ? st : inst).push(...a, ...b);
    }
    return [st, inst];
  }

  function block(node, scope, startUnassigned = new Set()) {
    let local = [...scope];
    let unassigned = new Set(startUnassigned);
    for (const c of named(node)) [local, unassigned] = stmt(c, local, unassigned);
    return local;
  }

  /** A loop or branch body; a loop's body starts by sending the loop line. */
  function body(node, scope, loop, endLine) {
    if (!node) return;
    const head = loop ? ` __nx_f.Head(${vars(scope)});` : '';
    const tail = endLine ? ` __nx_f.Tail(${endLine}, ${vars(scope)});` : '';
    if (node.type === 'block') {
      if (head) add(node.startIndex + 1, head);
      block(node, scope);
      if (tail) add(node.endIndex - 1, tail);
    } else {
      add(node.startIndex, `{${head} `);
      stmt(node, scope, new Set(), true);
      add(node.endIndex, `${tail} }`);
    }
  }

  const stepAt = (node, scope) => add(node.startIndex, `__nx_f.At(${lineOf(node)}, ${vars(scope)}); `);

  /** `out var x` / `out int x` declare x for what follows the statement. */
  const outDecls = (node) => {
    const out = [];
    const walk = (n) => {
      if (n.type === 'declaration_expression') {
        const id = named(n).filter((c) => c.type === 'identifier').pop();
        if (id) out.push(id.text);
      }
      if (n.type === 'lambda_expression' || n.type === 'anonymous_method_expression') return;
      for (const c of named(n)) walk(c);
    };
    walk(node);
    return out;
  };

  /** Instrument one statement; returns [scope after it, declared-but-unassigned names]. */
  function stmt(node, scope, unassigned, quiet = false) {
    const step = () => {
      if (!quiet) stepAt(node, scope);
    };
    switch (node.type) {
      case 'local_declaration_statement': {
        step();
        const decl = named(node).find((c) => c.type === 'variable_declaration');
        if (!decl || /\bref\b/.test(node.text.slice(0, 10))) return [scope, unassigned];
        const [a, b] = declarators(decl);
        const un = new Set(unassigned);
        b.forEach((n) => un.add(n));
        return [[...scope, ...a, ...outDecls(node)], un];
      }
      case 'expression_statement': {
        step();
        const e = named(node)[0];
        const extra = outDecls(node);
        // `x = …;` at this level makes a declared variable readable from here on.
        if (e && e.type === 'assignment_expression') {
          const left = field(e, 'left');
          if (left && left.type === 'identifier' && unassigned.has(left.text)) {
            const un = new Set(unassigned);
            un.delete(left.text);
            return [[...scope, left.text, ...extra], un];
          }
        }
        return [[...scope, ...extra], unassigned];
      }
      case 'break_statement':
      case 'continue_statement':
      case 'throw_statement':
      case 'goto_statement':
      case 'yield_statement':
        step();
        return [scope, unassigned];
      case 'return_statement': {
        step();
        const v = named(node)[0];
        if (v && current.ret && v.type !== 'lambda_expression') {
          add(v.startIndex, `__nx_f.Ret<${current.ret}>(`);
          add(v.endIndex, `, ${vars(scope)})`);
        } else if (!v) add(node.startIndex, `__nx_f.End(${vars(scope)}); `);
        return [scope, unassigned];
      }
      case 'if_statement': {
        step();
        body(field(node, 'consequence'), scope, false);
        const alt = field(node, 'alternative');
        if (alt) body(alt, scope, false);
        return [[...scope, ...outDecls(field(node, 'condition') ?? node)], unassigned];
      }
      case 'for_statement': {
        step();
        const inner = [...scope];
        const init = field(node, 'initializer');
        if (init && init.type === 'variable_declaration') inner.push(...declarators(init)[0]);
        // End of a pass: before the update (i++) runs.
        const tail = `__nx_f.Tail(${lineOf(node)}, ${vars(inner)})`;
        const up = field(node, 'update');
        const cond = field(node, 'condition');
        if (up) add(up.startIndex, `${tail}, `);
        else if (cond) {
          add(cond.startIndex, `${tail} && (`);
          add(cond.endIndex, ')');
        }
        body(field(node, 'body'), inner, true);
        return [scope, unassigned];
      }
      case 'for_each_statement': {
        step();
        const left = field(node, 'left');
        const names = left ? (left.type === 'identifier' ? [left.text] : named(left).filter((c) => c.type === 'identifier').map((c) => c.text)) : [];
        body(field(node, 'body'), [...scope, ...names], true, lineOf(node));
        return [scope, unassigned];
      }
      case 'while_statement': {
        step();
        const cond = field(node, 'condition');
        if (cond) {
          add(cond.startIndex, `__nx_f.Tail(${lineOf(node)}, ${vars(scope)}) && (`);
          add(cond.endIndex, ')');
        }
        body(field(node, 'body'), scope, true);
        return [scope, unassigned];
      }
      case 'do_statement': {
        step();
        const cond = field(node, 'condition');
        if (cond) {
          add(cond.startIndex, `__nx_f.Tail(${lineOf(node)}, ${vars(scope)}) && (`);
          add(cond.endIndex, ')');
        }
        body(field(node, 'body'), scope, true);
        return [scope, unassigned];
      }
      case 'block':
        block(node, scope, unassigned);
        return [scope, unassigned];
      case 'switch_statement': {
        step();
        const b = field(node, 'body');
        for (const sec of named(b)) {
          if (sec.type !== 'switch_section') continue;
          let s = [...scope];
          let un = new Set(unassigned);
          for (const st of named(sec)) {
            if (/label|pattern|expression$|when_clause/.test(st.type) && !/_statement$/.test(st.type)) continue;
            [s, un] = stmt(st, s, un);
          }
        }
        return [scope, unassigned];
      }
      case 'try_statement': {
        const b = field(node, 'body');
        if (b) block(b, scope);
        for (const c of named(node)) {
          if (c.type === 'catch_clause') {
            const decl = named(c).find((x) => x.type === 'catch_declaration');
            const id = decl ? named(decl).find((x) => x.type === 'identifier')?.text : null;
            const cb = named(c).find((x) => x.type === 'block');
            if (cb) block(cb, id ? [...scope, id] : scope);
          } else if (c.type === 'finally_clause') {
            const fb = named(c).find((x) => x.type === 'block');
            if (fb) block(fb, scope);
          }
        }
        return [scope, unassigned];
      }
      case 'using_statement':
      case 'lock_statement':
      case 'checked_statement':
      case 'unsafe_statement':
      case 'fixed_statement': {
        step();
        const b = named(node).filter((c) => c.type === 'block').pop();
        if (b) block(b, scope);
        return [scope, unassigned];
      }
      case 'labeled_statement': {
        step();
        const s = named(node).find((c) => c.type !== 'identifier');
        if (s) stmt(s, scope, unassigned, true);
        return [scope, unassigned];
      }
      case 'local_function_statement':
        method(node, null, scope);
        return [scope, unassigned];
      default:
        return [scope, unassigned];
    }
  }

  let current = { ret: null };

  /** A method or local function: its frame, then its body. */
  function method(m, klass, outer = []) {
    const b = field(m, 'body');
    const nameNode = field(m, 'name');
    if (!b || (b.type !== 'block' && b.type !== 'arrow_expression_clause') || !nameNode) return;
    const name = nameNode.text;
    const ms = mods(m);
    // Iterators (yield) cannot sit in a try with a filter; async methods are not traced.
    if (IO_METHOD.test(name) || BOILERPLATE.test(name) || ms.includes('async') || /\byield\b/.test(b.text)) return;
    if (b.type === 'arrow_expression_clause' && (ms.includes('extern') || ms.includes('abstract'))) return;
    const kn = klass ? field(klass, 'name')?.text : null;
    if (kn && IO_CLASS.test(kn)) return;
    const params = [];
    for (const p of named(field(m, 'parameters'))) {
      if (p.type !== 'parameter') continue;
      // An `out` parameter is not assigned on entry; a ref struct cannot be boxed.
      if (/^\s*out\b/.test(p.text) || UNBOXABLE.test(p.text)) continue;
      const n = field(p, 'name')?.text;
      if (n) params.push(n);
    }
    const [st, inst] = klass ? classFields(field(klass, 'body')) : [[], []];
    const isStatic = ms.includes('static');
    const visible = [...outer, ...(isStatic ? st : [...st, ...inst])];
    if (name === 'Main') params.splice(params.indexOf('args') >>> 0, params.includes('args') ? 1 : 0);
    const rt = field(m, 'type') ?? field(m, 'returns');
    const rtext = rt ? rt.text : 'void';
    const saved = current;
    current = { ret: rtext === 'void' || /^ref\b/.test(rtext) ? null : rtext };
    const all = [...visible, ...params];
    const open = `var __nx_f = __Nx.Call("${name}", ${lineOf(m)}, ${vars(params)}); try {`;
    const close = `} catch (System.Exception __nx_e) when (__nx_f.Exc(__nx_e)) { throw; } finally { __nx_f.End(${vars(all)}); __nx_f.Exit(); }`;
    if (b.type === 'block') {
      add(b.startIndex + 1, ` ${open}`);
      block(b, all);
      add(b.endIndex - 1, ` ${close} `);
    } else {
      // `=> expr;` becomes a block on the same line: the `=>` and the `;` are
      // commented out, so every line stays where the student wrote it.
      const expr = named(b)[0];
      const semi = m.children.find((c) => c.type === ';' && c.startIndex >= b.endIndex);
      if (expr && semi) {
        const step = `__nx_f.At(${lineOf(expr)}, ${vars(params)}); `;
        add(b.startIndex, `{ ${open} ${step}${current.ret ? `return __nx_f.Ret<${current.ret}>(` : ''}/*`);
        add(expr.startIndex, '*/ ');
        add(expr.endIndex, `${current.ret ? `, ${vars(all)})` : ''}; ${close} }/*`);
        add(semi.endIndex, '*/');
      }
    }
    current = saved;
  }

  const visit = (n, klass) => {
    for (const c of named(n)) {
      if (c.type === 'method_declaration' || c.type === 'constructor_declaration') method(c, klass);
      else if (/^(class|struct|record)_declaration$/.test(c.type)) visit(field(c, 'body') ?? c, c);
      else if (c.type === 'declaration_list' || c.type === 'namespace_declaration' || c.type === 'file_scoped_namespace_declaration') visit(c, klass);
    }
  };
  visit(root, null);

  // A top-level program: one frame for it, steps before each of its statements.
  const globals = named(root).filter((c) => c.type === 'global_statement');
  if (globals.length) {
    let scope = [];
    let un = new Set();
    add(globals[0].startIndex, `var __nx_f = __Nx.Call("main", ${lineOf(globals[0])}, null); `);
    for (const g of globals) {
      const s = named(g)[0];
      if (s) [scope, un] = stmt(s, scope, un);
    }
  }

  return { code: `${applyEdits(code, edits)}\n${RUNTIME}`, errors: root.hasError };
}

module.exports = { instrumentCSharp };
