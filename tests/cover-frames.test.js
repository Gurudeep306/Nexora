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
