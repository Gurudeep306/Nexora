#!/usr/bin/env node
// What the imported problems are missing, per source (the same report as
// Admin → Problem sources → "What is missing").
//
//   node scripts/problems-audit.js            # the table
//   node scripts/problems-audit.js --json     # the raw report
//   node scripts/problems-audit.js --gaps codeforces samples   # the problems
//
// It reads the database in DB_PATH (or TURSO_DATABASE_URL), like the server.
const db = require("../src/db");
const audit = require("../src/sources/audit");

const pad = (v, n) => String(v).padStart(n);

(async () => {
  await db.initDb();
  const args = process.argv.slice(2);
  if (args[0] === "--gaps") {
    const [, source, field] = args;
    const r = await audit.gaps(source, field, { limit: 100 });
    console.log(`${r.total} ${source} problems missing ${field}${r.total > 100 ? " (first 100)" : ""}:`);
    for (const p of r.problems) console.log(`  ${p.problem_id.padEnd(14)} ${p.title}${p.missingImages ? `  (${p.missingImages} images)` : ""}`);
    return;
  }
  const report = await audit.audit();
  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const cols = ["statement", "samples", "limits", "tags", "rating", "images"];
  console.log(`${"source".padEnd(12)}${pad("problems", 9)}${pad("fetched", 9)}  missing: ${cols.map((c) => pad(c, 9)).join("")}`);
  for (const s of report) {
    const cells = cols.map((c) => {
      if ((c === "rating" || c === "tags" || c === "samples" || c === "limits") && !s.published[c]) return pad("n/a", 9);
      return pad(s.missing[c], 9);
    });
    console.log(`${s.id.padEnd(12)}${pad(s.problems, 9)}${pad(s.statements, 9)}           ${cells.join("")}`);
  }
  console.log('\n"statement" counts problems whose statement is not fetched yet (it is fetched when someone opens the problem).');
  console.log('"n/a": this judge does not publish that field.');
})()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
