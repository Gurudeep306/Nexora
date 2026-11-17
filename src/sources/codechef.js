// CodeChef: the practice list API for problems, the problem API for statements.
// Statements come back as Markdown with TeX ($…$), split into components
// (statement, input format, output format, constraints, samples with
// explanations); they are rendered to HTML here.
const { getJson, markdown, looksHtml, tidySample, normalizeTime, blank, section, sleep } = require("./common");

const ORIGIN = "https://www.codechef.com";
const JSON_HEADERS = { "X-Requested-With": "XMLHttpRequest" };

/**
 * CodeChef's tag lists mix real topics with the author's handle, the contest
 * code ("start187", "cook142") and difficulty words ("cakewalk"). Keep topics.
 */
const NOT_TOPICS = new Set(["cakewalk", "simple", "easy", "easy-medium", "medium", "medium-hard", "hard", "challenge", "practice", "rated"]);
function topicTags(list, authors = []) {
  const who = new Set(authors.filter(Boolean).map((a) => String(a).toLowerCase()));
  return [...new Set(list.map((t) => String(t || "").trim()).filter(Boolean))].filter((t) => {
    const k = t.toLowerCase();
    if (who.has(k) || NOT_TOPICS.has(k)) return false;
    if (/^[a-z]{2,10}\d{1,4}[a-z]?$/.test(k)) return false; // contest codes: start187, cook142, ltime99, june21
    if (/^[a-z0-9_]+$/.test(k) && /\d/.test(k) && !/^\d+d$/.test(k)) return false; // handles like iceknight1093
    return true;
  });
}

const toRow = (p, fallbackCategory = "") => {
  const code = String(p.code || p.problem_code || "").trim();
  if (!code) return null;
  const tags = [...(Array.isArray(p.tags) ? p.tags : []), ...(Array.isArray(p.user_tags) ? p.user_tags : [])]
    .map((t) => (typeof t === "string" ? t : t?.tag || t?.name || ""))
    .filter(Boolean);
  return {
    platform: "codechef",
    problem_id: code,
    title: String(p.name || p.problem_name || code).trim(),
    url: `${ORIGIN}/problems/${code}`,
    rating: Math.round(Number(p.difficulty_rating) || 0),
    tags: JSON.stringify(topicTags(tags, [p.author, p.problem_author, p.setter]).slice(0, 12)),
    category: String(p.category || fallbackCategory || "").toLowerCase(),
  };
};

/** Every practice problem, paged; tries the current list endpoint, then the older per-category one. */
async function list() {
  const seen = new Map();
  const add = (rows) => rows.forEach((r) => r && !seen.has(r.problem_id) && seen.set(r.problem_id, r));
  let primaryOk = false;
  try {
    for (let page = 0; page < 200; page++) {
      const url = `${ORIGIN}/api/list/problems?page=${page}&limit=100&sort_by=difficulty_rating&sort_order=asc&search=&category=rated&start_rating=0&end_rating=5000&topic=&tags=&group=all`;
      const data = await getJson(url, { headers: JSON_HEADERS, timeoutMs: 30000 });
      const items = Array.isArray(data.data) ? data.data : [];
      if (!items.length) break;
      primaryOk = true;
      add(items.map((p) => toRow(p, "rated")));
      if (items.length < 100) break;
      await sleep(250);
    }
  } catch (e) {
    if (!primaryOk) console.warn("[codechef] list endpoint failed, trying the per-category one:", e.message);
  }
  for (const category of ["school", "easy", "medium", "hard", "challenge", "extcontest"]) {
    try {
      for (let page = 0; page < 60; page++) {
        const url = `${ORIGIN}/api/list/problems/practice?page=${page}&limit=200&sort_by=difficulty_rating&sort_order=asc&search=&category=${category}&start_rating=0&end_rating=5000`;
        const data = await getJson(url, { headers: JSON_HEADERS, timeoutMs: 30000 });
        const items = Array.isArray(data.data) ? data.data : [];
        if (!items.length) break;
        add(items.map((p) => toRow(p, category)));
        if (items.length < 200) break;
        await sleep(250);
      }
    } catch {
      /* this category isn't served any more */
    }
  }
  if (!seen.size) throw new Error("CodeChef returned no problems");
  return [...seen.values()];
}

const md = (s) => (looksHtml(s) ? String(s || "") : markdown(s));

/** Parse the problem API's JSON. */
function parse(data) {
  if (!data || data.status === "error" || data.status === "failure") return null;
  const c = data.problemComponents || {};
  const out = blank();
  const hasComponents = !!(c.statement || c.inputFormat || c.outputFormat);
  if (hasComponents) {
    out.statement = md(c.statement || "") + section("Constraints", c.constraints ? md(c.constraints) : "") + section("Subtasks", c.subtasks ? md(c.subtasks) : "");
    out.inputSpec = section("Input", c.inputFormat ? md(c.inputFormat) : "");
    out.outputSpec = section("Output", c.outputFormat ? md(c.outputFormat) : "");
  } else {
    // Older problems: one markdown body with the sample inside it.
    out.statement = md(data.body || "");
  }
  const cases = (Array.isArray(c.sampleTestCases) ? c.sampleTestCases : []).filter((t) => !t?.isDeleted && (t?.input || t?.output));
  out.samples = cases.map((t) => ({ input: tidySample(t.input), output: tidySample(t.output) }));
  const explanations = cases
    .map((t, i) => (t.explanation ? `<p><strong>Sample ${cases.length > 1 ? i + 1 : ""} explanation</strong></p>${md(t.explanation)}` : ""))
    .filter(Boolean);
  out.note = explanations.join("");
  // max_timelimit is in seconds; CodeChef doesn't publish a memory limit per problem.
  out.timeLimit = data.max_timelimit ? normalizeTime(`${data.max_timelimit} s`) : "";
  out.memLimit = "";
  const tags = topicTags([...(data.user_tags || []), ...(data.computed_tags || [])].filter((t) => typeof t === "string"), [data.problem_author, data.author, data.setter]);
  if (tags.length) out.extra.tags = tags;
  if (data.difficulty_rating) out.extra.rating = Number(data.difficulty_rating) || undefined;
  return out;
}

async function statement(problem) {
  const code = encodeURIComponent(problem.problem_id);
  let lastErr;
  for (const contest of ["PRACTICE"]) {
    try {
      const data = await getJson(`${ORIGIN}/api/contests/${contest}/problems/${code}`, { headers: JSON_HEADERS, timeoutMs: 20000 });
      const out = parse(data);
      if (out && out.statement.replace(/<[^>]+>/g, "").trim().length > 10) return out;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

module.exports = {
  topicTags,
  id: "codechef",
  name: "CodeChef",
  origin: ORIGIN,
  math: "dollar",
  kind: "stdin",
  // CodeChef publishes a time limit per problem, but no memory limit.
  publishes: { memoryLimit: false },
  description: "CodeChef practice problems with their difficulty ratings and tags.",
  list,
  statement,
  parse,
};
