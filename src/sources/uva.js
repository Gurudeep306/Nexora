// UVa Online Judge: the uHunt API lists every problem (number, title, solve
// counts). Statements live on onlinejudge.org as HTML (most problems) or PDF.
const { getJson, getText, load, preText, blank } = require("./common");

const ORIGIN = "https://onlinejudge.org";
const vol = (num) => Math.floor(Number(num) / 100);

/** Difficulty from the share of users who solved it (dacu = distinct accepted users). */
function ratingFromAcceptedUsers(dacu) {
  const n = Number(dacu);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(800, Math.min(3200, Math.round(3200 - 520 * Math.log10(n))));
}

async function list() {
  const data = await getJson("https://uhunt.onlinejudge.org/api/p", { timeoutMs: 45000 });
  if (!Array.isArray(data) || !data.length) throw new Error("uHunt returned no problems");
  // Each row: [pid, num, title, dacu, mrun, mrun_time, mrun_mem, nosol, …]
  return data
    .filter((r) => Array.isArray(r) && r[1] && r[2])
    .map((r) => ({
      platform: "uva",
      problem_id: `UVA${r[1]}`,
      title: String(r[2]).trim(),
      url: `${ORIGIN}/index.php?option=com_onlinejudge&Itemid=8&page=show_problem&problem=${r[0]}`,
      rating: ratingFromAcceptedUsers(r[3]),
      tags: JSON.stringify([]),
      category: `volume ${vol(r[1])}`,
      solved_count: Number(r[3]) || null,
    }));
}

function parse(html) {
  const $ = load(html);
  $("script, style").remove();
  const body = $("body").first();
  if (!body.length || body.text().trim().length < 30) return null;
  const out = blank();
  // "Sample Input" / "Sample Output" headings each followed by a <pre>.
  let input = null;
  body.find("h2, h3, h4, b, strong, p, font").each((_, h) => {
    const t = $(h).text().trim();
    const pre = $(h).nextAll("pre").first();
    if (!pre.length) return;
    if (/^sample\s*input/i.test(t)) input = preText($, pre);
    else if (/^sample\s*output/i.test(t) && input != null) {
      out.samples.push({ input, output: preText($, pre) });
      input = null;
    }
  });
  out.statement = (body.html() || "").trim();
  return out;
}

async function statement(problem) {
  const num = String(problem.problem_id).replace(/^UVA/i, "");
  try {
    const out = parse(await getText(`${ORIGIN}/external/${vol(num)}/${num}.html`, { timeoutMs: 20000, retries: 1 }));
    if (out) return out;
  } catch {
    /* PDF only */
  }
  const out = blank();
  const pdf = `${ORIGIN}/external/${vol(num)}/${num}.pdf`;
  out.statement = `<p>This problem's statement is a PDF.</p><p><a href="${pdf}" target="_blank" rel="noopener">Open the statement (PDF)</a></p>`;
  out.extra = { pdf };
  return out;
}

module.exports = {
  id: "uva",
  name: "UVa",
  origin: ORIGIN,
  math: "dollar3",
  kind: "stdin",
  description: "The UVa Online Judge archive via uHunt, rated by how many people solved each problem.",
  list,
  statement,
  parse,
  ratingFromAcceptedUsers,
};
