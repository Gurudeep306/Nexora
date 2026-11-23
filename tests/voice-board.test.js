/*
  The teacher's whiteboard (src/voice/board.js): the model's lesson is
  checked before any browser draws it — known shapes only, kept on the board,
  short text, limited steps — and Guru's Leak Guard runs on everything said
  and written for an unsolved question. These never call a model.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/voice/board');
const G = require('../src/voice/guru');

test('a reply wrapped in words or a code fence still gives its JSON; junk gives nothing', () => {
  assert.deepEqual(B.firstJson('Sure!\n```json\n{"a":{"b":"}"}}\n```'), { a: { b: '}' } });
  assert.equal(B.firstJson('no json here'), null);
  assert.equal(B.firstJson('{"broken": '), null);
});

test('only known shapes are drawn, kept on the board, with short plain text', () => {
  const b = B.cleanBoard({
    title: '<script>x</script>Binary search',
    steps: [
      {
        say: '**Look** at the middle.',
        draw: [
          { t: 'array', x: 999, values: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27], highlight: [1, 40, -1], pointers: [{ i: 1, label: 'mid' }, { i: 99, label: 'x' }] },
          { t: 'script', src: 'evil.js' },
          { t: 'text', text: '<b>low</b> < high > 0', x: -50, y: 500 },
          { t: 'arrow', from: [0, 0], to: ['a', 5] },
          { t: 'circle', x: 50, y: 30, r: 99, label: 'A', color: 'url(javascript:alert(1))' },
        ],
      },
      { say: '', draw: [] },
    ],
  });
  assert.equal(b.title, 'xBinary search', 'tags are removed');
  assert.equal(b.steps.length, 1, 'empty steps are dropped');
  const [arr, text, arrow, circle] = b.steps[0].draw;
  assert.equal(b.steps[0].draw.length, 4, 'unknown shapes are dropped');
  assert.equal(arr.values.length, 12, 'at most 12 cells');
  assert.ok(arr.x + arr.cell * arr.values.length <= B.W, 'the whole array stays on the board');
  assert.deepEqual(arr.highlight, [1]);
  assert.deepEqual(arr.pointers, [{ i: 1, label: 'mid' }]);
  assert.deepEqual([text.text, text.x, text.y], ['low < high > 0', 0, B.H], 'comparison signs stay, tags go');
  assert.deepEqual(arrow.to, [0, 5]);
  assert.equal(circle.r, 20);
  assert.equal(circle.color, 'ink', 'only the board’s own colours');
  assert.equal(b.steps[0].say, 'Look at the middle.');
  const many = B.cleanBoard({ steps: Array.from({ length: 20 }, () => ({ say: 'x', draw: Array.from({ length: 30 }, () => ({ t: 'clear' })) })) });
  assert.equal(many.steps.length, B.MAX_STEPS);
  assert.equal(many.steps[0].draw.length, B.MAX_OPS);
  assert.equal(B.cleanBoard({ nope: 1 }), null);
});

test('the Leak Guard reads what is written on the board too', () => {
  const board = B.cleanBoard({ steps: [{ say: 'Try a smaller example first.', draw: [{ t: 'text', text: 'Answer is B', x: 5, y: 5 }] }] });
  assert.ok(B.boardLeaks(board, { answerKey: 'B', options: [] }));
  const safe = B.cleanBoard({ steps: [{ say: 'Look at option B and test it on a small case.', draw: [{ t: 'array', values: [2, 4, 6] }] }] });
  assert.ok(!B.boardLeaks(safe, { answerKey: 'B', options: [] }));
});

test('the lesson prompt: who teaches, the drawing language, Hindi, and a different example while unsolved', () => {
  const m = B.buildBoardMessages({ topic: 'binary search', lang: 'hi-IN', persona: G.personaFor('arjun'), unsolved: true });
  const sys = m[0].content;
  assert.match(sys, /You are Arjun, a teacher on NexoraGuru/);
  assert.match(sys, /"t":"array"/);
  assert.match(sys, /simple Hindi/);
  assert.match(sys, /DIFFERENT example/);
  assert.equal(m.at(-1).content, 'Explain on the whiteboard: binary search');
  assert.doesNotMatch(B.buildBoardMessages({ topic: 'x', lang: 'en-IN' })[0].content, /DIFFERENT example/);
});
