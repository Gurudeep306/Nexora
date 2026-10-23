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
  }
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
});
