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

test('relation lab: properties with witnesses, closures, Warshall stages, classes and counts match rellib', async () => {
  const R = await load('relLogic.ts');
  const vec = vectors(3);
  for (const c of vec.cases) {
    const m = R.fromPairs(c.n, c.pairs);
    const at = `n=${c.n} ${JSON.stringify(c.pairs)}`;
    assert.deepEqual(R.violations(m), c.violations, `${at}: violations`);
    assert.deepEqual(R.compose(m, m), c.square, `${at}: R∘R`);
    assert.deepEqual(R.inverse(m), c.inverse, `${at}: inverse`);
    assert.deepEqual(R.reflexiveClosure(m), c.reflexive, `${at}: reflexive closure`);
    assert.deepEqual(R.symmetricClosure(m), c.symmetric, `${at}: symmetric closure`);
    assert.deepEqual(R.warshall(m), c.stages, `${at}: Warshall stages`);
    assert.deepEqual(R.equivalenceClosure(m), c.equivalence, `${at}: equivalence closure`);
    assert.equal(R.isEquivalence(m), c.isEquivalence);
    assert.equal(R.isPartialOrder(m), c.isPartialOrder);
    if (c.classes) assert.deepEqual(R.classes(m), c.classes, `${at}: classes`);
  }
  for (const [n, want] of Object.entries(vec.counts)) assert.deepEqual(R.counts(Number(n)), want, `counts n=${n}`);
  for (const p of R.PRESETS) assert.ok(p.pairs.every(([a, b]) => a < p.n && b < p.n), p.id);
});

test('hasse lab: covers, levels, bounds, lattice tests, complements and linear extensions match orderlib', async () => {
  const O = await load('orderLogic.ts');
  const vec = vectors(4);
  for (const c of vec.cases) {
    const P = O.fromPreset(c.src);
    assert.deepEqual(P.labels, c.labels, `${c.src}: labels`);
    assert.deepEqual(P.le, c.le, `${c.src}: order`);
    assert.deepEqual(O.covers(P), c.covers, `${c.src}: covers`);
    assert.deepEqual(O.levels(P), c.levels, `${c.src}: levels`);
    assert.deepEqual(O.minimal(P), c.minimal);
    assert.deepEqual(O.maximal(P), c.maximal);
    assert.equal(O.least(P), c.least);
    assert.equal(O.greatest(P), c.greatest);
    const n = c.labels.length;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        assert.equal(O.lub(P, a, b), c.lub[a][b], `${c.src}: lub(${a}, ${b})`);
        assert.equal(O.glb(P, a, b), c.glb[a][b], `${c.src}: glb(${a}, ${b})`);
      }
    assert.deepEqual(O.latticeFailure(P), c.latticeFailure, `${c.src}: lattice failure`);
    const an = O.analyse(P);
    assert.deepEqual(an, c.analysis, `${c.src}: analysis`);
    if (an.lattice && !an.distributive) assert.deepEqual(O.distributiveFailure(P), c.distributiveFailure, `${c.src}: distributive failure`);
    if (c.complements) for (let a = 0; a < n; a++) assert.deepEqual(O.complements(P, a), c.complements[a], `${c.src}: complements of ${a}`);
    assert.equal(O.linearExtensions(P), c.linearExtensions, `${c.src}: linear extensions`);
    assert.deepEqual(O.heightWidth(P), { height: c.height, width: c.width }, `${c.src}: height/width`);
  }
  for (const p of O.PRESETS) O.fromPreset(p.src);
  assert.throws(() => O.parsePairs('a<b, b<a'));
});

test('group lab: tables, axiom witnesses, kinds, orders, generators, subgroups, cosets and powers match grouplib', async () => {
  const G = await load('groupLogic.ts');
  const vec = vectors(5);
  for (const c of vec.presets) {
    const S = G.PRESETS.find((p) => p.id === c.id).make();
    assert.deepEqual(S.labels, c.labels, `${c.id}: labels`);
    assert.deepEqual(S.t, c.table, `${c.id}: table`);
    assert.deepEqual(G.closureFailure(S), c.closure, `${c.id}: closure`);
    assert.deepEqual(G.associativeFailure(S), c.assoc, `${c.id}: associativity`);
    assert.deepEqual(G.commutativeFailure(S), c.comm, `${c.id}: commutativity`);
    assert.equal(G.kind(S), c.kind, `${c.id}: kind`);
    if ('identity' in c) {
      assert.equal(G.identity(S), c.identity);
      assert.deepEqual(S.labels.map((_, a) => G.inverse(S, a)), c.inverses, `${c.id}: inverses`);
    }
    if (c.orders) {
      assert.deepEqual(S.labels.map((_, a) => G.order(S, a)), c.orders, `${c.id}: orders`);
      assert.deepEqual(G.generators(S), c.generators, `${c.id}: generators`);
      const subs = G.subgroups(S);
      assert.deepEqual(subs, c.subgroups, `${c.id}: subgroups`);
      subs.forEach((h, i) => assert.deepEqual(G.leftCosets(S, h), c.cosets[i], `${c.id}: cosets of subgroup ${i}`));
    }
  }
  for (const p of vec.pow) assert.deepEqual(G.powMod(p.a, p.k, p.n), { value: p.value, steps: p.steps }, `${p.a}^${p.k} mod ${p.n}`);
  for (const o of vec.orders) assert.equal(G.orderMod(o.a, o.n), o.order);
  const T = G.parseTable('e a\ne a\na e');
  assert.equal(G.kind(T), 'abelian group');
  assert.throws(() => G.parseTable('e a\na'));
});

test('counting lab: the twelvefold way, inclusion–exclusion terms, derangements, onto maps and Catalan numbers match countlib', async () => {
  const K = await load('countLogic.ts');
  const vec = vectors(6);
  for (const [n, k, bd, xd, r, v] of vec.twelve) {
    assert.equal(K.twelvefold(n, k, bd, xd, r), v, `${n} balls, ${k} boxes, ${bd}/${xd}/${r}`);
    if (k ** n <= 5000) assert.equal(K.twelvefoldBrute(n, k, bd, xd, r), v, `brute ${n}, ${k}, ${bd}/${xd}/${r}`);
  }
  for (const p of vec.pie) assert.deepEqual(K.divisibilityPie(p.N, p.ds), { terms: p.terms, total: p.total, none: p.none }, `PIE ${p.N} ${p.ds}`);
  vec.derangements.forEach((d, n) => assert.equal(K.derangements(n), d, `D${n}`));
  for (const [m, n, v] of vec.onto) assert.equal(K.onto(m, n), v, `onto ${m}→${n}`);
  vec.catalan.forEach((c, n) => assert.equal(K.catalan(n), c, `C${n}`));
});

test('recurrence lab: iteration, characteristic roots, fitted closed forms and series match reclib', async () => {
  const R = await load('recLogic.ts');
  const vec = vectors(7);
  const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} vs ${b}`);
  for (const c of vec.recs) {
    const rec = { coeffs: c.coeffs, init: c.init, poly: c.poly, q: c.q, s: c.s };
    const at = `${c.coeffs}/${c.init}`;
    R.iterate(rec, 16).forEach((t, n) => near(t, c.terms[n], 1e-12, `${at} a${n}`));
    const roots = R.charRoots(c.coeffs);
    assert.equal(roots.length, c.roots.length, `${at}: number of distinct roots`);
    roots.forEach((r, i) => {
      near(r.root.re, c.roots[i][0].re, 1e-5, `${at} root re`);
      near(r.root.im, c.roots[i][0].im, 1e-5, `${at} root im`);
      assert.equal(r.mult, c.roots[i][1], `${at} multiplicity`);
    });
    if (c.solution) {
      const sol = R.homogeneousSolution(c.coeffs, c.init);
      sol.forEach((t, i) => {
        near(t.c.re, c.solution[i].c.re, 1e-6, `${at} constant re`);
        near(t.c.im, c.solution[i].c.im, 1e-6, `${at} constant im`);
        assert.equal(t.power, c.solution[i].power);
      });
      for (let n = 0; n < 16; n++) near(R.evalTerms(sol, n), c.terms[n], 1e-6, `${at} closed form at ${n}`);
    }
  }
  for (const s of vec.series) R.series(s.num, s.den, 16).forEach((v, i) => near(v, s.coeffs[i], 1e-12, `series ${s.num}/${s.den} [${i}]`));
  for (const [s, k, want] of vec.binom) assert.deepEqual(R.binomPower(s, k), want);
  for (const p of R.PRESETS) R.iterate(p.rec, 8);
});
