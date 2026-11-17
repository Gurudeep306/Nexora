// Codeforces: the official API for the problem list (names, ratings, tags,
// solve counts), the problem page for statements. Codeforces sits behind
// Cloudflare, which usually refuses servers, so statements fall back to the
// open dataset (./cf-dataset.js) and then to an archived copy of the page.
const { getJson, getText, load, preText, normalizeTime, normalizeMemory, blank } = require("./common");

const ORIGIN = "https://codeforces.com";

async function list() {
  // lang=en: without it the API can answer in Russian (seen on a live sync).
  const data = await getJson(`${ORIGIN}/api/problemset.problems?lang=en`, { timeoutMs: 45000 });
  if (data.status !== "OK" || !Array.isArray(data.result?.problems)) throw new Error(`Codeforces API: ${data.comment || "unexpected answer"}`);
  const solved = new Map((data.result.problemStatistics || []).map((s) => [`${s.contestId}${s.index}`, s.solvedCount]));
  return data.result.problems
    .filter((p) => p.contestId && p.index && p.name)
    .map((p) => ({
      platform: "codeforces",
      problem_id: `${p.contestId}${p.index}`,
      title: p.name,
      url: `${ORIGIN}/problemset/problem/${p.contestId}/${p.index}`,
      rating: Number(p.rating) || 0,
      tags: JSON.stringify(p.tags || []),
      category: (p.tags && p.tags[0]) || "",
      solved_count: solved.get(`${p.contestId}${p.index}`) ?? null,
    }));
}

/** "1850G" → { contest: "1850", index: "G" }; indexes can be A, B1, F2 … */
function splitId(problemId) {
  const m = String(problemId || "").match(/^(\d+)([A-Z][0-9]?)$/i);
  return m ? { contest: m[1], index: m[2].toUpperCase() } : null;
}

function problemUrl(problem, host = ORIGIN) {
  const p = splitId(problem.problem_id);
  return p ? `${host}/problemset/problem/${p.contest}/${p.index}` : problem.url;
}

/** Parse a Codeforces problem page (live, mirror or archived). */
function parse(html) {
  const $ = load(html);
  // Strip the Wayback toolbar if this came from the archive.
  $('[id^="wm-"], [class^="wm-"], #donato, #playback').remove();
  const st = $(".problem-statement").first();
  if (!st.length) return null;
  const out = blank();
  const prop = (sel) => {
    const el = st.find(sel).first().clone();
    el.find(".property-title").remove();
    return el.text().trim();
  };
  out.timeLimit = normalizeTime(prop(".header .time-limit"));
  out.memLimit = normalizeMemory(prop(".header .memory-limit"));
  const io = [prop(".header .input-file"), prop(".header .output-file")];
  if (io.some((x) => x && !/standard/i.test(x))) out.extra.files = { input: io[0], output: io[1] };

  out.inputSpec = st.find(".input-specification").html() || "";
  out.outputSpec = st.find(".output-specification").html() || "";
  out.note = st.find(".note").html() || "";
  const sectionTitles = st.find(".section-title").map((_, e) => $(e).text().trim().toLowerCase()).get();
  if (sectionTitles.includes("interaction")) out.extra.interactive = true;

  const body = st.clone();
  body.find(".header, .input-specification, .output-specification, .sample-tests, .note").remove();
  out.statement = (body.html() || "").trim();

  st.find(".sample-test").each((_, block) => {
    const ins = $(block).find(".input pre");
    const outs = $(block).find(".output pre");
    ins.each((i, el) => {
      out.samples.push({ input: preText($, el), output: outs.eq(i).length ? preText($, outs.eq(i)) : "" });
    });
  });
  return out;
}

async function statement(problem) {
  // 1. The live page (it has the pictures), when Codeforces lets us in — briefly.
  // 2. The open dataset (open-r1/codeforces, CC BY 4.0): text, maths, examples, limits.
  // 3. An archived copy of the page, for problems the dataset doesn't have.
  // The old mirror step is gone: mirror.codeforces.com no longer answers, and
  // waiting on it made every blocked problem take ~45 s to fail.
  const tries = [
    async () => parse(await getText(problemUrl(problem), { timeoutMs: 10000, retries: 0 })),
    async () => require("./cf-dataset").statement(problem),
    async () => {
      const avail = await getJson(`https://archive.org/wayback/available?url=${encodeURIComponent(problemUrl(problem))}`, { timeoutMs: 12000, retries: 0 });
      const snap = avail?.archived_snapshots?.closest;
      if (!snap?.available || !snap.url) throw new Error("No archived copy");
      return parse(await getText(snap.url.replace(/^http:/, "https:"), { timeoutMs: 20000, retries: 0 }));
    },
  ];
  let firstErr;
  for (const t of tries) {
    try {
      const data = await t();
      if (data && data.statement.replace(/<[^>]+>/g, "").trim().length > 10) return data;
    } catch (e) {
      if (process.env.DEBUG_SOURCES) console.error(`[codeforces] ${problem.problem_id} step failed:`, e.message);
      firstErr ||= e; // the problem page's own answer is the one worth reporting
    }
  }
  if (firstErr) throw firstErr;
  return null;
}

module.exports = {
  id: "codeforces",
  name: "Codeforces",
  origin: ORIGIN,
  math: "dollar3",
  kind: "stdin",
  description: "The official Codeforces API: every problemset problem with its rating, tags and solve count.",
  list,
  statement,
  parse,
  splitId,
  problemUrl,
};
