/*
  Voice Explain-back (docs/voice/BLUEPRINT.md §2 row 3, §3 row 8): only after
  Accepted; the trace answer is checked exactly; a rubric point counts only
  with a real quote of the student's words; a pass counts towards mastery only
  when unaided, and Guru stays quiet during it.
*/
const test = require('node:test');
const assert = require('node:assert/strict');

const guru = require('../src/voice/guru');
const ex = require('../src/voice/explain');

const SAID = 'The idea is that every number must be added once so a single pass is enough. First I read n, then I add each value to a running total in a long long. It works because after each step the total holds the sum of the values read so far. It takes O(n) time and O(1) space. The sum can overflow a 32-bit int so I use 64 bits.';

test('quotes must come from what the student said', () => {
  assert.equal(ex.quoted('a single pass is enough', SAID), true);
  assert.equal(ex.quoted('A single PASS, is enough!', SAID), true);
  assert.equal(ex.quoted('uses a hash map for lookups', SAID), false);
  assert.equal(ex.quoted('pass', SAID), false, 'too short to prove anything');
  const reply = JSON.stringify({ scores: {
    idea: { score: 2, quote: 'a single pass is enough' },
    approach: { score: 2, quote: 'add each value to a running total' },
    why: { score: 2, quote: 'it is a classic greedy argument' }, // invented
    complexity: { score: 2, quote: 'It takes O(n) time and O(1) space' },
    edges: { score: 5, quote: 'The sum can overflow a 32-bit int' },
  }, feedback: 'Say what happens when n is 1.' });
  const g = ex.checkScores('```json\n' + reply + '\n```', SAID);
  assert.deepEqual(g.criteria.map((c) => c.score), [2, 2, 0, 2, 2]);
  assert.equal(g.total, 8);
  assert.equal(g.feedback, 'Say what happens when n is 1.');
  assert.equal(ex.checkScores('not json', SAID), null);
});

test('the trace input is a small test, picked at random', () => {
  const cases = [
    { input: '3\n1 2 3\n', output: '6' },
    { input: '200000\n' + '1 '.repeat(500), output: '500' }, // too long to trace
    { input: '1\n5\n', output: '5' },
  ];
  assert.deepEqual(ex.pickVariant(cases, () => 0), { input: '3\n1 2 3\n', expected: '6' });
  assert.deepEqual(ex.pickVariant(cases, () => 0.99), { input: '1\n5\n', expected: '5' });
  assert.equal(ex.pickVariant([{ input: 'x'.repeat(300), output: '1' }]), null);
});

test('pass rules: 7 of 10, complexity, the trace, and unaided to count', () => {
  const crit = (c) => [{ id: 'complexity', score: c }];
  assert.deepEqual(ex.verdict({ total: 8, criteria: crit(2), variant: {}, variantOk: true, aided: false }), { passed: true, counted: true, why: '' });
  assert.equal(ex.verdict({ total: 6, criteria: crit(2), variant: {}, variantOk: true, aided: false }).passed, false);
  assert.equal(ex.verdict({ total: 9, criteria: crit(0), variant: {}, variantOk: true, aided: false }).passed, false);
  assert.equal(ex.verdict({ total: 9, criteria: crit(2), variant: {}, variantOk: false, aided: false }).passed, false);
  const aided = ex.verdict({ total: 9, criteria: crit(2), variant: {}, variantOk: true, aided: true });
  assert.equal(aided.passed, true);
  assert.equal(aided.counted, false);
  assert.match(aided.why, /practice/);
  assert.equal(ex.verdict({ total: 9, criteria: crit(2), variant: null, variantOk: null, aided: false }).counted, false);
});

/** A tiny in-memory database for the tables explain-back uses. */
function memDb({ solved = true } = {}) {
  const rows = { voice_explain: [], voice_hint_log: new Map() };
  return {
    rows,
    async run(sql, a = []) {
      if (/INSERT INTO voice_explain/.test(sql)) rows.voice_explain.push({ username: a[0], item: a[1], tags: a[2], score: a[3], passed: a[4], counted: a[5] });
      if (/INSERT INTO voice_hint_log/.test(sql)) rows.voice_hint_log.set(`${a[0]}|${a[1]}`, a[2]);
    },
    async get(sql, a = []) {
      if (/FROM learn_progress/.test(sql)) return { status: solved ? 'solved' : 'attempted' };
      if (/FROM voice_hint_log/.test(sql)) { const at = rows.voice_hint_log.get(`${a[0]}|${a[1]}`); return at ? { at } : undefined; }
      return undefined;
    },
    async all(sql, a = []) {
      if (/FROM voice_explain/.test(sql)) return rows.voice_explain.filter((r) => r.username === a[0] && r.counted).map((r) => ({ item: r.item, tags: r.tags }));
      return [];
    },
  };
}

const grader = (scores) => [{ label: 'free', model: 'm', client: { chat: async () => ({ content: JSON.stringify({ scores, feedback: 'Good.' }) }) } }];
const GOOD = {
  idea: { score: 2, quote: 'a single pass is enough' },
  approach: { score: 2, quote: 'add each value to a running total' },
  why: { score: 2, quote: 'the total holds the sum of the values read so far' },
  complexity: { score: 2, quote: 'It takes O(n) time and O(1) space' },
  edges: { score: 1, quote: 'The sum can overflow a 32-bit int' },
};

test('locked before Accepted; Guru is quiet during; an unaided pass counts', async (t) => {
  t.mock.method(guru, 'chain', () => grader(GOOD));
  const problem = { kind: 'learn', id: 'arr-c-sum' };

  const locked = await ex.startExplain({ db: memDb({ solved: false }), user: { username: 'ravi' }, problem });
  assert.equal(locked.ok, false);
  assert.equal(locked.locked, true);

  const db = memDb();
  const user = { username: 'asha' };
  const s = await ex.startExplain({ db, user, problem, code: 'int main(){}', language: 'cpp' });
  assert.equal(s.ok, true);
  assert.equal(s.rubric.length, 5);
  assert.ok(s.trace && s.trace.input, 'a trace input from the problem tests');
  assert.equal(ex.explaining('asha', 'arr-c-sum'), true);
  assert.equal(ex.explaining('asha', 'other'), false);

  const short = await ex.gradeExplain({ db, user, token: s.token, transcript: 'it adds numbers', answer: '' });
  assert.equal(short.ok, false);

  // The right answer to the trace: the sum of the numbers after the first line.
  const nums = s.trace.input.trim().split(/\s+/).slice(1).map(Number);
  const sum = nums.reduce((a, b) => a + b, 0);
  const g = await ex.gradeExplain({ db, user, token: s.token, transcript: SAID, answer: String(sum) });
  assert.equal(g.ok, true);
  assert.equal(g.total, 9);
  assert.equal(g.trace.ok, true);
  assert.equal(g.passed, true);
  assert.equal(g.counted, true);
  assert.equal(ex.explaining('asha', 'arr-c-sum'), false, 'Guru speaks again afterwards');
  const rows = await ex.countedTagRows(db, 'asha');
  assert.deepEqual(rows, [{ id: 'explain:learn:arr-c-sum', tags: 'arrays,implementation' }]);

  // The token is used up.
  assert.equal((await ex.gradeExplain({ db, user, token: s.token, transcript: SAID, answer: String(sum) })).ok, false);
});

test('a hint in the last day makes it practice; no AI means no grade', async (t) => {
  t.mock.method(guru, 'chain', () => grader(GOOD));
  const db = memDb();
  const user = { username: 'kiran' };
  const problem = { kind: 'learn', id: 'arr-c-sum' };
  await ex.logHint(db, 'kiran', 'arr-c-sum');
  const s = await ex.startExplain({ db, user, problem });
  const sum = s.trace.input.trim().split(/\s+/).slice(1).map(Number).reduce((a, b) => a + b, 0);
  const g = await ex.gradeExplain({ db, user, token: s.token, transcript: SAID, answer: String(sum) });
  assert.equal(g.passed, true);
  assert.equal(g.counted, false);
  assert.match(g.why, /Guru/);

  t.mock.method(guru, 'chain', () => []);
  const s2 = await ex.startExplain({ db, user, problem });
  const g2 = await ex.gradeExplain({ db, user, token: s2.token, transcript: SAID, answer: '0' });
  assert.equal(g2.ok, false);
  assert.match(g2.say, /can’t reach a free AI/);
});
