/**
 * Dry run for Java: parse the student's program (tree-sitter) and add, on
 * the same lines so compiler messages keep their line numbers:
 *   - at the top of each method, a frame (`call`), with the body inside
 *     try / catch / finally so an exception is reported on its line and the
 *     `ret` event is always sent;
 *   - before each statement, a step with the variables that are surely
 *     assigned at that point (Java will not read a variable before that);
 *   - around each returned value, a note of what is returned.
 * Java rejects a statement it can prove unreachable, so nothing is added
 * after a return, break or loop: a loop's end-of-pass step goes into its
 * update (for) or its condition (while / do). The runtime (java-runtime.java)
 * is appended after the program as a non-public class.
 */
const fs = require('fs');
const path = require('path');
const { parserFor, applyEdits } = require('./treesitter');

const RUNTIME = fs.readFileSync(path.join(__dirname, 'java-runtime.java'), 'utf8');

const named = (n) => (n ? n.namedChildren : []);
const field = (n, f) => (n ? n.childForFieldName(f) : null);
const fields = (n, f) => (n ? n.childrenForFieldName(f).filter(Boolean) : []);
const lineOf = (n) => n.startPosition.row + 1;
const isStatic = (n) => named(n).some((c) => c.type === 'modifiers' && /\bstatic\b/.test(c.text));

/** Input / output helpers are called once per number read: tracing them would use up the steps. */
const IO_CLASS = /(Reader|Scanner|Input|Output|Writer|Kattio|FastIO|^IO$|Printer)/i;
const IO_METHOD = /^(ni|nl|nd|ns|nc|na|next|nextInt|nextLong|nextDouble|nextLine|nextToken|nextChar|readInt|readLong|readDouble|readLine|readString|read|readByte|ri|rl|rd|rs|scan|scanInt|print|println|printf|write|flush|close|isSpaceChar|skip|fillBuffer|eat)$/;

/** The vars argument: built only while tracing is on. */
function vars(names) {
  const seen = new Set();
  const list = [];
  for (let i = names.length - 1; i >= 0; i--) if (!seen.has(names[i])) seen.add(names[i]) && list.unshift(names[i]);
  return list.length ? `__Nx.on ? new Object[]{${list.map((n) => `"${n}", ${n}`).join(', ')}} : null` : 'null';
}

async function instrumentJava(code) {
  const parser = await parserFor('java');
  const tree = parser.parse(code);
  const root = tree.rootNode;
  const edits = [];
  const add = (at, text) => edits.push({ at, text });

  /** Field names of a class body: [static ones, instance ones]. */
  function classFields(body) {
    const st = [];
    const inst = [];
    for (const f of named(body)) {
      if (f.type !== 'field_declaration') continue;
      const names = fields(f, 'declarator').map((d) => field(d, 'name')?.text).filter(Boolean);
      (isStatic(f) ? st : inst).push(...names);
    }
    return [st, inst];
  }

  function block(node, scope, startUnassigned = new Set()) {
    let local = [...scope];
    let unassigned = new Set(startUnassigned);
    for (const c of named(node)) {
      if (c.type === 'switch_block_statement_group') {
        for (const s of named(c)) if (s.type !== 'switch_label') [local, unassigned] = stmt(s, local, unassigned);
      } else if (c.type === 'switch_rule') {
        const b = named(c).find((x) => x.type === 'block');
        if (b) block(b, local);
      } else [local, unassigned] = stmt(c, local, unassigned);
    }
    return local;
  }

  /** A loop or branch body: for a loop, a step on entry sends the loop line. */
  function body(node, scope, loop, ownerLine, unassigned = new Set()) {
    if (!node) return;
    const head = loop ? ` __nx_f.head(${vars(scope)});` : '';
    if (node.type === 'block') {
      if (head) add(node.startIndex + 1, head);
      block(node, scope, unassigned);
    } else {
      add(node.startIndex, `{${head} `);
      stmt(node, scope, unassigned, lineOf(node) === ownerLine);
      add(node.endIndex, ' }');
    }
  }

  const stepAt = (node, scope) => add(node.startIndex, `__nx_f.at(${lineOf(node)}, ${vars(scope)}); `);

  /** Instrument one statement; returns [scope after it, declared-but-unassigned names]. */
  function stmt(node, scope, unassigned, quiet = false) {
    const step = () => {
      if (!quiet) stepAt(node, scope);
    };
    switch (node.type) {
      case 'local_variable_declaration': {
        step();
        const out = [...scope];
        const un = new Set(unassigned);
        for (const d of fields(node, 'declarator')) {
          const n = field(d, 'name')?.text;
          if (!n) continue;
          if (field(d, 'value')) out.push(n);
          else un.add(n);
        }
        return [out, un];
      }
      case 'expression_statement': {
        step();
        // `x = …;` at this level makes a declared variable readable from here on.
        const e = named(node)[0];
        if (e && e.type === 'assignment_expression') {
          const left = field(e, 'left');
          if (left && left.type === 'identifier' && unassigned.has(left.text)) {
            const un = new Set(unassigned);
            un.delete(left.text);
            return [[...scope, left.text], un];
          }
        }
        // A switch used as a statement.
        if (e && e.type === 'switch_expression') {
          const b = field(e, 'body');
          if (b) block(b, scope);
        }
        return [scope, unassigned];
      }
      case 'switch_expression': {
        step();
        const b = field(node, 'body');
        if (b) block(b, scope);
        return [scope, unassigned];
      }
      case 'break_statement':
      case 'continue_statement':
      case 'throw_statement':
      case 'yield_statement':
      case 'assert_statement':
        step();
        return [scope, unassigned];
      case 'return_statement': {
        step();
        const v = named(node)[0];
        if (v && v.type !== 'lambda_expression' && v.type !== 'method_reference') {
          add(v.startIndex, `${current.cast}__nx_f.ret(`);
          add(v.endIndex, `, ${vars(scope)})`);
        } else if (!v) add(node.startIndex, `__nx_f.end(${vars(scope)}); `);
        return [scope, unassigned];
      }
      case 'if_statement': {
        step();
        body(field(node, 'consequence'), scope, false, lineOf(node));
        const alt = field(node, 'alternative');
        if (alt) body(alt, scope, false, lineOf(alt));
        return [scope, unassigned];
      }
      case 'for_statement': {
        step();
        const inner = [...scope];
        const un = new Set(unassigned);
        let after = scope;
        for (const i of fields(node, 'init')) {
          if (i.type === 'local_variable_declaration') {
            for (const d of fields(i, 'declarator')) {
              const n = field(d, 'name')?.text;
              if (!n) continue;
              if (field(d, 'value')) inner.push(n);
              else un.add(n); // for (int i = 0, j; …): j has no value yet
            }
          } else if (i.type === 'assignment_expression') {
            // for (j = i; …) gives a declared variable its value, here and after the loop.
            const left = field(i, 'left');
            if (left && left.type === 'identifier' && un.has(left.text)) {
              un.delete(left.text);
              inner.push(left.text);
              after = [...after, left.text];
            }
          }
        }
        // End of a pass: before the update (i++) runs.
        const tail = `__nx_f.tail(${lineOf(node)}, ${vars(inner)})`;
        const ups = fields(node, 'update');
        if (ups.length) add(ups[0].startIndex, `${tail}, `);
        else {
          const b = field(node, 'body');
          const close = node.text.lastIndexOf(')', b.startIndex - node.startIndex);
          add(node.startIndex + close, tail);
        }
        body(field(node, 'body'), inner, true, lineOf(node), un);
        const left = new Set(unassigned);
        for (const n of after) left.delete(n);
        return [after, left];
      }
      case 'enhanced_for_statement': {
        step();
        const n = field(node, 'name');
        body(field(node, 'body'), n ? [...scope, n.text] : scope, true, lineOf(node));
        return [scope, unassigned];
      }
      case 'while_statement':
      case 'do_statement': {
        if (node.type === 'while_statement') step();
        else step();
        const cond = field(node, 'condition');
        if (cond && cond.type === 'parenthesized_expression') {
          add(cond.startIndex + 1, `__nx_f.tail(${lineOf(node)}, ${vars(scope)}) && (`);
          add(cond.endIndex - 1, ')');
        }
        body(field(node, 'body'), scope, true, lineOf(node));
        return [scope, unassigned];
      }
      case 'block':
        block(node, scope);
        return [scope, unassigned];
      case 'try_statement':
      case 'try_with_resources_statement': {
        const inner = [...scope];
        const res = field(node, 'resources');
        for (const r of named(res)) {
          const n = field(r, 'name');
          if (n) inner.push(n.text);
        }
        const b = field(node, 'body');
        if (b) block(b, inner);
        for (const c of named(node)) {
          if (c.type === 'catch_clause') {
            const p = named(c).find((x) => x.type === 'catch_formal_parameter');
            const pn = p ? field(p, 'name')?.text : null;
            const cb = field(c, 'body');
            if (cb) block(cb, pn ? [...scope, pn] : scope);
          } else if (c.type === 'finally_clause') {
            const fb = named(c).find((x) => x.type === 'block');
            if (fb) block(fb, scope);
          }
        }
        return [scope, unassigned];
      }
      case 'labeled_statement': {
        // The step goes before the label, so `break outer;` still finds its loop.
        step();
        const s = named(node).find((c) => c.type !== 'identifier');
        if (s) stmt(s, scope, unassigned, true);
        return [scope, unassigned];
      }
      case 'synchronized_statement': {
        step();
        const b = named(node).find((c) => c.type === 'block');
        if (b) block(b, scope);
        return [scope, unassigned];
      }
      default:
        return [scope, unassigned];
    }
  }

  let current = { cast: '' };

  function method(m, klass) {
    const b = field(m, 'body');
    const nameNode = field(m, 'name');
    if (!b || !nameNode) return;
    const name = nameNode.text;
    if (IO_METHOD.test(name)) return;
    const kn = klass ? field(klass, 'name')?.text : null;
    if (kn && IO_CLASS.test(kn)) return;
    const params = named(field(m, 'parameters'))
      .filter((p) => p.type === 'formal_parameter' || p.type === 'spread_parameter')
      .map((p) => field(p, 'name')?.text || named(p).filter((x) => x.type === 'variable_declarator').map((d) => field(d, 'name')?.text)[0])
      .filter(Boolean);
    const [st, inst] = klass ? classFields(field(klass, 'body')) : [[], []];
    const visible = isStatic(m) ? st : [...st, ...inst];
    // main's String[] args is always empty here.
    if (name === 'main') params.splice(params.indexOf('args') >>> 0, params.includes('args') ? 1 : 0);
    const rtype = field(m, 'type')?.text ?? 'void';
    current = { cast: /^(byte|short|char)$/.test(rtype) ? `(${rtype}) ` : '' };
    const outer = [...visible, ...params];
    add(b.startIndex + 1, ` __Nx.F __nx_f = __Nx.call("${name}", ${lineOf(m)}, ${vars(outer)}); try {`);
    block(b, outer);
    add(b.endIndex - 1, ` } catch (Throwable __nx_t) { __nx_f.exc(__nx_t); throw __nx_t; } finally { __nx_f.end(${vars(outer)}); __nx_f.exit(); } `);
  }

  const visit = (n, klass) => {
    for (const c of named(n)) {
      if (c.type === 'method_declaration') {
        method(c, klass);
        // Classes declared inside a method body (anonymous or local) are visited too.
        visit(c, klass);
      } else if (c.type === 'class_declaration' || c.type === 'record_declaration' || c.type === 'enum_declaration') visit(c, c);
      else if (c.type === 'object_creation_expression' && named(c).some((x) => x.type === 'class_body')) visit(named(c).find((x) => x.type === 'class_body'), null);
      else visit(c, klass);
    }
  };
  visit(root, null);

  return { code: `${applyEdits(code, edits)}\n${RUNTIME}`, errors: root.hasError };
}

module.exports = { instrumentJava };
