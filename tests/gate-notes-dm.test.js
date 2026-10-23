'use strict';
/*
  Discrete Mathematics Live Labs: each lab's TypeScript logic module is checked
  against the vectors that the Python checks (content/gate-notes/_checks/dm)
  compute and commit, so the labs and the lessons can never disagree.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const LABS = path.join(ROOT, 'client', 'src', 'gate', 'notes', 'labs');
const vectors = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'gate-notes', '_checks', 'dm', `lab_vectors_ch${n}.json`), 'utf8'));
const load = (name) => import(pathToFileURL(path.join(LABS, name)).href);

test('truth table lab: parsing, tables, classification, canonical forms, comparison and arguments match logiclib', async () => {
  const L = await load('logicLogic.ts');
  const vec = vectors(1);
  for (const c of vec.cases) {
    const f = L.parse(c.src);
    assert.deepEqual(L.variables(f), c.vars, `${c.src}: variables`);
    const col = L.table(f, c.vars, vec.op);
    assert.deepEqual(col, c.table, `${c.src}: column`);
    assert.equal(L.classify(col), c.kind, `${c.src}: kind`);
    assert.deepEqual(L.minterms(col, c.vars.length), c.minterms, `${c.src}: minterms`);
    assert.deepEqual(L.maxterms(col, c.vars.length), c.maxterms, `${c.src}: maxterms`);
    // Same parse tree (precedence, associativity) and the same canonical forms as logiclib.
    assert.equal(L.show(f), c.shown, `${c.src}: parse`);
    assert.equal(L.dnfText(c.minterms, c.vars), c.dnf, `${c.src}: DNF`);
    assert.equal(L.cnfText(c.maxterms, c.vars), c.cnf, `${c.src}: CNF`);
    // The lab's table always ends with the whole formula's column, even for a bare variable or constant.
    const cols = L.columns(f);
    assert.ok(cols.length >= 1 && L.show(cols[cols.length - 1]) === L.show(f), `${c.src}: last column is the formula`);
    assert.equal(col.length, 2 ** c.vars.length, `${c.src}: 2^n rows`);
  }
  assert.ok(vec.cases.some((c) => c.vars.length === 0) && vec.cases.some((c) => c.vars.length === L.MAX_VARS), 'vectors cover 0 and MAX_VARS variables');
  for (const p of vec.pairs) {
    const r = L.compare(L.parse(p.a), L.parse(p.b));
    assert.deepEqual(r.vars, p.vars);
    assert.equal(r.equivalent, p.equivalent, `${p.a} vs ${p.b}`);
    assert.equal(r.aImpliesB, p.aImpliesB, `${p.a} ⇒ ${p.b}`);
    assert.equal(r.bImpliesA, p.bImpliesA, `${p.b} ⇒ ${p.a}`);
    assert.deepEqual(r.differ, p.differ);
  }
  for (const a of vec.args) {
    const r = L.argument(a.premises.map(L.parse), L.parse(a.conclusion));
    assert.deepEqual(r.vars, a.vars);
    assert.deepEqual(r.critical, a.critical, `${a.premises} ⊢ ${a.conclusion}: critical rows`);
    assert.deepEqual(r.counter, a.counter);
    assert.equal(r.valid, a.valid);
  }
  for (const p of L.PRESETS) L.parse(p.formula);
  assert.equal(L.show(L.parse('p -> q -> r')), 'p → (q → r)');
  assert.equal(L.dnfText([3], ['p', 'q']), '(p ∧ q)');
  assert.equal(L.cnfText([1], ['p', 'q']), '(p ∨ ¬q)');
  assert.throws(() => L.parse('p & (q'));
  assert.throws(() => L.parse(''));
  for (const bad of ['p q', 'p & | q', '(p', 'p)', '-> p', 'p ->', '¬', '10', 'p $ q']) assert.throws(() => L.parse(bad), bad);
  assert.equal(L.show(L.parse('\\text{p} \\to q')), 'p → q');
  assert.deepEqual(L.allVariables([L.parse('b & a'), L.parse('c | a')]), ['a', 'b', 'c']);
});

test('quantifier lab: parsing, finite evaluation and the model search match predlib', async () => {
  const Q = await load('predLogic.ts');
  const vec = vectors(2);
  const worlds = vec.worlds.map((w) => ({ n: w.n, I: Object.fromEntries(Object.entries(w.interp).map(([k, v]) => [k, new Set(v)])) }));
  for (const c of vec.evals) {
    const f = Q.parse(c.src);
    assert.deepEqual(Q.predicates(f), c.preds, `${c.src}: predicates`);
    worlds.forEach((w, i) => assert.equal(Q.evaluate(f, w.n, w.I), c.values[i], `${c.src} on world ${i}`));
  }
  const enc = (r) => (r === null ? null : { n: r.n, interp: Object.fromEntries(Object.entries(r.interp).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, [...v].sort()])) });
  for (const s of vec.search) {
    const f = Q.parse(s.src);
    assert.deepEqual(enc(Q.counterModel(f)), s.counter, `${s.src}: counter-model`);
    assert.deepEqual(enc(Q.model(f)), s.model, `${s.src}: model`);
  }
  for (const p of Q.PRESETS) Q.parse(p.formula);
  assert.equal(Q.show(Q.parse('(∀x)(P(x) → Q(x))')), '∀x (P(x) → Q(x))');
  assert.deepEqual(Q.freeVars(Q.parse('P(x) & forall y R(x, y)')), ['x']);
  assert.throws(() => Q.parse('forall x (P(x)'));
});
