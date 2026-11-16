/**
 * Dry run for Swift: parse the student's program (tree-sitter) and add, on
 * the same lines so compiler messages keep their line numbers:
 *   - at the top of each function, a frame (`call`) closed by a `defer`, so
 *     the `ret` event is sent however the function ends;
 *   - before each statement, a step with the variables that surely have a
 *     value at that point (Swift will not read a `let x: Int` before it is set);
 *   - around each returned value, a note of what is returned. A body that is
 *     one expression (an implicit return) becomes `return __nx_f.ret(expr, …)`.
 * Loops have no update part in Swift, so a loop's end-of-pass step goes at
 * the end of its body. Top-level code is one frame, "main". Closures are not
 * traced: they run inside the step of the line that calls them. A crash
 * (index out of range, nil unwrapped) is a signal; the runtime reports it on
 * its line and lets the program stop as before. print is counted by the
 * file-level print in swift-runtime.swift.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'swift-runtime.swift'), 'utf8');

const named = (n) => (n ? n.namedChildren : []);
const kids = (n) => (n ? n.children : []);
const tok = (n, t) => kids(n).find((c) => c.type === t) ?? null;
const lastTok = (n, t) => [...kids(n)].reverse().find((c) => c.type === t) ?? null;
const lineOf = (n) => n.startPosition.row + 1;

/** Input / output helpers are called once per number read: tracing them would use up the steps. */
const IO_METHOD = /^(readInt|readInts|readLine|readLn|readString|readStrings|readDouble|read|next|nextInt|nextLine|input|ints|print|println|write|flush)$/;
/** Called by the runtime, sorting and hashing, not by the student's steps. */
const BOILERPLATE = /^(description|hash|encode|isEqual)$/;
/** Statements, as opposed to an expression that can be a body's implicit return. */
const STATEMENTS = new Set([
  'property_declaration', 'assignment', 'control_transfer_statement', 'for_statement', 'while_statement',
  'repeat_while_statement', 'guard_statement', 'do_statement', 'function_declaration', 'class_declaration',
  'statement_label', 'import_declaration', 'typealias_declaration', 'protocol_declaration',
]);

/** The vars argument: built only while tracing is on. */
function vars(names) {
  const seen = new Set();
  const list = [];
  for (let i = names.length - 1; i >= 0; i--) if (!seen.has(names[i])) seen.add(names[i]) && list.unshift(names[i]);
  return list.length ? `__Nx.on ? __Nx.v(${list.map((n) => `"${n}", ${n} as Any`).join(', ')}) : nil` : 'nil';
}

/** Every name a pattern binds. */
function patternNames(p) {
  if (!p) return [];
  if (p.type === 'simple_identifier') return [p.text];
  if (p.type !== 'pattern') return [];
  return named(p).flatMap((c) => (c.type === 'simple_identifier' ? [c.text] : c.type === 'pattern' ? patternNames(c) : []));
}

/** Names bound by `if let x = …`, `guard let`, `while let`, `case let`. */
function conditionBindings(node) {
  const out = [];
  const ks = kids(node);
  for (let i = 0; i < ks.length; i++) {
    if (ks[i].type === '{') break;
    if (ks[i].type !== 'value_binding_pattern') continue;
    const n = ks[i + 1];
    if (n && (n.type === 'simple_identifier' || n.type === 'pattern')) out.push(...patternNames(n));
  }
  return out.filter((n) => n !== '_');
}

/** [names given a value, names declared without one] by a property declaration. */
function declared(decl) {
  const withV = [];
  const without = [];
  const ks = kids(decl);
  for (let i = 0; i < ks.length; i++) {
    if (ks[i].type !== 'pattern') continue;
    let j = i + 1;
    while (j < ks.length && ks[j].type === 'type_annotation') j++;
    (ks[j] && ks[j].type === '=' ? withV : without).push(...patternNames(ks[i]));
  }
  return [withV.filter((n) => n !== '_'), without.filter((n) => n !== '_')];
}

/** Stored properties of a type body that a method can read at any step. */
function storedProps(body) {
  const out = [];
  for (const p of named(body)) {
    if (p.type !== 'property_declaration') continue;
    const mods = named(p).find((c) => c.type === 'modifiers')?.text ?? '';
    if (/\b(static|class|lazy|weak|unowned)\b/.test(mods)) continue;
    if (named(p).some((c) => c.type === 'computed_property' || c.type === 'willset_didset_block')) continue;
    const [a, b] = declared(p);
    out.push(...a, ...b);
  }
  return out;
}

async function instrumentSwift(code) {
  const parser = await parserFor('swift');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });
  const stepAt = (node, scope) => add(node.startIndex, `__nx_f.at(${lineOf(node)}, ${vars(scope)}); `);

  /** The statements between a node's own braces; returns the scope after them. */
  function block(node, scope, startUnassigned = new Set()) {
    const s = named(node).find((c) => c.type === 'statements');
    if (!s) return scope;
    return stmts(named(s), scope, startUnassigned);
  }
  function stmts(list, scope, startUnassigned = new Set()) {
    let local = [...scope];
    let unassigned = new Set(startUnassigned);
    let quiet = false;
    for (const c of list) {
      if (c.type === 'statement_label') {
        // The step goes before the label, so `break outer` still finds its loop.
        stepAt(c, local);
        quiet = true;
        continue;
      }
      [local, unassigned] = stmt(c, local, unassigned, quiet);
      quiet = false;
    }
    return local;
  }

  /** A loop body: a step on entry sends the loop line; one at the end sends the end of the pass. */
  function loopBody(node, scope, line) {
    const open = tok(node, '{');
    const close = lastTok(node, '}');
    if (!open || !close) return;
    add(open.endIndex, ` __nx_f.head(${vars(scope)});`);
    block(node, scope);
    add(close.startIndex, `; __nx_f.tail(${line}, ${vars(scope)}) `);
  }

  function stmt(node, scope, unassigned, quiet = false) {
    const step = () => { if (!quiet) stepAt(node, scope); };
    switch (node.type) {
      case 'property_declaration': {
        step();
        const mods = named(node).find((c) => c.type === 'modifiers')?.text ?? '';
        if (/\blazy\b/.test(mods) || named(node).some((c) => c.type === 'computed_property')) return [scope, unassigned];
        const [withV, without] = declared(node);
        const un = new Set(unassigned);
        for (const n of without) un.add(n);
        return [[...scope, ...withV], un];
      }
      case 'assignment': {
        step();
        const left = named(node)[0];
        const id = left && named(left).length === 1 && named(left)[0].type === 'simple_identifier' ? named(left)[0].text : null;
        if (id && unassigned.has(id) && tok(node, '=')) {
          const un = new Set(unassigned);
          un.delete(id);
          return [[...scope, id], un];
        }
        return [scope, unassigned];
      }
      case 'control_transfer_statement': {
        step();
        const kw = kids(node)[0]?.type;
        const v = named(node)[0];
        if (kw === 'return' && v && current.returns) {
          add(v.startIndex, '__nx_f.ret(');
          add(v.endIndex, `, ${vars(scope)})`);
        }
        return [scope, unassigned];
      }
      case 'if_statement': {
        step();
        let n = node;
        while (n && n.type === 'if_statement') {
          block(n, [...scope, ...conditionBindings(n)]);
          // `else { … }` sits in the same node after the else keyword; `else if` nests.
          const elseAt = kids(n).findIndex((c) => c.type === 'else');
          if (elseAt < 0) break;
          const next = kids(n)[elseAt + 1];
          if (next && next.type === 'if_statement') { n = next; continue; }
          const after = kids(n).slice(elseAt + 1);
          const s = after.find((c) => c.type === 'statements');
          if (s) stmts(named(s), scope);
          break;
        }
        return [scope, unassigned];
      }
      case 'guard_statement': {
        step();
        block(node, scope);
        // `guard let x = …` makes x readable after the guard.
        return [[...scope, ...conditionBindings(node)], unassigned];
      }
      case 'switch_statement': {
        step();
        for (const e of named(node)) {
          if (e.type !== 'switch_entry') continue;
          const s = named(e).find((c) => c.type === 'statements');
          const binds = named(e).filter((c) => c.type === 'switch_pattern').flatMap((p) => {
            const names = [];
            const walk = (x) => { if (x.type === 'simple_identifier' && x.parent?.type === 'pattern' && /\blet\b|\bvar\b/.test(x.parent.parent?.text ?? '')) names.push(x.text); named(x).forEach(walk); };
            walk(p);
            return names;
          });
          if (s) stmts(named(s), [...scope, ...binds]);
        }
        return [scope, unassigned];
      }
      case 'for_statement': {
        step();
        const p = named(node).find((c) => c.type === 'pattern' || c.type === 'simple_identifier');
        const inner = [...scope, ...patternNames(p)].filter((n) => n !== '_');
        loopBody(node, inner, lineOf(node));
        return [scope, unassigned];
      }
      case 'while_statement':
      case 'repeat_while_statement':
        step();
        loopBody(node, node.type === 'while_statement' ? [...scope, ...conditionBindings(node)] : scope, lineOf(node));
        return [scope, unassigned];
      case 'do_statement': {
        step();
        block(node, scope);
        for (const c of named(node)) {
          if (c.type !== 'catch_block') continue;
          // A bare `catch` binds `error`; `catch E.bad(let v)` binds only what its pattern names.
          const open = tok(c, '{');
          const header = open ? code.slice(c.startIndex, open.startIndex) : c.text;
          const binds = /^catch\s*$/.test(header) ? ['error'] : [...header.matchAll(/\b(?:let|var)\s+([A-Za-z_]\w*)/g)].map((m) => m[1]);
          block(c, [...scope, ...binds]);
        }
        return [scope, unassigned];
      }
      case 'function_declaration':
        fn(node, null, scope);
        return [scope, unassigned];
      case 'class_declaration':
        visitType(node);
        return [scope, unassigned];
      default:
        step();
        return [scope, unassigned];
    }
  }

  let current = { returns: false };

  function fn(m, klass, outer = []) {
    const name = named(m).find((c) => c.type === 'simple_identifier')?.text;
    const fb = named(m).find((c) => c.type === 'function_body');
    if (!name || !fb) return;
    if (IO_METHOD.test(name) || BOILERPLATE.test(name)) return;
    const mods = named(m).find((c) => c.type === 'modifiers')?.text ?? '';
    if (/\b(async)\b/.test(m.text.slice(0, fb.startIndex - m.startIndex))) return;
    const params = named(m).filter((p) => p.type === 'parameter').map((p) => {
      const ids = named(p).filter((c) => c.type === 'simple_identifier');
      return ids[ids.length - 1]?.text;
    }).filter((n) => n && n !== '_');
    const isStatic = /\b(static|class)\b/.test(mods);
    const props = klass && !isStatic ? storedProps(named(klass).find((c) => c.type === 'class_body')) : [];
    const all = [...outer, ...props, ...params];
    const arrow = tok(m, '->');
    const rtype = arrow ? m.children[m.children.indexOf(arrow) + 1] : null;
    const returns = !!rtype && !/^(Void|\(\s*\))$/.test(rtype.text) && rtype.type !== 'type_identifier_never';
    const saved = current;
    current = { returns };
    const open = tok(fb, '{');
    const close = lastTok(fb, '}');
    add(open.endIndex, ` let __nx_f = __Nx.call("${name}", ${lineOf(m)}, ${vars(params)}); defer { __nx_f.end(${vars(all)}); __nx_f.exit() };`);
    const s = named(fb).find((c) => c.type === 'statements');
    const list = named(s);
    // An if / switch that returns from its branches is a statement, not the value.
    const jumps = (n) => n.descendantsOfType('control_transfer_statement').length > 0;
    const isExpr = (e) => !STATEMENTS.has(e.type) && !((e.type === 'if_statement' || e.type === 'switch_statement') && jumps(e));
    if (returns && list.length === 1 && isExpr(list[0])) {
      // One expression: the implicit return. if / switch used as an expression
      // keep their branches as they are (a step there would break them).
      const e = list[0];
      if (e.type === 'if_statement' || e.type === 'switch_statement') add(e.startIndex, `__nx_f.at(${lineOf(e)}, ${vars(all)}); return `);
      else {
        add(e.startIndex, `__nx_f.at(${lineOf(e)}, ${vars(all)}); return __nx_f.ret(`);
        add(e.endIndex, `, ${vars(all)})`);
      }
    } else if (s) stmts(list, all);
    void close;
    current = saved;
  }

  function visitType(t) {
    const body = named(t).find((c) => c.type === 'class_body' || c.type === 'enum_class_body' || c.type === 'protocol_body');
    for (const c of named(body)) {
      if (c.type === 'function_declaration') fn(c, t);
      else if (c.type === 'class_declaration') visitType(c);
    }
  }

  // Types and functions anywhere at the top; top-level code is one frame, "main".
  const top = named(root);
  const globals = [];
  let first = null;
  let lastCode = null;
  let un = new Set();
  let quiet = false;
  for (const c of top) {
    if (c.type === 'function_declaration') { fn(c, null, [...globals]); continue; }
    if (c.type === 'class_declaration' || c.type === 'protocol_declaration') { visitType(c); continue; }
    if (c.type === 'import_declaration' || c.type === 'typealias_declaration' || c.type === 'comment' || c.type === 'multiline_comment') continue;
    if (!first) {
      first = c;
      add(c.startIndex, `let __nx_f = __Nx.call("main", ${lineOf(c)}, nil); `);
    }
    if (c.type === 'statement_label') { stepAt(c, globals); quiet = true; continue; }
    let scope;
    [scope, un] = stmt(c, globals, un, quiet);
    quiet = false;
    globals.splice(0, globals.length, ...scope);
    lastCode = c;
  }
  if (lastCode) add(lastCode.endIndex, `; __nx_f.end(${vars(globals)}); __nx_f.exit()`);

  return { code: `${applyEdits(code, edits)}\n${RUNTIME}`, errors: root.hasError };
}

module.exports = { instrumentSwift };
