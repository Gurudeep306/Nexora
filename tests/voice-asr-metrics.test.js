/* S9: the accuracy measures used by scripts/voice/asr-eval.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../scripts/voice/asr-metrics');
const fs = require('node:fs');
const path = require('node:path');

test('word error rate folds case, punctuation and number words', () => {
  assert.deepEqual(m.wer('Mid ko update karo.', 'mid ko update karo'), { errors: 0, words: 4 });
  assert.deepEqual(m.wer('n minus one', 'n minus 1'), { errors: 0, words: 3 });
  assert.deepEqual(m.wer('open the notes', 'open notes'), { errors: 1, words: 3 });
  assert.deepEqual(m.wer('run BFS now', 'run beefs now'), { errors: 1, words: 3 });
  assert.deepEqual(m.wer('a b', 'a b c d'), { errors: 2, words: 2 });
});

test('code-word error rate counts only code and CS words', () => {
  // "the" is dropped (not code); push and in are code words and heard; "queue" is misheard.
  assert.deepEqual(m.codeWer('push it in the queue', 'push it in kyu'), { errors: 1, words: 3 });
  assert.deepEqual(m.codeWer('i plus plus', 'I plus plus'), { errors: 0, words: 3 });
  assert.equal(m.isCodeWord('bfs'), true);
  assert.equal(m.isCodeWord('please'), false);
});

test('percentiles and rates', () => {
  assert.equal(m.percentile([100, 200, 300, 400], 50), 200);
  assert.equal(m.percentile([100, 200, 300, 400, 5000], 95), 5000);
  assert.equal(m.percentile([], 50), null);
  assert.equal(m.rate([{ errors: 1, words: 4 }, { errors: 1, words: 6 }]), 0.2);
});

test('the clip list is well formed: unique ids, languages, and an expectation for every command or code clip', () => {
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'voice', 'tests', 'asr', 'clips.json'), 'utf8'));
  const ids = new Set();
  for (const c of list.clips) {
    assert.ok(/^[a-z0-9-]+$/.test(c.id) && !ids.has(c.id), c.id);
    ids.add(c.id);
    assert.ok(['en', 'hinglish', 'hi'].includes(c.lang), c.id);
    assert.ok(['command', 'code', 'doubt'].includes(c.kind), c.id);
    assert.ok(c.text && c.text.length < 200, c.id);
    if (c.kind === 'command') assert.ok(c.command, `${c.id} names its command`);
    if (c.kind === 'code') assert.ok(c.code, `${c.id} names its code`);
  }
  for (const lang of ['en', 'hinglish', 'hi']) assert.ok(list.clips.filter((c) => c.lang === lang).length >= 15, lang);
});

test('every clip\'s expectation holds for its own text (as if heard perfectly)', async () => {
  const { pathToFileURL } = require('node:url');
  const { normalise } = require('../src/voice/normalise');
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'voice', 'tests', 'asr', 'clips.json'), 'utf8'));
  const { commandSpecs } = require('../scripts/voice/asr-eval');
  const { matchCommand, expand } = await import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'voice', 'actions', 'match.ts')).href);
  const all = await commandSpecs();
  const expanded = new Map(all.map((s) => [s.id, expand(s)]));
  const wrong = [];
  for (const c of list.clips) {
    const lang = c.lang === 'hi' ? 'hi-IN' : 'en-IN';
    if (c.kind === 'command') {
      const text = normalise(c.text, { mode: 'command', lang, hints: c.hints || [] }).text;
      const { best } = matchCommand(text, all, expanded);
      if (best?.id !== c.command || (c.args && JSON.stringify(best.args) !== JSON.stringify(c.args))) wrong.push(`${c.id}: "${c.text}" → ${best?.id} ${JSON.stringify(best?.args)}`);
    }
    if (c.kind === 'code') {
      const code = normalise(c.text, { mode: 'code', lang, hints: c.hints || [] }).code;
      if (code !== c.code) wrong.push(`${c.id}: "${c.text}" → ${code} (want ${c.code})`);
    }
  }
  assert.deepEqual(wrong, []);
});
