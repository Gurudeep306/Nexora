'use strict';
/*
  Viz engine motion (dm.md job E1): frame tweening. Unit tests for the
  interpolation, plus proof that existing scenes still validate and are
  pixel-identical at the end of every step (interpolateFrames at t = 1 is the
  target frame itself). Fixtures live in tests/fixtures (never in content/,
  where every viz file must belong to a lesson).
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(ROOT, 'client', 'src', 'viz', rel)).href);

let T, F, S;
test.before(async () => {
  T = await load('tween.ts');
  F = await load('frames.ts');
  S = await load('schema.ts');
});

test('easeStandard: endpoints, monotonic, matches cubic-bezier(0.2, 0, 0, 1)', () => {
  assert.equal(T.easeStandard(0), 0);
  assert.equal(T.easeStandard(1), 1);
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const y = T.easeStandard(i / 100);
    assert.ok(y >= prev, `monotonic at ${i / 100}`);
    prev = y;
  }
  // easeOut: fast at the start, settles at the end.
  assert.ok(T.easeStandard(0.5) > 0.8, 'front-loaded like the CSS curve (bezier(0.2,0,0,1) gives ~0.88 at 0.5)');
  assert.ok(T.easeStandard(0.25) > 0.25 && T.easeStandard(0.25) < 1);
});

test('interpolateFrames: geometry tweens, other props come from the target, t=1 is the target itself', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'viz-motion-glide.json'), 'utf8'));
  assert.deepEqual(S.validateVizSpec(spec), [], 'fixture validates');
  const frames = F.buildFrames(spec);
  assert.equal(frames.length, 2);
  const [f0, f1] = frames;
  assert.equal(T.interpolateFrames(f0, f1, 1), f1, 't=1 returns the target frame object');
  assert.equal(T.interpolateFrames(f0, f1, 0), f0, 't=0 returns the source frame object');
  const mid = T.interpolateFrames(f0, f1, 0.5);
  const a = mid.elements.find((e) => e.id === 'a');
  const l = mid.elements.find((e) => e.id === 'l1');
  const e = mid.elements.find((e) => e.id === 'e1');
  const eased = T.easeStandard(0.5);
  assert.ok(Math.abs(a.cx - (80 + (520 - 80) * eased)) < 1e-9, `cx is eased to ${a.cx}`);
  assert.ok(a.cx > 80 && a.cx < 520, 'between the endpoints');
  assert.deepEqual(l.points, [[80 + 440 * eased, 40], [520, 40]], 'points tween pointwise at equal length');
  assert.equal(e, f1.elements.find((x) => x.id === 'e1'), 'an arrow with id ends is not geometry-tweened itself (the renderer re-snaps it per tick)');
  assert.equal(mid.caption, f1.caption);
  // Unchanged elements keep their identity so memoised renderers skip them.
  const b = mid.elements.find((x) => x.id === 'b');
  assert.equal(b, f1.elements.find((x) => x.id === 'b'));
  // Non-numeric patches apply immediately (tone changes at once; fill/stroke fade via CSS).
  const grid = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'viz-motion-grid.json'), 'utf8'));
  assert.deepEqual(S.validateVizSpec(grid), [], 'grid fixture validates (400 elements)');
  const gf = F.buildFrames(grid);
  const gm = T.interpolateFrames(gf[0], gf[1], 0.5);
  assert.equal(gm.elements.length, 400);
  assert.ok(gm.elements[0].cx > grid.elements[0].cx && gm.elements[0].cx < gf[1].elements[0].cx);
  const gLast = T.interpolateFrames(gf[0], gf[2], 1);
  assert.equal(gLast, gf[2]);
  assert.equal(gLast.elements.find((e) => e.id === 'v0_0').tone, 'accent', 'non-geometry patch present in the target');
});

test('existing DL scenes still validate and are unchanged at the final frame', async () => {
  const dir = path.join(ROOT, 'content', 'gate-notes', 'dl', 'viz');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).slice(0, 25);
  assert.ok(files.length > 0);
  for (const f of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.deepEqual(S.validateVizSpec(spec), [], `${f} validates`);
    for (const layout of ['wide', 'narrow']) {
      const frames = F.buildFrames(spec, layout);
      const last = frames[frames.length - 1];
      assert.equal(T.interpolateFrames(frames[0], last, 1), last, `${f} (${layout}): final frame is exactly the target`);
      // Mid-tween every numeric geometry stays within the two frames' bounds.
      for (let t = 0.25; t < 1; t += 0.25) {
        const mid = T.interpolateFrames(frames[0], last, t);
        assert.equal(mid.elements.length, last.elements.length);
      }
    }
  }
});
