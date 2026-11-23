/*
  The virtual teacher (docs/voice/VIRTUAL_TEACHER.md §3): lip timings, the
  Devanagari → Roman spelling the lips use, and that every shipped teacher
  model has what TalkingHead needs (Mixamo bone names, the Oculus visemes and
  ARKit face shapes), with the Rocketbox MIT licence beside them.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const T = (f) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'teacher', f)).href);
const DIR = path.join(__dirname, '..', 'client', 'public', 'teachers');

test('words share the sentence time in order, and never run past it', async () => {
  const { wordTimes } = await T('lipsync.ts');
  const r = wordTimes('Hello there, mid is 4. Then check the loop!', 3000);
  assert.deepEqual(r.words, ['Hello', 'there', 'mid', 'is', '4', 'Then', 'check', 'the', 'loop']);
  for (let i = 1; i < r.wtimes.length; i++) assert.ok(r.wtimes[i] >= r.wtimes[i - 1] + r.wdurations[i - 1], 'no overlap');
  const end = r.wtimes.at(-1) + r.wdurations.at(-1);
  assert.ok(end <= 3000 && end > 2500, `ends near the sentence end (${end})`);
  assert.ok(r.wdurations[0] > r.wdurations[3], 'a longer word gets longer');
  assert.deepEqual(wordTimes('  ... ', 1000).words, []);
});

test('Hindi is written in Roman letters for the lips; other text is left alone', async () => {
  const { toRoman } = await T('lipsync.ts');
  assert.equal(toRoman('नमस्ते'), 'namaste');
  assert.equal(toRoman('कमल'), 'kamal', 'the final inherent a is dropped');
  assert.equal(toRoman('बाएं जाओ।'), 'baaen jaao.');
  assert.equal(toRoman('बाइनरी सर्च में mid बदलो'), 'baainaree sarch men mid badalo');
  assert.equal(toRoman('१२३'), '123');
  assert.equal(toRoman('mid ko update karo'), 'mid ko update karo');
});

function glbJson(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('ascii', 0, 4), 'glTF', `${path.basename(file)} is a GLB`);
  const len = b.readUInt32LE(12);
  assert.equal(b.toString('ascii', 16, 20), 'JSON');
  return JSON.parse(b.toString('utf8', 20, 20 + len));
}

test('every teacher ships a model with Mixamo bones, visemes and ARKit shapes, plus a portrait', async () => {
  const { TEACHERS } = await T('teachers.ts');
  assert.equal(TEACHERS.length, 7);
  assert.deepEqual(TEACHERS.map((t) => t.id), ['priya', 'kavya', 'neha', 'ananya', 'arjun', 'rohan', 'dev']);
  const bones = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftEye', 'RightEye', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandIndex1', 'RightHandIndex1', 'LeftUpLeg', 'RightFoot'];
  const shapes = ['viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_aa', 'viseme_O', 'viseme_U', 'eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen', 'mouthSmileLeft', 'browInnerUp', 'mouthOpen', 'mouthSmile'];
  for (const t of TEACHERS) {
    const file = path.join(DIR, `${t.id}.glb`);
    const g = glbJson(file);
    const names = new Set(g.nodes.map((n) => n.name));
    for (const b of bones) assert.ok(names.has(b), `${t.id}: bone ${b}`);
    assert.ok(names.has('Armature'), `${t.id}: root named Armature`);
    const targets = new Set(g.meshes.flatMap((m) => m.extras?.targetNames ?? []));
    for (const s of shapes) assert.ok(targets.has(s), `${t.id}: face shape ${s}`);
    const mb = fs.statSync(file).size / 1e6;
    assert.ok(Math.abs(mb - t.mb) < 0.3, `${t.id}: the size shown to students (${t.mb} MB) is true (${mb.toFixed(1)} MB)`);
    assert.ok(mb < 6, `${t.id}: small enough for phones`);
    assert.ok(fs.existsSync(path.join(DIR, `${t.id}.jpg`)), `${t.id}: portrait`);
  }
  const lic = fs.readFileSync(path.join(DIR, 'LICENSE-rocketbox.md'), 'utf8');
  assert.match(lic, /MIT License/);
  assert.match(lic, /Microsoft/);
});

test('every teacher has an Indian voice on our voice server, women and men matched, and retired teachers move on', async () => {
  const { TEACHERS, RENAMED, teacherById } = await T('teachers.ts');
  const tts = require('../src/voice/tts');
  const own = new Map(tts.OWN_VOICES.map((v) => [v.id, v.gender]));
  for (const t of TEACHERS) {
    assert.ok(own.has(t.voice), `${t.id}: voice ${t.voice} is on the server`);
    assert.equal(own.get(t.voice), t.body === 'M' ? 'male' : 'female', `${t.id}: voice matches`);
  }
  for (const [old, now] of Object.entries(RENAMED)) {
    assert.ok(teacherById(now), `${old} → ${now} exists`);
    assert.equal(teacherById(old), null, `${old} is retired`);
  }
});

test('the teacher layer is never in the first page load', () => {
  const host = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'teacher', 'TeacherHost.tsx'), 'utf8');
  assert.match(host, /lazy\(\(\) => import\('\.\/TeacherLayer'\)\)/);
  assert.doesNotMatch(host, /from '@met4citizen\/talkinghead'/);
  assert.doesNotMatch(host, /from 'three'/);
});
