// Project Euler: the "minimal" endpoints serve the problem list as
// ID##Title##Published##Solved by and each statement as a bare HTML fragment.
// Answers are a single number, so there is no stdin sample to run.
const { getText, load, blank } = require("./common");

const ORIGIN = "https://projecteuler.net";

/** Rating by solver count is the honest difficulty signal Euler publishes. */
function ratingFromSolvers(solvedBy) {
  const n = Number(solvedBy);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // ~1M solvers → 800, ~1k → 2400, below 100 → 3200 (log scale, clamped).
  return Math.max(800, Math.min(3200, Math.round(3200 - 400 * Math.log10(n))));
}

function parseList(text) {
  const rows = [];
  for (const line of String(text).trim().split("\n")) {
    const parts = line.split("##");
    const id = (parts[0] || "").trim();
    if (!/^\d+$/.test(id)) continue; // header row
    const title = (parts[1] || "").trim();
    if (!title) continue;
    rows.push({
      platform: "euler",
      problem_id: `PE${id}`,
      title,
      url: `${ORIGIN}/problem=${id}`,
      rating: ratingFromSolvers(parts[3]),
      tags: JSON.stringify(["math"]),
      category: "math",
      solved_count: Number(parts[3]) || null,
    });
  }
  return rows;
}

async function list() {
  const rows = parseList(await getText(`${ORIGIN}/minimal=problems`, { timeoutMs: 20000 }));
  if (!rows.length) throw new Error("Project Euler returned no problems");
  return rows;
}

async function statement(problem) {
  const id = String(problem.problem_id).replace(/^PE/i, "");
  if (!/^\d+$/.test(id)) return null;
  let html = await getText(`${ORIGIN}/minimal=${id}`, { timeoutMs: 20000 }).catch(() => "");
  if (!html || html.replace(/<[^>]+>/g, "").trim().length < 10) {
    const $ = load(await getText(`${ORIGIN}/problem=${id}`, { timeoutMs: 20000 }));
    html = $(".problem_content").html() || "";
  }
  if (!html.trim()) return null;
  const out = blank();
  out.statement = html.trim();
  out.extra = { kind: "answer" };
  return out;
}

module.exports = {
  id: "euler",
  name: "Project Euler",
  origin: ORIGIN,
  math: "dollar",
  kind: "answer",
  description: "Project Euler's mathematical problems, rated by how many people have solved them.",
  list,
  statement,
  parseList,
  ratingFromSolvers,
};
