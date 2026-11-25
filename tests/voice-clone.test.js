/* The teacher in the student's own voice: the sample is trimmed to speech before it becomes a voice print (client/src/voice/clone). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('a voice sample: silence cut from both ends, speech kept, length measured', async () => {
  const { trimSilence, usableSeconds } = await import('../client/src/voice/clone/sample.ts');
  const rate = 24000;
  const quiet = new Float32Array(rate * 2);
  const speech = Float32Array.from({ length: rate * 10 }, (_, i) => 0.2 * Math.sin(i / 7));
  const sample = new Float32Array(quiet.length * 2 + speech.length);
  sample.set(quiet, 0);
  sample.set(speech, quiet.length);
  const t = trimSilence(sample, rate);
  assert.ok(t.length >= speech.length && t.length < speech.length + rate * 0.5, `kept the speech and a breath around it: ${(t.length / rate).toFixed(2)}s`);
  assert.ok(Math.abs(usableSeconds(sample) - 10) < 0.5);
  assert.equal(usableSeconds(new Float32Array(rate * 5)), 0, 'silence has no speech');
});

test('the voice stays on the device: the clone code never sends audio to a server', () => {
  const dir = path.join(__dirname, '..', 'client', 'src', 'voice', 'clone');
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|sendBeacon|api\.(post|put)\(/, `${f} sends nothing`);
  }
});

test('consent comes first: recording and upload are disabled until the student confirms', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'clone', 'OwnVoice.tsx'), 'utf8');
  assert.match(src, /disabled=\{!agreed\} onClick=\{\(\) => void record\(\)\}/);
  assert.match(src, /disabled=\{!agreed \|\| rec\.on\}/);
  assert.match(src, /I agree that NexoraGuru may use my voice/);
});
