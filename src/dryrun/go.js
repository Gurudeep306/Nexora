/**
 * Dry run for Go: parse the student's program (tree-sitter) and add, on the
 * same lines so compiler messages keep their line numbers:
 *   - at the top of each function (and each func literal), a frame (`call`)
 *     and a deferred `__nxDone` that sends `ret`, and reports a panic on its
 *     line before letting it go on exactly as before;
 *   - before each statement, a step with the variables in scope;
 *   - around a single returned value, a note of what is returned.
 * The loop's end-of-pass step runs before its post statement (i++), as in
 * the other languages. Output is counted by wrapping fmt.Print* and the
 * os.Stdout handed to writers; nothing is printed to stdout. The runtime
 * (go-runtime.go) is appended; its imports are added, aliased, on the
 * package line, so no line moves.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'go-runtime.go'), 'utf8');
const IMPORTS = '; import (__nxfmt "fmt"; __nxio "io"; __nxos "os"; __nxreflect "reflect"; __nxsort "sort"; __nxstrconv "strconv"; __nxstrings "strings")';

const named = (n) => (n ? n.namedChildren : []);
const field = (n, f) => (n ? n.childForFieldName(f) : null);
const fields = (n, f) => (n ? n.childrenForFieldName(f).filter((c) => c && c.isNamed) : []);
const lineOf = (n) => n.startPosition.row + 1;

/** Input / output helpers are called once per number read: tracing them would use up the steps. */
const IO_FUNC = /^(readInt|readLong|readString|readLine|read|readInts|nextInt|nextLine|next|ni|nl|ns|scan|scanInt|print|println|printf|write|flush|writeLine|out)$/i;
/** sort.Interface / heap.Interface / Stringer methods: called by the library many times per step. */
const BOILERPLATE_METHOD = /^(Len|Less|Swap|String|Error)$/;

/**
 * A variable in scope: its name, and how to pass it (`&a` for an array, so a
 * big one is not copied on every step).
 */
const v = (name, array = false) => ({ name, arg: array ? `&${name}` : name });

/** The variables argument for a step: each name once, the innermost wins. */
function args(scope) {
  const seen = new Set();
  const list = [];
  for (let i = scope.length - 1; i >= 0; i--) {
    const s = scope[i];
    if (!s.name || s.name === '_' || seen.has(s.name)) continue;
    seen.add(s.name);
    list.unshift(s);
  }
  return list.map((s) => `, "${s.name}", ${s.arg}`).join('');
}

const isArrayType = (t) => !!t && t.type === 'array_type';

async function instrumentGo(code) {
  const parser = await parserFor('go');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });

  /* ── package-level variables are visible everywhere ── */
  const globals = [];
  for (const d of named(root)) {
    if (d.type !== 'var_declaration') continue;
    for (const spec of named(d).flatMap((x) => (x.type === 'var_spec_list' ? named(x) : [x]))) {
      if (spec.type !== 'var_spec') continue;
      const arr = isArrayType(field(spec, 'type'));
      for (const n of fields(spec, 'name')) globals.push(v(n.text, arr));
    }
  }

  let current = null; // { ret: type text or null }

  const stepText = (node, scope) => `if __nxOn { __nx_f.at(${lineOf(node)}${args(scope)}) }; `;

  /** Names declared by a simple statement (x := …, var x T, a, b := …). */
  function declared(node) {
    const out = [];
    if (node.type === 'short_var_declaration') {
      const right = named(field(node, 'right'));
      named(field(node, 'left')).forEach((n, i) => {
        if (n.type !== 'identifier') return;
        const r = right[i];
        const arr = !!r && r.type === 'composite_literal' && isArrayType(field(r, 'type'));
        out.push(v(n.text, arr));
      });
    } else if (node.type === 'var_declaration') {
      for (const spec of named(node).flatMap((x) => (x.type === 'var_spec_list' ? named(x) : [x]))) {
        if (spec.type !== 'var_spec') continue;
        const arr = isArrayType(field(spec, 'type'));
        for (const n of fields(spec, 'name')) out.push(v(n.text, arr));
      }
    } else if (node.type === 'const_declaration') {
      for (const spec of named(node)) if (spec.type === 'const_spec') for (const n of fields(spec, 'name')) out.push(v(n.text));
    }
    return out;
  }

  function block(node, scope) {
    let local = [...scope];
    for (const c of named(node)) local = stmt(c, local);
    return local;
  }

  /** A loop or branch body; a loop's body starts by sending the loop line. */
  function body(node, scope, loop) {
    if (!node) return;
    if (loop) add(node.startIndex + 1, ` if __nxOn { __nx_f.head(${args(scope).slice(2)}) };`);
    block(node, scope);
  }

  /** Function literals inside an expression are traced as their own calls. */
  function literals(node, scope, name) {
    walkFuncLits(node, scope, name);
  }
  function walkFuncLits(n, scope, name) {
    if (!n) return;
    if (n.type === 'func_literal') {
      fn(n, name || 'func', scope);
      return;
    }
    for (const c of named(n)) walkFuncLits(c, scope, name);
  }

  /** Instrument one statement; returns the scope after it. */
  function stmt(node, scope) {
    const step = () => add(node.startIndex, stepText(node, scope));
    switch (node.type) {
      case 'short_var_declaration':
      case 'var_declaration':
      case 'const_declaration': {
        step();
        const names = declared(node);
        // A func literal assigned here takes the variable's name (dfs := func…).
        const right = named(field(node, 'right'));
        if (node.type === 'short_var_declaration') right.forEach((r, i) => literals(r, [...scope, ...names], names[i]?.name));
        else literals(node, [...scope, ...names], names[0]?.name);
        return [...scope, ...names];
      }
      case 'assignment_statement': {
        step();
        const left = named(field(node, 'left'));
        named(field(node, 'right')).forEach((r, i) => literals(r, scope, left[i]?.type === 'identifier' ? left[i].text : null));
        return scope;
      }
      case 'expression_statement':
      case 'inc_statement':
      case 'dec_statement':
      case 'send_statement':
      case 'go_statement':
      case 'defer_statement':
        step();
        literals(node, scope, null);
        return scope;
      case 'break_statement':
      case 'continue_statement':
      case 'goto_statement':
      case 'fallthrough_statement':
        step();
        return scope;
      case 'return_statement': {
        step();
        const list = named(node)[0];
        const vals = list ? (list.type === 'expression_list' ? named(list) : [list]) : [];
        if (vals.length === 1 && current && current.ret) {
          // return x  →  return __nxRet[T](__nx_f, x, vars…): the same value, noted.
          add(vals[0].startIndex, `__nxRet[${current.ret}](__nx_f, `);
          add(vals[0].endIndex, `${args(scope)})`);
          literals(vals[0], scope, null);
        } else if (!vals.length || !current || !current.ret) {
          add(node.startIndex, `if __nxOn { __nx_f.end(${args(scope).slice(2)}) }; `);
        }
        return scope;
      }
      case 'if_statement': {
        step();
        let inner = [...scope];
        const init = field(node, 'initializer');
        if (init) inner = [...inner, ...declared(init)];
        literals(field(node, 'condition'), inner, null);
        body(field(node, 'consequence'), inner, false);
        const alt = field(node, 'alternative');
        if (alt) {
          if (alt.type === 'if_statement') {
            // else if …  →  else { step; if … }
            add(alt.startIndex, '{ ');
            stmt(alt, inner);
            add(alt.endIndex, ' }');
          } else body(alt, inner, false);
        }
        return scope;
      }
      case 'for_statement': {
        step();
        const clause = named(node).find((c) => c.type === 'for_clause' || c.type === 'range_clause');
        const b = field(node, 'body');
        if (clause && clause.type === 'range_clause') {
          const inner = [...scope];
          // for i, x := range a: the loop's own variables.
          if (/:=/.test(clause.text)) for (const n of named(field(clause, 'left'))) if (n.type === 'identifier') inner.push(v(n.text));
          body(b, inner, true);
          return scope;
        }
        if (clause) {
          const init = field(clause, 'initializer');
          const inner = init ? [...scope, ...declared(init)] : [...scope];
          const update = field(clause, 'update');
          const cond = field(clause, 'condition');
          if (update) {
            // End of a pass, before the update (i++): func(){ step; i++ }()
            add(update.startIndex, `func() { if __nxOn { __nx_f.at(${lineOf(node)}${args(inner)}) }; `);
            add(update.endIndex, ' }()');
          } else if (cond) {
            add(cond.startIndex, `(!__nxOn || __nx_f.tail(${lineOf(node)}${args(inner)})) && (`);
            add(cond.endIndex, ')');
          }
          body(b, inner, true);
          return scope;
        }
        // for cond { } and for { }
        const cond = named(node).find((c) => c !== b);
        if (cond) {
          add(cond.startIndex, `(!__nxOn || __nx_f.tail(${lineOf(node)}${args(scope)})) && (`);
          add(cond.endIndex, ')');
        } else add(b.startIndex, `!__nxOn || __nx_f.tail(${lineOf(node)}${args(scope)}) `);
        body(b, scope, true);
        return scope;
      }
      case 'expression_switch_statement':
      case 'type_switch_statement':
      case 'select_statement': {
        step();
        let inner = [...scope];
        const init = field(node, 'initializer');
        if (init) inner = [...inner, ...declared(init)];
        const alias = named(node).find((c) => c.type === 'expression_list' && node.type === 'type_switch_statement');
        if (alias) for (const n of named(alias)) if (n.type === 'identifier') inner.push(v(n.text));
        for (const c of named(node)) {
          if (!/case|default_case|communication_case|type_case/.test(c.type)) continue;
          let caseScope = inner;
          const comm = field(c, 'communication');
          if (comm && comm.type === 'receive_statement') caseScope = [...inner, ...named(field(comm, 'left')).filter((n) => n.type === 'identifier').map((n) => v(n.text))];
          // Statements of a case come after its value(s) and the colon.
          for (const s of named(c)) {
            if (s.startIndex < (c.text.indexOf(':') >= 0 ? c.startIndex + c.text.indexOf(':') : c.startIndex)) continue;
            caseScope = stmt(s, caseScope);
          }
        }
        return scope;
      }
      case 'block':
        step();
        block(node, scope);
        return scope;
      case 'labeled_statement': {
        // The step goes before the label, so `break outer` still finds its loop.
        step();
        const s = named(node).find((c) => c.type !== 'label_name');
        if (s) {
          const restore = edits.length;
          stmt(s, scope);
          // The labelled statement itself gets no second step in front of it.
          const lbl = edits.findIndex((e, i) => i >= restore && e.at === s.startIndex && e.text.startsWith('if __nxOn { __nx_f.at('));
          if (lbl >= 0) edits.splice(lbl, 1);
        }
        return scope;
      }
      default:
        return scope;
    }
  }

  /** A function or func literal: its frame, then its body. */
  function fn(node, name, outer) {
    const b = field(node, 'body');
    if (!b || b.type !== 'block') return;
    if (IO_FUNC.test(name)) return;
    const params = [];
    for (const list of [field(node, 'receiver'), field(node, 'parameters')]) {
      for (const p of named(list)) {
        if (p.type !== 'parameter_declaration' && p.type !== 'variadic_parameter_declaration') continue;
        const arr = isArrayType(field(p, 'type'));
        for (const n of fields(p, 'name')) params.push(v(n.text, arr));
      }
    }
    const res = field(node, 'result');
    let ret = null;
    if (res && res.type === 'parameter_list') {
      // Named results are variables too.
      for (const p of named(res)) for (const n of fields(p, 'name')) params.push(v(n.text, isArrayType(field(p, 'type'))));
    } else if (res) ret = res.text;
    const saved = current;
    current = { ret };
    add(b.startIndex + 1, ` __nx_f := __nxCall("${name}", ${lineOf(node)}${args(params)}); defer func() { __nxDone(__nx_f, recover()) }();`);
    block(b, [...outer, ...params]);
    current = saved;
  }

  for (const d of named(root)) {
    if (d.type === 'function_declaration' || d.type === 'method_declaration') {
      const name = field(d, 'name')?.text ?? 'func';
      if (d.type === 'method_declaration' && BOILERPLATE_METHOD.test(name)) continue;
      fn(d, name, globals);
    } else if (d.type === 'var_declaration') {
      // var f = func(…) { … } at package level.
      for (const spec of named(d).flatMap((x) => (x.type === 'var_spec_list' ? named(x) : [x]))) {
        if (spec.type === 'var_spec') walkFuncLits(spec, globals, fields(spec, 'name')[0]?.text);
      }
    }
  }

  /* ── output: count it without changing it (added after the steps, so a
     step at the same place comes first) ── */
  const walkAll = (n, fn) => {
    fn(n);
    for (const c of named(n)) walkAll(c, fn);
  };
  walkAll(root, (n) => {
    if (n.type !== 'call_expression') return;
    const fnNode = field(n, 'function');
    if (fnNode && fnNode.type === 'selector_expression') {
      const op = field(fnNode, 'operand')?.text;
      const f = field(fnNode, 'field')?.text;
      // fmt.Println(…) → __nxCnt(fmt.Println(…)): the same two results, counted.
      if (op === 'fmt' && /^Print(ln|f)?$/.test(f || '')) {
        add(n.startIndex, '__nxCnt(');
        add(n.endIndex, ')');
      }
    }
    // os.Stdout handed to a writer (bufio.NewWriter(os.Stdout), fmt.Fprintln(os.Stdout, …)).
    for (const a of named(field(n, 'arguments'))) {
      if (a.type === 'selector_expression' && a.text.replace(/\s+/g, '') === 'os.Stdout') {
        add(a.startIndex, '__nxW(');
        add(a.endIndex, ')');
      }
    }
  });

  // The runtime's imports go on the package line, so no line moves.
  const pkg = named(root).find((c) => c.type === 'package_clause');
  if (pkg) add(pkg.endIndex, IMPORTS);

  return { code: `${applyEdits(code, edits)}\n${RUNTIME}`, errors: root.hasError };
}

module.exports = { instrumentGo };
