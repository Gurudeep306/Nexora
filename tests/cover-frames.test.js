// The "Life" profile cover (client/src/components/profile/coverFrames.ts):
// Conway's rules, and the same board for the same username.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let F;
test.before(async () => {
  F = await import(path.join(__dirname, '..', 'client', 'src', 'components', 'profile', 'coverFrames.ts'));
});
const seeds = [1, 7, 42, 2026, 99991];

test('Game of Life: a blinker blinks, a block stays, a glider moves', () => {
  const W = 6, H = 6;
  const board = (cells) => { const g = new Uint8Array(W * H); for (const [x, y] of cells) g[y * W + x] = 1; return g; };
  const live = (g) => [...g].map((v, i) => (v ? [i % W, Math.floor(i / W)] : null)).filter(Boolean).map(String).sort();
  assert.deepEqual(live(F.lifeStep(board([[1, 2], [2, 2], [3, 2]]), W, H)), [[2, 1], [2, 2], [2, 3]].map(String).sort());
  const block = board([[1, 1], [2, 1], [1, 2], [2, 2]]);
  assert.deepEqual(live(F.lifeStep(block, W, H)), live(block));
  let g = board([[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]]);
  for (let i = 0; i < 4; i++) g = F.lifeStep(g, W, H);
  assert.deepEqual(live(g), [[2, 1], [3, 2], [1, 3], [2, 3], [3, 3]].map(String).sort(), 'one cell down and right after 4');
});

test('Life: the same username always starts on the same board', () => {
  const a = F.lifeSeed(F.seedOf('asha'), 64, 16);
  const b = F.lifeSeed(F.seedOf('asha'), 64, 16);
  const c = F.lifeSeed(F.seedOf('ravi'), 64, 16);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const alive = a.reduce((s, v) => s + v, 0);
  assert.ok(alive > 200 && alive < 420, `about 30% alive (${alive})`);
});

// The illustrated covers (client/src/components/profile/coverArt.ts): the same
// username always draws the same scene, different names draw different ones,
// and nothing is placed off the 800 × 200 canvas.
test('cover scenes: seeded, varied and on the canvas', async () => {
  const A = await import(path.join(__dirname, '..', 'client', 'src', 'components', 'profile', 'coverArt.ts'));
  const scenes = ['dusk', 'ocean', 'skyline', 'forest', 'sakura', 'desert', 'teaHills', 'warli', 'cosmos', 'himalaya', 'backwaters', 'balloons', 'lotus', 'lighthouse', 'reef', 'aurora'];
  for (const name of scenes) {
    const a = JSON.stringify(A[name]('asha'));
    assert.equal(a, JSON.stringify(A[name]('asha')), `${name}: same name, same scene`);
    assert.notEqual(a, JSON.stringify(A[name]('ravi')), `${name}: different names differ`);
    assert.ok(!/NaN|undefined|Infinity/.test(a), `${name}: no broken numbers`);
  }
  // Ridges scroll by half their width, so the two halves must match (seamless loop).
  const nums = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);
  for (let s = 1; s < 6; s++) {
    const r = F.rng(s);
    const p = nums(A.ridge(r, 120, 30, 200, 0.3));
    const ys = p.filter((_, i) => i % 2 === 1).slice(1, -1);
    const half = (ys.length - 1) / 2;
    for (let i = 0; i < half; i += 7) assert.ok(Math.abs(ys[i] - ys[i + half]) < 0.2, 'ridge halves match');
  }
  for (const s of A.cosmos('asha').stars) assert.ok(s.x >= 0 && s.x <= 800 && s.y >= 0 && s.y <= 200);
});
