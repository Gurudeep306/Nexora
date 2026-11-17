/**
 * Dry run for JavaScript and TypeScript: parse the student's program
 * (tree-sitter) and add, without moving any line:
 *   - the runtime (js-runtime.js), joined onto the first line;
 *   - in each named function, a frame (`call`, `ret`, and an `exc` event
 *     when an error passes through), with try/catch/finally;
 *   - before each statement, a step with getters for the variables in scope
 *     (getters, so a `let` not reached yet is simply left out);
 *   - in loops, a step at the top of each pass and one at its end, put in
 *     the loop's update or condition (never after return/break/continue);
 *   - around each returned value, a note of what is returned.
 * TypeScript keeps its types: the added code is plain JavaScript.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');

/** The runtime as one line: block comments dropped, lines joined. */
const PRELUDE = fs
  .readFileSync(path.join(__dirname, 'js-runtime.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .join(' ');

const named = (n) => (n ? n.namedChildren : []);
const field = (n, f) => (n ? n.childForFieldName(f) : null);
const lineOf = (n) => n.startPosition.row + 1;
/** Where a node really ends: TypeScript's grammar stretches some over a trailing // comment. */
function endOf(n) {
  const kids = n.children;
  for (let i = kids.length - 1; i >= 0; i--) if (kids[i].type !== 'comment') return endOf(kids[i]);
  return n.endIndex;
}

/** Input/output helpers: called once per number read, they would use up the step budget. */
const IO_NAMES = /^(next|nextInt|nextLong|nextNum|nextNumber|nextLine|nextToken|nextStr|nextString|num|nums|int|ints|readInt|readLine|readline|input|read|ni|nl|ns|ri|rl|rs|rn|line|lines|print|println|write|out)$/;
/** Callbacks that run the program's own logic, named after the method they are passed to. */
const CALLBACK_METHODS = new Set(['forEach', 'map', 'filter', 'reduce', 'reduceRight', 'some', 'every', 'find', 'findIndex', 'flatMap']);

/** Sorting methods whose comparator is drawn (the first comparisons of each sort). */
const SORTS = new Set(['sort', 'toSorted']);
const COMPARISONS = 40;
const FN_EXPR = new Set(['arrow_function', 'function_expression', 'function']);
/** Nodes that start a new function: their awaits are their own. */
const FN_TYPES = new Set(['function_declaration', 'function_expression', 'function', 'arrow_function', 'method_definition', 'generator_function_declaration', 'generator_function', 'class_declaration', 'class']);

/** Names a binding pattern introduces (`a`, `{a, b: c}`, `[x, ...rest]`, `a = 1`, TS `a: number`). */
function patternNames(p) {
  if (!p) return [];
  switch (p.type) {
    case 'identifier':
    case 'shorthand_property_identifier_pattern':
      return [p.text];
    case 'object_pattern':
    case 'array_pattern':
      return named(p).flatMap(patternNames);
    case 'pair_pattern':
      return patternNames(field(p, 'value'));
    case 'rest_pattern':
      return named(p).flatMap(patternNames);
    case 'assignment_pattern':
    case 'object_assignment_pattern':
      return patternNames(field(p, 'left'));
    case 'required_parameter':
    case 'optional_parameter':
      return patternNames(field(p, 'pattern'));
    default:
      return [];
  }
}
const declNames = (decl) => named(decl).filter((d) => d.type === 'variable_declarator').flatMap((d) => patternNames(field(d, 'name')));
const paramNames = (params) => named(params).flatMap(patternNames);

/** Getters for the names in scope, inner names shadowing outer ones. */
function getters(names) {
  const seen = new Set();
  const list = [];
  for (let i = names.length - 1; i >= 0; i--) {
    const n = names[i];
    if (seen.has(n)) continue;
    seen.add(n);
    list.unshift(n === 'this' || n.startsWith('this.') ? `[${JSON.stringify(n === 'this' ? 'this' : n.slice(5))}, () => ${n}]` : `[${JSON.stringify(n)}, () => ${n}]`);
  }
  return `() => [${list.join(', ')}]`;
}

async function instrumentJs(code, { typescript = false } = {}) {
  const parser = await parserFor(typescript ? 'typescript' : 'javascript');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });

  /* statements */
  function block(nodes, scope) {
    let local = [...scope];
    for (const c of nodes) local = stmt(c, local);
    return local;
  }

  const stepAt = (node, scope) => add(node.startIndex, `__nx_f.at(${lineOf(node)}, ${getters(scope)}); `);

  /** A loop or branch body: for a loop, a step at the top of each pass. */
  function body(node, scope, loop, ownerLine, endLine = 0) {
    if (!node) return;
    const head = loop ? ` __nx_f.head(${getters(scope)});` : '';
    // for…of / for…in have no update to hold the end of a pass: it goes at the
    // end of the body (JavaScript has no unreachable-code errors).
    const tailStmt = endLine ? ` __nx_f.at(${endLine}, ${getters(scope)});` : '';
    if (node.type === 'statement_block') {
      if (head) add(node.startIndex + 1, head);
      block(named(node), scope);
      if (tailStmt) add(node.endIndex - 1, `${tailStmt} `);
    } else {
      // A one-line body (for (…) x++;  if (c) y = 1;) is one step, not two.
      add(node.startIndex, `{${head} `);
      stmt(node, scope, lineOf(node) === ownerLine);
      add(endOf(node), `${tailStmt} }`);
    }
  }

  /** The end of a loop pass, as a call that returns true, put where the loop evaluates it. */
  const tail = (line, scope) => `__nx_f.tail(${line}, ${getters(scope)})`;

  function stmt(node, scope, quiet = false) {
    const step = () => {
      if (!quiet) stepAt(node, scope);
    };
    switch (node.type) {
      case 'lexical_declaration':
      case 'variable_declaration': {
        step();
        for (const d of named(node)) {
          if (d.type !== 'variable_declarator') continue;
          const v = field(d, 'value');
          const nm = patternNames(field(d, 'name'))[0];
          if (v && nm) maybeFunction(v, nm, scope);
        }
        return [...scope, ...declNames(node)];
      }
      case 'expression_statement': {
        step();
        scanCallbacks(node, scope);
        // obj.method = function () {…} / f = () => {…}
        const e = named(node)[0];
        if (e && e.type === 'assignment_expression') {
          const left = field(e, 'left');
          const right = field(e, 'right');
          if (right) maybeFunction(right, left ? left.text.split('.').pop() : 'function', scope);
        }
        return scope;
      }
      case 'break_statement':
      case 'continue_statement':
      case 'throw_statement':
        step();
        return scope;
      case 'return_statement': {
        step();
        const v = named(node).find((c) => c.type !== 'comment');
        if (v) {
          add(v.startIndex, '__nx_f.ret((');
          add(endOf(v), `), ${getters(scope)})`);
        } else add(node.startIndex, `__nx_f.end(${getters(scope)}); `);
        return scope;
      }
      case 'if_statement': {
        step();
        body(field(node, 'consequence'), scope, false, lineOf(node));
        const alt = field(node, 'alternative');
        if (alt) {
          const inner = alt.type === 'else_clause' ? named(alt).find((c) => c.type !== 'comment') : alt;
          body(inner, scope, false, lineOf(alt));
        }
        return scope;
      }
      case 'for_statement': {
        step();
        const init = field(node, 'initializer');
        const inner = init && (init.type === 'lexical_declaration' || init.type === 'variable_declaration') ? [...scope, ...declNames(init)] : scope;
        const inc = field(node, 'increment');
        if (inc) add(inc.startIndex, `${tail(lineOf(node), inner)}, `);
        else {
          const b = field(node, 'body');
          const close = node.children.filter((c) => c.type === ')' && b && c.endIndex <= b.startIndex).pop();
          if (close) add(close.startIndex, tail(lineOf(node), inner));
        }
        body(field(node, 'body'), inner, true, lineOf(node));
        return scope;
      }
      case 'for_in_statement': {
        step();
        const inner = [...scope, ...patternNames(field(node, 'left'))];
        body(field(node, 'body'), inner, true, lineOf(node), lineOf(node));
        return scope;
      }
      case 'while_statement': {
        // The condition marks the end of each pass (and the first check).
        const cond = field(node, 'condition');
        if (cond && cond.type === 'parenthesized_expression') {
          add(cond.startIndex + 1, `${tail(lineOf(node), scope)} && (`);
          add(cond.endIndex - 1, ')');
        } else step();
        body(field(node, 'body'), scope, true, lineOf(node));
        return scope;
      }
      case 'do_statement': {
        step();
        const cond = field(node, 'condition');
        if (cond && cond.type === 'parenthesized_expression') {
          add(cond.startIndex + 1, `${tail(lineOf(node), scope)} && (`);
          add(cond.endIndex - 1, ')');
        }
        body(field(node, 'body'), scope, true, lineOf(node));
        return scope;
      }
      case 'switch_statement': {
        step();
        const b = field(node, 'body');
        let local = [...scope];
        for (const c of named(b)) {
          if (c.type !== 'switch_case' && c.type !== 'switch_default') continue;
          const value = field(c, 'value');
          local = block(
            named(c).filter((s) => s !== value && !(value && s.startIndex === value.startIndex) && s.type !== 'comment'),
            local,
          );
        }
        return scope;
      }
      case 'statement_block':
        block(named(node), scope);
        return scope;
      case 'try_statement': {
        block(named(field(node, 'body')), scope);
        const h = field(node, 'handler');
        if (h) block(named(field(h, 'body')), [...scope, ...patternNames(field(h, 'parameter'))]);
        const f = field(node, 'finalizer');
        if (f) block(named(field(f, 'body')), scope);
        return scope;
      }
      case 'labeled_statement': {
        // The step goes before the label, so `continue outer` still finds its loop.
        step();
        const inner = field(node, 'body') || named(node).find((c) => c.type !== 'statement_identifier');
        return inner ? stmt(inner, scope, true) : scope;
      }
      case 'function_declaration': {
        const nm = field(node, 'name');
        frameFor(node, nm ? nm.text : 'function', scope, []);
        return scope;
      }
      case 'class_declaration':
      case 'abstract_class_declaration':
        classBody(node, scope);
        return scope;
      default:
        return scope;
    }
  }

  /* functions */
  const isBlockFn = (n) => n && (n.type === 'arrow_function' || n.type === 'function_expression' || n.type === 'function') && field(n, 'body') && field(n, 'body').type === 'statement_block';
  function maybeFunction(v, name, scope) {
    let f = v;
    while (f && (f.type === 'parenthesized_expression' || f.type === 'as_expression' || f.type === 'satisfies_expression')) f = named(f)[0];
    if (isBlockFn(f)) frameFor(f, name, scope, []);
  }
  /** Callbacks given to forEach/map/… run the program's own logic; `rl.on('close', …)` is the main program. */
  function scanCallbacks(n, scope) {
    if (n.type === 'call_expression') {
      const callee = field(n, 'function');
      const args = field(n, 'arguments');
      const prop = callee && callee.type === 'member_expression' ? field(callee, 'property') : null;
      const method = prop ? prop.text : null;
      const list = named(args);
      for (const a of list) {
        if (method && SORTS.has(method) && FN_EXPR.has(a.type)) {
          comparator(a, scope);
          continue;
        }
        if (!isBlockFn(a)) continue;
        if (method && CALLBACK_METHODS.has(method)) frameFor(a, `${method} callback`, scope, []);
        else if (method === 'on' && list[0] && /^['"`](close|end)['"`]$/.test(list[0].text)) frameFor(a, `on(${list[0].text})`, scope, []);
      }
    }
    for (const c of named(n)) if (!isBlockFn(c) && c.type !== 'class' && c.type !== 'function_expression') scanCallbacks(c, scope);
  }

  /** The awaits that belong to this function (not to functions inside it). */
  function ownAwaits(n, out = []) {
    for (const c of named(n)) {
      if (FN_TYPES.has(c.type)) continue;
      if (c.type === 'await_expression') out.push(c);
      ownAwaits(c, out);
    }
    return out;
  }
  /**
   * An async function is a frame too. At each await it steps off the call
   * stack (other code runs meanwhile) and steps back on when it resumes:
   * `await x` becomes `__nx_f.resume(await __nx_f.pause(x))`.
   */
  function awaitsIn(b) {
    for (const a of ownAwaits(b)) {
      const arg = named(a).find((c) => c.type !== 'comment');
      if (!arg) continue;
      add(a.startIndex, '__nx_f.resume(');
      add(arg.startIndex, '__nx_f.pause(');
      edits.push({ at: endOf(arg), text: '))', o: -1 });
    }
  }

  function frameFor(fn, name, outer, members, limit = 0) {
    if (IO_NAMES.test(name)) return;
    // Generators and `for await` hand control back and forth in ways a call stack can't show.
    if (/^(async\s+)?function\s*\*/.test(fn.text) || fn.type === 'generator_function_declaration' || /\bfor\s+await\b/.test(fn.text)) return;
    const b = field(fn, 'body');
    if (!b || b.type !== 'statement_block') return;
    const params = paramNames(field(fn, 'parameters') || field(fn, 'parameter'));
    if (fn.type === 'arrow_function' && !field(fn, 'parameters')) {
      const p = field(fn, 'parameter');
      if (p) params.push(...patternNames(p));
    }
    // Outer variables come along only when the function uses them (dfs and its
    // visited array), so a call isn't crowded with the whole program.
    const used = new Set(b.text.match(/[A-Za-z_$][\w$]*/g) || []);
    const scope = [...outer.filter((n) => used.has(n)), ...members, ...params];
    const start = b.startIndex + 1;
    // The call shows its parameters (the arguments it was given); the rest appears from its first step.
    add(start, ` const __nx_f = __nx.call(${JSON.stringify(name)}, ${lineOf(fn)}, ${getters(params)}${limit ? `, ${limit}` : ''}); try {`);
    block(named(b), scope);
    if (/^async\b/.test(fn.text)) awaitsIn(b);
    add(b.endIndex - 1, ' } catch (__nx_e) { __nx_f.exc(__nx_e); throw __nx_e; } finally { __nx_f.exit(); } ');
  }

  /**
   * A sort's comparator, `(a, b) => a - b` included: each comparison is a
   * short call that shows the two values and what it answered. Only the
   * first COMPARISONS of each sort are drawn, so a big sort can't use up
   * the steps.
   */
  function comparator(fn, scope) {
    const b = field(fn, 'body');
    if (!b) return;
    if (b.type === 'statement_block') return frameFor(fn, 'compare', scope, [], COMPARISONS);
    const params = paramNames(field(fn, 'parameters') || field(fn, 'parameter'));
    if (fn.type === 'arrow_function' && !field(fn, 'parameters')) {
      const p = field(fn, 'parameter');
      if (p) params.push(...patternNames(p));
    }
    const g = getters(params);
    add(b.startIndex, `{ const __nx_f = __nx.call("compare", ${lineOf(fn)}, ${g}, ${COMPARISONS}); try { __nx_f.at(${lineOf(b)}, ${g}); return __nx_f.ret((`);
    edits.push({ at: endOf(b), text: `), ${g}); } catch (__nx_e) { __nx_f.exc(__nx_e); throw __nx_e; } finally { __nx_f.exit(); } }`, o: 1 });
  }

  /** Class methods: each a frame; non-static methods see the fields set on `this`. */
  function classBody(cls, scope) {
    const nameNode = field(cls, 'name');
    const cname = nameNode ? nameNode.text : 'Object';
    const body = field(cls, 'body');
    const fieldNames = new Set();
    for (const m of named(body)) {
      if (m.type === 'field_definition' || m.type === 'public_field_definition') {
        const p = field(m, 'property') || field(m, 'name');
        if (p && /^[A-Za-z_$][\w$]*$/.test(p.text) && !/^static\b/.test(m.text)) fieldNames.add(p.text);
      }
    }
    for (const m of body.text.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) fieldNames.add(m[1]);
    for (const m of named(body)) {
      if (m.type !== 'method_definition') continue;
      const nm = field(m, 'name');
      if (!nm) continue;
      const isStatic = /^static\b/.test(m.text);
      if (/^(get|set)\s/.test(m.text)) continue;
      const members = isStatic ? [] : [...fieldNames].map((f) => `this.${f}`);
      frameFor(m, nm.text === 'constructor' ? cname : nm.text, scope, members);
    }
  }

  // The program itself runs in the "main" frame the runtime opens.
  block(named(root), []);

  // Classes the program defines (and functions used as constructors) are drawn as objects.
  const classes = new Set();
  const visit = (n) => {
    if (/class_declaration|^class$|function_declaration/.test(n.type)) {
      const nm = field(n, 'name');
      if (nm) classes.add(nm.text);
    }
    for (const c of named(n)) visit(c);
  };
  visit(root);
  // TypeScript may be compiled down to old JavaScript first (Wandbox runs tsc),
  // where for…of over a Map or Set quietly does nothing. The runtime is
  // handed over as a string to eval, so it always runs exactly as written.
  const cut = PRELUDE.lastIndexOf('const __nx_f');
  const iife = PRELUDE.slice(0, cut).replace(/^const __nx = /, '').replace(/;\s*$/, '');
  const prelude = typescript
    ? `const __nx: any = (0, eval)(${JSON.stringify(iife)}); ${PRELUDE.slice(cut)} __nx.classes = new Set(${JSON.stringify([...classes])});`
    : `${PRELUDE} __nx.classes = new Set(${JSON.stringify([...classes])});`;

  const out = applyEdits(code, edits);
  // A shebang must stay first: the runtime starts line 2 instead.
  if (out.startsWith('#!')) {
    const nl = out.indexOf('\n');
    if (nl < 0) return { code: `${out}\n${prelude}` };
    return { code: `${out.slice(0, nl + 1)}${prelude} ${out.slice(nl + 1)}` };
  }
  return { code: `${prelude} ${out}` };
}

module.exports = { instrumentJs, PRELUDE };
