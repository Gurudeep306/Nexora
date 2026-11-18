'use strict';
/*
  Viz engine: the `loop` element and multigraph edges (dm.md job E2).
  Schema validation (good and bad scenes), loop geometry (attach point on the
  node outline, anchor on the far side, arrowhead for digraphs), and that a
  loop's angle tweens with E1.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'viz', rel)).href);

let S, G, F, T;
test.before(async () => {
  S = await load('schema.ts');
  G = await load('geometry.ts');
  F = await load('frames.ts');
  T = await load('tween.ts');
});

const fixture = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'viz-loop-multigraph.json'), 'utf8'));

test('fixture validates in both layouts; bad loops are rejected', () => {
  const spec = fixture();
  assert.deepEqual(S.validateVizSpec(spec), [], 'fixture validates');
  const bad = (mutate) => {
    const s = fixture();
    mutate(s);
    return S.validateVizSpec(s)
  };
  assert.ok(bad((s) => { s.elements[5].on = 'nope' }).some((e) => e.includes('.on')), 'loop on a missing id');
  assert.ok(bad((s) => { s.elements[5].on = 'e1' }).some((e) => e.includes('.on')), 'loop on an arrow');
  assert.ok(bad((s) => { s.elements[6].size = 1 }).some((e) => e.includes('.size')), 'loop too small');
  assert.ok(bad((s) => { s.elements[5].angle = 9999 }).some((e) => e.includes('.angle')), 'angle out of range');
  assert.ok(bad((s) => { s.elements[5].narrow = { on: 'b' } }).some((e) => e.includes('only geometry')), 'narrow cannot retarget the loop');
  assert.ok(bad((s) => { delete s.narrow; s.elements[5].narrow = { angle: 10 } }).some((e) => e.includes('top-level narrow canvas')), 'narrow override needs the narrow canvas');
  // arrow ends still cannot attach to loops
  assert.ok(bad((s) => { s.elements[2].to = 'l1' }).some((e) => e.includes('cannot attach')), 'arrow cannot attach to a loop');
});

test('loopGeom: attaches on the node outline, anchor on the far side, head for digraphs', () => {
  const g = G.loopGeom(100, 100, 24, 0, 21.6, 'none')
  const dAttach = Math.hypot(g.attach[0] - 100, g.attach[1] - 100)
  assert.ok(Math.abs(dAttach - 24) < 0.01, `attach is on the outline (r=24), got ${dAttach}`)
  assert.deepEqual(g.attach, [100, 76], 'angle 0 = straight up')
  assert.deepEqual(g.anchor, [100, 32.8], 'anchor is opposite, past the loop')
  assert.equal(g.head, undefined)
  const gd = G.loopGeom(100, 100, 24, 90, 20, 'end')
  assert.deepEqual(gd.attach, [124, 100], 'angle 90 = right')
  assert.ok(Array.isArray(gd.head) && gd.head.length === 3, 'digraph loop has an arrowhead')
  assert.match(g.d, /^M.*A21\.6 21\.6 0 1 1 /, 'a big arc, not a pie slice')
})

test('a loop follows its node and its angle tweens (E1)', () => {
  const spec = fixture();
  const frames = F.buildFrames(spec, 'wide');
  const mid = T.interpolateFrames(frames[0], frames[1], 0.5);
  const l1 = mid.elements.find((e) => e.id === 'l1');
  assert.ok(Math.abs(l1.angle - 67.5) < 1e-6 || (l1.angle > 0 && l1.angle < 135), `angle tweens (${l1.angle})`);
  const a = mid.elements.find((e) => e.id === 'a');
  assert.ok(a.cx > 140 && a.cx < 200, `node a glides (${a.cx})`);
  // narrow layout: the override wins over the patch for the keys it names
  const narrow = F.buildFrames(spec, 'narrow');
  assert.equal(narrow[1].elements.find((e) => e.id === 'l1').angle, -45, 'narrow angle override wins');
  assert.equal(narrow[1].elements.find((e) => e.id === 'a').cx, 90, 'narrow cx override wins');
});
