/*
  Voice Build mode (docs/voice/BLUEPRINT.md §3 row 1, §4.3 step 5): spoken
  requests are told apart without AI; a change (not a translation) is only
  allowed after the server has seen Accepted; the AI's code is extracted
  cleanly, and a failing example is sent back for the retry.
*/
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseBuild, languageIn } = require('../client/src/voice/code/build.ts');
const guru = require('../src/voice/guru');
const { buildCode, accepted, extractCode, changedLine, messagesFor } = require('../src/voice/build');

test('parseBuild: translations, in English and Hinglish', () => {
  const t = (s) => parseBuild(s);
  assert.deepEqual(t('translate to python'), { verb: 'translate', to: 'python' });
  assert.deepEqual(t('isko java mein likho'), { verb: 'translate', to: 'java' });
  assert.deepEqual(t('code ko java mein badlo'), { verb: 'translate', to: 'java' });
  assert.deepEqual(t('convert my code to c plus plus'), { verb: 'translate', to: 'cpp' });
  assert.deepEqual(t('rewrite it in javascript'), { verb: 'translate', to: 'javascript' });
  assert.deepEqual(t('python mein likh do'), { verb: 'translate', to: 'python' });
  assert.deepEqual(t('translate this to c'), { verb: 'translate', to: 'c' });
  assert.deepEqual(t('translate to go'), { verb: 'translate', to: 'go' });
});

test('parseBuild: changes, and what is not a request', () => {
  const t = (s) => parseBuild(s);
  assert.deepEqual(t('make it iterative'), { verb: 'change', instruction: 'make it iterative' });
  assert.deepEqual(t('convert it to iterative'), { verb: 'change', instruction: 'convert it to iterative' });
  assert.deepEqual(t('add memoization'), { verb: 'change', instruction: 'add memoization' });
  assert.deepEqual(t('build mode: use a hash map instead of sorting'), { verb: 'change', instruction: 'use a hash map instead of sorting' });
  assert.deepEqual(t('isko recursive banao'), { verb: 'change', instruction: 'isko recursive banao' });
  assert.deepEqual(t('optimize it'), { verb: 'change', instruction: 'optimize it' });
  // Questions go to Guru; lane C commands and short words are not Build mode.
  for (const s of ['how do I make it faster?', 'kya isko python mein likh sakte hai', 'go to line 5', 'run', 'submit', 'what does my code do', 'line 3 pe jao', 'for loop 0 se n tak']) {
    assert.equal(t(s), null, s);
  }
  // "c" and "go" are words too: only after to / in / mein.
  assert.equal(languageIn('go to line 5'), null);
  assert.equal(languageIn('a c b'), null);
});

test('extractCode / changedLine read the reply', () => {
  assert.equal(extractCode('Here:\n```python\nprint(1)\n```\nChanged: used print'), 'print(1)');
  assert.equal(extractCode('print(2)\nChanged: nothing'), 'print(2)');
  assert.equal(changedLine('```\nx\n```\nChanged: made the loop iterative.'), 'Made the loop iterative.');
});

test('the retry carries the failing example', () => {
  const m = messagesFor({ mode: 'translate', code: 'x', language: 'cpp', target: 'python', previous: 'print(1)', failing: { input: '3', expected: '6', actual: '5' } });
  assert.equal(m.length, 4);
  assert.match(m[3].content, /Input:\n3/);
  assert.match(m[3].content, /original program prints:\n6/);
  assert.match(m[0].content, /Do NOT fix/);
});

/** A database with one accepted platform problem (7) and one solved Learn problem. */
const fakeDb = {
  async get(sql, args) {
    if (/FROM submissions/.test(sql)) return args[0] === 'asha' && args[1] === 7 ? { ok: 1 } : undefined;
    if (/FROM learn_progress/.test(sql)) return args[0] === 'asha' && args[1] === 'code:two-sum' ? { status: 'solved' } : { status: 'attempted' };
    return undefined;
  },
};

test('a change needs Accepted, checked on the server', async () => {
  assert.equal(await accepted(fakeDb, 'asha', { kind: 'platform', id: '7' }), true);
  assert.equal(await accepted(fakeDb, 'asha', { kind: 'platform', id: '8' }), false);
  assert.equal(await accepted(fakeDb, 'ravi', { kind: 'platform', id: '7' }), false);
  assert.equal(await accepted(fakeDb, 'asha', { kind: 'learn', id: 'two-sum' }), true);
  assert.equal(await accepted(fakeDb, 'asha', { kind: 'learn', id: 'three-sum' }), false);
  assert.equal(await accepted(fakeDb, 'asha', { kind: 'custom', id: '3' }), false);
  assert.equal(await accepted(fakeDb, 'asha', { kind: 'platform', id: '7; DROP' }), false);
});

test('buildCode: locked before Accepted, translation always allowed, free chain only', async (t) => {
  const calls = [];
  t.mock.method(guru, 'chain', () => [
    { label: 'busy', model: 'm', client: { chat: async () => { throw new Error('429'); } } },
    { label: 'free', model: 'm', client: { chat: async (req) => { calls.push(req); return { content: '```python\nn = int(input())\nprint(n * 2)\n```\nChanged: doubled it' }; } } },
  ]);
  const user = { username: 'ravi' };
  const base = { user, db: fakeDb, code: 'int main(){}', language: 'cpp' };

  const locked = await buildCode({ ...base, mode: 'change', problem: { kind: 'platform', id: '7' }, instruction: 'make it iterative' });
  assert.equal(locked.ok, false);
  assert.equal(locked.locked, true);
  assert.equal(calls.length, 0, 'no AI call before Accepted');

  const tr = await buildCode({ ...base, mode: 'translate', problem: { kind: 'platform', id: '7' }, target: 'python' });
  assert.equal(tr.ok, true);
  assert.equal(tr.code, 'n = int(input())\nprint(n * 2)');
  assert.equal(tr.source, 'free', 'a busy provider is skipped');

  const ok = await buildCode({ ...base, user: { username: 'asha' }, mode: 'change', problem: { kind: 'platform', id: '7' }, instruction: 'make it iterative' });
  assert.equal(ok.ok, true);
  assert.equal(ok.say, 'Doubled it');

  assert.equal((await buildCode({ ...base, mode: 'translate', target: 'cpp' })).ok, false);
  assert.equal((await buildCode({ ...base, mode: 'translate', target: 'cobol' })).ok, false);
  assert.equal((await buildCode({ ...base, code: '  ', mode: 'translate', target: 'python' })).ok, false);
});

test('buildCode: no free provider → an honest message, no guess', async (t) => {
  t.mock.method(guru, 'chain', () => []);
  const r = await buildCode({ user: { username: 'ravi' }, db: fakeDb, code: 'x', language: 'cpp', mode: 'translate', target: 'python' });
  assert.equal(r.ok, false);
  assert.match(r.say, /can’t reach a free AI/);
});
