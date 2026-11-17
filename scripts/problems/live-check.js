// Import a few real problems from every source into a scratch database and
// show what came back (statement, samples, limits, tags, rating, images
// stored) — then run the audit on it. Never touches the real database.
//
//   DB_PATH=/tmp/nexora-import-check.db node scripts/problems/live-check.js [count] [source…]
//
// Uses each source's normal path (official APIs and open datasets first); a
// judge that blocks servers is reported as blocked, never worked around.
const path = require("path");
if (!process.env.DB_PATH || process.env.DB_PATH === ":memory:" || /nexora\.db$/.test(process.env.DB_PATH)) {
  console.error("Set DB_PATH to a scratch file, e.g. DB_PATH=/tmp/nexora-import-check.db");
  process.exit(2);
}
const { initDb } = require(path.join(__dirname, "../../src/db"));
const sources = require(path.join(__dirname, "../../src/sources"));
const imp = require(path.join(__dirname, "../../src/problem-import"));

(async () => {
  await initDb();
  const count = Number(process.argv[2]) || 3;
  const ids = process.argv.slice(3).length ? process.argv.slice(3) : sources.MODULES;
  for (const id of ids) {
    const m = sources.SOURCES[id];
    let rows;
    try {
      rows = await m.list();
    } catch (e) {
      console.log(`${m.name}: the list could not be read — ${e.message}`);
      continue;
    }
    // A spread of problems (not only the newest, which open datasets may not have yet).
    const pick = [0.15, 0.4, 0.65, 0.9].slice(0, count).map((f) => rows[Math.floor(rows.length * f)]).filter(Boolean);
    await sources.upsert(id, pick);
    const { all } = require(path.join(__dirname, "../../src/db"));
    const stored = await all(`SELECT id, problem_id FROM problems WHERE platform=? AND problem_id IN (${pick.map(() => "?").join(",")})`, [id, ...pick.map((p) => String(p.problem_id))]);
    for (const p of stored) {
      const r = await imp.reimportProblem(p.id).catch((e) => ({ ok: false, error: e.message }));
      const imgs = r.images ? ` · images ${r.images.stored}/${r.images.found}${r.images.foreign.length ? ` (${r.images.foreign.length} on another site)` : ""}` : "";
      console.log(`${m.name.padEnd(14)} ${String(p.problem_id).padEnd(14)} ${r.ok ? `ok · ${r.samples} samples · time ${r.timeLimit || "—"} · memory ${r.memLimit || "—"}${r.filled?.length ? ` · filled ${r.filled.join("+")}` : ""}${imgs}` : `missing · ${r.error}`}`);
      await new Promise((ok) => setTimeout(ok, id === "codeforces" ? 2500 : 800));
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
