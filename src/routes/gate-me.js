const express = require("express");
const crypto = require("crypto");
const { get, all, run, runBatch } = require("../db");
const { me } = require("../context");
const { requireAuthenticatedUser } = require("../middleware/auth");
const { loadGateBank } = require("./gate");
const { gradeQuestion, isAnswered, questionMarks } = require("../gate/grade");
const { recordAttempts, reviewState, isoDay, addDays, DAY_MS } = require("../gate/attempts");
const { sharedCache } = require("../shared-cache");

// Leaderboard rows per period (all ranked users), shared by every visitor.
const gateBoardCache = sharedCache({ name: "gate-leaderboard", ttlMs: 10 * 60 * 1000, minAgeMs: 5 * 60 * 1000, tables: ["gate_attempts", "users"] });

/*
 * GATE learning platform — the server half of client/src/gate/api.ts.
 *
 * Per-user routes (/api/gate/attempts, /api/gate/me/*, /api/gate/tests*)
 * require a signed-in user and only ever read/write that user's rows (the
 * username comes from the session, never from the request). Public routes:
 * question stats / similar, daily, leaderboard, trends.
 *
 * Accuracy values are percentages 0–100 (one decimal), as in /evaluate.
 * Dates (activity, review due) are UTC YYYY-MM-DD, like daily_activity.
 */

const OUTCOMES_ANSWERED = "('correct','wrong','partial')";
const MODES = new Set(["practice", "test", "review", "daily", "cbt"]);
const STATS_TTL_MS = 5 * 60 * 1000;

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const pct = (num, den) => (den > 0 ? round1((num / den) * 100) : 0);
const fail = (res, status, error) => res.status(status).json({ ok: false, error });
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[gate-me] ${req.method} ${req.path}: ${err.message}`);
    if (!res.headersSent) fail(res, 500, "Something went wrong");
  });
const placeholders = (n) => Array(n).fill("?").join(",");
const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const cleanId = (v) => (typeof v === "string" && v.length > 0 && v.length <= 80 ? v : null);
const parseJson = (s, fallback) => {
  try {
    return s == null ? fallback : JSON.parse(s);
  } catch {
    return fallback;
  }
};

/* Response shapes accepted for one question: letter(s), number or short text. */
function validResponse(r) {
  if (r === null || r === undefined) return true;
  if (typeof r === "number") return Number.isFinite(r);
  if (typeof r === "string") return r.length <= 500;
  if (Array.isArray(r)) return r.length <= 10 && r.every((x) => typeof x === "string" && x.length <= 20);
  return false;
}

/* Small per-user fixed-window limiter (keyed by the session username). */
function userLimiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.sessionUser.username;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      h = { start: now, n: 0 };
      hits.set(key, h);
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    }
    if (++h.n > max) return fail(res, 429, "Too many requests — please slow down.");
    next();
  };
}

/* ── Derived views of the bank (rebuilt when questions.json changes) ── */
const derived = new WeakMap();
function bankViews() {
  const b = loadGateBank();
  let d = derived.get(b);
  if (d) return d;
  const paperIds = new Map();
  for (const q of b.questions) {
    if (!q.paper) continue;
    if (!paperIds.has(q.paper)) paperIds.set(q.paper, []);
    paperIds.get(q.paper).push(q.id);
  }
  // Daily challenge: answerable (non-descriptive) questions in a stable order.
  const dailyPool = b.questions
    .filter((q) => q.type !== "DESC" && q.answer !== null && q.answer !== undefined)
    .map((q) => q.id)
    .sort();
  d = { bank: b, paperIds, dailyPool, trends: new Map(), similar: new Map() };
  derived.set(b, d);
  return d;
}

/* ── Community stats ── */
function difficultyOf(n, correct, avgTimeMs, marks) {
  if (n < 5) return null;
  const acc = correct / n;
  let d = acc >= 0.85 ? 1 : acc >= 0.7 ? 2 : acc >= 0.5 ? 3 : acc >= 0.3 ? 4 : 5;
  const expected = (marks || 1) * 90 * 1000; // ~1.5 min per mark
  if (avgTimeMs > expected * 1.5) d += 1;
  else if (avgTimeMs < expected * 0.5) d -= 1;
  return Math.min(5, Math.max(1, d));
}

const statsCache = new Map(); // question id → { at, stats }
async function questionStats(q) {
  const hit = statsCache.get(q.id);
  if (hit && Date.now() - hit.at < STATS_TTL_MS) return hit.stats;
  const [agg, byResp] = await Promise.all([
    get(
      `SELECT COUNT(*) AS n, COUNT(DISTINCT username) AS users, SUM(outcome='correct') AS c, AVG(time_ms) AS t
       FROM gate_attempts WHERE question_id=? AND outcome IN ${OUTCOMES_ANSWERED}`,
      [q.id],
    ),
    q.type === "MCQ" || q.type === "MSQ"
      ? all(
          `SELECT response, COUNT(*) AS n FROM gate_attempts
           WHERE question_id=? AND outcome IN ${OUTCOMES_ANSWERED} GROUP BY response`,
          [q.id],
        )
      : Promise.resolve([]),
  ]);
  const n = Number(agg?.n) || 0;
  const optionShare = {};
  for (const r of byResp) {
    const v = parseJson(r.response, null);
    for (const letter of Array.isArray(v) ? v : [v]) {
      if (typeof letter !== "string" || !letter.trim()) continue;
      const k = letter.trim().toUpperCase();
      optionShare[k] = (optionShare[k] || 0) + Number(r.n);
    }
  }
  for (const k of Object.keys(optionShare)) optionShare[k] = pct(optionShare[k], n);
  const avg = n ? Math.round(Number(agg.t) || 0) : null;
  const stats = {
    attempts: n,
    users: Number(agg?.users) || 0,
    accuracy: n ? pct(Number(agg.c) || 0, n) : null,
    avgTimeMs: avg,
    optionShare,
    difficulty: difficultyOf(n, Number(agg?.c) || 0, avg || 0, q.marks),
  };
  if (statsCache.size > 5000) statsCache.clear();
  statsCache.set(q.id, { at: Date.now(), stats });
  return stats;
}

/* Difficulty of every question with ≥ 5 attempts (for test filters), cached.
 * It aggregates all of gate_attempts and moves slowly, so an hour. */
const DIFF_TTL_MS = 60 * 60 * 1000;
let diffCache = { at: 0, map: new Map() };
async function difficultyMap() {
  if (Date.now() - diffCache.at < DIFF_TTL_MS) return diffCache.map;
  const rows = await all(
    `SELECT question_id, COUNT(*) AS n, SUM(outcome='correct') AS c, AVG(time_ms) AS t
     FROM gate_attempts WHERE outcome IN ${OUTCOMES_ANSWERED}
     GROUP BY question_id HAVING COUNT(*) >= 5`,
  );
  const { bank } = bankViews();
  const map = new Map();
  for (const r of rows) {
    const q = bank.byId.get(r.question_id);
    map.set(r.question_id, difficultyOf(Number(r.n), Number(r.c) || 0, Number(r.t) || 0, q?.marks));
  }
  diffCache = { at: Date.now(), map };
  return map;
}

function similarIds(q) {
  const v = bankViews();
  if (v.similar.has(q.id)) return v.similar.get(q.id);
  const tags = new Set(q.tags || []);
  const scored = [];
  for (const x of v.bank.questions) {
    if (x.id === q.id || (q.group && x.group === q.group)) continue;
    const sameTopic = x.subject === q.subject && !!q.topic && x.topic === q.topic;
    let overlap = 0;
    for (const t of x.tags || []) if (tags.has(t)) overlap++;
    if (!sameTopic && !overlap) continue;
    const score = (sameTopic ? 100 : 0) + overlap * 10 + (x.exam === q.exam ? 5 : 0) + (x.subject === q.subject ? 1 : 0);
    scored.push([score, x]);
  }
  scored.sort((a, b) => b[0] - a[0] || (b[1].year || 0) - (a[1].year || 0) || (a[1].id < b[1].id ? -1 : 1));
  const ids = scored.slice(0, 6).map(([, x]) => x.id);
  if (v.similar.size > 5000) v.similar.clear();
  v.similar.set(q.id, ids);
  return ids;
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function dailyQuestionId(date) {
  const { dailyPool } = bankViews();
  if (!dailyPool.length) return null;
  return dailyPool[fnv1a(`gate-daily:${date}`) % dailyPool.length];
}

function trendsFor(exam) {
  const v = bankViews();
  if (v.trends.has(exam)) return v.trends.get(exam);
  const perPaper = new Map(); // paper → subject → marks
  const paperYear = new Map();
  const topicCounts = {};
  for (const q of v.bank.questions) {
    if ((q.exam === "DA" ? "DA" : "CSE") !== exam || !q.subject) continue;
    if (q.paper && q.year) {
      paperYear.set(q.paper, q.year);
      if (!perPaper.has(q.paper)) perPaper.set(q.paper, {});
      const m = perPaper.get(q.paper);
      m[q.subject] = (m[q.subject] || 0) + questionMarks(q);
    }
    if (q.topic) {
      topicCounts[q.subject] = topicCounts[q.subject] || {};
      topicCounts[q.subject][q.topic] = (topicCounts[q.subject][q.topic] || 0) + 1;
    }
  }
  const papersPerYear = {};
  for (const y of paperYear.values()) papersPerYear[y] = (papersPerYear[y] || 0) + 1;
  const marksBySubjectYear = {};
  for (const [paper, subj] of perPaper) {
    const y = paperYear.get(paper);
    for (const [s, m] of Object.entries(subj)) {
      marksBySubjectYear[s] = marksBySubjectYear[s] || {};
      marksBySubjectYear[s][y] = (marksBySubjectYear[s][y] || 0) + m / papersPerYear[y];
    }
  }
  for (const s of Object.keys(marksBySubjectYear)) {
    for (const y of Object.keys(marksBySubjectYear[s])) marksBySubjectYear[s][y] = round2(marksBySubjectYear[s][y]);
  }
  const trends = {
    marksBySubjectYear,
    topicCounts,
    years: Object.keys(papersPerYear).map(Number).sort((a, b) => a - b),
  };
  v.trends.set(exam, trends);
  return trends;
}

/* ── Streaks from activity days (UTC, newest first) ── */
function streakFromDays(days, today) {
  const sorted = [...days].sort().reverse();
  const yesterday = addDays(today, -1);
  let current = 0;
  if (sorted.length && (sorted[0] === today || sorted[0] === yesterday)) {
    current = 1;
    for (let i = 1; i < sorted.length && addDays(sorted[i - 1], -1) === sorted[i]; i++) current++;
  }
  let best = sorted.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = addDays(sorted[i - 1], -1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return { current, best: Math.max(best, current), todayDone: sorted[0] === today };
}

/* ── Stat rows ── */
const emptyAgg = () => ({ n: 0, c: 0, t: 0, g: 0, l: 0 });
function addAgg(a, r) {
  a.n += Number(r.n) || 0;
  a.c += Number(r.c) || 0;
  a.t += Number(r.t) || 0;
  a.g += Number(r.g) || 0;
  a.l += Number(r.l) || 0;
}
const subjectStat = (subject, a) => ({
  subject,
  attempted: a.n,
  correct: a.c,
  accuracy: pct(a.c, a.n),
  avgTimeMs: a.n ? Math.round(a.t / a.n) : 0,
  marksGained: round2(a.g),
  marksLost: round2(a.l),
});

/* ── Tests ── */
const TEST_ID_RE = /^t_[0-9a-f]{16}$/;
const ONE_MARK_SHARE = 30 / 65; // a real GATE paper: 30 one-mark + 35 two-mark questions

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function strList(v, max, itemMax = 80) {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || v.length > max) return null;
  if (!v.every((x) => typeof x === "string" && x.length > 0 && x.length <= itemMax)) return null;
  return [...new Set(v)];
}

/** Validates a TestConfig; returns { config } or { error }. */
function parseTestConfig(body) {
  if (!isPlainObject(body)) return { error: "Test config required" };
  const config = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.length > 120) return { error: "Invalid title" };
    if (body.title.trim()) config.title = body.title.trim().slice(0, 80);
  }
  if (body.exam !== undefined && body.exam !== null) {
    if (body.exam !== "CSE" && body.exam !== "DA") return { error: "exam must be CSE or DA" };
    config.exam = body.exam;
  }
  for (const k of ["subjects", "topics", "papers", "types"]) {
    const l = strList(body[k], 200);
    if (l === null) return { error: `Invalid ${k}` };
    if (l && l.length) config[k] = l;
  }
  if (body.years !== undefined && body.years !== null) {
    if (!Array.isArray(body.years) || body.years.length > 100 || !body.years.every((y) => Number.isInteger(y) && y >= 1980 && y <= 2100)) {
      return { error: "Invalid years" };
    }
    if (body.years.length) config.years = [...new Set(body.years)];
  }
  if (body.difficulty !== undefined && body.difficulty !== null) {
    const d = body.difficulty;
    if (!Array.isArray(d) || d.length !== 2 || !d.every((x) => Number.isFinite(x) && x >= 1 && x <= 5) || d[0] > d[1]) {
      return { error: "difficulty must be [min, max] within 1..5" };
    }
    config.difficulty = [d[0], d[1]];
  }
  if (body.focus !== undefined && body.focus !== null) {
    if (!["any", "unseen", "mistakes", "weak"].includes(body.focus)) return { error: "Invalid focus" };
    config.focus = body.focus;
  }
  const count = Number(body.count);
  const duration = Number(body.durationMin);
  if (!Number.isFinite(count) || !Number.isFinite(duration)) return { error: "count and durationMin are required numbers" };
  config.count = Math.min(100, Math.max(5, Math.round(count)));
  config.durationMin = Math.min(240, Math.max(5, Math.round(duration)));
  if (body.negativeMarking !== undefined && body.negativeMarking !== null) {
    if (typeof body.negativeMarking !== "boolean") return { error: "negativeMarking must be a boolean" };
    config.negativeMarking = body.negativeMarking;
  }
  return { config };
}

/* Pick questions: filters → focus tiers → GATE-like 1-mark / 2-mark balance. */
function pickQuestions(config, qstate, diffMap) {
  const { bank } = bankViews();
  const has = (list, v) => !list || list.includes(v);
  const pool = bank.questions.filter((q) => {
    if (q.type === "DESC" || q.answer === null || q.answer === undefined) return false;
    if (config.exam && (q.exam === "DA" ? "DA" : "CSE") !== config.exam) return false;
    if (!has(config.subjects, q.subject)) return false;
    if (config.topics && !config.topics.includes(q.topic) && !config.topics.includes(`${q.subject}/${q.topic}`)) return false;
    if (!has(config.years, q.year)) return false;
    if (!has(config.papers, q.paper)) return false;
    if (!has(config.types, q.type)) return false;
    if (config.difficulty) {
      const d = diffMap.get(q.id) ?? 3;
      if (d < config.difficulty[0] || d > config.difficulty[1]) return false;
    }
    return true;
  });

  // Focus: 0 = preferred, 1 = acceptable filler.
  const focus = config.focus || "any";
  let tierOf = () => 0;
  if (focus === "unseen") tierOf = (q) => (qstate.get(q.id)?.attempts > 0 ? 1 : 0);
  else if (focus === "mistakes") {
    tierOf = (q) => {
      const s = qstate.get(q.id);
      return s && (s.outcome === "wrong" || s.outcome === "revealed" || s.outcome === "partial") ? 0 : 1;
    };
  } else if (focus === "weak") {
    const topics = new Map(); // subject/topic → { n, c }
    for (const [id, s] of qstate) {
      const q = bank.byId.get(id);
      if (!q || !(s.attempts > 0)) continue;
      const k = `${q.subject}/${q.topic}`;
      const t = topics.get(k) || { n: 0, c: 0 };
      t.n += s.attempts;
      t.c += s.correct;
      topics.set(k, t);
    }
    const ranked = [...topics.entries()].filter(([, t]) => t.n >= 2).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n);
    const weak = new Set(ranked.filter(([, t]) => t.c / t.n < 0.6).slice(0, 8).map(([k]) => k));
    for (const [k] of ranked.slice(0, 3)) weak.add(k);
    tierOf = (q) => (weak.has(`${q.subject}/${q.topic}`) ? 0 : 1);
  }
  const tiered = shuffle(pool).map((q) => [tierOf(q), q]);
  tiered.sort((a, b) => a[0] - b[0]);

  const target = Math.min(config.count, tiered.length);
  const oneQuota = Math.round(target * ONE_MARK_SHARE);
  const twoQuota = target - oneQuota;
  const chosen = [];
  const used = new Set();
  let ones = 0;
  let twos = 0;
  // Pass 1 keeps the mark balance; pass 2 fills whatever is left.
  for (const [, q] of tiered) {
    if (chosen.length >= target) break;
    const m = questionMarks(q);
    if (m === 1 && ones < oneQuota) ones++;
    else if (m !== 1 && twos < twoQuota) twos++;
    else continue;
    chosen.push(q);
    used.add(q.id);
  }
  for (const [, q] of tiered) {
    if (chosen.length >= target) break;
    if (!used.has(q.id)) {
      chosen.push(q);
      used.add(q.id);
    }
  }
  // Present GA first, then by subject, like a paper.
  chosen.sort((a, b) => (a.section === "ga" ? 0 : 1) - (b.section === "ga" ? 0 : 1) || String(a.subject).localeCompare(String(b.subject)));
  return chosen;
}

const qsetOf = (ids) => crypto.createHash("sha1").update([...ids].sort().join(",")).digest("hex");

function testShape(row) {
  const t = {
    id: row.id,
    title: row.title,
    config: parseJson(row.config, {}),
    questionIds: parseJson(row.question_ids, []),
    createdAt: Number(row.created_at),
  };
  if (row.submitted_at) {
    t.submittedAt = Number(row.submitted_at);
    const r = parseJson(row.result, null);
    if (r) t.result = r;
  }
  return t;
}

async function percentileFor(qset, testId, score) {
  const r = await get(
    `SELECT COUNT(*) AS n, SUM(score < ?) AS beaten FROM gate_tests
     WHERE qset=? AND submitted_at IS NOT NULL AND id<>?`,
    [score, qset, testId],
  );
  const n = Number(r?.n) || 0;
  return n ? round1(((Number(r.beaten) || 0) / n) * 100) : null;
}

/* ── Study plan ── */
function parsePlan(body) {
  if (!isPlainObject(body)) return { error: "Plan required" };
  const { examDate, hoursPerDay, priorities, days } = body;
  if (examDate !== null && examDate !== undefined) {
    if (typeof examDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(examDate) || Number.isNaN(Date.parse(`${examDate}T00:00:00Z`))) {
      return { error: "examDate must be YYYY-MM-DD or null" };
    }
  }
  if (!Number.isFinite(hoursPerDay) || hoursPerDay < 0.5 || hoursPerDay > 16) return { error: "hoursPerDay must be 0.5–16" };
  if (!isPlainObject(priorities) || Object.keys(priorities).length > 64) return { error: "Invalid priorities" };
  const pr = {};
  for (const [k, v] of Object.entries(priorities)) {
    if (!/^[a-z0-9_-]{1,40}$/i.test(k) || !Number.isInteger(v) || v < 0 || v > 3) return { error: "Priorities map subject ids to 0..3" };
    pr[k] = v;
  }
  if (!Array.isArray(days) || days.length > 7 || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    return { error: "days must be weekday numbers 0..6" };
  }
  return {
    plan: {
      examDate: examDate || null,
      hoursPerDay: round2(hoursPerDay),
      priorities: pr,
      days: [...new Set(days)].sort((a, b) => a - b),
    },
  };
}

function createGateMeRouter() {
  const router = express.Router();
  const auth = requireAuthenticatedUser;
  const attemptLimit = userLimiter(120, 60 * 1000);
  const testLimit = userLimiter(30, 60 * 1000);
  const user = (req) => req.sessionUser.username;
  const question = (id) => (typeof id === "string" ? bankViews().bank.byId.get(id) : undefined);

  /* Record one answer (graded here; the client's idea of correctness is ignored). */
  router.post("/api/gate/attempts", auth, attemptLimit, wrap(async (req, res) => {
    const b = req.body;
    if (!isPlainObject(b)) return fail(res, 400, "Attempt required");
    const q = question(b.questionId);
    if (!q) return fail(res, 404, "Unknown question");
    if (!validResponse(b.response)) return fail(res, 400, "Invalid response");
    const mode = b.mode === undefined ? "practice" : b.mode;
    if (!MODES.has(mode)) return fail(res, 400, "Invalid mode");
    if (b.confidence !== undefined && b.confidence !== null && ![1, 2, 3].includes(b.confidence)) {
      return fail(res, 400, "confidence must be 1, 2 or 3");
    }
    if (b.testId !== undefined && b.testId !== null && (typeof b.testId !== "string" || !TEST_ID_RE.test(b.testId))) {
      return fail(res, 400, "Invalid testId");
    }
    const grade = gradeQuestion(q, b.response);
    const revealed = b.revealed === true;
    if (!grade.attempted && !revealed) {
      // Nothing answered: report it without touching the history or schedule.
      const s = await get(
        "SELECT ease, interval_days, due, srs_streak FROM gate_qstate WHERE username=? AND question_id=?",
        [user(req), q.id],
      );
      return res.json({ ok: true, outcome: "skipped", marks: 0, review: reviewState(s) });
    }
    const [r] = await recordAttempts(user(req), [
      {
        q,
        response: b.response,
        grade,
        revealed,
        timeMs: b.timeMs,
        mode,
        testId: mode === "test" ? b.testId : null,
        confidence: b.confidence,
      },
    ]);
    res.json({ ok: true, ...r });
  }));

  /* Dashboard / analytics. */
  router.get("/api/gate/me/summary", auth, wrap(async (req, res) => {
    const u = user(req);
    const now = Date.now();
    const today = isoDay(now);
    const since = Date.parse(`${addDays(today, -400)}T00:00:00Z`);
    const [groups, days, recent, qs, notes] = await Promise.all([
      all(
        `SELECT subject, topic, type, year, COUNT(*) AS n, SUM(outcome='correct') AS c, SUM(time_ms) AS t,
                SUM(CASE WHEN marks > 0 THEN marks ELSE 0 END) AS g, SUM(CASE WHEN marks < 0 THEN -marks ELSE 0 END) AS l
         FROM gate_attempts WHERE username=? AND outcome IN ${OUTCOMES_ANSWERED}
         GROUP BY subject, topic, type, year`,
        [u],
      ),
      all(
        `SELECT date(created_at / 1000, 'unixepoch') AS d, COUNT(*) AS n FROM gate_attempts
         WHERE username=? AND created_at >= ? GROUP BY d`,
        [u, since],
      ),
      all(
        `SELECT question_id, outcome, time_ms, created_at, mode FROM gate_attempts
         WHERE username=? ORDER BY created_at DESC, id DESC LIMIT 50`,
        [u],
      ),
      all("SELECT question_id, attempts, bookmarked, due FROM gate_qstate WHERE username=?", [u]),
      get("SELECT COUNT(*) AS n FROM gate_notes WHERE username=?", [u]),
    ]);

    const total = emptyAgg();
    const bySubject = new Map();
    const byTopic = new Map();
    const byType = new Map();
    const byYear = new Map();
    const bump = (m, k, r, init) => {
      if (!m.has(k)) m.set(k, { ...init(), a: emptyAgg() });
      addAgg(m.get(k).a, r);
    };
    for (const r of groups) {
      addAgg(total, r);
      const s = r.subject || "unknown";
      bump(bySubject, s, r, () => ({ subject: s }));
      bump(byTopic, `${s}/${r.topic || ""}`, r, () => ({ subject: s, topic: r.topic || "" }));
      bump(byType, r.type || "unknown", r, () => ({ type: r.type || "unknown" }));
      if (r.year) bump(byYear, Number(r.year), r, () => ({ year: Number(r.year) }));
    }
    const topicStats = [...byTopic.values()].map((x) => ({ ...subjectStat(x.subject, x.a), topic: x.topic }));

    const { bank, paperIds } = bankViews();
    const attemptedIds = new Set();
    let reviewDue = 0;
    let bookmarks = 0;
    for (const r of qs) {
      if (r.attempts > 0) attemptedIds.add(r.question_id);
      if (r.due && r.due <= today) reviewDue++;
      if (r.bookmarked) bookmarks++;
    }
    let papersCompleted = 0;
    for (const ids of paperIds.values()) if (ids.length && ids.every((id) => attemptedIds.has(id))) papersCompleted++;

    const activity = {};
    const yearAgo = addDays(today, -364);
    for (const r of days) if (r.d >= yearAgo) activity[r.d] = Number(r.n);

    res.json({
      ok: true,
      summary: {
        totals: {
          attempted: total.n,
          correct: total.c,
          accuracy: pct(total.c, total.n),
          avgTimeMs: total.n ? Math.round(total.t / total.n) : 0,
          questionsInBank: bank.questions.length,
          papersCompleted,
          reviewDue,
          bookmarks,
          notes: Number(notes?.n) || 0,
        },
        streak: streakFromDays(days.map((r) => r.d), today),
        activity,
        bySubject: [...bySubject.values()].map((x) => subjectStat(x.subject, x.a)).sort((a, b) => b.attempted - a.attempted),
        byTopic: topicStats.slice().sort((a, b) => b.attempted - a.attempted),
        byYear: [...byYear.values()]
          .map((x) => ({ year: x.year, attempted: x.a.n, accuracy: pct(x.a.c, x.a.n) }))
          .sort((a, b) => a.year - b.year),
        byType: [...byType.values()]
          .map((x) => ({ type: x.type, attempted: x.a.n, accuracy: pct(x.a.c, x.a.n), avgTimeMs: x.a.n ? Math.round(x.a.t / x.a.n) : 0 }))
          .sort((a, b) => b.attempted - a.attempted),
        weakTopics: topicStats
          .filter((t) => t.attempted >= 3)
          .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted)
          .slice(0, 10),
        recent: recent.map((r) => ({
          questionId: r.question_id,
          outcome: r.outcome,
          timeMs: Number(r.time_ms) || 0,
          at: Number(r.created_at),
          mode: r.mode,
        })),
      },
    });
  }));

  /* Per-question progress (?ids=a,b — or everything). */
  router.get("/api/gate/me/progress", auth, wrap(async (req, res) => {
    const u = user(req);
    let ids = null;
    if (req.query.ids !== undefined) {
      ids = [...new Set(String(req.query.ids).split(",").map((s) => s.trim()).filter((s) => s && s.length <= 80))].slice(0, 500);
      if (!ids.length) return res.json({ ok: true, progress: {} });
    }
    const filter = ids ? ` AND question_id IN (${placeholders(ids.length)})` : "";
    const params = ids ? [u, ...ids] : [u];
    const [rows, noteRows] = await Promise.all([
      all(`SELECT * FROM gate_qstate WHERE username=?${filter}`, params),
      all(`SELECT question_id FROM gate_notes WHERE username=?${filter}`, params),
    ]);
    const progress = {};
    for (const r of rows) {
      const p = { attempts: Number(r.attempts) || 0, correct: Number(r.correct) || 0 };
      if (r.outcome) p.outcome = r.outcome;
      if (r.last_at) p.lastAt = Number(r.last_at);
      if (r.bookmarked) p.bookmarked = true;
      const cols = parseJson(r.collections, []);
      if (cols.length) p.collections = cols;
      if (r.due) p.review = reviewState(r);
      progress[r.question_id] = p;
    }
    for (const r of noteRows) {
      progress[r.question_id] = progress[r.question_id] || { attempts: 0, correct: 0 };
      progress[r.question_id].hasNote = true;
    }
    res.json({ ok: true, progress });
  }));

  /* One-time merge of the old localStorage progress (idempotent). */
  router.post("/api/gate/me/import", auth, wrap(async (req, res) => {
    const progress = req.body?.progress;
    if (!isPlainObject(progress)) return fail(res, 400, "progress object required");
    const entries = Object.entries(progress);
    if (entries.length > 5000) return fail(res, 413, "Too many entries (max 5000)");
    const { bank } = bankViews();
    const now = Date.now();
    const today = isoDay(now);
    const rows = [];
    for (const [id, p] of entries) {
      if (!bank.byId.has(id) || !isPlainObject(p)) continue;
      const outcome = ["correct", "wrong", "revealed"].includes(p.outcome) ? p.outcome : null;
      const bookmarked = p.bookmarked === true ? 1 : 0;
      if (!outcome && !bookmarked) continue;
      const at = Number.isFinite(p.at) && p.at > 0 ? Math.min(Math.round(p.at), now) : null;
      const answered = outcome === "correct" || outcome === "wrong";
      rows.push([
        req.sessionUser.username, id, outcome, answered ? 1 : 0, outcome === "correct" ? 1 : 0, at, bookmarked,
        outcome === "wrong" || outcome === "revealed" ? today : null,
      ]);
    }
    const stmts = [];
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      stmts.push([
        `INSERT INTO gate_qstate(username, question_id, outcome, attempts, correct, last_at, bookmarked, due)
         VALUES ${chunk.map(() => "(?,?,?,?,?,?,?,?)").join(",")}
         ON CONFLICT(username, question_id) DO UPDATE SET
           outcome = COALESCE(gate_qstate.outcome, excluded.outcome),
           attempts = CASE WHEN gate_qstate.attempts > 0 THEN gate_qstate.attempts ELSE excluded.attempts END,
           correct = CASE WHEN gate_qstate.attempts > 0 THEN gate_qstate.correct ELSE excluded.correct END,
           last_at = MAX(COALESCE(gate_qstate.last_at, 0), COALESCE(excluded.last_at, 0)),
           bookmarked = MAX(gate_qstate.bookmarked, excluded.bookmarked),
           due = COALESCE(gate_qstate.due, excluded.due)`,
        chunk.flat(),
      ]);
    }
    await runBatch(stmts);
    res.json({ ok: true, imported: rows.length });
  }));

  /* Bookmarks + collections. */
  router.put("/api/gate/me/bookmarks/:id", auth, wrap(async (req, res) => {
    const u = user(req);
    const q = question(req.params.id);
    if (!q) return fail(res, 404, "Unknown question");
    const { on, collections } = req.body || {};
    if (typeof on !== "boolean") return fail(res, 400, "on must be a boolean");
    let cols = strList(collections, 50, 40);
    if (cols === null) return fail(res, 400, "Invalid collections");
    if (cols && cols.length) {
      const owned = await all(`SELECT id FROM gate_collections WHERE username=? AND id IN (${placeholders(cols.length)})`, [u, ...cols]);
      if (owned.length !== cols.length) return fail(res, 404, "Unknown collection");
    }
    if (!on) cols = [];
    if (cols) {
      await run(
        `INSERT INTO gate_qstate(username, question_id, bookmarked, collections) VALUES(?,?,?,?)
         ON CONFLICT(username, question_id) DO UPDATE SET bookmarked=excluded.bookmarked, collections=excluded.collections`,
        [u, q.id, on ? 1 : 0, JSON.stringify(cols)],
      );
    } else {
      await run(
        `INSERT INTO gate_qstate(username, question_id, bookmarked) VALUES(?,?,1)
         ON CONFLICT(username, question_id) DO UPDATE SET bookmarked=1`,
        [u, q.id],
      );
    }
    res.json({ ok: true });
  }));

  const collectionShape = (r) => {
    const c = { id: r.id, name: r.name, count: Number(r.count) || 0 };
    if (r.color) c.color = r.color;
    return c;
  };

  router.get("/api/gate/me/collections", auth, wrap(async (req, res) => {
    const rows = await all(
      `SELECT c.id, c.name, c.color,
         (SELECT COUNT(*) FROM gate_qstate s, json_each(s.collections) j WHERE s.username=c.username AND j.value=c.id) AS count
       FROM gate_collections c WHERE c.username=? ORDER BY c.created_at`,
      [user(req)],
    );
    res.json({ ok: true, collections: rows.map(collectionShape) });
  }));

  router.post("/api/gate/me/collections", auth, wrap(async (req, res) => {
    const u = user(req);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 40) return fail(res, 400, "Name must be 1–40 characters");
    const color = req.body?.color;
    if (color !== undefined && color !== null && (typeof color !== "string" || !/^(#[0-9a-f]{3,8}|[a-z-]{1,20})$/i.test(color))) {
      return fail(res, 400, "Invalid color");
    }
    const existing = await get(
      "SELECT COUNT(*) AS n, SUM(lower(name)=lower(?)) AS dup FROM gate_collections WHERE username=?",
      [name, u],
    );
    if (Number(existing?.n) >= 50) return fail(res, 400, "You can have at most 50 collections");
    if (Number(existing?.dup) > 0) return fail(res, 409, "A collection with that name already exists");
    const id = `c_${crypto.randomBytes(6).toString("hex")}`;
    await run("INSERT INTO gate_collections(id, username, name, color, created_at) VALUES(?,?,?,?,?)", [
      id, u, name, color || null, Date.now(),
    ]);
    res.json({ ok: true, collection: collectionShape({ id, name, color, count: 0 }) });
  }));

  router.delete("/api/gate/me/collections/:id", auth, wrap(async (req, res) => {
    const u = user(req);
    const id = cleanId(req.params.id);
    if (!id) return fail(res, 404, "Unknown collection");
    const [del] = await runBatch([
      ["DELETE FROM gate_collections WHERE id=? AND username=?", [id, u]],
      [
        `UPDATE gate_qstate SET collections =
           (SELECT COALESCE(json_group_array(j.value), '[]') FROM json_each(gate_qstate.collections) j WHERE j.value <> ?)
         WHERE username=? AND EXISTS (SELECT 1 FROM json_each(gate_qstate.collections) j WHERE j.value = ?)`,
        [id, u, id],
      ],
    ]);
    if (!del.changes) return fail(res, 404, "Unknown collection");
    res.json({ ok: true });
  }));

  /* Notes. */
  const noteShape = (r) => ({ questionId: r.question_id, text: r.text, updatedAt: Number(r.updated_at) });

  router.get("/api/gate/me/notes", auth, wrap(async (req, res) => {
    const rows = await all(
      "SELECT question_id, text, updated_at FROM gate_notes WHERE username=? ORDER BY updated_at DESC LIMIT 2000",
      [user(req)],
    );
    res.json({ ok: true, notes: rows.map(noteShape) });
  }));

  router.get("/api/gate/me/notes/:id", auth, wrap(async (req, res) => {
    const q = question(req.params.id);
    if (!q) return fail(res, 404, "Unknown question");
    const r = await get("SELECT question_id, text, updated_at FROM gate_notes WHERE username=? AND question_id=?", [user(req), q.id]);
    res.json({ ok: true, note: r ? noteShape(r) : null });
  }));

  router.put("/api/gate/me/notes/:id", auth, wrap(async (req, res) => {
    const q = question(req.params.id);
    if (!q) return fail(res, 404, "Unknown question");
    const text = req.body?.text;
    if (typeof text !== "string") return fail(res, 400, "text must be a string");
    if (text.length > 10000) return fail(res, 413, "Notes are limited to 10 000 characters");
    const now = Date.now();
    if (!text.trim()) {
      await run("DELETE FROM gate_notes WHERE username=? AND question_id=?", [user(req), q.id]);
    } else {
      await run(
        `INSERT INTO gate_notes(username, question_id, text, updated_at) VALUES(?,?,?,?)
         ON CONFLICT(username, question_id) DO UPDATE SET text=excluded.text, updated_at=excluded.updated_at`,
        [user(req), q.id, text, now],
      );
    }
    res.json({ ok: true, note: { questionId: q.id, text: text.trim() ? text : "", updatedAt: now } });
  }));

  /* Spaced-repetition queue. */
  router.get("/api/gate/me/review", auth, wrap(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Math.round(Number(req.query.limit)) || 20));
    const today = isoDay();
    const horizon = addDays(today, 14);
    const rows = await all(
      `SELECT question_id, due FROM gate_qstate WHERE username=? AND due IS NOT NULL AND due <= ?
       ORDER BY due ASC, last_at ASC`,
      [user(req), horizon],
    );
    const upcoming = {};
    for (let i = 1; i <= 14; i++) upcoming[addDays(today, i)] = 0;
    const due = [];
    for (const r of rows) {
      if (r.due <= today) due.push(r.question_id);
      else if (upcoming[r.due] !== undefined) upcoming[r.due]++;
    }
    res.json({ ok: true, due: due.slice(0, limit), dueCount: due.length, upcoming });
  }));

  /* Community stats (public, cached ~5 min). */
  router.get("/api/gate/questions/:id/stats", wrap(async (req, res) => {
    const q = question(req.params.id);
    if (!q) return fail(res, 404, "Unknown question");
    res.json({ ok: true, stats: await questionStats(q) });
  }));

  router.get("/api/gate/questions/:id/similar", (req, res) => {
    const q = question(req.params.id);
    if (!q) return fail(res, 404, "Unknown question");
    res.json({ ok: true, ids: similarIds(q) });
  });

  /* Daily challenge (public): the same question for everyone on a UTC date. */
  router.get("/api/gate/daily", wrap(async (req, res) => {
    const date = isoDay();
    const questionId = dailyQuestionId(date);
    if (!questionId) return fail(res, 404, "No questions available");
    const out = { ok: true, date, questionId };
    const u = me();
    if (u) {
      const start = Date.parse(`${date}T00:00:00Z`);
      const r = await get(
        `SELECT 1 AS hit FROM gate_attempts WHERE username=? AND question_id=? AND created_at >= ? AND created_at < ?
           AND outcome IN ${OUTCOMES_ANSWERED} LIMIT 1`,
        [u, questionId, start, start + DAY_MS],
      );
      out.solvedToday = !!r;
    }
    res.json(out);
  }));

  /* Custom / sectional tests. */
  router.post("/api/gate/tests", auth, testLimit, wrap(async (req, res) => {
    const u = user(req);
    const { config, error } = parseTestConfig(req.body);
    if (error) return fail(res, 400, error);
    const needState = config.focus && config.focus !== "any";
    const [stateRows, diffMap] = await Promise.all([
      needState ? all("SELECT question_id, outcome, attempts, correct FROM gate_qstate WHERE username=?", [u]) : [],
      config.difficulty ? difficultyMap() : new Map(),
    ]);
    const qstate = new Map(stateRows.map((r) => [r.question_id, { outcome: r.outcome, attempts: Number(r.attempts) || 0, correct: Number(r.correct) || 0 }]));
    const chosen = pickQuestions(config, qstate, diffMap);
    if (!chosen.length) return fail(res, 400, "No questions match these filters");
    const ids = chosen.map((q) => q.id);
    const id = `t_${crypto.randomBytes(8).toString("hex")}`;
    const title = config.title || `Custom test · ${ids.length} questions`;
    const createdAt = Date.now();
    await run(
      `INSERT INTO gate_tests(id, username, title, config, question_ids, qset, created_at) VALUES(?,?,?,?,?,?,?)`,
      [id, u, title, JSON.stringify(config), JSON.stringify(ids), qsetOf(ids), createdAt],
    );
    res.json({ ok: true, test: { id, title, config, questionIds: ids, createdAt } });
  }));

  router.get("/api/gate/tests/:id", auth, wrap(async (req, res) => {
    const id = req.params.id;
    if (!TEST_ID_RE.test(id)) return fail(res, 404, "Test not found");
    const row = await get("SELECT * FROM gate_tests WHERE id=? AND username=?", [id, user(req)]);
    if (!row) return fail(res, 404, "Test not found");
    const t = testShape(row);
    // Keep the percentile current as other people submit the same set.
    if (t.result && row.score !== null) t.result.percentile = await percentileFor(row.qset, row.id, Number(row.score));
    res.json({ ok: true, test: t });
  }));

  router.post("/api/gate/tests/:id/submit", auth, testLimit, wrap(async (req, res) => {
    const u = user(req);
    const id = req.params.id;
    if (!TEST_ID_RE.test(id)) return fail(res, 404, "Test not found");
    const { responses = {}, timeMs = {} } = req.body || {};
    if (!isPlainObject(responses) || !isPlainObject(timeMs)) return fail(res, 400, "responses and timeMs must be objects");
    const row = await get("SELECT * FROM gate_tests WHERE id=? AND username=?", [id, u]);
    if (!row) return fail(res, 404, "Test not found");
    if (row.submitted_at) return fail(res, 409, "This test was already submitted");
    const config = parseJson(row.config, {});
    const ids = parseJson(row.question_ids, []);
    const negative = config.negativeMarking !== false;
    const { bank } = bankViews();

    const items = [];
    const graded = [];
    const subj = new Map();
    let score = 0;
    let maxScore = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let totalTime = 0;
    for (const qid of ids) {
      const q = bank.byId.get(qid);
      if (!q) continue;
      const resp = Object.prototype.hasOwnProperty.call(responses, qid) ? responses[qid] : null;
      if (!validResponse(resp)) return fail(res, 400, `Invalid response for ${qid}`);
      const t = Math.max(0, Math.min(Math.round(Number(timeMs[qid]) || 0), 4 * 3600 * 1000));
      const g = gradeQuestion(q, resp);
      let marks = g.marks;
      if (!negative && marks < 0) marks = 0;
      maxScore += g.max;
      score += marks;
      totalTime += t;
      const outcome = !g.attempted ? "skipped" : g.correct ? "correct" : "wrong";
      if (outcome === "correct") correct++;
      else if (outcome === "wrong") wrong++;
      else skipped++;
      items.push({ questionId: qid, outcome, marks: round2(marks), timeMs: t });
      if (g.attempted) {
        graded.push({ q, response: resp, grade: g, timeMs: t, mode: "test", testId: id });
        const s = q.subject || "unknown";
        if (!subj.has(s)) subj.set(s, emptyAgg());
        addAgg(subj.get(s), { n: 1, c: g.correct ? 1 : 0, t, g: marks > 0 ? marks : 0, l: marks < 0 ? -marks : 0 });
      }
    }
    score = round2(score);
    const result = {
      score,
      maxScore: round2(maxScore),
      correct,
      wrong,
      skipped,
      timeMs: totalTime,
      items,
      bySubject: [...subj.entries()].map(([s, a]) => subjectStat(s, a)).sort((a, b) => b.attempted - a.attempted),
      percentile: await percentileFor(row.qset, id, score),
    };
    const upd = await run(
      "UPDATE gate_tests SET submitted_at=?, result=?, score=? WHERE id=? AND username=? AND submitted_at IS NULL",
      [Date.now(), JSON.stringify(result), score, id, u],
    );
    if (!upd.changes) return fail(res, 409, "This test was already submitted");
    if (graded.length) await recordAttempts(u, graded, { negativeMarking: negative });
    res.json({ ok: true, result });
  }));

  router.get("/api/gate/me/tests", auth, wrap(async (req, res) => {
    const rows = await all("SELECT * FROM gate_tests WHERE username=? ORDER BY created_at DESC LIMIT 200", [user(req)]);
    res.json({ ok: true, tests: rows.map(testShape) });
  }));

  /* Study plan. */
  router.get("/api/gate/me/plan", auth, wrap(async (req, res) => {
    const r = await get("SELECT plan FROM gate_plans WHERE username=?", [user(req)]);
    res.json({ ok: true, plan: r ? parseJson(r.plan, null) : null });
  }));

  router.put("/api/gate/me/plan", auth, wrap(async (req, res) => {
    const { plan, error } = parsePlan(req.body);
    if (error) return fail(res, 400, error);
    await run(
      `INSERT INTO gate_plans(username, plan, updated_at) VALUES(?,?,?)
       ON CONFLICT(username) DO UPDATE SET plan=excluded.plan, updated_at=excluded.updated_at`,
      [user(req), JSON.stringify(plan), Date.now()],
    );
    res.json({ ok: true, plan });
  }));

  /* Leaderboard (public): positive marks earned in the period; top 50 + me. */
  router.get("/api/gate/leaderboard", wrap(async (req, res) => {
    const period = ["week", "month", "all"].includes(req.query.period) ? req.query.period : "week";
    const since = period === "week" ? Date.now() - 7 * DAY_MS : period === "month" ? Date.now() - 30 * DAY_MS : 0;
    const u = me();
    // Every ranked user for the period, shared by all visitors and cached
    // (10 min; 5 min after new attempts) — then top 50 + me from memory.
    const rows = await gateBoardCache.get(period, () => all(
      `WITH agg AS (
         SELECT username, COUNT(*) AS attempted, SUM(outcome='correct') AS correct,
                SUM(CASE WHEN marks > 0 THEN marks ELSE 0 END) AS score
         FROM gate_attempts WHERE created_at >= ? AND outcome IN ${OUTCOMES_ANSWERED}
         GROUP BY username
       ), ranked AS (
         SELECT agg.*, ROW_NUMBER() OVER (ORDER BY score DESC, correct DESC, attempted ASC, username ASC) AS rnk FROM agg
       )
       SELECT r.username, r.attempted, r.correct, r.score, r.rnk, u.display_name, u.avatar, u.avatar_url
       FROM ranked r LEFT JOIN users u ON u.username = r.username
       ORDER BY r.rnk`,
      [since],
    ));
    const shape = (r) => {
      const row = {
        username: r.username,
        attempted: Number(r.attempted) || 0,
        correct: Number(r.correct) || 0,
        accuracy: pct(Number(r.correct) || 0, Number(r.attempted) || 0),
        score: round2(Number(r.score) || 0),
        rank: Number(r.rnk),
      };
      if (r.display_name) row.displayName = r.display_name;
      const avatar = r.avatar_url || r.avatar;
      if (avatar) row.avatar = avatar;
      return row;
    };
    const out = { ok: true, rows: rows.filter((r) => Number(r.rnk) <= 50).map(shape) };
    const mine = u ? rows.find((r) => r.username === u) || null : null;
    if (mine) out.me = shape(mine);
    res.json(out);
  }));

  /* Subject weightage over the years (public, computed once from the bank). */
  router.get("/api/gate/trends", (req, res) => {
    const exam = req.query.exam === "DA" ? "DA" : "CSE";
    res.json({ ok: true, trends: trendsFor(exam) });
  });

  return router;
}

module.exports = { createGateMeRouter, difficultyOf, streakFromDays, pickQuestions, parseTestConfig };
