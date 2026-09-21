#!/usr/bin/env node
/**
 * Download a full copy of the cloud (Turso) database into a local SQLite file.
 *
 *   npm run db:backup                 → backups/nexora-YYYY-MM-DD.db
 *   npm run db:backup -- out/file.db  → custom path
 *
 * Used by the nightly GitHub Action (.github/workflows/backup.yml), and handy
 * for pulling live data down to your Mac. To restore a backup into the cloud:
 *   npm run db:push-to-cloud -- backups/nexora-YYYY-MM-DD.db --force
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const { createClient } = require("@libsql/client");

const URL = process.env.TURSO_DATABASE_URL;
if (!URL) {
  console.error("✗ TURSO_DATABASE_URL is not set.");
  process.exit(1);
}
const stamp = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(process.argv[2] || path.join(__dirname, "..", "backups", `nexora-${stamp}.db`));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

const remote = createClient({ url: URL, authToken: process.env.TURSO_AUTH_TOKEN, intMode: "bigint" });
const q = (n) => `"${String(n).replace(/"/g, '""')}"`;
const toLocal = (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : v);

(async () => {
  const out = new DatabaseSync(OUT);
  out.exec("PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA foreign_keys=OFF;");
  const objs = (
    await remote.execute(
      `SELECT type, name, sql FROM sqlite_master
       WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'
       ORDER BY type='table' DESC, name`,
    )
  ).rows;
  const tables = objs.filter((o) => o.type === "table");
  let rows = 0;
  for (const t of tables) {
    out.exec(t.sql);
    const cols = (await remote.execute(`PRAGMA table_info(${q(t.name)})`)).rows.map((r) => r.name);
    const ins = out.prepare(
      `INSERT INTO ${q(t.name)} (${cols.map(q).join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
    );
    const PAGE = 1000;
    for (let off = 0; ; off += PAGE) {
      const rs = await remote.execute(`SELECT * FROM ${q(t.name)} LIMIT ${PAGE} OFFSET ${off}`);
      if (!rs.rows.length) break;
      out.exec("BEGIN");
      for (const r of rs.rows) ins.run(...cols.map((c) => toLocal(r[c])));
      out.exec("COMMIT");
      rows += rs.rows.length;
      if (rs.rows.length < PAGE) break;
    }
  }
  try {
    const seq = (await remote.execute("SELECT name, seq FROM sqlite_sequence")).rows;
    const st = out.prepare("INSERT INTO sqlite_sequence(name, seq) VALUES(?,?)");
    for (const s of seq) st.run(s.name, s.seq);
  } catch {}
  for (const o of objs.filter((x) => x.type !== "table")) {
    try {
      out.exec(o.sql);
    } catch {}
  }
  out.close();
  const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
  console.log(`✓ Backed up ${tables.length} tables / ${rows} rows → ${OUT} (${mb} MB)`);
})().catch((e) => {
  console.error("✗ Backup failed:", e.message);
  process.exit(1);
});
