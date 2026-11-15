// Kattis (open.kattis.com): the paged problem list shows each problem's
// difficulty (1.0–10.0); problem pages carry samples as two-column tables.
const { getText, load, preText, normalizeTime, normalizeMemory, blank, sleep } = require("./common");

const ORIGIN = "https://open.kattis.com";

/** Kattis difficulty 1.0–10.0 mapped onto the shared 800–3500 scale. */
const ratingFromDifficulty = (d) => {
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? Math.round(800 + ((Math.min(10, n) - 1) / 9) * 2700) : 0;
};

function parseList(html) {
  const $ = load(html);
  const rows = [];
  $("table tbody tr").each((_, tr) => {
    const a = $(tr).find('a[href^="/problems/"]').first();
    const id = (a.attr("href") || "").match(/^\/problems\/([a-z0-9_.-]+)$/i)?.[1];
    if (!id) return;
    const diffText = $(tr).find(".difficulty_number, [class*='difficulty']").first().text() || $(tr).text().match(/\b(\d+(?:\.\d)?)\s*(?:-\s*\d+(?:\.\d)?)?\s*(?:Easy|Medium|Hard)?\s*$/i)?.[1] || "";
    const diff = Number(String(diffText).match(/\d+(?:\.\d+)?/)?.[0]);
    rows.push({
      platform: "kattis",
      problem_id: id,
      title: a.text().trim(),
      url: `${ORIGIN}/problems/${id}`,
      rating: ratingFromDifficulty(diff),
      tags: JSON.stringify([]),
      category: "",
    });
  });
  return rows;
}

async function list() {
  const out = new Map();
  for (let page = 0; page < 200; page++) {
    const rows = parseList(await getText(`${ORIGIN}/problems?page=${page}&order=problem_difficulty`, { timeoutMs: 20000 }));
    let added = 0;
    for (const r of rows) if (!out.has(r.problem_id)) out.set(r.problem_id, r), added++;
    if (!added) break;
    await sleep(500);
  }
  if (!out.size) throw new Error("Kattis returned no problems");
  return [...out.values()];
}

function parse(html) {
  const $ = load(html);
  const body = $(".problembody").first();
  if (!body.length) return null;
  const out = blank();
  body.find("table.sample").each((_, t) => {
    const pres = $(t).find("pre");
    if (pres.length >= 2) out.samples.push({ input: preText($, pres.eq(0)), output: preText($, pres.eq(1)) });
  });
  const clean = body.clone();
  clean.find("table.sample").remove();
  out.statement = (clean.html() || "").trim();
  const side = $("body").text().replace(/\s+/g, " ");
  const tm = side.match(/CPU Time limit\s*([\d.]+\s*seconds?)/i);
  const mm = side.match(/Memory limit\s*([\d.]+\s*(?:MB|GB|KB))/i);
  out.timeLimit = tm ? normalizeTime(tm[1]) : "";
  out.memLimit = mm ? normalizeMemory(mm[1]) : "";
  if (/interactive/i.test($(".problembody").text().slice(0, 400)) || $('a[href*="interactive"]').length) out.extra.interactive = true;
  return out;
}

async function statement(problem) {
  return parse(await getText(`${ORIGIN}/problems/${encodeURIComponent(problem.problem_id)}`, { timeoutMs: 20000 }));
}

module.exports = {
  id: "kattis",
  name: "Kattis",
  origin: ORIGIN,
  math: "dollar",
  kind: "stdin",
  description: "Open Kattis: thousands of contest problems (NWERC, NCPC, ICPC regionals) with difficulty scores.",
  list,
  statement,
  parse,
  parseList,
};
