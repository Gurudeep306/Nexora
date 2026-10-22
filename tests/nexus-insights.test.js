// Nexus learning intelligence (src/nexus/insights.js): time estimates,
// weightage and high-yield, peer mastery, quick-check grading.
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../src/nexus/insights');

test('time estimates: lessons (or a default by kind) plus ~3 min per PYQ; DSA by problems', () => {
  assert.equal(I.nodeMinutes({ lessonMinutes: [55, 20], pyqTarget: 10 }), 105);
  assert.equal(I.nodeMinutes({ kind: 'concept', pyqTarget: 0 }), 40);
  assert.equal(I.nodeMinutes({ kind: 'project' }), 120);
  assert.equal(I.nodeMinutes({ dsaTarget: 8 }), 160);
});

test('weightage: marks by year; high-yield is the top 20% (at least one)', () => {
  const byId = new Map([
    ['a', { marks: 2, year: 2023 }],
    ['b', { marks: 1, year: 2023 }],
    ['c', { marks: 1, year: 2021 }],
  ]);
  assert.deepEqual(I.weightage(['a', 'b', 'c', 'nope'], byId), { n: 3, marks: 4, years: { 2023: 3, 2021: 1 } });
  const weights = new Map([
    ['n1', { marks: 9 }],
    ['n2', { marks: 1 }],
    ['n3', { marks: 0 }],
    ['n4', { marks: 4 }],
    ['n5', { marks: 2 }],
    ['n6', { marks: 3 }],
  ]);
  assert.deepEqual([...I.highYield(weights)], ['n1']);
  weights.set('n7', { marks: 8 });
  weights.set('n8', { marks: 7 });
  assert.deepEqual([...I.highYield(weights)].sort(), ['n1', 'n7']);
  assert.equal(I.highYield(new Map([['x', { marks: 0 }]])).size, 0);
});

test('peer mastery: share of learners reaching the target, median days to master', () => {
  const D = I.DAY;
  const rows = [
    // u1: masters (2 of 2) after 4 days
    { username: 'u1', question_id: 'q1', first_at: 0, first_correct: D },
    { username: 'u1', question_id: 'q2', first_at: D, first_correct: 4 * D },
    // u2: one correct only
    { username: 'u2', question_id: 'q1', first_at: 0, first_correct: 2 * D },
    { username: 'u2', question_id: 'q2', first_at: 0, first_correct: null },
    // u3: masters after 2 days
    { username: 'u3', question_id: 'q1', first_at: 10 * D, first_correct: 11 * D },
    { username: 'u3', question_id: 'q2', first_at: 10 * D, first_correct: 12 * D },
    // outside the pool
    { username: 'u4', question_id: 'zz', first_at: 0, first_correct: 0 },
  ];
  assert.deepEqual(I.peerMastery(rows, ['q1', 'q2'], 2), { learners: 3, mastered: 2, pct: 67, medianDays: 3 });
  assert.deepEqual(I.peerMastery([], ['q1'], 1), { learners: 0, mastered: 0, pct: null, medianDays: null });
});

test('quick check grading: MCQ, MSQ, NAT ranges and alternatives; a pass needs 80% of 3+', () => {
  assert.ok(I.isCorrect({ type: 'MCQ', answer: 'C' }, 'c'));
  assert.ok(!I.isCorrect({ type: 'MCQ', answer: 'C' }, 'B'));
  assert.ok(I.isCorrect({ type: 'MSQ', answer: ['A', 'C'] }, ['C', 'A']));
  assert.ok(!I.isCorrect({ type: 'MSQ', answer: ['A', 'C'] }, ['A']));
  assert.ok(I.isCorrect({ type: 'NAT', answer: '110 to 110' }, '110'));
  assert.ok(I.isCorrect({ type: 'NAT', answer: '2.5 to 2.6' }, 2.55));
  assert.ok(I.isCorrect({ type: 'NAT', answer: 96 }, '96.02'));
  assert.ok(I.isCorrect({ type: 'NAT', answer: '2 to 2 OR 4 to 4' }, '4'));
  assert.ok(!I.isCorrect({ type: 'NAT', answer: 96 }, ''));
  assert.equal(I.passed(4, 5), true);
  assert.equal(I.passed(3, 5), false);
  assert.equal(I.passed(2, 2), false, 'too few questions to test out');
  assert.equal(I.passed(3, 3), true);
  // Picks are stable for a seed and skip figures / missing keys.
  const byId = new Map([
    ['a', { id: 'a', type: 'MCQ', answer: 'A', figures: [] }],
    ['b', { id: 'b', type: 'NAT', answer: 3, figures: [] }],
    ['c', { id: 'c', type: 'MCQ', answer: 'B', figures: ['x.png'] }],
    ['d', { id: 'd', type: 'DESC', answer: 'x', figures: [] }],
    ['e', { id: 'e', type: 'MCQ', answer: null, figures: [] }],
    ['f', { id: 'f', type: 'MSQ', answer: ['A'], figures: [] }],
  ]);
  const a = I.pickQuick(['a', 'b', 'c', 'd', 'e', 'f'], byId, 'seed').map((q) => q.id);
  assert.deepEqual([...a].sort(), ['a', 'b', 'f']);
  assert.deepEqual(I.pickQuick(['a', 'b', 'c', 'd', 'e', 'f'], byId, 'seed').map((q) => q.id), a);
});
