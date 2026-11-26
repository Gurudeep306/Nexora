/*
  Pratibimb's speaking face (client/src/pratibimb/engine/lipsync.ts, docs/pratibimb/SPEC.md §5):
  lips fully closed on p/b/m, lower lip to teeth on f/v, the face leading the sound, subtle (not
  flapping) mouths, and prosody read from the voice itself.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const L = () => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'pratibimb', 'engine', 'lipsync.ts')).href);

// "aa PP aa": an open vowel, a p, an open vowel.
const timing = { visemes: ['aa', 'PP', 'aa', 'FF', 'aa'], vtimes: [0, 200, 300, 500, 600], vdurations: [200, 80, 200, 90, 200] };
const open = { jawOpen: 0.3, mouthLowerDownLeft: 0.2, mouthLowerDownRight: 0.2, mouthFunnel: 0.1 }
const curves = { fps: 30, frames: Array.from({ length: 30 }, () => ({ ...open })) };

test('lips close fully on p, b and m even when the curves keep the mouth open', async () => {
  const { speakingFace } = await L();
  const f = speakingFace(0.24, { curves, timing });
  assert.equal(f.shapes.jawOpen, 0, 'jaw shut during p');
  assert.equal(f.shapes.mouthLowerDownLeft, 0);
  assert.ok(f.shapes.mouthPressLeft > 0.3 && f.shapes.mouthPressRight > 0.3, 'lips pressed');
  const g = speakingFace(0.1, { curves, timing });
  assert.ok(g.shapes.jawOpen > 0.2, 'open again on the vowel');
});

test('f and v: lower lip rolls to the upper teeth, jaw half open', async () => {
  const { speakingFace } = await L();
  const f = speakingFace(0.54, { curves, timing });
  assert.ok(f.shapes.mouthRollLower > 0.4);
  assert.ok(f.shapes.jawOpen < 0.3 * 1.15 * 0.6);
});

test('the face leads the sound by 40 ms', async () => {
  const { speakingFace, LEAD_S } = await L();
  assert.equal(LEAD_S, 0.04);
  const ramp = { fps: 100, frames: Array.from({ length: 100 }, (_, i) => ({ jawOpen: i / 100 })) };
  const f = speakingFace(0.5, { curves: ramp }, {});
  assert.ok(Math.abs(f.shapes.jawOpen - 0.54) < 0.02, `shows the shape of 40 ms later (${f.shapes.jawOpen})`);
});

test('without curves the mouth comes from visemes and stays subtle', async () => {
  const { speakingFace, VISEME_SHAPES } = await L();
  for (const [v, s] of Object.entries(VISEME_SHAPES)) assert.ok((s.jawOpen || 0) <= 0.45, `${v} never opens the jaw more than 0.45`);
  const f = speakingFace(0.1, { timing });
  assert.ok(f.shapes.jawOpen > 0.2 && f.shapes.jawOpen < 0.55);
  const silent = speakingFace(5, { timing });
  assert.equal(silent.shapes.jawOpen || 0, 0, 'mouth rests after speech');
});

test('teeth-baring shapes are toned down; values stay within 0..1', async () => {
  const { speakingFace } = await L();
  const c = { fps: 30, frames: [{ mouthUpperUpLeft: 1, jawOpen: 1 }] };
  const f = speakingFace(0, { curves: c });
  assert.ok(f.shapes.mouthUpperUpLeft <= 0.36);
  assert.equal(f.shapes.jawOpen, 1);
});

test('voice analysis finds stresses and pauses; prosody moves brows, head and blinks', async () => {
  const { analyseVoice, speakingFace } = await L();
  const rate = 16000;
  const x = new Float32Array(rate * 2);
  // Two voiced bursts at 220 Hz with a 0.5 s pause between them.
  for (let i = 0; i < x.length; i++) {
    const t = i / rate;
    const on = (t > 0.1 && t < 0.7) || (t > 1.2 && t < 1.8);
    x[i] = on ? 0.5 * Math.sin(2 * Math.PI * 220 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 3 * t)) : 0;
  }
  const p = analyseVoice(x, rate);
  assert.equal(p.rate, 100);
  assert.ok(p.stress.length >= 2, `stresses found (${p.stress})`);
  assert.ok(p.pauses.some(([a, b]) => a > 0.6 && b < 1.3), `the pause is found (${JSON.stringify(p.pauses)})`);
  const f = speakingFace(p.pauses[p.pauses.length - 1][0] + 0.12, { prosody: p });
  assert.ok(f.blink > 0.5, 'blinks at the phrase end');
  const nodAt = p.stress[0] + 0.12;
  assert.ok(speakingFace(nodAt, { prosody: p }).head[0] > 0.02, 'nods on a stressed syllable');
});
