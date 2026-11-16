/**
 * Dry run for C++: parse the student's program (tree-sitter), and add, on
 * the same lines so compiler messages keep their line numbers:
 *   - at the top of each function, a frame object (`call` and `ret` events);
 *   - before each statement, a step that sends the variables in scope
 *     (the runtime sends only the ones that changed);
 *   - around each returned value, a note of what is returned;
 *   - inside each struct, a list of its fields, so linked nodes and trees
 *     can be drawn.
 * The runtime (cpp-runtime.h) is prepended and ends with `#line 1`.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');
const { expandMacros } = require('./macros');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'cpp-runtime.h'), 'utf8');

const named = (n) => (n ? n.namedChildren : []);
const field = (n, f) => (n ? n.childForFieldName(f) : null);
const fields = (n, f) => (n ? n.childrenForFieldName(f).filter(Boolean) : []);
const lineOf = (n) => n.startPosition.row + 1;

/** The names a declarator introduces (`a`, `*p`, `&r`, `b[10]`, `x = 1`, `[a, b]`); none for a function prototype. */
function declaredNames(d) {
  if (!d) return [];
  switch (d.type) {
    case 'identifier':
    case 'field_identifier':
      return [d.text];
    case 'function_declarator':
    case 'abstract_function_declarator':
    case 'qualified_identifier':
    case 'operator_name':
      return [];
    case 'structured_binding_declarator':
      return named(d).filter((c) => c.type === 'identifier').map((c) => c.text);
    case 'init_declarator':
    case 'pointer_declarator':
    case 'reference_declarator':
    case 'array_declarator':
    case 'parenthesized_declarator':
    case 'attributed_declarator': {
      const inner = field(d, 'declarator') || named(d).find((c) => c.type !== 'attribute_declaration' && c.type !== 'type_qualifier');
      return declaredNames(inner);
    }
    default:
      return [];
  }
}
const namesOfDeclaration = (decl) => fields(decl, 'declarator').flatMap(declaredNames);

/**
 * Inside a function, `vector<int> a(n);` parses like a prototype (C++'s
 * "most vexing parse"). When no parameter has a name of its own, it is a
 * variable built from arguments.
 */
function localNames(decl) {
  return fields(decl, 'declarator').flatMap((d) => {
    if (d.type !== 'function_declarator') return declaredNames(d);
    const params = named(field(d, 'parameters'));
    const prototype = params.some((p) => p.type === 'variadic_parameter' || (p.type.endsWith('parameter_declaration') && field(p, 'declarator')));
    const id = field(d, 'declarator');
    return !prototype && id && id.type === 'identifier' ? [id.text] : [];
  });
}

function paramNames(fnDeclarator) {
  const list = field(fnDeclarator, 'parameters');
  return named(list)
    .filter((p) => p.type === 'parameter_declaration' || p.type === 'optional_parameter_declaration')
    .flatMap((p) => declaredNames(field(p, 'declarator')));
}

/** The function_declarator under a function definition's declarator (through pointers / references). */
function fnDeclaratorOf(d) {
  while (d && d.type !== 'function_declarator') d = field(d, 'declarator') || named(d)[0];
  return d;
}

const isConstDecl = (decl) => named(decl).some((c) => (c.type === 'type_qualifier' && /^(const|constexpr|constinit)$/.test(c.text)) || (c.type === 'storage_class_specifier' && c.text === 'constexpr'));
const hasSpecifier = (n, re) => named(n).some((c) => (c.type === 'storage_class_specifier' || c.type === 'type_qualifier' || c.type === 'virtual' || c.type === 'explicit_function_specifier') && re.test(c.text));
const insideFunction = (n) => {
  for (let p = n.parent; p; p = p.parent) if (p.type === 'function_definition' || p.type === 'lambda_expression' || p.type === 'compound_statement') return true;
  return false;
};

/** `[&](::__nx::V& __nx_v){ __nx_v("a", a); … }` — inner names shadow outer ones. */
function lam(names) {
  const seen = new Set();
  const list = [];
  for (let i = names.length - 1; i >= 0; i--) if (!seen.has(names[i])) seen.add(names[i]) && list.unshift(names[i]);
  return `[&](::__nx::V& __nx_v){${list.map((n) => ` __nx_v("${n}", ${n});`).join('')} }`;
}

async function instrumentCpp(source) {
  const code = expandMacros(source);
  const parser = await parserFor('cpp');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });

  /* structs: their fields, for the runtime and for methods */
  const structFields = new Map();
  const visit = (n, fn) => {
    fn(n);
    for (const c of named(n)) visit(c, fn);
  };
  visit(root, (n) => {
    if (n.type !== 'struct_specifier' && n.type !== 'class_specifier') return;
    const name = field(n, 'name');
    const body = field(n, 'body');
    if (!name || !body || name.type !== 'type_identifier') return;
    const own = [];
    for (const f of named(body)) {
      if (f.type !== 'field_declaration' || hasSpecifier(f, /^static$/)) continue;
      own.push(...fields(f, 'declarator').flatMap(declaredNames));
    }
    structFields.set(name.text, own);
    // A friend can't be defined in a struct declared inside a function.
    if (insideFunction(n) || !own.length) return;
    const t = name.text;
    add(body.endIndex - 1, ` friend void __nx_fields(const ${t}& __nx_o, ::__nx::Obj& __nx_w){ __nx_w.c = "${t}";${own.map((f) => ` __nx_w.f("${f}", __nx_o.${f});`).join('')} }`);
  });

  /* globals the program can change, in order */
  const globals = [];
  for (const c of named(root)) if (c.type === 'declaration' && !isConstDecl(c) && !hasSpecifier(c, /^extern$/)) for (const n of namesOfDeclaration(c)) globals.push({ n, end: c.endIndex });
  const globalsBefore = (at) => globals.filter((g) => g.end <= at).map((g) => g.n);

  /* statements */
  const lastNamed = (block) => named(block).filter((c) => c.type !== 'comment').pop();

  function block(node, scope) {
    let local = [...scope];
    for (const c of named(node)) {
      if (c.type === 'case_statement') {
        const value = field(c, 'value');
        for (const s of named(c)) if (s !== value && !(value && s.startIndex === value.startIndex)) local = stmt(s, local);
      } else local = stmt(c, local);
    }
    return local;
  }

  /**
   * A loop or branch body. For a loop: the line before the loop is sent
   * first; each pass starts by sending the loop line (its update, like j++,
   * has just run) and ends by marking the loop line as next — so the last
   * line of a pass is sent before the update changes its variables.
   */
  function body(node, scope, loopLine, ownerLine) {
    if (!node) return;
    const head = loopLine ? ` __nx_f.head(${lam(scope)});` : '';
    const tail = loopLine ? ` __nx_f.at(${loopLine}, ${lam(scope)});` : '';
    if (node.type === 'compound_statement') {
      if (head) add(node.startIndex + 1, head);
      block(node, scope);
      if (tail) add(node.endIndex - 1, `${tail} `);
    } else {
      // A one-line body (for (…) x++;  if (c) y = 1;) is one step, not two.
      add(node.startIndex, `{${head}`);
      stmt(node, scope, lineOf(node) === ownerLine);
      add(node.endIndex, `${tail} }`);
    }
  }

  const stepAt = (node, scope) => add(node.startIndex, `__nx_f.at(${lineOf(node)}, ${lam(scope)}); `);

  /** Instrument one statement; returns the scope after it. */
  function stmt(node, scope, quiet = false) {
    const step = (n, sc) => {
      if (!quiet) stepAt(n, sc);
    };
    switch (node.type) {
      case 'declaration': {
        if (!quiet) step(node, scope);
        const names = localNames(node);
        // A named lambda (auto dfs = [&](int u){…}) runs as its own function.
        for (const d of fields(node, 'declarator')) {
          const v = d.type === 'init_declarator' ? field(d, 'value') : null;
          const lambda = v && (v.type === 'lambda_expression' ? v : null);
          const nm = declaredNames(d)[0];
          if (lambda && nm) instrumentLambda(lambda, nm, scope);
        }
        return [...scope, ...names];
      }
      case 'expression_statement':
      case 'break_statement':
      case 'continue_statement':
      case 'goto_statement':
      case 'throw_statement':
        if (node.text.trim() !== ';') step(node, scope);
        return scope;
      case 'return_statement': {
        step(node, scope);
        const v = named(node)[0];
        if (v && v.type !== 'initializer_list' && v.type !== 'comment') {
          add(v.startIndex, '__nx_f.ret((');
          add(v.endIndex, `), ${lam(scope)})`);
        } else if (!v) add(node.startIndex, `__nx_f.end(${lam(scope)}); `);
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
        const inner = init && init.type === 'declaration' ? [...scope, ...namesOfDeclaration(init)] : scope;
        body(field(node, 'body'), inner, lineOf(node), lineOf(node));
        return scope;
      }
      case 'for_range_loop': {
        step(node, scope);
        const inner = [...scope, ...declaredNames(field(node, 'declarator'))];
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
      case 'try_statement': {
        const b = field(node, 'body');
        if (b) block(b, scope);
        for (const c of named(node)) if (c.type === 'catch_clause') block(field(c, 'body'), scope);
        return scope;
      }
      case 'labeled_statement': {
        const s = named(node).find((c) => c.type !== 'statement_identifier');
        return s ? stmt(s, scope) : scope;
      }
      default:
        return scope;
    }
  }

  function frame(bodyNode, name, line, params, outer) {
    add(bodyNode.startIndex + 1, ` ::__nx::Frame __nx_f("${name}", ${line}, ${lam(params)});`);
    const end = block(bodyNode, [...outer, ...params]);
    const last = lastNamed(bodyNode);
    if (!last || last.type !== 'return_statement') add(bodyNode.endIndex - 1, ` __nx_f.end(${lam(end)}); `);
  }

  function instrumentLambda(lambda, name, scope) {
    const b = field(lambda, 'body');
    if (!b || b.type !== 'compound_statement') return;
    const caps = field(lambda, 'captures');
    const capText = caps ? caps.text : '[]';
    let outer;
    if (/^\[\s*[&=]/.test(capText)) outer = scope;
    else {
      const listed = named(caps).filter((c) => c.type === 'identifier').map((c) => c.text);
      outer = [...globalsBefore(lambda.startIndex), ...scope.filter((n) => listed.includes(n))];
    }
    const decl = field(lambda, 'declarator');
    frame(b, name, lineOf(lambda), decl ? paramNames(decl) : [], outer);
  }

  /* functions (not ones nested in another function: those are lambdas, handled above) */
  visit(root, (n) => {
    if (n.type !== 'function_definition' || insideFunction(n)) return;
    const b = field(n, 'body');
    if (!b || b.type !== 'compound_statement') return;
    if (hasSpecifier(n, /^(constexpr|consteval)$/)) return;
    const fd = fnDeclaratorOf(field(n, 'declarator'));
    if (!fd) return;
    const id = field(fd, 'declarator');
    if (!id || id.type === 'operator_name' || id.type === 'destructor_name') return;
    let name = id.text;
    let members = [];
    const klass = n.parent && n.parent.type === 'field_declaration_list' ? n.parent.parent : null;
    if (klass) {
      const kn = field(klass, 'name');
      if (kn && kn.text === name) name = `${name}()`;
      if (!hasSpecifier(n, /^static$/) && kn) members = structFields.get(kn.text) || [];
    } else if (id.type === 'qualified_identifier') {
      const scopeName = field(id, 'scope');
      const nm = field(id, 'name');
      if (!nm || nm.type === 'operator_name' || nm.type === 'destructor_name') return;
      name = nm.text;
      if (scopeName) {
        if (scopeName.text === nm.text) name = `${name}()`;
        members = structFields.get(scopeName.text) || [];
      }
    }
    if (/^operator\b/.test(name)) return;
    frame(b, name, lineOf(n), paramNames(fd), [...globalsBefore(n.startIndex), ...members]);
  });

  return { code: RUNTIME + applyEdits(code, edits), errors: root.hasError };
}

module.exports = { instrumentCpp };
