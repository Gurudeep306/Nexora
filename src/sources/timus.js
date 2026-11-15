// Timus Online Judge (acm.timus.ru): one page lists the whole archive with
// solve counts and difficulty; each problem page has limits and a sample table.
const { getText, load, preText, normalizeTime, normalizeMemory, blank } = require("./common");

const ORIGIN = "https://acm.timus.ru";

function parseList(html) {
  const $ = load(html);
  const rows = [];
  $("tr.content").each((_, tr) => {
    const a = $(tr).find('a[href*="problem.aspx"]').first();
    const num = (a.attr("href") || "").match(/num=(\d+)/)?.[1];
    if (!num) return;
    const cells = $(tr).find("td");
    const solvedBy = Number(cells.eq(4).text().replace(/\D/g, "")) || null;
    // Timus' difficulty column is its own rating (roughly 50–15000+).
    const difficulty = Number(cells.eq(5).text().replace(/\D/g, "")) || 0;
    rows.push({
      platform: "timus",
      problem_id: `T${num}`,
      title: a.text().trim(),
      url: `${ORIGIN}/problem.aspx?space=1&num=${num}&locale=en`,
      rating: difficulty ? Math.max(800, Math.min(3500, Math.round(800 + Math.log10(difficulty) * 600 - 600))) : 0,
      tags: JSON.stringify([]),
      category: "archive",
      solved_count: solvedBy,
    });
  });
  return rows;
}

async function list() {
  const rows = parseList(await getText(`${ORIGIN}/problemset.aspx?space=1&page=all&locale=en`, { timeoutMs: 30000 }));
  if (!rows.length) throw new Error("Timus returned no problems");
  return rows;
}

function parse(html) {
  const $ = load(html);
  const text = $("#problem_text").first();
  if (!text.length) return null;
  const out = blank();
  const limits = $(".problem_limits").text().replace(/\s+/g, " ");
  const tm = limits.match(/Time limit\s*:\s*([\d.]+\s*seconds?)/i);
  const mm = limits.match(/Memory limit\s*:\s*([\d.]+\s*(?:MB|KB))/i);
  out.timeLimit = tm ? normalizeTime(tm[1]) : "";
  out.memLimit = mm ? normalizeMemory(mm[1]) : "";
  text.find("table.sample").each((_, t) => {
    $(t)
      .find("tr")
      .each((__, tr) => {
        const pres = $(tr).find("pre");
        if (pres.length >= 2) out.samples.push({ input: preText($, pres.eq(0)), output: preText($, pres.eq(1)) });
      });
  });
  const body = text.clone();
  body.find("table.sample").remove();
  out.statement = (body.html() || "").trim();
  return out;
}

async function statement(problem) {
  const num = String(problem.problem_id).replace(/^T/i, "");
  return parse(await getText(`${ORIGIN}/problem.aspx?space=1&num=${num}&locale=en`, { timeoutMs: 20000 }));
}

module.exports = {
  id: "timus",
  name: "Timus",
  origin: ORIGIN,
  math: "paren",
  kind: "stdin",
  description: "The Timus Online Judge archive (Ural championships and more), with exact limits.",
  list,
  statement,
  parse,
  parseList,
};
