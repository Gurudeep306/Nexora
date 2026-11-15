// LeetCode: the GraphQL API (with the long-standing REST list as a fallback)
// for problems; contest ratings from zerotrac's public dataset, which
// estimates each contest problem's Elo from real contestant results.
// LeetCode problems are functions, not stdin programs, so their examples and
// starter code are kept as metadata instead of being run as stdin samples.
const { getJson, http, load, blank, sleep } = require("./common");

const ORIGIN = "https://leetcode.com";
const GQL = `${ORIGIN}/graphql`;
const DIFF = { Easy: 1200, Medium: 1600, Hard: 2100 };
const DIFF_LEVEL = { 1: "Easy", 2: "Medium", 3: "Hard" };

async function gql(query, variables) {
  const res = await http(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: `${ORIGIN}/problemset/`, Origin: ORIGIN },
    body: JSON.stringify({ query, variables }),
    timeoutMs: 30000,
  });
  if (!res.ok) throw new Error(`LeetCode GraphQL: HTTP ${res.status}`);
  const j = await res.json();
  if (j.errors?.length) throw new Error(`LeetCode GraphQL: ${j.errors[0].message}`);
  return j.data;
}

const LIST_QUERY = `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
    total: totalNum
    questions: data { questionFrontendId title titleSlug difficulty topicTags { name } paidOnly: isPaidOnly }
  }
}`;

async function ratings() {
  try {
    const data = await getJson("https://zerotrac.github.io/leetcode_problem_rating/data.json", { timeoutMs: 30000 });
    return new Map((Array.isArray(data) ? data : []).filter((r) => r.TitleSlug && r.Rating).map((r) => [r.TitleSlug, Math.round(Number(r.Rating))]));
  } catch {
    return new Map();
  }
}

async function list() {
  const elo = await ratings();
  const out = [];
  const row = (q, tags) => {
    const slug = q.titleSlug;
    return {
      platform: "leetcode",
      problem_id: `LC${q.questionFrontendId}`,
      title: q.title,
      url: `${ORIGIN}/problems/${slug}/`,
      // A measured contest rating when one exists, else the difficulty band.
      rating: elo.get(slug) || DIFF[q.difficulty] || 1500,
      tags: JSON.stringify(tags),
      category: String(q.difficulty || "medium").toLowerCase(),
    };
  };
  try {
    for (let skip = 0; skip < 10000; skip += 100) {
      const d = await gql(LIST_QUERY, { categorySlug: "", skip, limit: 100, filters: {} });
      const page = d?.problemsetQuestionList;
      const qs = page?.questions || [];
      if (!qs.length) break;
      for (const q of qs) if (!q.paidOnly) out.push(row(q, (q.topicTags || []).map((t) => t.name)));
      if (skip + 100 >= (page.total || 0)) break;
      await sleep(250);
    }
  } catch (e) {
    console.warn("[leetcode] GraphQL list failed, using the REST list:", e.message);
  }
  if (out.length) return out;
  // Fallback: the REST list (no tags).
  const data = await getJson(`${ORIGIN}/api/problems/all/`, { timeoutMs: 45000 });
  for (const p of data.stat_status_pairs || []) {
    if (p.paid_only || !p.stat) continue;
    out.push(row({ questionFrontendId: p.stat.frontend_question_id, title: p.stat.question__title, titleSlug: p.stat.question__title_slug, difficulty: DIFF_LEVEL[p.difficulty?.level] }, []));
  }
  if (!out.length) throw new Error("LeetCode returned no problems");
  return out;
}

const Q_QUERY = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId title content difficulty isPaidOnly
    exampleTestcaseList sampleTestCase metaData hints
    topicTags { name }
    codeSnippets { lang langSlug code }
  }
}`;

/**
 * Examples as LeetCode writes them in the description: the older
 * <pre><strong>Input:</strong> … <strong>Output:</strong> …</pre> blocks and
 * the newer <div class="example-block"> ones.
 */
function examples(content) {
  const $ = load(content || "");
  const out = [];
  const grab = (text) => {
    const t = text.replace(/ /g, " ");
    const i = t.match(/Input\s*:\s*([\s\S]*?)\s*Output\s*:/i);
    const o = t.match(/Output\s*:\s*([\s\S]*?)(?:\s*Explanation\s*:|$)/i);
    const e = t.match(/Explanation\s*:\s*([\s\S]*)$/i);
    if (i && o) out.push({ input: i[1].trim(), output: o[1].trim(), explanation: e ? e[1].trim() : "" });
  };
  $(".example-block").each((_, el) => grab($(el).text()));
  if (!out.length) $("pre").each((_, el) => grab($(el).text()));
  return out;
}

async function statement(problem) {
  const slug = String(problem.url || "").match(/\/problems\/([^/]+)/)?.[1];
  if (!slug) return null;
  const d = await gql(Q_QUERY, { titleSlug: slug });
  const q = d?.question;
  if (!q || !q.content) return null;
  const out = blank();
  out.statement = q.content;
  const hints = Array.isArray(q.hints) ? q.hints.filter(Boolean) : [];
  out.note = hints.length ? `<div class="section-title">Hints</div><ol>${hints.map((h) => `<li>${h}</li>`).join("")}</ol>` : "";
  let meta = {};
  try {
    meta = JSON.parse(q.metaData || "{}");
  } catch {
    /* not JSON */
  }
  out.extra = {
    kind: "function",
    difficulty: q.difficulty,
    tags: (q.topicTags || []).map((t) => t.name),
    examples: examples(q.content),
    exampleInputs: String(q.exampleTestcaseList ? q.exampleTestcaseList.join("\n---\n") : q.sampleTestCase || ""),
    signature: meta?.name ? { name: meta.name, params: meta.params || [], returns: meta.return?.type || null } : null,
    snippets: Object.fromEntries((q.codeSnippets || []).map((s) => [s.langSlug, s.code])),
  };
  return out;
}

module.exports = {
  id: "leetcode",
  name: "LeetCode",
  origin: ORIGIN,
  math: "dollar3",
  kind: "function",
  description: "Free LeetCode problems with tags, starter code and real contest ratings where they exist.",
  list,
  statement,
  examples,
};
