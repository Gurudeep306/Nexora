// AtCoder: the problem list and difficulty estimates come from AtCoder
// Problems (kenkoooo.com, the community-run index everyone uses); statements
// from the task page itself, English section when there is one.
const { getJson, getText, load, preText, normalizeTime, normalizeMemory, blank, section } = require("./common");

const ORIGIN = "https://atcoder.jp";
const INDEX = "https://kenkoooo.com/atcoder/resources";

/**
 * AtCoder Problems' displayed difficulty. Raw estimates below 400 are
 * compressed with the same formula AtCoder uses for ratings
 * (400 / e^((400 − d) / 400)), so they stay positive and ordered.
 */
function displayDifficulty(d) {
  if (d == null || !Number.isFinite(Number(d))) return 0;
  const x = Number(d);
  return Math.max(1, Math.round(x >= 400 ? x : 400 / Math.exp((400 - x) / 400)));
}

function contestKind(contestId) {
  const m = String(contestId).match(/^(abc|arc|agc|ahc)\d+/);
  return m ? m[1] : "other";
}

async function list() {
  const [problems, models] = await Promise.all([getJson(`${INDEX}/problems.json`, { timeoutMs: 45000 }), getJson(`${INDEX}/problem-models.json`, { timeoutMs: 45000 }).catch(() => ({}))]);
  if (!Array.isArray(problems) || !problems.length) throw new Error("AtCoder Problems returned no problems");
  return problems
    .filter((p) => p.id && p.contest_id)
    .map((p) => {
      const model = models[p.id] || {};
      return {
        platform: "atcoder",
        problem_id: p.id,
        title: String(p.name || p.title || p.id).trim(),
        url: `${ORIGIN}/contests/${p.contest_id}/tasks/${p.id}`,
        rating: displayDifficulty(model.difficulty),
        // AtCoder publishes no topic tags; the contest series is the honest category.
        tags: JSON.stringify([]),
        category: contestKind(p.contest_id),
      };
    });
}

/** Parse an AtCoder task page. */
function parse(html) {
  const $ = load(html);
  const task = $("#task-statement").first();
  if (!task.length) return null;
  const out = blank();
  const scope = task.find(".lang-en").length ? task.find(".lang-en").first() : task;

  let statement = "";
  let constraints = "";
  let input = "";
  let output = "";
  let note = "";
  const pending = new Map(); // sample number → { input, output }
  scope.find(".part").each((_, part) => {
    const h = $(part).find("h3").first();
    const heading = h.text().replace(/\s+/g, " ").trim();
    const body = $(part).clone();
    body.find("h3").first().remove();
    const html = (body.html() || "").trim();
    const sample = heading.match(/^sample\s*(input|output)\s*(\d*)/i);
    if (sample) {
      const n = sample[2] || String(pending.size + 1);
      const pre = $(part).find("pre").first();
      const cur = pending.get(n) || { input: "", output: "" };
      cur[sample[1].toLowerCase()] = pre.length ? preText($, pre) : "";
      pending.set(n, cur);
      // Sample explanations sit after the output <pre>.
      if (/output/i.test(sample[1])) {
        const after = $(part).clone();
        after.find("h3, pre").remove();
        const extra = (after.html() || "").replace(/<div[^>]*>\s*<\/div>/g, "").trim();
        if (after.text().trim()) note += `<p><strong>Sample ${n}</strong></p>${extra}`;
      }
    } else if (/^(problem\s*)?statement$|^task$/i.test(heading)) statement += html;
    else if (/^constraints?$/i.test(heading)) constraints += html;
    else if (/^input$|^input and output$/i.test(heading)) input += html;
    else if (/^output$/i.test(heading)) output += html;
    else if (/^(scoring|partial score|notes?|hints?)$/i.test(heading)) note = section(heading, html) + note;
    else if (heading) statement += section(heading, html);
  });
  if (!statement && !input) statement = (scope.html() || "").trim();
  out.statement = statement + section("Constraints", constraints);
  out.inputSpec = section("Input", input);
  out.outputSpec = section("Output", output);
  out.note = note;
  out.samples = [...pending.values()].filter((s) => s.input || s.output);

  // "Time Limit: 2 sec / Memory Limit: 1024 MiB" sits just above the statement.
  const limits = $("#task-statement").parent().text() + " " + $("p:contains('Time Limit')").first().text();
  const tm = limits.match(/Time Limit\s*:\s*([\d.]+\s*(?:sec|s|ms))/i);
  const mm = limits.match(/Memory Limit\s*:\s*([\d.]+\s*(?:KiB|KB|MiB|MB|GiB|GB))/i);
  out.timeLimit = tm ? normalizeTime(tm[1]) : "";
  out.memLimit = mm ? normalizeMemory(mm[1]) : "";
  // Interactive tasks replace Input/Output with one "Input and Output" section.
  if (scope.find("h3").filter((_, e) => /input and output/i.test($(e).text())).length || /this (problem|task) is an interactive/i.test(scope.text())) out.extra.interactive = true;
  return out;
}

async function statement(problem) {
  const url = problem.url && problem.url.startsWith(ORIGIN) ? problem.url : null;
  if (!url) return null;
  const sep = url.includes("?") ? "&" : "?";
  return parse(await getText(`${url}${sep}lang=en`, { timeoutMs: 20000 }));
}

module.exports = {
  id: "atcoder",
  name: "AtCoder",
  origin: ORIGIN,
  math: "var",
  kind: "stdin",
  description: "Every AtCoder task (ABC, ARC, AGC, AHC and more) with difficulty estimates from AtCoder Problems.",
  list,
  statement,
  parse,
  displayDifficulty,
};
