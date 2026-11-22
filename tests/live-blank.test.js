/*
  A shared screen that sends a black picture (macOS without the permission, or
  a mirrored iPad that macOS blacks out) is spotted from a tiny copy of the
  frame: black or one flat colour is "blank"; a real screen is not.
*/
const test = require('node:test');
const assert = require('node:assert/strict');

const { frameStats, looksBlank } = require('../client/src/live/blank.ts');

/** A 32×18 RGBA frame from a function of (x, y) → [r, g, b]. */
function frame(fn) {
  const d = new Uint8ClampedArray(32 * 18 * 4);
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 32; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * 32 + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  return d;
}

test('black and flat frames are blank', () => {
  assert.equal(looksBlank(frameStats(frame(() => [0, 0, 0]))), true);
  assert.equal(looksBlank(frameStats(frame(() => [6, 6, 8]))), true, 'near black');
  assert.equal(looksBlank(frameStats(frame(() => [240, 240, 240]))), true, 'one flat colour');
});

test('a real screen is not blank', () => {
  // White page with dark text lines.
  const page = frame((x, y) => (y % 4 === 1 && x > 2 && x < 28 ? [30, 30, 30] : [250, 250, 250]));
  assert.equal(looksBlank(frameStats(page)), false);
  // A dark editor with some coloured code.
  const editor = frame((x, y) => (y % 3 === 0 && x < 20 ? [120, 200, 255] : [20, 22, 26]));
  assert.equal(looksBlank(frameStats(editor)), false);
});
