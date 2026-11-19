'use strict';
/*
  Nexora Stage (client/src/ai/stage): the safe formula parser, the scene
  validator and the timeline that glides between steps.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (rel) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'ai', 'stage', rel)).href);
let E, S;
test.before(async () => {
  E = await load('expr.ts');
  S = await load('spec.ts');
});

test('formulas: precedence, unary minus, powers, functions, constants, parameters', () => {
  const f = (src, vars = {}, allowed = Object.keys(vars)) => E.compile(src, allowed)(vars);
  assert.equal(f('1 + 2 * 3'), 7);
  assert.equal(f('(1 + 2) * 3'), 9);
  assert.equal(f('2 ^ 3 ^ 2'), 512, '^ is right-associative');
  assert.equal(f('-x^2', { x: 3 }), -9, 'unary minus binds looser than ^');
  assert.equal(f('-2^2'), -4);
  assert.equal(f('2 * -3'), -6);
  assert.ok(Math.abs(f('exp(-(x^2 + y^2) / 2)', { x: 1, y: 1 }) - Math.exp(-1)) < 1e-12);
  assert.ok(Math.abs(f('sin(pi / 2) + ln(e)') - 2) < 1e-12);
  assert.equal(f('max(1, x, 3)', { x: 5 }), 5);
  assert.equal(f('relu(x) + sigmoid(0)', { x: -2 }), 0.5);
  assert.equal(f('1.5e2 + .5'), 150.5);
});

test('formulas: unknown names, functions and junk are refused (no code runs)', () => {
  assert.throws(() => E.compile('x + z', ['x']), /Unknown name "z"/);
  assert.throws(() => E.compile('alert(1)', ['x']), /Unknown function "alert"/);
  assert.throws(() => E.compile('constructor', []), /Unknown name/);
  assert.throws(() => E.compile('__proto__', []), /Unknown name/);
  assert.throws(() => E.compile('constructor(1)', []), /Unknown function/);
  assert.throws(() => E.compile('toString(x)', ['x']), /Unknown function/);
  assert.throws(() => E.compile('x; y', ['x', 'y']), /Unexpected ";"/);
  assert.throws(() => E.compile('(1 + 2', []), /Expected "\)"/);
  assert.throws(() => E.compile('1 2', []), /Unexpected "2"/);
  assert.throws(() => E.compile('x'.repeat(3000), ['x']), /at most 2000/);
});

const scene = () => ({
  version: 1,
  title: 'A bell',
  description: 'A two-dimensional Gaussian bell that rises from a flat map into 3D.',
  dim: 2,
  params: { rho: 0 },
  elements: [
    { id: 'bell', type: 'surface', f: 'exp(-(x^2 - 2*rho*x*y + y^2) / (2*(1 - rho^2)))', range: [-3, 3] },
    { id: 'dot', type: 'points', points: [[0, 0, 0]] },
    { id: 'path', type: 'path', points: [[0, 0, 0], [1, 1, 1], [2, 2, 2]], upTo: 0 },
    { id: 'note', type: 'label', at: [0, 0, 1], text: 'peak', hidden: true },
  ],
  steps: [
    { label: 'Flat' },
    { label: 'Lift it', caption: 'The [bell](#bell) rises.', dim: 3, params: { rho: 0.8 }, set: [{ id: 'dot', set: { points: [[2, 2, 2]] } }, { id: 'path', set: { upTo: 2 } }, { id: 'note', set: { hidden: false } }] },
  ],
});

test('validator: a good scene passes; every mistake is named', () => {
  assert.deepEqual(S.validateStage(scene()), []);
  const bad = scene();
  bad.version = 2;
  bad.elements.push({ id: 'bell', type: 'surface', f: 'x + q', range: [1, 0] });
  bad.elements.push({ id: 'w', type: 'wobble' });
  bad.elements.push({ id: 'c', type: 'points', points: [[0, 0]], tone: 'pink' });
  bad.steps.push({ label: 'x', focus: ['nope'], set: [{ id: 'ghost', set: {} }], params: { sigma: 1 }, caption: 'see [it](#missing)', dim: 4 });
  const e = S.validateStage(bad).join('\n');
  for (const want of ['version must be 1', 'id used twice', 'Unknown name "q"', 'range must be', 'unknown type "wobble"', 'unknown tone "pink"', 'points must be [x, y, z]', 'focus "nope"', 'set "ghost"', 'param "sigma"', 'links to "missing"', 'dim must be 2 or 3']) assert.match(e, new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), want);
});

test('timeline: frames carry changes forward; every number glides; things fade in; 2D rises to 3D', () => {
  const frames = S.buildFrames(scene());
  assert.equal(frames.length, 2);
  assert.equal(frames[0].lift, 0, 'starts flat');
  assert.equal(frames[1].lift, 1, 'ends in 3D');
  assert.equal(frames[1].params.rho, 0.8);
  const mid = S.frameAt(frames, 0.5);
  assert.equal(mid.lift, 0.5);
  assert.ok(Math.abs(mid.params.rho - 0.4) < 1e-12);
  assert.deepEqual(mid.elements.get('dot').points, [[1, 1, 1]], 'nested arrays glide');
  assert.equal(mid.elements.get('path').upTo, 1);
  assert.ok(Math.abs(mid.elements.get('note').opacity - 0.5) < 1e-12, 'a hidden element fades in');
  assert.equal(S.frameAt(frames, 1).elements.get('dot').points[0][0], 2, 'at the step itself it is exact');
  assert.equal(S.frameAt(frames, 0), frames[0]);
  assert.deepEqual(S.blendValue('a', 'b', 0.4), 'a');
  assert.deepEqual(S.blendValue([1, 2], [3, 4, 5], 0.6), [3, 4, 5], 'different shapes switch, never mix');
});

test('the four showcase scenes are valid Stage scenes', async () => {
  // demos.ts imports the engine, which Node can load (plain, erasable TypeScript).
  const D = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'ai', 'stage', 'demos.ts')).href).catch((e) => ({ err: e }));
  if (D.err) return assert.fail(`demos.ts did not load: ${D.err.message}`);
  for (const make of [D.attentionScene, D.networkScene, D.scoreScene, D.tensorScene]) {
    const s = make();
    assert.deepEqual(S.validateStage(s), [], s.title);
    const frames = S.buildFrames(s);
    assert.equal(frames.length, s.steps.length);
  }
  const att = D.attentionScene();
  const w = att.steps[1].set[0].set.values;
  for (const row of w) assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 0.01, 'every softmax row adds up to 1');
});

test('the tape: forward values match the network code, gradients match finite differences', async () => {
  const T = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'ai', 'engine', 'tape.ts')).href);
  const NN = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'ai', 'engine', 'mlp.ts')).href);
  const net = NN.train(1500, 0.5, 7, 50).history[8].net;
  const build = (W1v) => {
    const t = new T.Tape();
    const x = t.input('x', [[0, 1]]);
    const W1 = t.param('W1', W1v);
    const z1 = t.add(t.matmul(x, W1, 'xW1'), t.param('b1', [net.b1.slice()]), 'z1');
    const a1 = t.tanh(z1, 'a1');
    const z2 = t.add(t.matmul(a1, t.param('W2', net.W2.map((w) => [w])), 'a1W2'), t.param('b2', [[net.b2]]), 'z2');
    const yhat = t.sigmoid(z2, 'yhat');
    const L = t.bce(yhat, t.input('y', [[1]]), 'L');
    return { t, W1, yhat, L };
  };
  const W1v = net.W1[0].map((_, j) => net.W1.map((row) => row[j]));
  const { t, W1, yhat, L } = build(W1v);
  const P = NN.pass(net, [0, 1], 1);
  assert.ok(Math.abs(t.v(yhat)[0][0] - P.yhat) < 1e-12, 'same prediction as mlp.pass');
  assert.ok(Math.abs(t.v(L)[0][0] - P.loss) < 1e-9, 'same loss');
  t.backward(L);
  // ∂L/∂W1 on the tape is the transpose of mlp.pass's dW1, and agrees with finite differences.
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 3; j++) {
      assert.ok(Math.abs(t.nodes[W1].grad[i][j] - P.dW1[j][i]) < 1e-9, `dW1[${i}][${j}] matches backprop in mlp.ts`);
      const h = 1e-6;
      const up = W1v.map((r) => r.slice());
      const dn = W1v.map((r) => r.slice());
      up[i][j] += h;
      dn[i][j] -= h;
      const fd = (build(up).t.v(build(up).L)[0][0] - build(dn).t.v(build(dn).L)[0][0]) / (2 * h);
      assert.ok(Math.abs(fd - t.nodes[W1].grad[i][j]) < 1e-6, `finite difference agrees at [${i}][${j}]`);
    }
  // Softmax rows add to 1, and its backward pass passes a finite-difference check too.
  const s = new T.Tape();
  const a = s.input('a', [[0.3, -1.2, 2.0]]);
  const sm = s.softmax(a, 'p');
  const w = s.input('w', [[0.5], [-1], [2]]);
  const out = s.matmul(sm, w, 'o');
  assert.ok(Math.abs(s.v(sm)[0].reduce((x, y) => x + y, 0) - 1) < 1e-12);
  s.backward(out);
  const f = (v) => { const u = new T.Tape(); const o = u.matmul(u.softmax(u.input('a', [v]), 'p'), u.input('w', [[0.5], [-1], [2]]), 'o'); return u.v(o)[0][0]; };
  for (let j = 0; j < 3; j++) {
    const v1 = [0.3, -1.2, 2.0]; const v2 = [0.3, -1.2, 2.0]; v1[j] += 1e-6; v2[j] -= 1e-6;
    assert.ok(Math.abs((f(v1) - f(v2)) / 2e-6 - s.nodes[a].grad[0][j]) < 1e-6, `softmax gradient ${j}`);
  }
});

test('the generator turns tape records into valid scenes', async () => {
  const D = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'ai', 'stage', 'demos.ts')).href);
  for (const make of [D.mlpTraceScene, D.attentionTraceScene]) {
    const s = make();
    assert.deepEqual(S.validateStage(s), [], s.title);
    assert.ok(s.steps.length >= 5);
  }
  const mlp = D.mlpTraceScene();
  assert.ok(mlp.steps.some((st) => /∂L\/∂W1/.test(st.label)), 'the backward pass reaches the first weights');
});
