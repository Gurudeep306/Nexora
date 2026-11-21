/*
  Reasoning models (Qwen3 and others on the free tiers) write their thinking
  in <think>…</think> before the answer. Only the answer may reach students:
  the thinking can name the key (which would also trip the Leak Guard) and
  must never be spoken aloud.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const { stripThinking } = require('../src/ai/groq');

test('only the answer after the thinking is kept', () => {
  assert.equal(stripThinking('<think>\nThe key is B.\n</think>\n\nPehle key word pakdo.'), 'Pehle key word pakdo.');
  assert.equal(stripThinking('<THINK>x</THINK>```py\nprint(1)\n```'), '```py\nprint(1)\n```');
  assert.equal(stripThinking('<think>ran out of room before answering'), '');
  assert.equal(stripThinking('a plain answer'), 'a plain answer');
  assert.equal(stripThinking(''), '');
});

test('streams: thinking is dropped even when its tags are split across pieces', () => {
  const { thinkFilter } = require('../src/ai/groq');
  const run = (pieces) => {
    const f = thinkFilter();
    return pieces.map((p) => f(p)).join('') + f.flush();
  };
  assert.equal(run(['<thi', 'nk>The key', ' is B</th', 'ink>\n\nHint: look at', ' the loop.']), 'Hint: look at the loop.');
  assert.equal(run(['Plain ', 'answer <b>bold</b>', ' and a < b']), 'Plain answer <b>bold</b> and a < b');
  assert.equal(run(['<think>never closed']), '');
  assert.equal(run(['x <', 't']), 'x <t');
});
