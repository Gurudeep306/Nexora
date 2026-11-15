// DMOJ (dmoj.ca): the public JSON API (v2) lists problems with points and
// types and gives exact limits; the statement is the problem page's
// rendered description, with samples under "Sample Input"/"Sample Output".
const { getJson, getText, load, preText, normalizeTime, blank, sleep } = require("./common");

const ORIGIN = "https://dmoj.ca";

/** DMOJ points (3–50) are its difficulty; mapped onto the shared scale. */
const ratingFromPoints = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(800, Math.min(3500, Math.round(800 + (n - 3) * 50)));
};

async function list() {
  const rows = [];
  for (let page = 1; page < 200; page++) {
    const j = await getJson(`${ORIGIN}/api/v2/problems?page=${page}`, { timeoutMs: 30000 });
    const d = j?.data || {};
    for (const p of d.objects || []) {
      if (!p.code || p.is_organization_private || p.is_public === false) continue;
      rows.push({
        platform: "dmoj",
        problem_id: p.code,
        title: String(p.name || p.code).trim(),
        url: `${ORIGIN}/problem/${p.code}`,
        rating: ratingFromPoints(p.points),
        tags: JSON.stringify((p.types || []).map((t) => String(t).toLowerCase())),
        category: String(p.group || ""),
      });
    }
    if (!d.has_more) break;
    await sleep(300);
  }
  if (!rows.length) throw new Error("DMOJ returned no problems");
  return rows;
}

function parse(html) {
  const $ = load(html);
  const desc = $(".content-description").first();
  if (!desc.length) return null;
  const out = blank();
  // Pair "Sample Input N" with "Sample Output N" by their headings.
  const byNum = new Map();
  desc.find("h1, h2, h3, h4, h5").each((_, h) => {
    const m = $(h).text().trim().match(/^sample\s*(input|output)\s*(\d*)/i);
    if (!m) return;
    const pre = $(h).nextAll("pre, .codehilite").first();
    const el = pre.is("pre") ? pre : pre.find("pre").first();
    if (!el.length) return;
    const n = m[2] || "1";
    const cur = byNum.get(n) || { input: "", output: "" };
    cur[m[1].toLowerCase()] = preText($, el);
    byNum.set(n, cur);
  });
  out.samples = [...byNum.values()].filter((s) => s.input || s.output);
  out.statement = (desc.html() || "").trim();
  if (/interactive/i.test($(".problem-info-entry, .problem-types").text())) out.extra.interactive = true;
  return out;
}

async function statement(problem) {
  const code = encodeURIComponent(problem.problem_id);
  const [html, api] = await Promise.all([getText(`${ORIGIN}/problem/${code}`, { timeoutMs: 20000 }), getJson(`${ORIGIN}/api/v2/problem/${code}`, { timeoutMs: 20000 }).catch(() => null)]);
  const out = parse(html);
  if (!out) return null;
  const o = api?.data?.object;
  if (o) {
    if (o.time_limit) out.timeLimit = normalizeTime(`${o.time_limit} s`);
    if (o.memory_limit) out.memLimit = `${Math.round(Number(o.memory_limit) / 1024)} MB`;
    if (Array.isArray(o.types) && o.types.length) out.extra.tags = o.types;
    if (o.points) out.extra.points = o.points;
  }
  return out;
}

module.exports = {
  id: "dmoj",
  name: "DMOJ",
  origin: ORIGIN,
  math: "tilde",
  kind: "stdin",
  description: "DMOJ's public problems (CCC, COCI, IOI and more) with exact limits from its API.",
  list,
  statement,
  parse,
  ratingFromPoints,
};
