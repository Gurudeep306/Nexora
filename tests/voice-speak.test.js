/* S8: answers are spoken sentence by sentence (client/src/voice/sentences.ts). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { splitSentences } = require('../client/src/voice/sentences.ts');

test('splits into sentences, keeping abbreviations, decimals and numbered steps whole', () => {
  assert.deepEqual(splitSentences('First, sort the array. Then use two pointers! Done?'), ['First, sort the array.', 'Then use two pointers!', 'Done?']);
  assert.deepEqual(splitSentences('Use a queue, e.g. a deque. It is O(n log n) here.'), ['Use a queue, e.g. a deque.', 'It is O(n log n) here.']);
  assert.deepEqual(splitSentences('Pi is about 3.14 here.'), ['Pi is about 3.14 here.']);
  assert.deepEqual(splitSentences('Step 1. Read it.'), ['Step 1. Read it.']);
  assert.deepEqual(splitSentences('मिड को अपडेट करो। फिर लूप चलाओ।'), ['मिड को अपडेट करो।', 'फिर लूप चलाओ।']);
  assert.deepEqual(splitSentences('**Bold** `code` text'), ['Bold code text']);
  assert.deepEqual(splitSentences('   '), []);
});

test('a very long sentence is cut at a comma so the first piece starts quickly', () => {
  const long = 'We keep two pointers low and high, ' + 'and we move them towards each other while comparing the middle value with the key, '.repeat(4) + 'until they cross.';
  const parts = splitSentences(long);
  assert.ok(parts.length > 1);
  for (const p of parts) assert.ok(p.length <= 220, p.length);
  assert.equal(parts.join(' ').replace(/\s+/g, ' '), long.replace(/\s+/g, ' '));
});

test('voices: the clearest voice for the teacher by default, the student’s choice when made, Hindi always in a Hindi voice', async () => {
  const { pickVoice, VOICES, voiceById } = await import('../client/src/voice/voices.ts');
  assert.equal(pickVoice('', false, 'A heap is a tree.'), 'af_heart', 'a woman teacher: the clearest woman voice');
  assert.equal(pickVoice('', true, 'A heap is a tree.'), 'am_michael');
  assert.equal(pickVoice('bf_emma', false, 'A heap is a tree.'), 'bf_emma', 'the student’s choice');
  assert.equal(pickVoice('bf_emma', false, 'हीप एक पेड़ है।'), 'hf_alpha', 'Hindi goes to a Hindi voice of the same gender');
  assert.equal(pickVoice('hm_psi', true, 'हीप एक पेड़ है।'), 'hm_psi');
  assert.equal(pickVoice('nonsense', true, 'hello'), 'am_michael', 'an unknown id is ignored');
  for (const v of VOICES) assert.ok(voiceById(v.id) && v.name && v.sounds, v.id);
  for (const g of ['F', 'M']) assert.ok(VOICES.some((v) => v.gender === g && v.hindi), `a Hindi voice for ${g}`);
});

test('voices: a quiet clip is brought to speaking level, never clipped', async () => {
  const { levelUp } = await import('../client/src/voice/voices.ts');
  const quiet = Float32Array.from({ length: 2400 }, (_, i) => 0.01 * Math.sin(i / 5));
  const g = levelUp(quiet);
  assert.ok(g > 2, `louder: x${g.toFixed(1)}`);
  assert.ok(Math.max(...quiet.map(Math.abs)) <= 0.95 + 1e-6, 'no clipping');
  const loud = Float32Array.from({ length: 2400 }, (_, i) => 0.9 * Math.sin(i / 5));
  assert.equal(levelUp(loud), 1, 'a loud clip is left alone');
  assert.equal(levelUp(new Float32Array(10)), 1, 'silence is left alone');
});

test('she never hangs: every network call in the voice code has a time limit', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..', 'client', 'src', 'voice');
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) && files.push(path.join(d, e.name))));
  walk(root);
  let calls = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const parts = src.split(/\bfetch\(/).slice(1);
    for (const p of parts) {
      calls++;
      const call = p.slice(0, p.indexOf('\n  }') > 0 ? Math.min(600, p.length) : 600);
      assert.match(call, /signal/, `${path.relative(root, f)}: a fetch without a time limit or abort signal`);
    }
  }
  assert.ok(calls >= 5, `checked ${calls} calls`);
});

test('she never hangs: the answer on the device and each voice clip have a time limit', () => {
  const fs = require('fs');
  const path = require('path');
  const brain = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'brain', 'brain.ts'), 'utf8');
  assert.match(brain, /Promise\.race\(\[generate\(/);
  const speak = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'speak.ts'), 'utf8');
  assert.match(speak, /const usual = \(s: string\) => inTime\(/);
  assert.match(speak, /await inTime\(ownClip\(s\)\)/);
});
