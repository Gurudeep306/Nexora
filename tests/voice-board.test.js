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

/* ── 5,000 random, malformed and hostile lessons: whatever comes out is safe to draw ── */

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('random and hostile whiteboard lessons always come out safe, small and on the board', (t) => {
  const { cleanBoard, W, H, MAX_STEPS, MAX_OPS } = require('../src/voice/board');
  const r = rng(20261123);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const NASTY_STR = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'a[mid] < key', 'x'.repeat(500), '', '   ', 'नमस्ते', '\u0000\u0007', '{"t":"box"}', 'javascript:alert(1)', 'low ≤ high', '<b>bold</b> text'];
  const num = () => pick([r() * 100, -r() * 1e9, r() * 1e12, NaN, Infinity, -Infinity, '12', 'abc', null, undefined, [], {}, 1e-9, 50]);
  const str = () => (r() < 0.5 ? pick(NASTY_STR) : Math.random().toString(36).slice(2));
  const T = ['text', 'box', 'circle', 'arrow', 'line', 'array', 'clear', 'image', 'html', 'script', null, 7];
  const op = () => {
    const o = { t: pick(T), id: r() < 0.3 ? str() : 'a', x: num(), y: num(), w: num(), h: num(), r: num(), size: num(), text: str(), label: str(), color: pick(['ink', 'accent', 'bad', 'red', '<x>', null]) };
    if (r() < 0.5) o.from = pick([[num(), num()], [1], 'x', null, [1, 2, 3]]);
    if (r() < 0.5) o.to = pick([[num(), num()], null]);
    if (o.t === 'array' || r() < 0.2) {
      o.values = pick([Array.from({ length: Math.floor(r() * 40) }, () => pick([str(), num(), 3, 'x'])), 'abc', null, []]);
      o.highlight = pick([[0, 1, -5, 999, 'x', 2.7], null, 'a']);
      o.pointers = pick([[{ i: 0, label: 'low' }, { i: 99, label: 'x' }, { i: 'a' }, null, { i: 2, label: '<b>mid</b>' }], null]);
      o.cell = num();
    }
    return o;
  };
  const real = () => ({ title: str(), steps: Array.from({ length: 1 + Math.floor(r() * 12) }, () => ({ say: str(), draw: Array.from({ length: Math.floor(r() * 25) }, op) })) });
  const lesson = () => (r() < 0.7 ? real() : pick([
    null, 'text', [], { steps: 'x' },
    { title: str(), steps: Array.from({ length: Math.floor(r() * 30) }, () => pick([null, 'x', { say: str(), draw: Array.from({ length: Math.floor(r() * 40) }, op) }, { say: 42, draw: 'x' }])) },
  ]));
  let boards = 0;
  let shapes = 0;
  const bad = [];
  for (let k = 0; k < 5000; k++) {
    const out = cleanBoard(lesson());
    if (!out) continue;
    boards++;
    const where = `lesson ${k}`;
    if (typeof out.title !== 'string' || out.title.length > 60 || /<[a-z/]/i.test(out.title)) bad.push(`${where}: title ${JSON.stringify(out.title)}`);
    if (!Array.isArray(out.steps) || !out.steps.length || out.steps.length > MAX_STEPS) bad.push(`${where}: ${out.steps?.length} steps`);
    for (const s of out.steps) {
      if (typeof s.say !== 'string' || s.say.length > 400 || /<[a-z/]/i.test(s.say)) bad.push(`${where}: say ${JSON.stringify(s.say).slice(0, 60)}`);
      if (s.draw.length > MAX_OPS) bad.push(`${where}: ${s.draw.length} shapes in a step`);
      for (const o of s.draw) {
        shapes++;
        const texts = [o.text, o.label, ...(o.values || []), ...(o.pointers || []).map((p) => p.label)].filter((x) => x != null);
        for (const tx of texts) if (typeof tx !== 'string' || /<[a-z/]/i.test(tx)) bad.push(`${where}: text ${JSON.stringify(tx)}`);
        const nums = [o.x, o.y, o.w, o.h, o.r, o.size, o.cell, ...(o.from || []), ...(o.to || [])].filter((v) => v !== undefined);
        for (const v of nums) if (typeof v !== 'number' || !Number.isFinite(v)) bad.push(`${where}: number ${v} in ${o.t}`);
        if (o.color && !['ink', 'accent', 'muted', 'good', 'bad'].includes(o.color)) bad.push(`${where}: colour ${o.color}`);
        const inside = (x, y) => x >= 0 && x <= W && y >= 0 && y <= H;
        if (o.t === 'text' || o.t === 'box' || o.t === 'circle') if (!inside(o.x, o.y)) bad.push(`${where}: ${o.t} at ${o.x},${o.y}`);
        if (o.t === 'box' && (o.w <= 0 || o.h <= 0)) bad.push(`${where}: box size`);
        if ((o.t === 'arrow' || o.t === 'line') && !(inside(...o.from) && inside(...o.to))) bad.push(`${where}: ${o.t} off the board`);
        if (o.t === 'array') {
          if (o.x < 0 || o.x + o.cell * o.values.length > W) bad.push(`${where}: array off the board (${o.x} + ${o.cell}×${o.values.length})`);
          if (o.values.length > 12 || o.values.some((v) => v.length > 6)) bad.push(`${where}: array too big`);
          if (o.highlight.some((i) => !Number.isInteger(i) || i < 0 || i >= o.values.length)) bad.push(`${where}: highlight ${o.highlight}`);
          if (o.pointers.some((p) => !Number.isInteger(p.i) || p.i < 0 || p.i >= o.values.length || !p.label)) bad.push(`${where}: pointer`);
        }
        if (!['text', 'box', 'circle', 'arrow', 'line', 'array', 'clear'].includes(o.t)) bad.push(`${where}: shape ${o.t}`);
      }
    }
  }
  t.diagnostic(`${boards} boards with ${shapes} shapes checked out of 5000 random lessons`);
  assert.equal(bad.length, 0, bad.slice(0, 25).join('\n'));
  assert.ok(boards > 3000, `${boards} boards`);
});
