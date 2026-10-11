/* Function tools the chat agent may call.
   - Every handler runs inside runAs(<session user>) so per-user queries (me())
     only ever see the signed-in student's data — never a name the model or the
     request body picked.
   - Results are JSON, capped (~4 KB), and handed back to the model wrapped in a
     <data source="tool:..."> block: tool output is data, not instructions.
   - suggest_navigation only accepts real client routes (client/src/App.tsx);
     an accepted suggestion becomes an `action` event for the UI. */
const { runAs } = require("../context");
const D = require("./data");
const { data: dataBlock } = require("./prompts");
const { findGateQuestion, searchGateQuestions } = require("../routes/gate");
const { findProblem: findLearnProblem } = require("../routes/learn");

const RESULT_MAX = 4000;

/* Mirrors the routes in client/src/App.tsx (signed-in area). */
const ROUTES = [
  /^\/hub$/,
  /^\/problems$/,
  /^\/solve\/\d+$/,
  /^\/solve\/(custom|learn)\/[A-Za-z0-9_-]{1,80}$/,
  /^\/contests$/,
  /^\/workshop$/,
  /^\/nexus$/,
  /^\/analytics$/,
  /^\/achievements$/,
  /^\/ailab$/,
  /^\/learn$/,
  /^\/learn\/system-design\/[a-z0-9-]{1,60}(\/\d{1,3})?$/,
  /^\/learn\/dsa\/[a-z0-9-]{1,60}\/practice$/,
  /^\/learn\/dsa\/[a-z0-9-]{1,60}(\/[a-z0-9-]{1,60})?$/,
  /^\/gate$/,
  /^\/gate\/cbt(\/[A-Za-z0-9_-]{1,60})?$/,
  /^\/social$/,
  /^\/submissions$/,
  /^\/bookmarks$/,
  /^\/profile(\/[A-Za-z0-9_.-]{1,40})?$/,
  /^\/settings$/,
];

function validNavPath(p) {
  const path = String(p || "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 120) return null;
  const [pathname, query = ""] = path.split("?");
  if (!ROUTES.some((re) => re.test(pathname))) return null;
  if (query && !/^[A-Za-z0-9_=&%.-]{1,80}$/.test(query)) return null;
  return query ? `${pathname}?${query}` : pathname;
}

const fn = (name, description, properties = {}, required = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
});

const DEFINITIONS = [
  fn(
    "search_problems",
    "Search the problem library (Codeforces, CodeChef, AtCoder, LeetCode, SPOJ, Project Euler) with the student's solve status.",
    {
      query: { type: "string", description: "words in the title or problem code" },
      tags: { type: "array", items: { type: "string" }, description: "e.g. dp, graphs, greedy" },
      minRating: { type: "integer" },
      maxRating: { type: "integer" },
      platform: { type: "string" },
      status: { type: "string", enum: ["all", "unsolved", "attempted", "solved"] },
      limit: { type: "integer", minimum: 1, maximum: 20 },
    },
  ),
  fn("get_problem", "Get one library problem by its numeric id: metadata, the student's status and the statement text.", { id: { type: "integer" } }, ["id"]),
  fn("get_user_stats", "The signed-in student's own totals: solved, attempted, XP, accuracy, solved count by rating."),
  fn("get_weak_tags", "The signed-in student's topics (tags) ordered weakest first, with solve rates."),
  fn(
    "recommend_problems",
    "Pick unsolved practice problems pitched just above the student's level, optionally for one tag.",
    { tag: { type: "string" }, count: { type: "integer", minimum: 1, maximum: 10 } },
  ),
  fn(
    "get_submissions",
    "The student's own recent submissions (verdicts and times, no code), optionally for one problem.",
    { problemId: { type: "integer" }, limit: { type: "integer", minimum: 1, maximum: 10 } },
  ),
  fn(
    "get_gate_question",
    "One GATE past-year question by id. The worked solution is only included when includeSolution is true and the student is reviewing, not sitting a mock exam.",
    { id: { type: "string" }, includeSolution: { type: "boolean" } },
    ["id"],
  ),
  fn(
    "search_gate",
    "Search GATE CSE/DA past-year questions by words, subject code and year.",
    { q: { type: "string" }, subject: { type: "string" }, year: { type: "integer" }, limit: { type: "integer", minimum: 1, maximum: 20 } },
  ),
  fn(
    "get_learn_content",
    "A Nexora Learn course coding problem by slug: title, topic, difficulty and statement (no solutions).",
    { slug: { type: "string" } },
    ["slug"],
  ),
  fn(
    "suggest_navigation",
    "Offer the student a button that opens a Nexora page, e.g. /solve/123, /learn/dsa/arrays, /gate, /analytics. Only real Nexora paths.",
    { path: { type: "string" }, label: { type: "string", description: "short button text" } },
    ["path", "label"],
  ),
];

const HANDLERS = {
  search_problems: (a) => D.searchProblems(a),
  get_problem: async (a) => (await D.getProblem(a.id)) || { error: "No problem with that id" },
  get_user_stats: () => D.getUserStats(),
  get_weak_tags: async () => {
    const { analysis } = await D.weaknessAnalysis({ recommend: false });
    return { weakest: analysis.slice(0, 10), strongest: analysis.slice(-5).reverse() };
  },
  recommend_problems: (a) => D.recommendProblems(a),
  get_submissions: (a) => D.getSubmissions(a),
  get_gate_question: (a, ctx) => {
    const q = findGateQuestion(a.id);
    if (!q) return { error: "No GATE question with that id" };
    const inExam = /^\/gate\/cbt\/.+/.test(String(ctx.page?.path || ""));
    const { solution, answer, answerSource, reviewNote, needsReview, ...rest } = q;
    if (a.includeSolution && !inExam) return { ...rest, answer, solution: String(solution || "").slice(0, 2500) };
    return { ...rest, note: inExam ? "Solution hidden during a mock exam." : "Solution withheld; ask for it explicitly to review." };
  },
  search_gate: (a) =>
    searchGateQuestions(a).map((q) => ({
      id: q.id,
      year: q.year,
      subject: q.subject,
      topic: q.topic,
      marks: q.marks,
      type: q.type,
      text: String(q.text || "").slice(0, 240),
    })),
  get_learn_content: (a) => {
    const p = findLearnProblem(String(a.slug || "").slice(0, 80));
    if (!p) return { error: "No course problem with that slug" };
    return {
      slug: p.slug,
      title: p.title,
      topic: p.topic,
      difficulty: p.difficulty,
      tags: p.tags,
      statement: D.plainText(p.statement).slice(0, 3000),
      input: D.plainText(p.input_spec).slice(0, 600),
      output: D.plainText(p.output_spec).slice(0, 600),
      open: `/solve/learn/${p.slug}`,
    };
  },
  suggest_navigation: (a) => {
    const path = validNavPath(a.path);
    if (!path) return { error: `"${String(a.path).slice(0, 80)}" is not a Nexora page; do not suggest it.` };
    return { ok: true, action: { type: "navigate", path, label: String(a.label || "Open").slice(0, 60) } };
  },
};

function capJson(value) {
  let s;
  try {
    s = JSON.stringify(value);
  } catch {
    s = JSON.stringify({ error: "unserialisable result" });
  }
  if (s === undefined) s = "null";
  return s.length > RESULT_MAX ? `${s.slice(0, RESULT_MAX)}…(truncated)` : s;
}

/**
 * Run one tool call as `username`.
 * Returns { content (wrapped, for the model), result (raw), action?, ok }.
 */
async function runTool(call, { username, page } = {}) {
  const name = call?.function?.name || call?.name;
  const handler = HANDLERS[name];
  let args = {};
  try {
    const raw = call?.function?.arguments ?? call?.arguments ?? "{}";
    args = typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {};
    if (!args || typeof args !== "object" || Array.isArray(args)) args = {};
  } catch {
    args = null;
  }
  let result;
  let ok = true;
  if (!handler) {
    result = { error: `Unknown tool ${String(name).slice(0, 40)}` };
    ok = false;
  } else if (args === null) {
    result = { error: "Arguments were not valid JSON" };
    ok = false;
  } else {
    try {
      result = await runAs(username, () => handler(args, { page }));
      if (result && typeof result === "object" && !Array.isArray(result) && result.error) ok = false;
    } catch (e) {
      result = { error: `Tool failed: ${String(e?.message || e).slice(0, 160)}` };
      ok = false;
    }
  }
  const action = name === "suggest_navigation" && ok ? result.action : null;
  return { name, ok, result, action, content: dataBlock(`tool:${name}`, capJson(result), RESULT_MAX + 40) };
}

module.exports = { DEFINITIONS, HANDLERS, runTool, validNavPath, ROUTES };
