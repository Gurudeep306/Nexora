/**
 * Dry run for Kotlin: parse the student's program (tree-sitter) and add, on
 * the same lines so compiler messages keep their line numbers:
 *   - at the top of each function, a frame (`call`), with the body inside
 *     try / catch / finally so an exception is reported on its line and the
 *     `ret` event is always sent. A function written `= expr` becomes
 *     `= __Nx.call(…).let { __nx_f -> try { …ret(expr) } … }`, so its type is
 *     still inferred from the expression;
 *   - before each statement, a step with the variables that surely have a
 *     value at that point (Kotlin will not read a `val x: Int` before it is set);
 *   - around each returned value, a note of what is returned.
 * Loops in Kotlin have no update part, so a loop's end-of-pass step goes at
 * the end of its body (for), or into its condition (while / do-while).
 * Lambdas are not traced: they run inside the step of the line that calls them.
 * `System.out` becomes `__Nx.out`, which counts what is printed; print and
 * println are counted by the file-level functions in kotlin-runtime.kt.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'kotlin-runtime.kt'), 'utf8');

const named = (n) => (n ? n.namedChildren : []);
const kids = (n) => (n ? n.children : []);
const tok = (n, t) => kids(n).find((c) => c.type === t) ?? null;
const lastTok = (n, t) => [...kids(n)].reverse().find((c) => c.type === t) ?? null;
const lineOf = (n) => n.startPosition.row + 1;
const nameOf = (n) => named(n).find((c) => c.type === 'simple_identifier')?.text ?? null;

/** Input / output helpers are called once per number read: tracing them would use up the steps. */
const IO_CLASS = /(Reader|Scanner|Input|Output|Writer|FastIO|^IO$|Printer)/i;
const IO_METHOD = /^(readInt|readLong|readDouble|readLine|readLn|readInts|readLongs|readStrings|readString|readStr|read|readByte|next|nextInt|nextLong|nextDouble|nextLine|nextToken|ni|nl|nd|ns|print|println|write|flush|close)$/;
/** Called by the runtime, sorting and hashing, not by the student's steps. */
/** Statements whose body the grammar can leave as the next statement. */
const ORPHAN = new Set(['for_statement', 'while_statement', 'if_expression']);
const BOILERPLATE = /^(toString|equals|hashCode|compareTo|compare|component\d+)$/;

/** The vars argument: built only while tracing is on. */
function vars(names) {
  const seen = new Set();
  const list = [];
  for (let i = names.length - 1; i >= 0; i--) if (!seen.has(names[i])) seen.add(names[i]) && list.unshift(names[i]);
  return list.length ? `if (__Nx.on) arrayOf<Any?>(${list.map((n) => `"${n}", ${n}`).join(', ')}) else null` : 'null';
}

/** Names a property declaration binds: [names, has a value now]. */
function bound(decl) {
  const names = [];
  for (const c of named(decl)) {
    if (c.type === 'variable_declaration') names.push(nameOf(c));
    else if (c.type === 'multi_variable_declaration') for (const v of named(c)) if (v.type === 'variable_declaration') names.push(nameOf(v));
  }
  const delegated = named(decl).some((c) => c.type === 'property_delegate' || c.type === 'getter' || c.type === 'setter');
  return [names.filter((n) => n && n !== '_'), !!tok(decl, '='), delegated];
}

/** Properties of a class or object body, or of the file, that can be read at any step. */
function readableProps(nodes) {
  const out = [];
  for (const p of nodes) {
    if (p.type === 'class_parameter') {
      if (tok(p, 'binding_pattern_kind') || named(p).some((c) => c.type === 'binding_pattern_kind')) out.push(nameOf(p));
      continue;
    }
    if (p.type !== 'property_declaration') continue;
    const mods = named(p).find((c) => c.type === 'modifiers')?.text ?? '';
    if (/\b(const|lateinit)\b/.test(mods)) continue;
    const [names, hasValue, delegated] = bound(p);
    if (hasValue && !delegated) out.push(...names);
  }
  return out.filter(Boolean);
}

async function instrumentKotlin(code) {
  const parser = await parserFor('kotlin');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });
  const stepAt = (node, scope) => add(node.startIndex, `__nx_f.at(${lineOf(node)}, ${vars(scope)}); `);

  /** The statements between a node's own braces. */
  function block(node, scope, startUnassigned = new Set()) {
    const s = named(node).find((c) => c.type === 'statements');
    if (!s) return scope;
    let local = [...scope];
    let unassigned = new Set(startUnassigned);
    let quiet = false;
    const list = named(s);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.type === 'label') {
        // The step goes before the label, so `break@outer` still finds its loop.
        stepAt(c, local);
        quiet = true;
        continue;
      }
      // The grammar leaves a body written on the next line (`for (…)` ⏎ body)
      // as the next statement: it is this one's body, so no step goes between.
      let k = i;
      const orphan = [];
      while (k + 1 < list.length && ORPHAN.has(list[k].type) && !named(list[k]).some((x) => x.type === 'control_structure_body')) orphan.push(list[++k]);
      [local, unassigned] = stmt(c, local, unassigned, quiet, orphan);
      i = k;
      quiet = false;
    }
    return local;
  }

  /** A control structure's body: braced, or one statement (`one`, when the grammar left it outside). */
  function body(csb, scope, loop, ownerLine, unassigned = new Set(), orphan = []) {
    if (!csb && !orphan.length) return;
    const open = csb ? tok(csb, '{') : null;
    const tailText = loop ? `__nx_f.tail(${ownerLine}, ${vars(scope)})` : '';
    if (open) {
      if (loop) add(open.endIndex, ` __nx_f.head(${vars(scope)});`);
      block(csb, scope, unassigned);
      if (loop && loop !== 'cond') add(lastTok(csb, '}').startIndex, `; ${tailText} `);
      return;
    }
    const one = csb ? named(csb)[0] : orphan[0];
    if (!one) return;
    const rest = csb ? [] : orphan.slice(1);
    const last = rest.length ? rest[rest.length - 1] : one;
    if (loop) {
      add(one.startIndex, `{ __nx_f.head(${vars(scope)}); `);
      stmt(one, scope, unassigned, lineOf(one) === ownerLine, rest);
      add(last.endIndex, loop !== 'cond' ? `; ${tailText} }` : ' }');
    } else stmt(one, scope, unassigned, true, rest);
  }

  /** Instrument one statement; returns [scope after it, declared-but-unset names]. */
  function stmt(node, scope, unassigned, quiet = false, orphan = []) {
    const step = () => { if (!quiet) stepAt(node, scope); };
    switch (node.type) {
      case 'property_declaration': {
        step();
        const [names, hasValue, delegated] = bound(node);
        if (delegated) return [scope, unassigned];
        if (hasValue) return [[...scope, ...names], unassigned];
        const un = new Set(unassigned);
        for (const n of names) un.add(n);
        return [scope, un];
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
      case 'jump_expression': {
        step();
        const kw = kids(node)[0]?.type;
        const v = named(node)[0];
        if (kw === 'return' && !/^return@/.test(node.text)) {
          if (v) {
            add(v.startIndex, '__nx_f.ret(');
            add(v.endIndex, `, ${vars(scope)})`);
          } else add(node.startIndex, `__nx_f.end(${vars(scope)}); `);
        }
        return [scope, unassigned];
      }
      case 'if_expression': {
        step();
        const branches = named(node).filter((c) => c.type === 'control_structure_body');
        if (branches.length) for (const c of branches) body(c, scope, false, lineOf(node));
        else body(null, scope, false, lineOf(node), unassigned, orphan);
        return [scope, unassigned];
      }
      case 'when_expression': {
        step();
        for (const e of named(node)) {
          if (e.type !== 'when_entry') continue;
          const b = named(e).find((c) => c.type === 'control_structure_body');
          body(b, scope, false, lineOf(e));
        }
        return [scope, unassigned];
      }
      case 'for_statement': {
        step();
        const inner = [...scope];
        for (const c of named(node)) {
          if (c.type === 'variable_declaration') inner.push(nameOf(c));
          else if (c.type === 'multi_variable_declaration') for (const v of named(c)) if (v.type === 'variable_declaration') inner.push(nameOf(v));
        }
        body(named(node).find((c) => c.type === 'control_structure_body'), inner.filter((n) => n && n !== '_'), true, lineOf(node), unassigned, orphan);
        return [scope, unassigned];
      }
      case 'while_statement':
      case 'do_while_statement': {
        step();
        const kw = node.type === 'while_statement' ? kids(node).findIndex((c) => c.type === '(') : kids(node).findIndex((c) => c.type === 'while');
        const all = kids(node);
        const open = node.type === 'while_statement' ? all[kw] : all.slice(kw).find((c) => c.type === '(');
        const close = lastTok(node, ')');
        if (open && close) {
          add(open.endIndex, `__nx_f.tail(${lineOf(node)}, ${vars(scope)}) && (`);
          add(close.startIndex, ')');
        }
        body(named(node).find((c) => c.type === 'control_structure_body'), scope, 'cond', lineOf(node), unassigned, node.type === 'while_statement' ? orphan : []);
        return [scope, unassigned];
      }
      case 'try_expression': {
        step();
        block(node, scope);
        for (const c of named(node)) {
          if (c.type === 'catch_block') block(c, [...scope, nameOf(c)].filter(Boolean));
          else if (c.type === 'finally_block') block(c, scope);
        }
        return [scope, unassigned];
      }
      case 'function_declaration':
        fn(node, null, scope);
        return [scope, unassigned];
      case 'class_declaration':
      case 'object_declaration':
        visit(node, node);
        return [scope, unassigned];
      default:
        step();
        return [scope, unassigned];
    }
  }

  let fileProps = [];

  function fn(m, klass, outer = []) {
    const name = nameOf(m);
    const fb = named(m).find((c) => c.type === 'function_body');
    if (!name || !fb) return;
    if (IO_METHOD.test(name) || BOILERPLATE.test(name)) return;
    const mods = named(m).find((c) => c.type === 'modifiers')?.text ?? '';
    if (/\b(suspend|inline)\b/.test(mods)) return;
    const kn = klass ? named(klass).find((c) => c.type === 'type_identifier')?.text : null;
    if (kn && IO_CLASS.test(kn)) return;
    const params = named(named(m).find((c) => c.type === 'function_value_parameters'))
      .filter((p) => p.type === 'parameter')
      .map(nameOf)
      .filter(Boolean);
    if (name === 'main') params.splice(params.indexOf('args') >>> 0, params.includes('args') ? 1 : 0);
    let props = [];
    if (klass) {
      const ctor = named(klass).find((c) => c.type === 'primary_constructor');
      const cb = named(klass).find((c) => c.type === 'class_body');
      props = readableProps([...named(ctor), ...named(cb)]);
    }
    const all = [...fileProps, ...outer, ...props, ...params];
    const open = `__Nx.call("${name}", ${lineOf(m)}, ${vars(params)})`;
    const close = `catch (__nx_t: Throwable) { __nx_f.exc(__nx_t); throw __nx_t } finally { __nx_f.end(${vars(all)}); __nx_f.exit() }`;
    const brace = tok(fb, '{');
    if (brace) {
      add(brace.endIndex, ` val __nx_f = ${open}; try {`);
      block(fb, all);
      add(lastTok(fb, '}').startIndex, ` } ${close} `);
      return;
    }
    // `= expr`: the frame wraps the expression, so the type is still inferred.
    const expr = named(fb)[0];
    if (!expr) return;
    add(expr.startIndex, `${open}.let { __nx_f -> try { __nx_f.at(${lineOf(expr)}, ${vars(params)}); __nx_f.ret(`);
    add(expr.endIndex, `, ${vars(all)}) } ${close} }`);
  }

  function visit(n, klass) {
    for (const c of named(n)) {
      if (c.type === 'function_declaration') fn(c, klass);
      else if (c.type === 'class_declaration' || c.type === 'object_declaration' || c.type === 'companion_object') visit(named(c).find((x) => x.type === 'class_body') ?? c, c);
      else if (c.type === 'class_body' || c.type === 'enum_class_body') visit(c, klass);
    }
  }

  fileProps = readableProps(named(root));
  visit(root, null);

  // Count what goes through System.out (println via PrintWriter, BufferedWriter, …).
  const out = applyEdits(code, edits).replace(/\bSystem\.out\b/g, '__Nx.out');
  return { code: `${out}\n${RUNTIME}`, errors: root.hasError };
}

module.exports = { instrumentKotlin };
