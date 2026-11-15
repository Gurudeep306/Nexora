// SPOJ: the classical problem list (paged HTML table) and the problem page.
// SPOJ statements are free-form: samples are usually one <pre> holding
// "Input:" and "Output:" blocks, sometimes separate titled <pre>s.
const { getText, load, tidySample, normalizeTime, normalizeMemory, blank, sleep } = require("./common");

const ORIGIN = "https://www.spoj.com";

/** One page of the classical list. Exported for tests. */
function parseList(html) {
  const $ = load(html);
  const rows = [];
  $("tr.problemrow").each((_, tr) => {
    const a = $(tr).find('a[href^="/problems/"]').first();
    const code = (a.attr("href") || "").match(/^\/problems\/([^/]+)\/?$/)?.[1];
    if (!code) return;
    const users = Number($(tr).find("td").eq(3).text().replace(/\D/g, "")) || null;
    rows.push({
      platform: "spoj",
      problem_id: code,
      title: a.text().replace(/\s+/g, " ").trim() || code,
      url: `${ORIGIN}/problems/${code}/`,
      rating: 0, // SPOJ publishes no difficulty rating
      tags: JSON.stringify([]),
      category: "classical",
      solved_count: users,
    });
  });
  return rows;
}

async function list() {
  const out = new Map();
  for (let start = 0; start < 20000; start += 50) {
    const html = await getText(`${ORIGIN}/problems/classical/sort=0,start=${start}`, { timeoutMs: 20000 });
    const rows = parseList(html);
    rows.forEach((r) => out.set(r.problem_id, r));
    if (rows.length < 50) break;
    await sleep(400);
  }
  if (!out.size) throw new Error("SPOJ returned no problems");
  return [...out.values()];
}

/** Split "Input:\n1 2\n\nOutput:\n3" into a sample. */
function splitLabelled(text) {
  const t = String(text).replace(/\r\n?/g, "\n");
  const m = t.match(/^\s*(?:sample\s*)?input\s*:?\s*\n([\s\S]*?)\n\s*(?:sample\s*)?output\s*:?\s*\n([\s\S]*?)\s*$/i);
  return m ? { input: tidySample(m[1]), output: tidySample(m[2]) } : null;
}

function parse(html) {
  const $ = load(html);
  const body = $("#problem-body").first();
  if (!body.length) return null;
  const out = blank();
  const samples = [];
  const pres = body.find("pre");
  pres.each((i, el) => {
    const node = $(el).clone();
    node.find("br").replaceWith("\n");
    const text = node.text();
    const both = splitLabelled(text);
    if (both) return void samples.push(both);
    // "Input" / "Output" written as headings just before separate <pre>s.
    const prevLabel = $(el).prevAll("h3, h4, p, b, strong").first().text().trim().toLowerCase();
    if (/input/.test(prevLabel) && !/output/.test(prevLabel)) {
      const next = pres.eq(i + 1);
      const nextLabel = next.prevAll("h3, h4, p, b, strong").first().text().trim().toLowerCase();
      if (next.length && /output/.test(nextLabel)) samples.push({ input: tidySample(text), output: tidySample(next.text()) });
    }
  });
  out.samples = samples;
  out.statement = (body.html() || "").trim();
  const meta = $("#problem-meta").text().replace(/\s+/g, " ");
  const tm = meta.match(/Time limit\s*:\s*([\d.]+\s*s)/i);
  const mm = meta.match(/Memory limit\s*:\s*([\d.]+\s*(?:KB|MB|GB))/i);
  out.timeLimit = tm ? normalizeTime(tm[1]) : "";
  out.memLimit = mm ? normalizeMemory(mm[1]) : "";
  const tags = $("#problem-tags a").map((_, a) => $(a).text().replace(/^#/, "").trim()).get().filter(Boolean);
  if (tags.length) out.extra.tags = tags;
  return out;
}

async function statement(problem) {
  return parse(await getText(`${ORIGIN}/problems/${encodeURIComponent(problem.problem_id)}/`, { timeoutMs: 20000 }));
}

module.exports = {
  id: "spoj",
  name: "SPOJ",
  origin: ORIGIN,
  math: "dollar3",
  kind: "stdin",
  description: "SPOJ's classical problems with time and memory limits and their tags.",
  list,
  statement,
  parse,
  parseList,
};
