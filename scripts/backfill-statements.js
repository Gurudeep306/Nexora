#!/usr/bin/env node
// Fill in problem statements (with their samples and figures) ahead of time,
// straight into the live database — the same filler the server runs while it
// is awake (src/sources/backfill.js). The scheduled GitHub Actions job
// "Fill problem statements" runs this, so the work keeps going while the
// free web service sleeps.
//
//   TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… node scripts/backfill-statements.js --hours 5.5
//   node scripts/backfill-statements.js --platforms atcoder,cses --hours 1   (local tracker.db)
//
// It works from the oldest problems up; the server works from the newest
// down, so the two never fetch the same problem twice.
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
if (process.env.TURSO_DATABASE_URL && !process.env.USE_CLOUD_DB) process.env.USE_CLOUD_DB = "1";

const hours = Math.max(0.05, Number(arg("hours", "5.5")) || 5.5);
const platforms = arg("platforms", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

(async () => {
  const db = require("../src/db");
  await db.initDb();
  const { normalizeStatementHtml } = require("../src/statement-media");
  const { keepFigures } = require("../src/media-fetch");
  const backfill = require("../src/sources/backfill");
  const sources = require("../src/sources");

  // The same row the server's saver writes, then the statement's figures.
  const save = async (id, data) => {
    await db.run(
      `INSERT OR REPLACE INTO problem_statements
        (problem_rowid, statement, input_spec, output_spec, note, time_limit, memory_limit, samples, scraped_at, extra)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.statement || "", data.inputSpec || "", data.outputSpec || "", data.note || "", data.timeLimit || "", data.memLimit || "", JSON.stringify(data.samples || []), new Date().toISOString(), JSON.stringify(data.extra || {})],
    );
    const row = await db.get("SELECT platform FROM problems WHERE id=?", [id]).catch(() => null);
    await keepFigures(normalizeStatementHtml([data.statement, data.inputSpec, data.outputSpec, data.note].join("\n"), { platform: row?.platform }));
  };

  const before = await backfill.coverage();
  const sum = (rows, k) => rows.reduce((n, r) => n + r[k], 0);
  console.log(`Before: ${sum(before, "stored")} of ${sum(before, "total")} statements stored (${sum(before, "withSamples")} with samples).`);

  const job = backfill.start({ save, fetch: (p) => sources.fetchStatement(p), platforms, order: "asc", until: Date.now() + hours * 3600e3, log: (m) => console.log(m) });
  const timer = setInterval(() => {
    const st = job.status();
    const line = Object.entries(st.judges)
      .map(([p, j]) => `${p} +${j.saved}${j.failed ? ` (${j.failed} refused)` : ""}${j.left != null ? `, ${j.left} left` : ""}${j.resting ? ", resting" : ""}${j.done ? ", done" : ""}`)
      .join(" · ");
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${line}`);
  }, 5 * 60e3);
  await job.done;
  clearInterval(timer);

  const after = await backfill.coverage();
  console.log(`After: ${sum(after, "stored")} of ${sum(after, "total")} statements stored (${sum(after, "withSamples")} with samples).`);
  for (const r of after) console.log(`  ${r.platform.padEnd(11)} ${String(r.stored).padStart(6)} / ${String(r.total).padEnd(6)} samples ${r.withSamples}${r.failing ? `, ${r.failing} waiting to retry` : ""}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
