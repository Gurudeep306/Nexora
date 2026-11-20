/*
  Theme scenes (client/src/components/look/sceneArt.ts): every theme with a
  scene draws the same picture each time, with no broken numbers, and every
  theme's pattern names a scene.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const mod = (...p) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', ...p)).href);

test('theme scenes: one per theme, the same every time, no broken numbers', async () => {
  const A = await mod('components', 'look', 'sceneArt.ts');
  const { THEMES } = await mod('theme', 'styles.ts');
  for (const t of THEMES) assert.ok(A.SCENE_IDS.includes(t.bundle.pattern), `${t.id}: scene ${t.bundle.pattern} exists`);
  assert.equal(new Set(THEMES.map((t) => t.bundle.pattern)).size, THEMES.length, 'every theme has its own scene');
  for (const id of A.SCENE_IDS) {
    const a = JSON.stringify(A[id]());
    assert.equal(a, JSON.stringify(A[id]()), `${id} is deterministic`);
    assert.ok(!/NaN|undefined|Infinity|null/.test(a), `${id} has no broken numbers`);
    assert.ok(a.length > 400, `${id} draws something`);
  }
});

test('theme scenes: mountain snow caps sit on their peaks', async () => {
  const A = await mod('components', 'look', 'sceneArt.ts');
  const h = A.himalaya();
  assert.ok(h.farSnow.length >= 4 && h.midSnow.length >= 4);
  for (const cap of [...h.farSnow, ...h.midSnow]) {
    const ys = [...cap.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    for (const y of ys) assert.ok(y >= 0 && y <= A.GH, `cap inside the ground canvas (${y})`);
  }
});
