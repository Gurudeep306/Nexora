// CSES Problem Set (cses.fi): ~400 classic problems in sections (Introductory,
// Sorting and Searching, Dynamic Programming, Graph Algorithms …). The list is
// one page; each task page has limits, a markdown-rendered body and examples.
const { getText, load, preText, normalizeTime, normalizeMemory, blank, section } = require("./common");

const ORIGIN = "https://cses.fi";

// Rough difficulty by section, so CSES fits the shared rating filters.
const SECTION_RATING = {
  "introductory problems": 1000,
  "sorting and searching": 1400,
  "dynamic programming": 1600,
  "graph algorithms": 1700,
  "range queries": 1800,
  "tree algorithms": 1800,
  mathematics: 1900,
  "string algorithms": 2000,
  geometry: 2100,
  "advanced techniques": 2400,
  "sliding window problems": 1800,
  "interactive problems": 1900,
  "bitwise operations": 1700,
  "construction problems": 1800,
  "advanced graph problems": 2300,
  "counting problems": 2200,
  "additional problems i": 2200,
  "additional problems ii": 2400,
  "additional problems": 2300,
};

function parseList(html) {
  const $ = load(html);
  const rows = [];
  $("h2").each((_, h) => {
    const name = $(h).text().trim();
    if (!name || /^general$/i.test(name)) return;
    const ul = $(h).nextAll("ul.task-list").first();
    ul.find("li.task a[href*='/problemset/task/']").each((__, a) => {
      const id = ($(a).attr("href") || "").match(/task\/(\d+)/)?.[1];
      if (!id) return;
      rows.push({
        platform: "cses",
        problem_id: `CSES${id}`,
        title: $(a).text().trim(),
        url: `${ORIGIN}/problemset/task/${id}`,
        rating: SECTION_RATING[name.toLowerCase()] || 0,
        tags: JSON.stringify([name.toLowerCase()]),
        category: name,
      });
    });
  });
  return rows;
}

async function list() {
  const rows = parseList(await getText(`${ORIGIN}/problemset/`, { timeoutMs: 20000 }));
  if (!rows.length) throw new Error("CSES returned no problems");
  return rows;
}

function parse(html) {
  const $ = load(html);
  const md = $(".content .md, .md").first();
  if (!md.length) return null;
  const out = blank();
  $(".task-constraints li").each((_, li) => {
    const t = $(li).text().replace(/\s+/g, " ").trim();
    if (/^time limit/i.test(t)) out.timeLimit = normalizeTime(t.replace(/^time limit\s*:?\s*/i, ""));
    if (/^memory limit/i.test(t)) out.memLimit = normalizeMemory(t.replace(/^memory limit\s*:?\s*/i, ""));
  });
  // Walk the body, splitting it at its <h1> headings.
  const parts = { "": "" };
  let cur = "";
  const exampleNodes = [];
  md.children().each((_, el) => {
    if (el.tagName === "h1") {
      cur = $(el).text().trim().toLowerCase();
      parts[cur] = "";
      return;
    }
    if (/^example/.test(cur)) exampleNodes.push(el);
    else parts[cur] = (parts[cur] || "") + $.html(el);
  });
  out.statement = parts[""] + section("Constraints", parts.constraints || "");
  out.inputSpec = section("Input", parts.input || "");
  out.outputSpec = section("Output", parts.output || "");
  if (parts.interaction) {
    out.inputSpec = section("Interaction", parts.interaction);
    out.extra.interactive = true;
  }
  const rest = Object.entries(parts).filter(([k]) => k && !["constraints", "input", "output", "interaction"].includes(k) && !/^example/.test(k));
  for (const [k, v] of rest) out.note += section(k.replace(/^./, (c) => c.toUpperCase()), v);

  // Examples: "Input:" <pre> "Output:" <pre>, possibly several, then an explanation.
  let pendingInput = null;
  let label = "";
  for (const el of exampleNodes) {
    const text = $(el).text().trim();
    if (el.tagName === "pre") {
      if (/^input/i.test(label) || pendingInput == null) pendingInput = preText($, el);
      else {
        out.samples.push({ input: pendingInput, output: preText($, el) });
        pendingInput = null;
      }
    } else {
      label = text;
      if (!/^(input|output):?$/i.test(text) && text) out.note += $.html(el);
    }
  }
  return out;
}

async function statement(problem) {
  const id = String(problem.problem_id).replace(/^CSES/i, "");
  return parse(await getText(`${ORIGIN}/problemset/task/${id}`, { timeoutMs: 20000 }));
}

module.exports = {
  id: "cses",
  name: "CSES",
  origin: ORIGIN,
  math: "paren",
  kind: "stdin",
  description: "The CSES Problem Set: the classic ~400-problem curriculum, grouped by topic.",
  list,
  statement,
  parse,
  parseList,
};
