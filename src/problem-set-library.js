// The built-in problem set library: famous series and company sets, made by
// scripts/problem-sets/build-library.mjs from public data and stored in
// content/problem-sets/library.json.
//
//   series     public lists (NeetCode's MIT-licensed data, LeetCode's free
//              study plans, AtCoder's well-known sets, Project Euler).
//   companies  one set per company that ran or sponsored real programming
//              contests on AtCoder or Codeforces, titled with the company name.
//
// Each problem is matched to our catalog by platform and problem id. A problem
// we don't have stays in the set as a link to the original.
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "content", "problem-sets", "library.json");
let lib = null;

/** The library file, read once. An unreadable file means an empty library. */
function library() {
  if (lib) return lib;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    lib = { series: Array.isArray(raw.series) ? raw.series : [], companies: Array.isArray(raw.companies) ? raw.companies : [] };
  } catch (e) {
    console.error("[problem-set-library]", e.message);
    lib = { series: [], companies: [] };
  }
  return lib;
}

/** platform:problem_id → catalog row, built once per catalog. */
function keyMap(catalog) {
  if (!catalog.memo.has("set-library-keys")) {
    catalog.memo.set("set-library-keys", new Map(catalog.rows.map((r) => [`${r.platform}:${r.problem_id}`, r])));
  }
  return catalog.memo.get("set-library-keys");
}

/** A library set's items, flat, in order: { section, row } or { section, link }. */
function resolve(set, catalog) {
  const keys = keyMap(catalog);
  const out = [];
  for (const sec of set.sections || []) {
    for (const it of sec.items || []) {
      const row = keys.get(`${it.platform}:${it.problemId}`);
      out.push(row ? { section: sec.name || "", row } : { section: sec.name || "", link: { title: it.title, url: it.url } });
    }
  }
  return out;
}

const findSeries = (id) => library().series.find((s) => s.id === id) || null;
const findCompany = (name) => {
  const n = String(name || "").toLowerCase();
  return library().companies.find((c) => c.company.toLowerCase() === n) || null;
};

module.exports = { library, resolve, findSeries, findCompany, FILE };
