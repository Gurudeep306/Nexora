// Hosted contests, the rules (src/contests.js): timing, grading your own
// questions, past-paper marks, coding standings, analysis and a safe CSV.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/contests');

const T0 = Date.parse('2026-12-01T10:00:00Z');
const contest = (over = {}) => ({ id: 1, status: 'published', start_time: new Date(T0).toISOString(), duration_mins: 60, settings: C.normalizeSettings({}), ...over });

test('phase and each person\'s time, fixed and window', () => {
  const c = contest();
  assert.equal(C.phase(c, T0 - 1), 'upcoming');
  assert.equal(C.phase(c, T0 + 1), 'live');
  assert.equal(C.phase(c, T0 + 60 * 60000), 'ended');
  assert.equal(C.phase({ ...c, status: 'draft' }, T0 + 1), 'draft');
  // Fixed: everyone from the start; finishing early ends your time.
  assert.equal(C.personWindow(c, {}, T0 + 5).state, 'running');
  assert.equal(C.personWindow(c, { finished_at: T0 + 10 }, T0 + 20).state, 'finished');
  // Window: open for a day, each person gets 60 minutes from Start, never past the close.
  const w = contest({ settings: C.normalizeSettings({ mode: 'window', endTime: new Date(T0 + 24 * 3600000).toISOString() }) });
  assert.equal(C.phase(w, T0 + 3 * 3600000), 'live');
  assert.equal(C.personWindow(w, null, T0 + 1).state, 'not_started');
  const started = T0 + 23.5 * 3600000;
  const pw = C.personWindow(w, { started_at: started, ends_at: started + 3600000 }, started + 10);
  assert.equal(pw.to, T0 + 24 * 3600000, 'cut at the window close');
  assert.equal(C.personWindow(w, null, T0 + 25 * 3600000).state, 'missed');
});

test('answers show after the end, or after finishing when the host allows it', () => {
  const c = contest();
  assert.equal(C.canReview(c, {}, T0 + 5), false);
  assert.equal(C.canReview(c, {}, T0 + 2 * 3600000), true);
  const early = contest({ settings: C.normalizeSettings({ review: 'after_finish' }) });
  assert.equal(C.canReview(early, { finished_at: T0 + 10 }, T0 + 20), true);
  assert.equal(C.canReview(early, {}, T0 + 20), false);
});

test('own questions are cleaned and checked before use', () => {
  const q = C.cleanQuestion({ type: 'MCQ', text: 'Pick B', options: ['a', 'b', 'c'], answer: 'B', marks: 2 });
  assert.equal(q.negative, 0.67, 'MCQ default is a third of the marks');
  assert.deepEqual(C.questionProblems(q), []);
  assert.deepEqual(C.questionProblems(C.cleanQuestion({ type: 'MCQ', text: 'x', options: ['a', 'b'], answer: 'D' })), ['the correct option']);
  assert.deepEqual(C.questionProblems(C.cleanQuestion({ type: 'NAT', text: 'x' })), ['the correct answer (a number or a range)']);
  const msq = C.cleanQuestion({ type: 'MSQ', text: 'x', options: ['a', 'b', 'c'], answer: ['C', 'A', 'A', 'Z'] });
  assert.deepEqual(msq.answer, ['A', 'C']);
  assert.equal(msq.negative, 0, 'MSQ has no negative marks unless set');
  // Only our own uploaded figures are kept.
  const f = C.cleanQuestion({ text: 'x', figures: [{ url: '/uploads/contests/1-ab.png' }, { url: 'https://evil.test/x.png' }, { url: '/uploads/../etc/passwd' }] });
  assert.deepEqual(f.figures.map((x) => x.url), ['/uploads/contests/1-ab.png']);
});

test('grading own questions uses their marks and negative marks', () => {
  const mcq = C.cleanQuestion({ type: 'MCQ', text: 'x', options: ['a', 'b'], answer: 'B', marks: 3, negative: 1 });
  assert.equal(C.gradeOwn(mcq, 'b').marks, 3);
  assert.equal(C.gradeOwn(mcq, 'A').marks, -1);
  assert.equal(C.gradeOwn(mcq, null).attempted, false);
  const msq = C.cleanQuestion({ type: 'MSQ', text: 'x', options: ['a', 'b', 'c'], answer: ['A', 'C'], marks: 2 });
  assert.equal(C.gradeOwn(msq, ['C', 'A']).correct, true);
  assert.equal(C.gradeOwn(msq, ['A']).marks, -0, 'a partly right MSQ scores nothing');
  const nat = C.cleanQuestion({ type: 'NAT', text: 'x', answer: { min: 2.5, max: 2.6 }, marks: 2 });
  assert.equal(C.gradeOwn(nat, '2.55').correct, true);
  assert.equal(C.gradeOwn(nat, 2.7).correct, false);
});

test('past-paper questions take the contest\'s marks, GATE\'s −1/3 scaled to them', () => {
  const q = { type: 'MCQ', answer: 'A', marks: 1, options: [{ l: 'A' }, { l: 'B' }] };
  assert.equal(C.gradeBank(q, 'A', 3, true).marks, 3);
  assert.equal(C.gradeBank(q, 'B', 3, true).marks, -1);
  assert.equal(C.gradeBank(q, 'B', 3, false).marks, 0, 'no negative marking when the host turns it off');
});

test('coding: solved at the first Accepted; wrong tries before it are penalty, compile errors are not', () => {
  const r = C.codingResult([{ verdict: 'WA', at: T0 + 60000 }, { verdict: 'CE', at: T0 + 120000 }, { verdict: 'AC', at: T0 + 10 * 60000 }, { verdict: 'WA', at: T0 + 11 * 60000 }], T0);
  assert.deepEqual([r.solved, r.wrong, r.minutes], [true, 1, 10]);
  assert.equal(C.codingResult([{ verdict: 'TLE', at: T0 }], T0).solved, false);
});

test('standings rank by marks, then penalty; ties share a rank', () => {
  const c = contest();
  const items = [
    { idx: 0, kind: 'problem', ref: '5', marks: 100 },
    { idx: 1, kind: 'question', ref: '1', marks: 2 },
  ];
  const entries = [{ username: 'ann' }, { username: 'bob' }, { username: 'cat' }];
  const runs = [
    { username: 'ann', item_idx: 0, verdict: 'AC', at: T0 + 30 * 60000 },
    { username: 'bob', item_idx: 0, verdict: 'WA', at: T0 + 5 * 60000 },
    { username: 'bob', item_idx: 0, verdict: 'AC', at: T0 + 10 * 60000 },
  ];
  const responses = [
    { username: 'ann', item_idx: 1, attempted: 1, correct: 1, marks: 2, time_ms: 1000 },
    { username: 'bob', item_idx: 1, attempted: 1, correct: 1, marks: 2, time_ms: 1000 },
    { username: 'cat', item_idx: 1, attempted: 1, correct: 0, marks: -0.67, time_ms: 1000 },
  ];
  const rows = C.standings(c, items, entries, runs, responses);
  assert.deepEqual(rows.map((r) => [r.username, r.marks, r.penalty, r.rank]), [
    ['ann', 102, 30, 1], // 30 minutes
    ['bob', 102, 30, 1], // 10 minutes + 20 for the wrong try: a tie
    ['cat', -0.67, 0, 3],
  ]);
  const a = C.analysis(c, items, rows, responses, runs);
  assert.equal(a.perItem[0].right, 2);
  assert.equal(a.perItem[1].tried, 3);
  assert.equal(a.perItem[1].right, 2);
});

test('CSV cells cannot run as spreadsheet formulas, and the file opens in Excel', () => {
  assert.equal(C.csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(C.csvCell('+1'), `"'+1"`);
  assert.equal(C.csvCell('plain'), 'plain');
  const items = [{ idx: 0, kind: 'question', ref: '1', marks: 2 }];
  const rows = [{ rank: 1, username: 'ann', marks: 2, cells: [{ idx: 0, marks: 2 }], correct: 1, wrong: 0, skipped: 0, solved: 0, penalty: 0, startedAt: T0, finishedAt: T0 + 60000, timeUsedMs: 60000 }];
  const csv = C.toCsv(items, rows, { ann: '@Ann' }, ['What is 1+1']);
  assert.ok(csv.startsWith('﻿Rank,Username,Name,Marks,Max marks,Q1 What is 1+1,'));
  assert.ok(csv.includes(`1,ann,"'@Ann",2,2,2,1,0,0,0,0,`));
});
