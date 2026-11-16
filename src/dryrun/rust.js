/**
 * Dry run for Rust: parse the student's program (tree-sitter) and add, on
 * the same lines so compiler messages keep their line numbers:
 *   - at the top of each function, a frame (`call`) whose Drop sends `ret`
 *     (also while a panic unwinds), and in main a panic hook that reports
 *     the panic on its line before Rust prints its own message;
 *   - before each statement, a step with the variables that are surely safe
 *     to read there: Rust rejects reading a value that was moved away, a
 *     variable lent out as `&mut` while the loan lives, or a `let x;` with
 *     no value yet — such variables are left out of the step;
 *   - around a returned value (return or tail expression), a note of it.
 * The program's own structs get a serializer, so lists and trees can be
 * drawn. Output is counted by wrapping println!/print!/writeln!/write!.
 * The runtime (rust-runtime.rs) is appended after the program.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'rust-runtime.rs'), 'utf8');

const named = (n) => (n ? n.namedChildren : []);
const field = (n, f) => (n ? n.childForFieldName(f) : null);
const lineOf = (n) => n.startPosition.row + 1;

/** Input / output helpers are called once per number read: tracing them would use up the steps. */
const IO_FUNC = /^(read|read_line|read_int|read_vec|next|next_line|scan|token|ni|nl|nu|ns|input|get_line|readln|parse_line|out|flush)$/i;
const PRIMITIVE = /^(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char)$/;
/** Methods that consume their receiver (it is moved away). */
const CONSUMING = /^(into_iter|into_boxed_slice|into_bytes|into_keys|into_values|into_inner|into_sorted_vec|into_vec|unwrap|expect|unwrap_or|unwrap_or_default|unwrap_or_else|ok|err)$/;
/** Methods that lend their receiver out as &mut for as long as the result lives. */
const MUT_LOAN = /^(iter_mut|get_mut|last_mut|first_mut|entry|as_mut|values_mut|drain|split_at_mut|chunks_mut|peek_mut|as_mut_slice|borrow_mut)$/;
/** Macros whose arguments are only read. */
const READ_MACROS = /^(println|print|eprintln|eprint|format|write|writeln|assert|assert_eq|assert_ne|debug_assert|dbg|panic|unreachable)$/;

/** All identifiers bound by a pattern. */
function bound(p, out = []) {
  if (!p) return out;
  if (p.type === 'identifier') {
    if (p.text !== '_') out.push(p.text);
    return out;
  }
  if (p.type === 'shorthand_field_identifier') {
    out.push(p.text);
    return out;
  }
  // Path patterns (None, Some, an enum variant) bind nothing themselves.
  if (p.type === 'scoped_identifier' || p.type === 'field_identifier' || p.type === 'type_identifier') return out;
  for (const c of named(p)) {
    if (p.type === 'tuple_struct_pattern' && c === named(p)[0]) continue; // the variant name
    if (p.type === 'struct_pattern' && c.type === 'type_identifier') continue;
    if (p.type === 'field_pattern') {
      // `x: pat` binds what pat binds; `x` alone binds x.
      const pat = field(p, 'pattern');
      if (pat) bound(pat, out);
      else for (const s of named(p)) if (s.type === 'shorthand_field_identifier') out.push(s.text);
      return out;
    }
    bound(c, out);
  }
  return out;
}

/** Is a `let` surely of a Copy type (a number, bool, char or reference)? */
function copyish(typeNode, value) {
  if (typeNode) {
    if (typeNode.type === 'primitive_type' || typeNode.type === 'reference_type') return true;
    if (typeNode.type === 'array_type' || typeNode.type === 'tuple_type') return named(typeNode).every((c) => c.type === 'primitive_type' || c.type === 'integer_literal' || /^[A-Z_0-9]+$/.test(c.text));
    return false;
  }
  if (!value) return false;
  const t = value.type;
  if (/^(integer_literal|float_literal|boolean_literal|char_literal)$/.test(t)) return true;
  if (t === 'type_cast_expression') return PRIMITIVE.test(field(value, 'type')?.text ?? '');
  if (t === 'reference_expression') return !/\bmut\b/.test(value.text.slice(0, 5));
  if (t === 'unary_expression' || t === 'binary_expression') return !/[a-zA-Z_]\w*\s*\(/.test(value.text) || /\.(len|count)\(\)/.test(value.text);
  if (/\.(len|count|abs|pow|min|max)\(\s*[^)]*\)\s*$/.test(value.text) && !/\.(min|max)\(\)$/.test(value.text)) return true;
  if (/parse::<\s*(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char)\s*>\s*\(\s*\)(\.unwrap\(\)|\?)?$/.test(value.text)) return true;
  return false;
}

async function instrumentRust(code) {
  const parser = await parserFor('rust');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });
  const impls = [];

  /* ── a variable in scope: { name, copy, moved, loaned, unset } ── */
  const usable = (v) => !v.moved && !v.loaned && !v.unset;
  function stepArgs(scope) {
    const seen = new Set();
    const list = [];
    for (let i = scope.length - 1; i >= 0; i--) {
      const v = scope[i];
      if (seen.has(v.name)) continue;
      seen.add(v.name); // the innermost binding hides outer ones, usable or not
      if (usable(v)) list.unshift(v.name);
    }
    return `&[${list.map((n) => `("${n}", crate::__nx_s!(${n}))`).join(', ')}]`;
  }
  const find = (scope, name) => {
    for (let i = scope.length - 1; i >= 0; i--) if (scope[i].name === name) return scope[i];
    return null;
  };

  /** After a statement: which variables it moved away, or lent out as &mut. */
  function effects(node, scope, local) {
    const visit = (n, inMoveClosure) => {
      if (!n) return;
      if (n.type === 'assignment_expression') {
        // x = f(x): the right side may move x, then x has a new value again.
        visit(field(n, 'right'), inMoveClosure);
        const left = field(n, 'left');
        const v = left && left.type === 'identifier' ? find(scope, left.text) : null;
        if (v) v.moved = false;
        else visit(left, inMoveClosure);
        return;
      }
      if (n.type === 'closure_expression') {
        const move = /^move\b/.test(n.text);
        for (const c of named(n)) visit(c, inMoveClosure || move);
        return;
      }
      if (n.type === 'macro_invocation') {
        const m = field(n, 'macro')?.text ?? '';
        if (!READ_MACROS.test(m)) {
          // vec![x; n] and other macros may take their arguments by value.
          for (const id of n.text.match(/\b[a-zA-Z_]\w*\b/g) ?? []) {
            const v = find(scope, id);
            if (v && !v.copy) v.moved = true;
          }
        }
        return;
      }
      if (n.type === 'identifier' || n.type === 'field_expression') {
        const base = n.type === 'identifier' ? n : leftmost(n);
        const v = base && find(scope, base.text);
        if (v && !v.copy && (inMoveClosure || byValue(n))) v.moved = true;
      }
      if (n.type === 'let_condition') {
        const v = patternMoves(field(n, 'value'), [field(n, 'pattern')], scope);
        if (v) v.moved = true;
      }
      if (n.type === 'match_expression') {
        const arms = named(field(n, 'body')).filter((a) => a.type === 'match_arm').map((a) => field(a, 'pattern'));
        const v = patternMoves(field(n, 'value'), arms, scope);
        if (v) v.moved = true;
      }
      if (n.type === 'call_expression') {
        // x.into_iter(), x.unwrap(): the receiver is consumed.
        const fnode = field(n, 'function');
        if (fnode && fnode.type === 'field_expression') {
          const m = field(fnode, 'field')?.text ?? '';
          const recv = field(fnode, 'value');
          if (CONSUMING.test(m) && recv && recv.type === 'identifier') {
            const v = find(scope, recv.text);
            if (v && !v.copy) v.moved = true;
          }
        }
      }
      for (const c of named(n)) visit(c, inMoveClosure);
    };
    visit(node, false);
    // let r = &mut x; let it = x.iter_mut(); → x is lent out while r / it live.
    if (node.type === 'let_declaration') {
      const val = field(node, 'value');
      for (const name of loans(val)) {
        const v = find(scope, name);
        if (v) {
          v.loaned = true;
          local.loans.push(v);
        }
      }
    }
  }
  /** `if let P = x` / `while let P = x` / `match x { P => … }` binding by value moves (part of) x. */
  function patternMoves(value, patterns, scope) {
    if (!value || value.type !== 'identifier') return null;
    const v = find(scope, value.text);
    if (!v || v.copy) return null;
    const binds = patterns.some((p) => p && bound(p).length && !/\bref\b/.test(p.text));
    return binds ? v : null;
  }
  const leftmost = (n) => {
    let x = n;
    while (x && x.type === 'field_expression') x = field(x, 'value');
    return x && x.type === 'identifier' ? x : null;
  };
  /** An identifier (or field) used by value: passed, assigned, returned, stored, iterated. */
  function byValue(n) {
    const p = n.parent;
    if (!p) return false;
    switch (p.type) {
      case 'arguments':
      case 'array_expression':
      case 'tuple_expression':
      case 'return_expression':
        return true;
      case 'let_declaration':
        return field(p, 'value')?.id === n.id;
      case 'assignment_expression':
        return field(p, 'right')?.id === n.id;
      case 'for_expression':
        return field(p, 'value')?.id === n.id;
      case 'field_initializer':
        return field(p, 'value')?.id === n.id;
      case 'shorthand_field_initializer':
        return true;
      default:
        return false;
    }
  }
  /** Names lent out as &mut by an expression stored in a binding. */
  function loans(n) {
    const out = [];
    const visit = (x) => {
      if (!x || x.type === 'closure_expression') return;
      if (x.type === 'reference_expression' && /^&\s*mut\b/.test(x.text)) {
        const b = field(x, 'value');
        const id = b && (b.type === 'identifier' ? b : leftmost(b) || (b.type === 'index_expression' ? leftmost(named(b)[0]) || (named(b)[0]?.type === 'identifier' ? named(b)[0] : null) : null));
        if (id) out.push(id.text);
      }
      if (x.type === 'call_expression') {
        const f = field(x, 'function');
        if (f && f.type === 'field_expression' && MUT_LOAN.test(field(f, 'field')?.text ?? '')) {
          const r = field(f, 'value');
          const id = r && (r.type === 'identifier' ? r : leftmost(r));
          if (id) out.push(id.text);
        }
      }
      for (const c of named(x)) visit(c);
    };
    visit(n);
    return out;
  }

  const stepText = (node, scope) => `if crate::__nx_rt::on() { __nx_f.at(${lineOf(node)}, ${stepArgs(scope)}); } `;

  /** A block: its statements in order; the scope grows as lets appear. */
  function block(node, scope, opts = {}) {
    const local = { loans: [] };
    let s = [...scope];
    const kids = named(node).filter((c) => c.type !== 'line_comment' && c.type !== 'block_comment');
    kids.forEach((c, i) => {
      // The last expression without a `;` is the block's value (a match or an if
      // there is filed as an expression_statement).
      const tail = i === kids.length - 1 && !/;\s*$/.test(c.text) && c.type !== 'let_declaration' && !/_item$/.test(c.type) && !/^(for_expression|while_expression|loop_expression)$/.test((c.type === 'expression_statement' ? named(c)[0] : c)?.type ?? '');
      s = stmt(c, s, local, tail && opts.tailReturns);
    });
    // Loans made in this block end with it.
    for (const v of local.loans) v.loaned = false;
  }

  /** A body that runs again and again (a loop): it starts by sending the loop line. */
  function loopBody(b, scope, line) {
    if (!b || b.type !== 'block') return;
    add(b.startIndex + 1, ` if crate::__nx_rt::on() { __nx_f.head(${stepArgs(scope)}); }`);
    block(b, scope);
    // The end of a pass, before the loop variable moves on (for / loop have
    // no update of their own): the pass's last line is sent with its values.
    if (line) add(b.endIndex - 1, `; if crate::__nx_rt::on() { __nx_f.tail(${line}, ${stepArgs(scope)}); } `);
  }

  /** Bodies inside an expression (if / match / loop / block). */
  function inner(n, scope) {
    if (!n) return;
    switch (n.type) {
      case 'if_expression': {
        let s = scope;
        const cond = field(n, 'condition');
        if (cond && (cond.type === 'let_condition' || cond.type === 'let_chain')) {
          const pats = cond.type === 'let_condition' ? [cond] : named(cond).filter((c) => c.type === 'let_condition');
          s = [...scope];
          for (const lc of pats) {
            const mv = patternMoves(field(lc, 'value'), [field(lc, 'pattern')], s);
            if (mv) s = s.map((x) => (x === mv ? { ...x, moved: true } : x));
            for (const name of loans(field(lc, 'value'))) {
              const v = find(s, name);
              if (v) s = s.map((x) => (x === v ? { ...x, loaned: true } : x));
            }
            for (const name of bound(field(lc, 'pattern'))) s.push({ name, copy: false });
          }
        }
        const c = field(n, 'consequence');
        if (c) block(c, s);
        const alt = field(n, 'alternative');
        if (alt) for (const x of named(alt)) x.type === 'block' ? block(x, scope) : inner(x, scope);
        return;
      }
      case 'match_expression': {
        const val = field(n, 'value');
        let s = scope;
        for (const name of loans(val)) {
          const v = find(s, name);
          if (v) s = s.map((x) => (x === v ? { ...x, loaned: true } : x));
        }
        const mv = patternMoves(val, named(field(n, 'body')).filter((a) => a.type === 'match_arm').map((a) => field(a, 'pattern')), s);
        if (mv) s = s.map((x) => (x === mv ? { ...x, moved: true } : x));
        for (const arm of named(field(n, 'body'))) {
          if (arm.type !== 'match_arm') continue;
          const pat = field(arm, 'pattern');
          const armScope = [...s, ...bound(pat).map((name) => ({ name, copy: false }))];
          const v = field(arm, 'value');
          if (v && v.type === 'block') block(v, armScope);
          else inner(v, armScope);
        }
        return;
      }
      case 'while_expression': {
        const cond = field(n, 'condition');
        let s = [...scope];
        if (cond && cond.type === 'let_condition') {
          const mv = patternMoves(field(cond, 'value'), [field(cond, 'pattern')], s);
          if (mv) s = s.map((x) => (x === mv ? { ...x, moved: true } : x));
          for (const name of loans(field(cond, 'value'))) {
            const v = find(s, name);
            if (v) s = s.map((x) => (x === v ? { ...x, loaned: true } : x));
          }
          for (const name of bound(field(cond, 'pattern'))) s.push({ name, copy: false });
        } else if (cond) {
          // End of a pass: the condition sends the loop line first.
          add(cond.startIndex, `{ if crate::__nx_rt::on() { __nx_f.tail(${lineOf(n)}, ${stepArgs(scope)}); } true } && (`);
          add(cond.endIndex, ')');
        }
        loopBody(field(n, 'body'), s);
        return;
      }
      case 'loop_expression':
        loopBody(field(n, 'body'), scope, lineOf(n));
        return;
      case 'for_expression': {
        const val = field(n, 'value');
        let s = [...scope];
        for (const name of loans(val)) {
          const v = find(s, name);
          if (v) s = s.map((x) => (x === v ? { ...x, loaned: true } : x));
        }
        // for x in v.iter_mut() / for x in &mut v: v is lent out in the body.
        if (val && /\.iter_mut\(\)|^&\s*mut\s/.test(val.text)) {
          const id = val.type === 'identifier' ? val : leftmost(field(field(val, 'function') || val, 'value') || val) || (val.type === 'reference_expression' ? field(val, 'value') : null);
          const v = id && find(s, id.text);
          if (v) s = s.map((x) => (x === v ? { ...x, loaned: true } : x));
        }
        const isRange = val && (val.type === 'range_expression' || /^\(?\s*\w+\s*\.\.=?/.test(val.text));
        for (const name of bound(field(n, 'pattern'))) s.push({ name, copy: isRange });
        loopBody(field(n, 'body'), s, lineOf(n));
        return;
      }
      case 'block':
      case 'unsafe_block':
        block(n.type === 'block' ? n : named(n).find((x) => x.type === 'block'), scope);
        return;
      case 'closure_expression':
        return; // closures are not traced (they may outlive or move the frame)
      default:
        for (const c of named(n)) inner(c, scope);
    }
  }

  /** One statement: its step, the bodies inside it; returns the scope after it. */
  function stmt(node, scope, local, tailReturn) {
    if (/_item$/.test(node.type) || node.type === 'attribute_item' || node.type === 'empty_statement') return scope;
    add(node.startIndex, stepText(node, scope));
    if (node.type === 'let_declaration') {
      const val = field(node, 'value');
      inner(val, scope);
      const alt = field(node, 'alternative');
      if (alt) inner(alt, scope);
      effects(node, scope, local);
      const ty = field(node, 'type');
      const names = bound(field(node, 'pattern'));
      const copy = copyish(ty, val);
      return [...scope, ...names.map((name) => ({ name, copy, unset: !val }))];
    }
    if (tailReturn && current && current.ret) {
      // The tail expression is the returned value: note it, unchanged.
      inner(node, scope);
      add(node.startIndex, `{ let __nx_v = `);
      add(node.endIndex, `; __nx_f.keep(crate::__nx_s!(__nx_v)); __nx_v }`);
      return scope;
    }
    const e = node.type === 'expression_statement' ? named(node)[0] : node;
    if (e && e.type === 'return_expression') {
      const v = named(e)[0];
      if (v && current && current.ret) {
        inner(v, scope);
        add(v.startIndex, `{ let __nx_v = `);
        add(v.endIndex, `; __nx_f.keep(crate::__nx_s!(__nx_v)); __nx_v }`);
      }
      return scope;
    }
    // x = …; gives a `let x;` its value.
    if (e && e.type === 'assignment_expression') {
      const left = field(e, 'left');
      const v = left && left.type === 'identifier' ? find(scope, left.text) : null;
      inner(field(e, 'right'), scope);
      effects(node, scope, local);
      if (v && v.unset) {
        return scope.map((x) => (x === v ? { ...x, unset: false } : x));
      }
      if (v && v.moved) {
        // Assigning a new value makes a moved variable readable again.
        return scope.map((x) => (x === v ? { ...x, moved: false } : x));
      }
      return scope;
    }
    inner(e, scope);
    effects(node, scope, local);
    return scope;
  }

  let current = null;

  /** A function or method: its frame, then its body. */
  function fn(node) {
    const b = field(node, 'body');
    const name = field(node, 'name')?.text ?? 'fn';
    if (!b || IO_FUNC.test(name) || /\basync\b/.test(node.text.slice(0, node.text.indexOf(name)))) return;
    const params = [];
    for (const p of named(field(node, 'parameters'))) {
      if (p.type === 'self_parameter') {
        if (!/&\s*mut/.test(p.text)) params.push({ name: 'self', copy: /&/.test(p.text) });
        continue;
      }
      if (p.type !== 'parameter') continue;
      const ty = field(p, 'type');
      const copy = !!ty && (ty.type === 'primitive_type' || (ty.type === 'reference_type' && !/&\s*mut/.test(ty.text)));
      for (const n of bound(field(p, 'pattern'))) params.push({ name: n, copy });
    }
    const rt = field(node, 'return_type');
    const saved = current;
    current = { ret: !!rt && rt.text !== '()' && rt.text !== '!' };
    const hook = name === 'main' ? 'crate::__nx_rt::hook(); ' : '';
    add(b.startIndex + 1, ` ${hook}let __nx_f = crate::__nx_rt::F::call("${name}", ${lineOf(node)}, ${stepArgs(params)});`);
    block(b, params, { tailReturns: true });
    current = saved;
  }

  /** A serializer for each of the program's own (non-generic) structs. */
  function struct(node) {
    const name = field(node, 'name')?.text;
    if (!name || field(node, 'type_parameters')) return;
    const body = field(node, 'body');
    let fieldsList = [];
    if (body && body.type === 'field_declaration_list') {
      fieldsList = named(body).filter((f) => f.type === 'field_declaration').map((f) => field(f, 'name')?.text).filter(Boolean);
    } else if (body && body.type === 'ordered_field_declaration_list') {
      fieldsList = named(body).filter((f) => f.type !== 'attribute_item' && f.type !== 'visibility_modifier').map((_, i) => String(i));
    } else return;
    impls.push(
      `impl crate::__nx_rt::S for ${name} { fn nx(&self, w: &mut String) -> bool { crate::__nx_rt::obj(self as *const Self as usize, "${name}", w, &|| vec![${fieldsList
        .map((f) => `("${f}", crate::__nx_s!(self.${f}))`)
        .join(', ')}]) } }`,
    );
  }

  const visit = (n, inTraitImpl) => {
    for (const c of named(n)) {
      if (c.type === 'function_item') {
        if (!inTraitImpl) fn(c);
        // Functions declared inside a function are their own items.
        visit(field(c, 'body') ?? c, false);
      } else if (c.type === 'impl_item') {
        // impl Ord / Display / Iterator for X: library plumbing, called many times — not traced.
        visit(field(c, 'body') ?? c, !!field(c, 'trait'));
      } else if (c.type === 'struct_item') struct(c);
      else if (c.type === 'mod_item') visit(c, false);
      else if (c.type === 'declaration_list') visit(c, inTraitImpl);
      else if (c.type !== 'closure_expression') visit(c, inTraitImpl);
    }
  };
  visit(root, false);

  /* ── output: counted, not changed (added after the steps, so a step at the
     same place comes first) ── */
  const walk = (n) => {
    if (n.type === 'macro_invocation') {
      const m = field(n, 'macro');
      if (m && m.type === 'identifier' && /^(println|print|writeln|write)$/.test(m.text)) {
        add(m.startIndex, 'crate::__nx_');
      }
    }
    for (const c of named(n)) walk(c);
  };
  walk(root);

  return { code: `${applyEdits(code, edits)}\n${RUNTIME}\n${impls.join('\n')}\n`, errors: root.hasError };
}

module.exports = { instrumentRust };
