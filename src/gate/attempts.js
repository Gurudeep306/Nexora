/*
 * Recording GATE attempts — shared by practice (POST /api/gate/attempts),
 * custom tests (POST /api/gate/tests/:id/submit) and the CBT mock
 * (POST /api/gate/evaluate).
 *
 * One read (the current spaced-repetition state of the questions involved)
 * and one batched write: the attempt rows, the per-question rollup
 * (gate_qstate) and the day's activity (daily_activity.gate_attempts, which
 * counts toward the streak but never awards problem XP).
 */
const { all, runBatch } = require("../db");

const DAY_MS = 86400000;
const MAX_RESPONSE_CHARS = 2000;

const isoDay = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const addDays = (day, n) => isoDay(Date.parse(`${day}T00:00:00Z`) + Math.round(n) * DAY_MS);

const EASE_MIN = 1.3;
const EASE_MAX = 3.0;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * SM-2 lite. Wrong (or revealed) → due tomorrow, ease −0.2 (min 1.3), streak
 * reset. Correct → interval 1 → 3 → interval × ease; confidence 1 lowers the
 * ease by 0.15, 3 raises it by 0.1 (2 or none leaves it).
 */
function nextReview(prev, outcome, confidence, today = isoDay()) {
  let ease = prev && Number.isFinite(prev.ease) && prev.ease > 0 ? prev.ease : 2.5;
  let interval = prev && Number(prev.interval_days) > 0 ? Number(prev.interval_days) : 0;
  let streak = prev ? Number(prev.srs_streak) || 0 : 0;
  if (outcome === "correct") {
    if (confidence === 1) ease -= 0.15;
    else if (confidence === 3) ease += 0.1;
    ease = Math.min(EASE_MAX, Math.max(EASE_MIN, ease));
    streak += 1;
    interval = streak === 1 ? 1 : streak === 2 ? 3 : Math.max(1, Math.round(interval * ease));
  } else {
    ease = Math.max(EASE_MIN, ease - 0.2);
    streak = 0;
    interval = 1;
  }
  ease = round2(ease);
  return { ease, interval_days: interval, due: addDays(today, interval), srs_streak: streak };
}

const reviewState = (s) =>
  s
    ? { due: s.due || null, intervalDays: Number(s.interval_days) || 0, ease: Number(s.ease) || 2.5, streak: Number(s.srs_streak) || 0 }
    : { due: null, intervalDays: 0, ease: 2.5, streak: 0 };

function responseJson(response) {
  if (response === undefined) return null;
  const s = JSON.stringify(response);
  return s && s.length <= MAX_RESPONSE_CHARS ? s : null;
}

/**
 * @param {string} username   the session user
 * @param {Array<{ q, response, grade?, revealed?, timeMs?, mode, testId?, confidence? }>} entries
 *   `grade` comes from gateQuestion() (src/gate/grade.js); entries with
 *   neither an answer nor `revealed` must be filtered out by the caller.
 * @param {{ negativeMarking?: boolean }} [opts]
 * @returns {Promise<Array<{ outcome, marks, review }>>}
 */
async function recordAttempts(username, entries, opts = {}) {
  if (!username) throw new Error("recordAttempts needs a username");
  if (!entries.length) return [];
  const now = Date.now();
  const today = isoDay(now);
  const ids = [...new Set(entries.map((e) => e.q.id))];

  const prevRows = await all(
    `SELECT question_id, outcome, ease, interval_days, srs_streak FROM gate_qstate
     WHERE username=? AND question_id IN (${ids.map(() => "?").join(",")})`,
    [username, ...ids],
  );
  const state = new Map(prevRows.map((r) => [r.question_id, r]));
  const delta = new Map(); // question_id → { attempts, correct }

  const attemptRows = [];
  const results = entries.map((e) => {
    const revealed = !!e.revealed && !(e.grade && e.grade.attempted);
    const outcome = revealed ? "revealed" : e.grade.correct ? "correct" : "wrong";
    let marks = revealed ? 0 : e.grade.marks;
    if (opts.negativeMarking === false && marks < 0) marks = 0;
    marks = round2(marks);
    const prev = state.get(e.q.id);
    const sched = nextReview(prev, outcome, e.confidence, today);
    // A "show answer" never hides an earlier real result.
    const shownOutcome = outcome === "revealed" && prev && prev.outcome ? prev.outcome : outcome;
    state.set(e.q.id, { ...(prev || {}), question_id: e.q.id, outcome: shownOutcome, ...sched });
    const d = delta.get(e.q.id) || { attempts: 0, correct: 0 };
    if (!revealed) d.attempts += 1;
    if (outcome === "correct") d.correct += 1;
    delta.set(e.q.id, d);
    const timeMs = Math.max(0, Math.min(Math.round(Number(e.timeMs) || 0), 3 * 3600 * 1000));
    attemptRows.push([
      username, e.q.id, e.q.paper || null, e.q.exam || null, Number(e.q.year) || null,
      e.q.subject || null, e.q.topic || null, e.q.type || null,
      responseJson(revealed ? null : e.response), outcome, marks, timeMs, e.mode, e.testId || null, now,
    ]);
    return { outcome, marks, review: reviewState(sched) };
  });

  const stmts = [];
  for (let i = 0; i < attemptRows.length; i += 60) {
    const chunk = attemptRows.slice(i, i + 60);
    stmts.push([
      `INSERT INTO gate_attempts(username, question_id, paper, exam, year, subject, topic, type, response, outcome, marks, time_ms, mode, test_id, created_at)
       VALUES ${chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}`,
      chunk.flat(),
    ]);
  }
  const qRows = ids.map((id) => {
    const s = state.get(id);
    const d = delta.get(id);
    return [username, id, s.outcome, d.attempts, d.correct, now, s.ease, s.interval_days, s.due, s.srs_streak];
  });
  for (let i = 0; i < qRows.length; i += 60) {
    const chunk = qRows.slice(i, i + 60);
    stmts.push([
      `INSERT INTO gate_qstate(username, question_id, outcome, attempts, correct, last_at, ease, interval_days, due, srs_streak)
       VALUES ${chunk.map(() => "(?,?,?,?,?,?,?,?,?,?)").join(",")}
       ON CONFLICT(username, question_id) DO UPDATE SET
         outcome=excluded.outcome,
         attempts=gate_qstate.attempts + excluded.attempts,
         correct=gate_qstate.correct + excluded.correct,
         last_at=excluded.last_at,
         ease=excluded.ease,
         interval_days=excluded.interval_days,
         due=excluded.due,
         srs_streak=excluded.srs_streak`,
      chunk.flat(),
    ]);
  }
  stmts.push([
    `INSERT INTO daily_activity(username, date, gate_attempts) VALUES(?,?,?)
     ON CONFLICT(username, date) DO UPDATE SET gate_attempts=COALESCE(daily_activity.gate_attempts,0)+excluded.gate_attempts`,
    [username, today, entries.length],
  ]);
  await runBatch(stmts);
  return results;
}

module.exports = { recordAttempts, nextReview, reviewState, isoDay, addDays, DAY_MS };
