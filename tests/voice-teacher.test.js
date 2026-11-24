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

test('the face and hands follow the words: smiles, thumbs up, namaste, shrug; calm for a worried student', async () => {
  const { moodFor, gestureFor, soundsWorried } = await T('expressions.ts');
  assert.equal(moodFor('Shabaash! Bilkul sahi jawab.'), 'happy');
  assert.equal(moodFor('Namaste! Let us begin.'), 'happy');
  assert.equal(moodFor('The loop runs n times, so it is O of n.'), 'neutral');
  assert.equal(gestureFor('Well done, that is correct.'), 'thumbup');
  assert.equal(gestureFor('नमस्ते! मैं प्रिया हूँ।'), 'namaste');
  assert.equal(gestureFor("I won't guess that number."), 'shrug');
  assert.equal(gestureFor('Dekho, the middle element is 7.'), 'index');
  assert.equal(gestureFor('The loop runs n times.'), null, 'most sentences need no gesture');
  assert.ok(soundsWorried('I find recursion really hard'));
  assert.ok(soundsWorried('mujhe samajh nahi aaya'));
  assert.ok(soundsWorried('मुझे डर लग रहा है'));
  assert.ok(!soundsWorried('what is the time complexity of merge sort'));
});

test('every teacher and site-wide action id is unique (a reused id silently breaks a command)', async () => {
  const S = await import(require('node:url').pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'actions', 'teacherSpecs.ts')).href);
  const G = await import(require('node:url').pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'actions', 'globalSpecs.ts')).href);
  const ids = [...S.TEACHER_SPECS, ...G.GLOBAL_SPECS].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, `duplicates: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);
});

test('the guide finds things by the names people see, prefers what is on screen, and never presses risky buttons', async () => {
  const { nameScore, bestTarget, risky } = await T('findTarget.ts');
  assert.equal(nameScore('run', 'Run'), 1);
  assert.ok(nameScore('the run button', 'Run') >= 0.95);
  assert.ok(nameScore('setings', 'Settings') > 0.6, 'a small slip still finds it');
  assert.ok(nameScore('dark mode', 'Switch to dark mode') > 0.6);
  assert.equal(nameScore('submit', 'Run'), 0);
  const list = [
    { name: 'Run', kind: 'button', visible: false },
    { name: 'Run', kind: 'button', visible: true, id: 2 },
    { name: 'Run your code', kind: 'heading', visible: true },
    { name: 'Settings', kind: 'link', visible: true },
  ];
  assert.equal(bestTarget('run', list).id, 2, 'on-screen beats below the fold');
  assert.equal(bestTarget('run your code', list, true), null, 'a click never lands on a heading');
  assert.equal(bestTarget('history', list), null, 'nothing close: nothing found');
  for (const n of ['Submit', 'Delete account', 'Log out', 'End test', 'Send']) assert.ok(risky(n), n);
  for (const n of ['Run', 'Settings', 'Next', 'Dark mode']) assert.ok(!risky(n), n);
});

test('natural speech: short sentences said in one go, few seams, a quick first piece', async () => {
  const { speechChunks } = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'sentences.ts')).href);
  const text = 'Okay, got it. A heap is a tree. The parent is always smaller. So the smallest is on top. Want to try one?';
  const chunks = speechChunks(text);
  assert.equal(chunks.join(' '), text, 'nothing lost or reordered');
  assert.ok(chunks.length < 5, `joined into fewer pieces than sentences: ${chunks.length}`);
  assert.ok(chunks[0].length <= 90, 'the first piece is short so she starts at once');
  for (const c of chunks.slice(1)) assert.ok(c.length <= 180, c);
  assert.deepEqual(speechChunks(''), []);
});

test('the device voice: the most natural one for the language and the teacher, never a novelty voice', async () => {
  const { bestVoice, voiceScore } = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'deviceVoice.ts')).href);
  const mac = [
    { name: 'Rishi', lang: 'en-IN' },
    { name: 'Zarvox', lang: 'en-US' },
    { name: 'Veena', lang: 'en-IN' },
    { name: 'Veena (Enhanced)', lang: 'en-IN' },
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Lekha', lang: 'hi-IN' },
  ];
  assert.equal(bestVoice(mac, 'en-IN').name, 'Veena (Enhanced)');
  assert.equal(bestVoice(mac, 'hi-IN').name, 'Lekha');
  const edge = [
    { name: 'Microsoft Ravi - English (India)', lang: 'en-IN' },
    { name: 'Microsoft Neerja Online (Natural) - English (India)', lang: 'en-IN' },
    { name: 'Microsoft Prabhat Online (Natural) - English (India)', lang: 'en-IN' },
  ];
  assert.match(bestVoice(edge, 'en-IN').name, /Neerja/, 'a woman teacher gets the natural woman voice');
  assert.match(bestVoice(edge, 'en-IN', true).name, /Prabhat/, 'a man teacher gets the natural man voice');
  assert.ok(voiceScore({ name: 'Zarvox', lang: 'en-IN' }, 'en-IN') < voiceScore({ name: 'Samantha', lang: 'en-US' }, 'en-IN'), 'a robot voice loses even to another accent');
  assert.equal(bestVoice([{ name: 'Thomas', lang: 'fr-FR' }], 'en-IN'), null, 'no voice in another language');
  assert.equal(bestVoice([{ name: 'Google English', lang: 'en_IN' }], 'en-IN').name, 'Google English', 'Android writes en_IN');
});

test('interrupting the teacher: only a clear, sustained voice above what the mic hears while she talks', async () => {
  const { isVoice } = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'bargeIn.ts')).href);
  assert.equal(isVoice(0.01, 0.002), false, 'quiet room, quiet frame');
  assert.equal(isVoice(0.05, 0.004), true, 'a student talking');
  assert.equal(isVoice(0.05, 0.02), false, 'her own voice leaking into the mic sets the bar higher');
  assert.equal(isVoice(0.02, 0), false, 'never below the minimum level');
});

test('she reacts to real results: praise for Accepted, calm help after misses, never the answer', async () => {
  const { reactionFor, resultFromVerdict, allLines, countResult } = await T('reactions.ts');
  assert.equal(resultFromVerdict('AC'), 'solved');
  assert.equal(resultFromVerdict('AC', true), 'examples', 'examples only is never called solved');
  assert.equal(resultFromVerdict('wa'), 'wrong');
  assert.equal(resultFromVerdict('PENDING'), null);
  const win = reactionFor('solved');
  assert.equal(win.mood, 'happy');
  assert.equal(win.gesture, 'thumbup');
  const miss = reactionFor('wrong');
  assert.equal(miss.mood, 'neutral', 'no smile at a wrong answer');
  assert.equal(miss.gesture, null, 'never a thumbs down');
  assert.ok(miss.nod);
  assert.match(reactionFor('wrong', { misses: 2 }).say, /hint/i, 'the third miss in a row: she offers a hint');
  assert.doesNotMatch(reactionFor('wrong', { misses: 1 }).say, /hint/i);
  assert.match(reactionFor('incorrect', { misses: 4, lang: 'hi-IN' }).say, /हिंट/);
  // Varied, not one canned line.
  assert.ok(new Set([0, 1, 2, 3].map((seed) => reactionFor('correct', { seed }).say)).size >= 3);
  // Lines are general: no digits, option letters or code, so nothing about the answer can leak.
  for (const line of allLines()) {
    assert.doesNotMatch(line, /\d/, line);
    assert.doesNotMatch(line, /\(([A-D])\)|\boption [a-d]\b|\banswer is\b/i, line);
    assert.doesNotMatch(line, /[{};=]/, line);
    assert.ok(line.length <= 80, `short enough to say in a breath: ${line}`);
  }
  // Misses in a row: reset by a success.
  countResult('wrong');
  countResult('wrong');
  assert.equal(countResult('wrong'), 2);
  assert.equal(countResult('solved'), 3);
  assert.equal(countResult('wrong'), 0);
});

test('reactions are never sent during a contest or a timed test', () => {
  const solve = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'pages', 'SolvePage.tsx'), 'utf8');
  assert.match(solve, /contestId \? null : resultFromVerdict/);
  const q = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'gate', 'QuestionView.tsx'), 'utf8');
  assert.match(q, /mode !== 'test' && \(o === 'correct'/);
});

test('the teacher steps away for every exam: the exam console tells her, the host hides her', () => {
  const read = (...p) => fs.readFileSync(path.join(__dirname, '..', 'client', 'src', ...p), 'utf8');
  assert.match(read('gate', 'cbt', 'CbtConsole.tsx'), /setTeacher\(\{ exam: true \}\)[\s\S]*return \(\) => setTeacher\(\{ exam: false \}\)/);
  assert.match(read('voice', 'teacher', 'TeacherHost.tsx'), /const allowed = !!teacher && !st\.exam/);
  for (const page of [['pages', 'gate', 'GateTestPage.tsx'], ['pages', 'contests', 'HostedPaperPage.tsx'], ['gate', 'GateCbtExam.tsx']]) assert.match(read(...page), /CbtConsole/, page.join('/'));
});

test('renaming the teacher never reloads the 3D model; the name only words messages', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'teacher', 'TeacherLayer.tsx'), 'utf8');
  assert.match(src, /\}, \[teacher\.id, teacher\.body, attempt\]\)/);
});

test('no Hindi words in English lines the teacher speaks by rule', async () => {
  const M = require('../src/voice/memory.js');
  for (const mem of [null, { name: 'Asha', turns: 0 }, { turns: 3, topics: ['heaps'] }]) assert.doesNotMatch(M.greeting(mem, 'en-IN'), /\b(haan|bolo|achha|chalo)\b/i);
  const vb = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'VoiceButton.tsx'), 'utf8');
  assert.doesNotMatch(vb, /'Haan, bolo/);
});

test('lips follow the sound: words share only the time the voice sounds, never stretch across a pause', async () => {
  const { energyEnvelope, voicedSpans, wordTimesByEnergy, wordTimes } = await T('lipsync.ts');
  const rate = 16000;
  const x = new Float32Array(rate * 2);
  // Voice for 0–600 ms, a pause, voice again for 1100–2000 ms.
  for (let i = 0; i < x.length; i++) {
    const ms = (i / rate) * 1000;
    if (ms < 600 || ms >= 1100) x[i] = 0.3 * Math.sin(i / 7);
  }
  const env = energyEnvelope(x, rate);
  assert.deepEqual(voicedSpans(env), [[0, 600], [1100, 2000]]);
  const r = wordTimesByEnergy('Hello there, now look at mid', 2000, env);
  assert.deepEqual(r.words, ['Hello', 'there', 'now', 'look', 'at', 'mid']);
  for (let i = 0; i < r.words.length; i++) {
    const s = r.wtimes[i];
    const e = s + r.wdurations[i];
    assert.ok(e <= 600 || s >= 1100, `"${r.words[i]}" (${s}–${e} ms) is not said in the pause`);
    if (i) assert.ok(s >= r.wtimes[i - 1] + r.wdurations[i - 1], 'no overlap');
  }
  assert.ok(r.wtimes.at(-1) + r.wdurations.at(-1) <= 2000);
  // A nearly silent clip (or none) falls back to sharing the time by length.
  assert.deepEqual(wordTimesByEnergy('one two', 800, new Array(40).fill(0)), wordTimes('one two', 800));
});

test('captions light the right written word, in English and in Hindi', async () => {
  const { captionStarts, sameWord, wordAt, wordTimes, toRoman } = await T('lipsync.ts');
  const tokens = 'Look — mid is 4, okay?'.split(' ');
  const t = wordTimes(tokens.join(' '), 2000);
  const starts = captionStarts(tokens, t);
  assert.equal(starts.length, tokens.length);
  assert.equal(starts[1], starts[0], 'a lone dash takes the time of the word before');
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] >= starts[i - 1]);
  assert.equal(wordAt(starts, -1), -1);
  assert.equal(wordAt(starts, starts[3] + 1), 3);
  // A voice that counts words differently is matched by position, never out of range.
  const odd = captionStarts(['a', 'b', 'c', 'd'], { words: ['ab', 'cd'], wtimes: [0, 500], wdurations: [400, 400] });
  assert.deepEqual(odd, [0, 500, 500, 500]);
  const hi = 'बाइनरी सर्च में mid बदलो।'.split(' ');
  const th = wordTimes(toRoman(hi.join(' ')), 2000);
  assert.equal(captionStarts(hi, th).length, hi.length);
  assert.ok(sameWord('Hello,', 'hello'));
  assert.ok(sameWord('नमस्ते!', 'namaste'));
  assert.ok(!sameWord('—', ''));
});

test('she leans in to listen and presses her lips to think, with face shapes every teacher has', async () => {
  const { presenceFor, PRESENCE_SHAPES, nodder } = await T('presence.ts');
  assert.deepEqual(presenceFor('idle'), {});
  assert.deepEqual(presenceFor('speaking'), {});
  const right = presenceFor('listening', 'right');
  const left = presenceFor('listening', 'left');
  assert.ok(right.bodyRotateX > 0 && right.browInnerUp > 0, 'leans in, brows lifted');
  assert.equal(Math.sign(right.headRotateZ), -Math.sign(left.headRotateZ), 'tilts towards the page from either side');
  for (const v of [...Object.values(right), ...Object.values(presenceFor('thinking'))]) assert.ok(Math.abs(v) <= 0.3, 'small and natural');
  // Every face shape held is in every model (the turns and mouthSmile are TalkingHead's own).
  const own = new Set(['bodyRotateX', 'headRotateZ', 'mouthSmile']);
  const { TEACHERS } = await T('teachers.ts');
  for (const t of TEACHERS) {
    const g = glbJson(path.join(DIR, `${t.id}.glb`));
    const targets = new Set(g.meshes.flatMap((m) => m.extras?.targetNames ?? []));
    for (const k of PRESENCE_SHAPES) if (!own.has(k)) assert.ok(targets.has(k), `${t.id}: face shape ${k}`);
  }
  // Nods come at the start of a phrase, not on every loud moment, at most one every 1.6 s.
  const nod = nodder();
  const at = (level, ms) => nod(level, ms);
  assert.equal(at(0.5, 10000), true, 'starts speaking: nod');
  assert.equal(at(0.5, 10100), false, 'still the same phrase');
  assert.equal(at(0, 10200), false);
  assert.equal(at(0.5, 10700), false, 'new phrase but too soon');
  assert.equal(at(0, 11000), false);
  assert.equal(at(0.5, 12000), true, 'next phrase after a pause');
});

test('typing to the teacher is handled like speaking, and remembered while she thinks', async () => {
  const talk = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'talk.ts')).href);
  assert.equal(talk.askTyped('what is paging'), false, 'nothing listening: false, nothing lost silently');
  const got = [];
  const off = talk.onAskTyped((t) => got.push(t));
  assert.equal(talk.askTyped('  what is paging?  '), true);
  assert.equal(talk.askTyped('   '), false, 'blank is ignored');
  assert.deepEqual(got, ['what is paging?']);
  assert.equal(talk.getTalk().asked, 'what is paging?');
  talk.setTalkStatus('listening', 'deadlock kya hai');
  talk.setTalkStatus('thinking');
  assert.equal(talk.getTalk().asked, 'deadlock kya hai', 'what was heard stays while she thinks');
  off();
});

test('Teacher studio settings are kept safe: speed within limits, known framings, switches on by default', async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'voice', 'prefs.ts'), 'utf8');
  // prefs.ts talks to the API; check its defaults and limits by reading them, as the other prefs checks do.
  assert.match(src, /rate: 1, teacherView: 'upper', teacherCaptions: true, teacherGestures: true, teacherReacts: true, teacherGlance: true/);
  assert.match(src, /Math\.min\(1\.25, Math\.max\(0\.8,/, 'speed is kept between 0.8 and 1.25');
  assert.match(src, /r\.teacherView === 'head' \|\| r\.teacherView === 'mid' \? r\.teacherView : 'upper'/);
  assert.match(src, /export const RATES = \[0\.85, 1, 1\.15\]/);
  // Every studio route and label is real: the page is routed and listed where people look.
  const app = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'App.tsx'), 'utf8');
  assert.match(app, /path="\/teacher"/);
  const features = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'pages', 'explore', 'features.ts'), 'utf8');
  assert.match(features, /to: '\/teacher'/);
});
