/* Read-only data helpers used by the agent's tools (and by a few routes).
   Every query is scoped to the current request's user via me()/meSql() from
   src/context.js — tools run inside runAs(sessionUser), so they can only ever
   see the signed-in student's own progress. */
const { get, all } = require("../db");
const { me, meSql } = require("../context");

const clamp = (v, lo, hi, dflt) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : dflt;
};

function plainText(html) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/pre>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const parseTags = (t) => {
  try {
    const v = JSON.parse(t || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const slimProblem = (p) => ({
  id: p.id,
  platform: p.platform,
  code: p.problem_id,
  title: p.title,
  rating: p.rating || null,
  tags: parseTags(p.tags),
  status: p.solve_status || "unsolved",
});

async function searchProblems({ query, tags, minRating, maxRating, platform, status, limit } = {}) {
  const where = ["1=1"];
  const params = [];
  if (platform && platform !== "all") {
    where.push("p.platform=?");
    params.push(String(platform));
  }
  if (Number.isFinite(+minRating) && minRating !== null && minRating !== "") {
    where.push("p.rating>=?");
    params.push(+minRating);
  }
  if (Number.isFinite(+maxRating) && maxRating !== null && maxRating !== "") {
    where.push("p.rating<=?");
    params.push(+maxRating);
  }
  for (const t of (Array.isArray(tags) ? tags : tags ? [tags] : []).slice(0, 4)) {
    where.push("p.tags LIKE ?");
    params.push(`%${String(t).slice(0, 40)}%`);
  }
  if (status === "solved") where.push("COALESCE(pr.status,'unsolved')='solved'");
  else if (status === "attempted") where.push("COALESCE(pr.status,'unsolved')='attempted'");
  else if (status === "unsolved") where.push("(pr.status IS NULL OR pr.status='unsolved')");
  if (query) {
    where.push("(p.title LIKE ? OR p.problem_id LIKE ?)");
    const q = `%${String(query).slice(0, 80)}%`;
    params.push(q, q);
  }
  const rows = await all(
    `SELECT p.id, p.platform, p.problem_id, p.title, p.rating, p.tags, COALESCE(pr.status,'unsolved') as solve_status
     FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
     WHERE ${where.join(" AND ")} ORDER BY (p.rating=0), p.rating ASC LIMIT ?`,
    [...params, clamp(limit, 1, 20, 10)],
  );
  return rows.map(slimProblem);
}

/** Problem metadata + statement as plain text (≤ maxChars). */
async function getProblem(id, { maxChars = 6000 } = {}) {
  const p = await get(
    `SELECT p.*, COALESCE(pr.status,'unsolved') as solve_status, pr.attempts
     FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()} WHERE p.id=?`,
    [clamp(id, 1, Number.MAX_SAFE_INTEGER, 0)],
  );
  if (!p) return null;
  const st = await get("SELECT statement, input_spec, output_spec, note FROM problem_statements WHERE problem_rowid=?", [p.id]).catch(
    () => null,
  );
  const statement = st
    ? plainText([st.statement, st.input_spec && `Input: ${st.input_spec}`, st.output_spec && `Output: ${st.output_spec}`, st.note && `Note: ${st.note}`]
        .filter(Boolean)
        .join("\n"))
    : "";
  return { ...slimProblem(p), attempts: p.attempts || 0, url: p.url, statement: statement.slice(0, maxChars) };
}

/** 'solved' | 'attempted' | 'unsolved' for the current user. */
async function problemStatus(id) {
  if (!/^\d+$/.test(String(id))) return "unsolved";
  const r = await get("SELECT status FROM progress WHERE problem_rowid=? AND username=?", [+id, me()]).catch(() => null);
  return r?.status || "unsolved";
}

async function getUserStats() {
  const c = await get(`SELECT
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='solved') as solved,
      (SELECT COUNT(*) FROM progress WHERE username=${meSql()} AND status='attempted') as attempted,
      (SELECT COALESCE(SUM(xp_earned),0) FROM progress WHERE username=${meSql()}) as xp,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()}) as submissions,
      (SELECT COUNT(*) FROM submissions WHERE username=${meSql()} AND verdict='AC') as accepted`);
  const byRating = await all(
    `SELECT (p.rating/200)*200 as band, COUNT(*) as n FROM progress pr JOIN problems p ON p.id=pr.problem_rowid
     WHERE pr.username=${meSql()} AND pr.status='solved' AND p.rating>0 GROUP BY band ORDER BY band`,
  );
  return {
    username: me(),
    solved: c.solved,
    attempted: c.attempted,
    xp: c.xp,
    submissions: c.submissions,
    accuracy: c.submissions ? Math.round((c.accepted / c.submissions) * 100) : 0,
    solvedByRating: byRating.map((r) => ({ rating: r.band, solved: r.n })),
  };
}

/** Per-tag solve rates (weakest first) and practice picks for the weak ones.
 *  Shared with GET /api/weakness-analysis. */
async function weaknessAnalysis({ recommend = true } = {}) {
  const rows = await all(
    `SELECT p.tags, pr.status FROM progress pr JOIN problems p ON pr.problem_rowid=p.id AND pr.username=${meSql()}
     WHERE pr.status IN ('solved','attempted') AND p.tags!='[]'`,
  );
  const tagStats = {};
  for (const r of rows) {
    for (const t of parseTags(r.tags)) {
      const s = (tagStats[t] ||= { solved: 0, attempted: 0 });
      if (r.status === "solved") s.solved++;
      else s.attempted++;
    }
  }
  const analysis = Object.entries(tagStats)
    .map(([tag, s]) => ({
      tag,
      solved: s.solved,
      attempted: s.attempted,
      total: s.solved + s.attempted,
      solveRate: s.solved + s.attempted > 0 ? Math.round((s.solved / (s.solved + s.attempted)) * 100) : 0,
      strength: s.solved >= 10 ? "strong" : s.solved >= 5 ? "moderate" : "weak",
    }))
    .filter((a) => a.total >= 2)
    .sort((a, b) => a.solveRate - b.solveRate);
  const recommendations = [];
  if (recommend) {
    for (const wt of analysis.filter((a) => a.solveRate < 70).slice(0, 5)) {
      const probs = await all(
        `SELECT p.id, p.title, p.problem_id, p.platform, p.rating, COALESCE(pr.status,'unsolved') as solve_status
         FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
         WHERE p.tags LIKE ? AND (pr.status IS NULL OR pr.status!='solved') AND p.rating>0
         ORDER BY p.rating ASC LIMIT 5`,
        [`%${wt.tag}%`],
      );
      if (probs.length) recommendations.push({ tag: wt.tag, solveRate: wt.solveRate, problems: probs });
    }
  }
  return { analysis, recommendations };
}

/** Unsolved problems pitched slightly above the student's comfort zone. */
async function recommendProblems({ tag, count } = {}) {
  const n = clamp(count, 1, 10, 5);
  const avg = await get(
    `SELECT AVG(p.rating) as r FROM progress pr JOIN problems p ON p.id=pr.problem_rowid
     WHERE pr.username=${meSql()} AND pr.status='solved' AND p.rating>0`,
  );
  const target = Math.round((avg?.r || 1000) / 100) * 100;
  const where = ["(pr.status IS NULL OR pr.status!='solved')", "p.rating BETWEEN ? AND ?"];
  const params = [target - 100, target + 300];
  if (tag) {
    where.push("p.tags LIKE ?");
    params.push(`%${String(tag).slice(0, 40)}%`);
  }
  const rows = await all(
    `SELECT p.id, p.platform, p.problem_id, p.title, p.rating, p.tags, COALESCE(pr.status,'unsolved') as solve_status
     FROM problems p LEFT JOIN progress pr ON pr.problem_rowid=p.id AND pr.username=${meSql()}
     WHERE ${where.join(" AND ")} ORDER BY RANDOM() LIMIT ?`,
    [...params, n],
  );
  return { targetRating: target, problems: rows.map(slimProblem) };
}

/** The student's own recent submissions (verdicts, no code). */
async function getSubmissions({ problemId, limit } = {}) {
  const params = [me()];
  let filter = "";
  if (problemId != null && /^\d+$/.test(String(problemId))) {
    filter = "AND s.problem_rowid=?";
    params.push(+problemId);
  }
  const rows = await all(
    `SELECT s.id, s.problem_rowid, s.language, s.verdict, s.exec_time_ms, s.submitted_at, p.title
     FROM submissions s LEFT JOIN problems p ON p.id=s.problem_rowid
     WHERE s.username=? ${filter} ORDER BY s.submitted_at DESC LIMIT ?`,
    [...params, clamp(limit, 1, 10, 5)],
  );
  return rows.map((r) => ({
    id: r.id,
    problemId: r.problem_rowid,
    title: r.title,
    language: r.language,
    verdict: r.verdict,
    timeMs: r.exec_time_ms,
    at: r.submitted_at,
  }));
}

module.exports = {
  plainText,
  searchProblems,
  getProblem,
  problemStatus,
  getUserStats,
  weaknessAnalysis,
  recommendProblems,
  getSubmissions,
};
