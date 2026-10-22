/*
 * Nexus learning intelligence, server side (pure; unit-tested):
 *   time estimates, exam weightage and high-yield nodes, peer mastery and
 *   median time to master, and grading for "Test out" quick checks.
 * The client adds the per-user maths (confidence, shortest unlock path,
 * study plan) in client/src/components/nexus/insights.ts.
 */

const DAY = 86400000;

/** Minutes to learn a node: its lessons (or a default by kind) plus ~3 min per PYQ to master. */
function nodeMinutes({ kind = "concept", lessonMinutes = [], pyqTarget = 0, dsaTarget = 0 } = {}) {
  if (dsaTarget) return dsaTarget * 20;
  const study = lessonMinutes.length ? lessonMinutes.reduce((a, b) => a + (b || 0), 0) : kind === "project" ? 120 : 40;
  return Math.round(study + pyqTarget * 3);
}

/** A node's exam weight from its PYQ pool: count, marks, and marks by year. */
function weightage(ids, byId) {
  let n = 0;
  let marks = 0;
  const years = {};
  for (const id of ids || []) {
    const q = byId.get(id);
    if (!q) continue;
    n++;
    const m = Number(q.marks) || 1;
    marks += m;
    if (q.year) years[q.year] = (years[q.year] || 0) + m;
  }
  return { n, marks, years };
}

/** The top 20% of nodes by marks (at least one), among nodes that appear in PYQs. */
function highYield(weights) {
  const list = [...weights].filter(([, w]) => w.marks > 0).sort((a, b) => b[1].marks - a[1].marks || a[0].localeCompare(b[0]));
  const k = Math.max(1, Math.ceil(list.length * 0.2));
  return new Set(list.slice(0, list.length ? k : 0).map(([id]) => id));
}

/**
 * Peer mastery of one node from aggregate rows: users who reached the
 * node's target of correct PYQs, among users who attempted its pool, and
 * the median days from their first attempt to mastery. Never per person.
 * rows: [{ username, question_id, first_at, first_correct }]
 */
function peerMastery(rows, pool, target) {
  const inPool = new Set(pool);
  const users = new Map(); // username → { start, corrects: [] }
  for (const r of rows) {
    if (!inPool.has(r.question_id)) continue;
    const u = users.get(r.username) || { start: Infinity, corrects: [] };
    if (r.first_at !== null && r.first_at !== undefined) u.start = Math.min(u.start, Number(r.first_at));
    if (r.first_correct !== null && r.first_correct !== undefined) u.corrects.push(Number(r.first_correct));
    users.set(r.username, u);
  }
  const days = [];
  let mastered = 0;
  for (const u of users.values()) {
    if (!target || u.corrects.length < target) continue;
    mastered++;
    u.corrects.sort((a, b) => a - b);
    days.push(Math.max(0, (u.corrects[target - 1] - u.start) / DAY));
  }
  days.sort((a, b) => a - b);
  const median = days.length ? (days.length % 2 ? days[(days.length - 1) / 2] : (days[days.length / 2 - 1] + days[days.length / 2]) / 2) : null;
  return {
    learners: users.size,
    mastered,
    pct: users.size ? Math.round((mastered / users.size) * 100) : null,
    medianDays: median === null ? null : Math.round(median * 10) / 10,
  };
}

/* ── grading (the same rules as client/src/gate/answers.ts) ── */
const alts = (a) => (typeof a === "string" ? a.split(/\s+or\s+/i).map((x) => x.trim()).filter(Boolean) : [a]);
const list = (a) => (Array.isArray(a) ? a.map(String) : typeof a === "string" ? a.split(/[,;\s]+/).filter(Boolean) : a == null ? [] : [String(a)]);
function natRange(a) {
  if (typeof a !== "string") return null;
  const m = a.match(/^\s*(-?[\d.]+)\s*(?::|to)\s*(-?[\d.]+)\s*$/i);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
function isCorrect(q, pick) {
  if (pick === undefined || pick === null || pick === "" || (Array.isArray(pick) && !pick.length)) return false;
  if (q.type === "MSQ") {
    const u = (Array.isArray(pick) ? [...pick] : [pick]).map(String).sort();
    return alts(q.answer).some((k) => {
      const t = list(k).sort();
      return u.length === t.length && u.every((v, i) => v === t[i]);
    });
  }
  if (q.type === "NAT") {
    const num = Number(pick);
    if (Number.isNaN(num)) return false;
    return alts(q.answer).some((k) => {
      const r = natRange(k);
      return r ? num >= r[0] - 0.01 && num <= r[1] + 0.01 : Math.abs(num - Number(k)) <= 0.05;
    });
  }
  if (q.type === "TF" && !(q.options || []).length) return String(q.answer).trim().toLowerCase().startsWith(String(pick).trim().toLowerCase());
  return alts(q.answer).some((k) => String(pick).trim().toUpperCase() === String(k).trim().toUpperCase());
}

/** Questions a quick check can use: auto-gradable, no figures, a key. */
function testable(q) {
  return !!q && q.answer != null && q.answer !== "" && !(q.figures || []).length && (q.type === "MCQ" || q.type === "NAT" || q.type === "MSQ" || (q.type === "TF" && true));
}

/** Pick up to `n` questions for a quick check, stable for a user and day. */
function pickQuick(ids, byId, seed, n = 5) {
  const pool = (ids || []).map((id) => byId.get(id)).filter(testable);
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

/** Passing a quick check: at least 80% right (and at least 3 questions). */
function passed(score, total) {
  return total >= 3 && score >= Math.ceil(total * 0.8);
}

module.exports = { nodeMinutes, weightage, highYield, peerMastery, isCorrect, testable, pickQuick, passed, DAY };
