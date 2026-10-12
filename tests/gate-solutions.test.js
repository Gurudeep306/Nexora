/*
  GATE solutions v2: every solution file validates, the validator catches the
  mistakes authors make, apply-fixes is idempotent, and the API serves
  solutions lazily while keeping answers out of the CBT paper payload.
*/
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const mod = (f) => import(pathToFileURL(path.join(ROOT, 'scripts', 'gate', f)).href);

test('every solution file passes the validator', async () => {
  const { validateAll } = await mod('validate-solutions.mjs');
  const reports = validateAll();
  assert.ok(reports.length > 0, 'no solution files found');
  const errors = reports.flatMap((r) => r.errors);
  assert.deepEqual(errors, [], `\n${errors.join('\n')}`);
});

test('the validator rejects common authoring mistakes', async () => {
  const { validateSolution, loadBank } = await mod('validate-solutions.mjs');
  const q = loadBank().byId.get('cse-2012-cs-42');
  const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/gate/solutions/cse-2012.json'), 'utf8'));
  const good = file.solutions['cse-2012-cs-42'];
  const run = (mutate) => {
    const sol = structuredClone(good);
    mutate(sol);
    const report = { errors: [], warnings: [], fixes: [] };
    validateSolution(q.id, sol, q, report);
    return report.errors.join('\n');
  };
  assert.equal(run(() => {}), '');
  assert.match(run((s) => (s.answer.choice = ['A'])), /matchesKey is true but the stored key/);
  assert.match(run((s) => (s.animation.expectFaults = 7)), /expectFaults: 7, but FIFO with 3 frames gives 6/);
  assert.match(run((s) => (s.steps[2].scene.expectFaults = 5)), /LRU with 3 frames gives 9/);
  assert.match(run((s) => (s.animation.kind = 'pagin')), /unknown kind "pagin"/);
  assert.match(run((s) => (s.steps[0].body = 'cost is $x + 1')), /unbalanced \$/);
  assert.match(run((s) => (s.steps[0].body = 'bad $\\frac{1}{$ tex')), /KaTeX cannot parse/);
  assert.match(run((s) => s.optionAnalysis.pop()), /must list each option once/);
  assert.match(run((s) => (s.steps[0].scene = { colour: 'red' })), /unknown key "colour"/);
  assert.match(run((s) => (s.steps[1].body = 'x'.repeat(13000))), /too long|budget/);
});

test('apply-fixes is idempotent and refuses mismatched "before" values', async () => {
  const { applyFixes } = await mod('apply-fixes.mjs');
  const bank = { questions: [{ id: 'p-1', paper: 'p', answer: 'A', text: 't' }] };
  const fix = { id: 'p-1', field: 'answer', before: 'A', after: 'B', reason: 'key', source: 'pdf p.1' };
  const files = [{ name: 'p', data: { paper: 'p', fixes: [fix] } }];
  assert.deepEqual(applyFixes(bank, files).applied, ['p-1.answer']);
  assert.equal(bank.questions[0].answer, 'B');
  const again = applyFixes(bank, files);
  assert.deepEqual([again.applied, again.skipped], [[], ['p-1.answer']]);
  const clash = applyFixes(bank, [{ name: 'p', data: { paper: 'p', fixes: [{ ...fix, before: 'C', after: 'D' }] } }]);
  assert.equal(clash.conflicts.length, 1);
  assert.equal(bank.questions[0].answer, 'B');
});

test('committed fixes are already applied to questions.json', async () => {
  const { applyFixes, fixesFiles } = await mod('apply-fixes.mjs');
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/gate/questions.json'), 'utf8'));
  const r = applyFixes(bank, fixesFiles());
  assert.deepEqual([r.errors, r.conflicts, r.applied], [[], [], []], 'run node scripts/gate/apply-fixes.mjs');
});

test('API: lazy solutions, no legacy blob in lists, no answers in CBT papers', async () => {
  const express = require('express');
  const { createGateRouter } = require('../src/routes/gate');
  const app = express();
  app.use(createGateRouter());
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const v2 = await (await fetch(`${base}/api/gate/questions/cse-2012-cs-40/solution`)).json();
    assert.equal(v2.format, 'v2');
    assert.ok(v2.solution.steps.length >= 2);
    const legacy = await (await fetch(`${base}/api/gate/questions/cse-1992-b-4-a/solution`)).json();
    assert.equal(legacy.format, 'legacy');
    assert.equal((await fetch(`${base}/api/gate/questions/nope/solution`)).status, 404);
    const list = await (await fetch(`${base}/api/gate/questions?limit=5`)).json();
    assert.ok(list.questions.every((q) => !('solution' in q)));
    const detail = await (await fetch(`${base}/api/gate/questions/cse-2012-cs-40`)).json();
    assert.ok(!('solution' in detail.question));
    const paper = await (await fetch(`${base}/api/gate/paper/cse-2012`)).json();
    assert.ok(paper.questions.length > 0);
    assert.ok(paper.questions.every((q) => !('answer' in q) && !('solution' in q) && !('reviewNote' in q)));
  } finally {
    server.close();
  }
});
