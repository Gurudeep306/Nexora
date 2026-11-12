// GATE learning platform (src/routes/gate-me.js, contract: client/src/gate/api.ts):
// server-side grading, spaced repetition, per-user progress and isolation,
// tests (no answer leak before submit), daily challenge, leaderboard, stats.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gradeQuestion } = require('../src/gate/grade');
const { nextReview, isoDay, addDays } = require('../src/gate/attempts');
const { loadGateBank } = require('../src/routes/gate');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-gate-'));
const DB = path.join(tmp, 'test.db');
let proc, base;
let serverLog = '';

async function waitFor(url) {
  for (let i = 0; i < 160; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (proc && proc.exitCode !== null) throw new Error(`server exited early (${proc.exitCode}): ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 40s: ${serverLog}`);
}
const call = async (method, p, cookie, body) => {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
async function signup(name) {
  const r = await fetch(`${base}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, email: `${name}@t.io`, password: 'secret123' }),
  });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}

const bank = loadGateBank();
const answerable = (q) => q.type !== 'DESC' && q.answer !== null && q.answer !== undefined;
const MCQ = bank.questions.find((q) => q.type === 'MCQ' && q.marks === 2 && /^[A-D]$/.test(q.answer));
const MCQ2 = bank.questions.find((q) => q.type === 'MCQ' && q.marks === 1 && /^[A-D]$/.test(q.answer));
const NAT = bank.questions.find((q) => q.type === 'NAT' && /^\s*[\d.]+\s*:\s*[\d.]+\s*$/.test(q.answer));
const wrongLetter = (a) => (a === 'A' ? 'B' : 'A');
// A paper whose answerable questions fit in one test (for the percentile check).
const smallPaper = (() => {
  const counts = new Map();
  const mcqs = new Map();
  for (const q of bank.questions) {
    if (!q.paper || !answerable(q)) continue;
    counts.set(q.paper, (counts.get(q.paper) || 0) + 1);
    if (q.type === 'MCQ' && /^[A-D]$/.test(q.answer)) mcqs.set(q.paper, (mcqs.get(q.paper) || 0) + 1);
  }
  return [...counts.entries()].find(([p, n]) => n >= 10 && n <= 60 && mcqs.get(p) >= 5)[0];
})();

const stamp = Date.now().toString(36);
let alice, bob;

test.before(async () => {
  const port = 25000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: DB, DISABLE_PUPPETEER: '1', DISABLE_SCRAPER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { serverLog += d; });
  proc.stderr.on('data', (d) => { serverLog += d; });
  await waitFor(`${base}/api/health`);
  alice = await signup(`ga${stamp}`);
  bob = await signup(`gb${stamp}`);
});
test.after(async () => {
  if (!proc) return;
  const done = new Promise((r) => proc.once('exit', r));
  proc.kill('SIGKILL');
  await done;
});

/* ── Pure grading / SRS ── */
test('grader: MCQ negative marks, MSQ sets, NAT ranges and " or " alternatives', () => {
  const mcq = { type: 'MCQ', marks: 2, answer: 'C', options: [{}, {}, {}, {}] };
  assert.deepEqual(gradeQuestion(mcq, 'c'), { attempted: true, correct: true, marks: 2, max: 2 });
  assert.equal(gradeQuestion(mcq, 'A').marks, -2 / 3);
  assert.equal(gradeQuestion({ ...mcq, marks: 1 }, 'A').marks, -1 / 3);
  assert.equal(gradeQuestion(mcq, null).attempted, false);
  assert.equal(gradeQuestion(mcq, []).attempted, false);
  assert.equal(gradeQuestion({ ...mcq, answer: 'A or B' }, 'B').correct, true);

  const msq = { type: 'MSQ', marks: 2, answer: 'A;C;D or C;D' };
  assert.equal(gradeQuestion(msq, ['D', 'C']).correct, true);
  assert.equal(gradeQuestion(msq, ['D', 'A', 'C']).correct, true);
  const msqWrong = gradeQuestion(msq, ['A']);
  assert.equal(msqWrong.correct, false);
  assert.equal(msqWrong.marks, 0, 'MSQ has no negative marks');
  assert.equal(gradeQuestion({ type: 'MSQ', marks: 1, answer: ['B'] }, ['b']).correct, true);

  const nat = { type: 'NAT', marks: 1, answer: '2 to 2 OR 4 to 4' };
  assert.equal(gradeQuestion(nat, 4).correct, true);
  assert.equal(gradeQuestion(nat, '2').correct, true);
  assert.equal(gradeQuestion(nat, 3).marks, 0);
  assert.equal(gradeQuestion({ type: 'NAT', marks: 2, answer: '28:30' }, 29.5).correct, true);
  assert.equal(gradeQuestion({ type: 'NAT', marks: 2, answer: '0.5' }, 0.53).correct, true);
  assert.equal(gradeQuestion({ type: 'NAT', marks: 2, answer: '0.5' }, 0.6).correct, false);
  assert.equal(gradeQuestion({ type: 'NAT', marks: 2, answer: '0.5' }, 'abc').correct, false);
});

test('SRS: wrong → tomorrow with lower ease; correct → 1, 3, interval × ease; confidence adjusts ease', () => {
  const today = '2026-01-10';
  const w = nextReview(null, 'wrong', undefined, today);
  assert.deepEqual(w, { ease: 2.3, interval_days: 1, due: '2026-01-11', srs_streak: 0 });
  assert.equal(nextReview({ ease: 1.35 }, 'revealed', undefined, today).ease, 1.3);
  const c1 = nextReview(null, 'correct', 2, today);
  assert.equal(c1.interval_days, 1);
  const c2 = nextReview(c1, 'correct', 2, today);
  assert.equal(c2.interval_days, 3);
  const c3 = nextReview(c2, 'correct', 2, today);
  assert.equal(c3.interval_days, Math.round(3 * 2.5));
  assert.equal(c3.due, addDays(today, c3.interval_days));
  assert.equal(nextReview(null, 'correct', 1, today).ease, 2.35);
  assert.equal(nextReview(null, 'correct', 3, today).ease, 2.6);
});

/* ── HTTP ── */
test('per-user routes require sign-in; errors use { ok:false, error }', async () => {
  for (const [m, p] of [['GET', '/api/gate/me/summary'], ['POST', '/api/gate/attempts'], ['GET', '/api/gate/me/tests'], ['PUT', '/api/gate/me/plan']]) {
    const r = await call(m, p, null, m === 'GET' ? undefined : {});
    assert.equal(r.status, 401, `${m} ${p}`);
    assert.equal(r.body.ok, false);
  }
  const bad = await call('POST', '/api/gate/attempts', alice, { questionId: 'nope', response: 'A', timeMs: 1, mode: 'practice' });
  assert.equal(bad.status, 404);
  assert.equal(bad.body.ok, false);
  assert.equal(typeof bad.body.error, 'string');
});

test('attempts are graded on the server and schedule reviews', async () => {
  const wrong = await call('POST', '/api/gate/attempts', alice, {
    questionId: MCQ.id, response: wrongLetter(MCQ.answer), timeMs: 30000, mode: 'practice',
  });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.outcome, 'wrong');
  assert.equal(wrong.body.marks, -0.67);
  assert.equal(wrong.body.review.due, addDays(isoDay(), 1));
  assert.equal(wrong.body.review.ease, 2.3);

  const right = await call('POST', '/api/gate/attempts', alice, {
    questionId: MCQ2.id, response: MCQ2.answer, timeMs: 20000, mode: 'practice', confidence: 3,
  });
  assert.equal(right.body.outcome, 'correct');
  assert.equal(right.body.marks, 1);
  assert.equal(right.body.review.intervalDays, 1);
  assert.equal(right.body.review.ease, 2.6);

  const nat = await call('POST', '/api/gate/attempts', alice, {
    questionId: NAT.id, response: Number(NAT.answer.split(':')[0]), timeMs: 10000, mode: 'daily',
  });
  assert.equal(nat.body.outcome, 'correct');

  const skipped = await call('POST', '/api/gate/attempts', alice, { questionId: NAT.id, response: null, timeMs: 1, mode: 'practice' });
  assert.equal(skipped.body.outcome, 'skipped');

  const revealed = await call('POST', '/api/gate/attempts', bob, { questionId: MCQ2.id, response: null, revealed: true, timeMs: 5, mode: 'practice' });
  assert.equal(revealed.body.outcome, 'revealed');
  assert.equal(revealed.body.marks, 0);
  assert.equal(revealed.body.review.due, addDays(isoDay(), 1));

  const badMode = await call('POST', '/api/gate/attempts', alice, { questionId: MCQ.id, response: 'A', timeMs: 1, mode: 'hack' });
  assert.equal(badMode.status, 400);
});

test('summary aggregates the user’s attempts', async () => {
  const { body } = await call('GET', '/api/gate/me/summary', alice);
  assert.equal(body.ok, true);
  const s = body.summary;
  assert.equal(s.totals.attempted, 3);
  assert.equal(s.totals.correct, 2);
  assert.equal(s.totals.accuracy, 66.7);
  assert.equal(s.totals.questionsInBank, bank.questions.length);
  assert.equal(s.totals.avgTimeMs, 20000);
  assert.equal(s.streak.current, 1);
  assert.equal(s.streak.todayDone, true);
  assert.equal(s.activity[isoDay()], 3);
  assert.ok(s.bySubject.length >= 1);
  const lost = s.bySubject.reduce((a, x) => a + x.marksLost, 0);
  assert.equal(Math.round(lost * 100) / 100, 0.67);
  assert.ok(s.byType.some((t) => t.type === 'NAT'));
  assert.ok(Array.isArray(s.byYear) && Array.isArray(s.weakTopics) && Array.isArray(s.byTopic));
  assert.equal(s.recent.length, 3);
  assert.equal(s.recent[0].questionId, NAT.id);
  assert.equal(s.recent[0].mode, 'daily');
});

test('progress + idempotent import of localStorage progress', async () => {
  const p = await call('GET', `/api/gate/me/progress?ids=${encodeURIComponent([MCQ.id, MCQ2.id].join(','))}`, alice);
  assert.equal(p.body.progress[MCQ.id].outcome, 'wrong');
  assert.equal(p.body.progress[MCQ.id].attempts, 1);
  assert.equal(p.body.progress[MCQ2.id].correct, 1);
  assert.ok(p.body.progress[MCQ.id].review.due);

  const other = bank.questions.filter(answerable).find((q) => ![MCQ.id, MCQ2.id, NAT.id].includes(q.id));
  const payload = { progress: { [other.id]: { outcome: 'correct', bookmarked: true, at: Date.now() - 1000 }, [MCQ.id]: { outcome: 'correct' }, bogus: { outcome: 'correct' } } };
  const i1 = await call('POST', '/api/gate/me/import', alice, payload);
  assert.equal(i1.body.imported, 2);
  await call('POST', '/api/gate/me/import', alice, payload);
  const all = (await call('GET', '/api/gate/me/progress', alice)).body.progress;
  assert.equal(all[other.id].attempts, 1, 'import is idempotent');
  assert.equal(all[other.id].bookmarked, true);
  assert.equal(all[MCQ.id].outcome, 'wrong', 'import never overwrites server history');
  assert.equal(all[MCQ.id].attempts, 1);
  assert.equal(all.bogus, undefined);
});

test('bookmarks, collections and notes are private to each user', async () => {
  const c = await call('POST', '/api/gate/me/collections', alice, { name: 'Tricky', color: '#f80' });
  assert.equal(c.body.collection.name, 'Tricky');
  const cid = c.body.collection.id;
  assert.equal((await call('POST', '/api/gate/me/collections', alice, { name: 'x'.repeat(41) })).status, 400);

  assert.equal((await call('PUT', `/api/gate/me/bookmarks/${MCQ.id}`, alice, { on: true, collections: [cid] })).status, 200);
  // Bob cannot file questions into Alice's collection or delete it.
  assert.equal((await call('PUT', `/api/gate/me/bookmarks/${MCQ.id}`, bob, { on: true, collections: [cid] })).status, 404);
  assert.equal((await call('DELETE', `/api/gate/me/collections/${cid}`, bob)).status, 404);

  const ac = (await call('GET', '/api/gate/me/collections', alice)).body.collections;
  assert.deepEqual(ac, [{ id: cid, name: 'Tricky', color: '#f80', count: 1 }]);
  assert.deepEqual((await call('GET', '/api/gate/me/collections', bob)).body.collections, []);

  const n = await call('PUT', `/api/gate/me/notes/${MCQ.id}`, alice, { text: '**remember** the base case' });
  assert.equal(n.body.note.text, '**remember** the base case');
  assert.equal((await call('PUT', `/api/gate/me/notes/${MCQ.id}`, alice, { text: 'x'.repeat(10001) })).status, 413);
  assert.equal((await call('GET', `/api/gate/me/notes/${MCQ.id}`, bob)).body.note, null);
  assert.equal((await call('GET', '/api/gate/me/notes', bob)).body.notes.length, 0);
  assert.equal((await call('GET', '/api/gate/me/notes', alice)).body.notes.length, 1);

  const ap = (await call('GET', `/api/gate/me/progress?ids=${MCQ.id}`, alice)).body.progress[MCQ.id];
  assert.equal(ap.bookmarked, true);
  assert.deepEqual(ap.collections, [cid]);
  assert.equal(ap.hasNote, true);
  const bp = (await call('GET', `/api/gate/me/progress?ids=${MCQ.id}`, bob)).body.progress;
  assert.equal(bp[MCQ.id], undefined);

  assert.equal((await call('DELETE', `/api/gate/me/collections/${cid}`, alice)).status, 200);
  const after = (await call('GET', `/api/gate/me/progress?ids=${MCQ.id}`, alice)).body.progress[MCQ.id];
  assert.equal(after.collections, undefined);
  assert.equal(after.bookmarked, true);
  await call('PUT', `/api/gate/me/bookmarks/${MCQ.id}`, alice, { on: false });
  assert.equal((await call('GET', `/api/gate/me/progress?ids=${MCQ.id}`, alice)).body.progress[MCQ.id].bookmarked, undefined);
});

test('review queue: due now, count and the next 14 days', async () => {
  const before = (await call('GET', '/api/gate/me/review', alice)).body;
  assert.equal(before.dueCount, 0);
  assert.equal(Object.keys(before.upcoming).length, 14);
  assert.ok(before.upcoming[addDays(isoDay(), 1)] >= 2);
  // Make the wrong MCQ due yesterday.
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { timeout: 10000 }); // wait for the server's write lock instead of failing
  db.prepare('UPDATE gate_qstate SET due=? WHERE question_id=?').run(addDays(isoDay(), -1), MCQ.id);
  db.close();
  const after = (await call('GET', '/api/gate/me/review?limit=5', alice)).body;
  assert.equal(after.dueCount, 1);
  assert.deepEqual(after.due, [MCQ.id]);
  assert.equal((await call('GET', '/api/gate/me/review', bob)).body.due.includes(MCQ.id), false);
});

test('tests: create → fetch without answers → submit → result and percentile', async () => {
  const bad = await call('POST', '/api/gate/tests', alice, { count: 10, durationMin: 30, exam: 'XYZ' });
  assert.equal(bad.status, 400);

  const cfg = { title: 'Small paper', papers: [smallPaper], count: 100, durationMin: 500, negativeMarking: true };
  const created = await call('POST', '/api/gate/tests', alice, cfg);
  assert.equal(created.status, 200);
  const t = created.body.test;
  assert.equal(t.config.durationMin, 240, 'duration is clamped');
  assert.ok(t.questionIds.every((id) => bank.byId.get(id).paper === smallPaper));
  assert.equal(t.questionIds.length, bank.questions.filter((q) => q.paper === smallPaper && answerable(q)).length);

  const fetched = await call('GET', `/api/gate/tests/${t.id}`, alice);
  const raw = JSON.stringify(fetched.body);
  assert.ok(!/"answer"|"solution"/.test(raw), 'no answers before submit');
  assert.equal(fetched.body.test.result, undefined);
  assert.equal((await call('GET', `/api/gate/tests/${t.id}`, bob)).status, 404, 'owner only');

  // Bob takes the same question set first and scores 0.
  const bt = (await call('POST', '/api/gate/tests', bob, cfg)).body.test;
  const bres = await call('POST', `/api/gate/tests/${bt.id}/submit`, bob, { responses: {}, timeMs: {} });
  assert.equal(bres.body.result.score, 0);
  assert.equal(bres.body.result.percentile, null);

  // Alice answers everything correctly.
  const responses = {};
  for (const id of t.questionIds) {
    const q = bank.byId.get(id);
    if (q.type === 'MCQ' && /^[A-D]$/.test(q.answer)) responses[id] = q.answer;
  }
  const first = Object.keys(responses)[0];
  const sub = await call('POST', `/api/gate/tests/${t.id}/submit`, alice, { responses, timeMs: { [first]: 4000 } });
  assert.equal(sub.status, 200);
  const r = sub.body.result;
  assert.equal(r.correct, Object.keys(responses).length);
  assert.equal(r.wrong, 0);
  assert.equal(r.skipped, t.questionIds.length - r.correct);
  assert.ok(r.score > 0 && r.score <= r.maxScore);
  assert.equal(r.items.length, t.questionIds.length);
  assert.equal(r.timeMs, 4000);
  assert.equal(r.percentile, 100);
  assert.ok(r.bySubject.length >= 1);
  assert.equal((await call('POST', `/api/gate/tests/${t.id}/submit`, alice, { responses, timeMs: {} })).status, 409);

  const mine = (await call('GET', '/api/gate/me/tests', alice)).body.tests;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].result.score, r.score);
  assert.equal((await call('GET', '/api/gate/me/tests', bob)).body.tests.length, 1);
});

test('test filters, focus and limits', async () => {
  const subj = MCQ.subject;
  const t = (await call('POST', '/api/gate/tests', bob, { subjects: [subj], types: ['MCQ'], exam: 'CSE', count: 2, durationMin: 1, focus: 'unseen', difficulty: [1, 5] })).body.test;
  assert.equal(t.questionIds.length, 5, 'count is clamped to ≥ 5');
  assert.equal(t.config.durationMin, 5);
  for (const id of t.questionIds) {
    const q = bank.byId.get(id);
    assert.equal(q.subject, subj);
    assert.equal(q.type, 'MCQ');
  }
  const none = await call('POST', '/api/gate/tests', bob, { years: [1980], count: 5, durationMin: 10 });
  assert.equal(none.status, 400);
  // Mistakes focus puts the wrongly answered question first in line.
  await call('POST', '/api/gate/attempts', alice, { questionId: MCQ.id, response: wrongLetter(MCQ.answer), timeMs: 1000, mode: 'review' });
  const m = (await call('POST', '/api/gate/tests', alice, { subjects: [MCQ.subject], focus: 'mistakes', count: 5, durationMin: 10 })).body.test;
  assert.ok(m.questionIds.includes(MCQ.id));
});

test('daily challenge is deterministic and reports solvedToday when signed in', async () => {
  const a = (await call('GET', '/api/gate/daily')).body;
  const b = (await call('GET', '/api/gate/daily')).body;
  assert.equal(a.date, isoDay());
  assert.equal(a.questionId, b.questionId);
  assert.equal(a.solvedToday, undefined);
  assert.notEqual(bank.byId.get(a.questionId).type, 'DESC');
  assert.equal((await call('GET', '/api/gate/daily', bob)).body.solvedToday, false);
});

test('leaderboard ranks by positive marks in the period', async () => {
  await call('POST', '/api/gate/attempts', bob, { questionId: MCQ.id, response: wrongLetter(MCQ.answer), timeMs: 1000, mode: 'practice' });
  const lb = (await call('GET', '/api/gate/leaderboard?period=week', bob)).body;
  assert.equal(lb.ok, true);
  assert.equal(lb.rows[0].username, `ga${stamp}`);
  assert.equal(lb.rows[0].rank, 1);
  assert.ok(lb.rows[0].score > 0);
  assert.ok(lb.me && lb.me.username === `gb${stamp}`);
  assert.equal((await call('GET', '/api/gate/leaderboard?period=all')).body.me, undefined);
});

test('question stats, similar questions, trends and plan', async () => {
  const st = (await call('GET', `/api/gate/questions/${MCQ2.id}/stats`)).body.stats;
  assert.equal(st.attempts, 1);
  assert.equal(st.users, 1);
  assert.equal(st.accuracy, 100);
  assert.equal(st.difficulty, null);
  assert.equal(st.optionShare[MCQ2.answer], 100);
  assert.equal((await call('GET', '/api/gate/questions/nope/stats')).status, 404);

  const sim = (await call('GET', `/api/gate/questions/${MCQ.id}/similar`)).body.ids;
  assert.ok(sim.length > 0 && sim.length <= 6);
  assert.ok(!sim.includes(MCQ.id));
  assert.equal(bank.byId.get(sim[0]).topic, MCQ.topic);

  const tr = (await call('GET', '/api/gate/trends?exam=CSE')).body.trends;
  assert.ok(tr.years.length > 5);
  assert.ok(Object.keys(tr.marksBySubjectYear).length > 3);

  assert.equal((await call('GET', '/api/gate/me/plan', alice)).body.plan, null);
  const plan = { examDate: '2027-02-01', hoursPerDay: 3, priorities: { algo: 3, cn: 1 }, days: [1, 3, 5] };
  assert.deepEqual((await call('PUT', '/api/gate/me/plan', alice, plan)).body.plan, plan);
  assert.deepEqual((await call('GET', '/api/gate/me/plan', alice)).body.plan, plan);
  assert.equal((await call('GET', '/api/gate/me/plan', bob)).body.plan, null);
  assert.equal((await call('PUT', '/api/gate/me/plan', alice, { ...plan, days: [9] })).status, 400);
});
