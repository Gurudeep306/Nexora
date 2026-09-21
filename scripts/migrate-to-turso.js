#!/usr/bin/env node
/**
 * Copy your local tracker.db (users, problems, submissions, XP, uploads…)
 * into the cloud Turso database used by the deployed site.
 *
 *   1. Put TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your .env
 *   2. Stop the local server (Ctrl+C) so tracker.db isn't being written
 *   3. npm run db:push-to-cloud            (refuses if the cloud DB has users)
 *      npm run db:push-to-cloud -- --force (replace the cloud data)
 *
 * Safe to re-run: tables are created if missing and rows are upserted.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const srcArg = args.find((a) => !a.startsWith("--"));
const SRC = path.resolve(srcArg || process.env.DB_PATH || path.join(__dirname, "..", "tracker.db"));
const URL = process.env.TURSO_DATABASE_URL;
const TOKEN = process.env.TURSO_AUTH_TOKEN;

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}
if (!URL) die("TURSO_DATABASE_URL is not set (add it to your .env).");
if (!fs.existsSync(SRC)) die(`Local database not found: ${SRC}`);

const { createClient } = require("@libsql/client");
const remote = createClient({ url: URL, authToken: TOKEN, intMode: "number" });

// Read the local file with node:sqlite (built into Node 22.5+) or sqlite3.
function openLocal(file) {
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(file, { readOnly: true });
    return { all: async (sql, p = []) => db.prepare(sql).all(...p), close: () => db.close() };
  } catch {
    const sqlite3 = require("sqlite3");
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
    return {
      all: (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r)))),
      close: () => db.close(),
    };
  }
}

const q = (name) => `"${String(name).replace(/"/g, '""')}"`;
const toArg = (v) => (v === undefined ? null : v instanceof Uint8Array ? Buffer.from(v) : v);
const approxSize = (row) =>
  Object.values(row).reduce((n, v) => n + (v == null ? 1 : v.length ?? 8), 0);

(async () => {
  const local = openLocal(SRC);
  console.log(`\nNexora → Turso migration\n  from: ${SRC}\n  to:   ${URL.replace(/\?.*$/, "")}\n`);

  const objects = await local.all(
    `SELECT type, name, tbl_name, sql FROM sqlite_master
     WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type='table' DESC, name`,
  );
  const tables = objects.filter((o) => o.type === "table");
  const others = objects.filter((o) => o.type !== "table");

  // Safety check: don't silently overwrite a cloud DB that already has users.
  const existing = await remote.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
  );
  if (existing.rows.length) {
    const n = (await remote.execute("SELECT COUNT(*) AS c FROM users")).rows[0].c;
    if (n > 0 && !FORCE) {
      die(`The cloud database already has ${n} user(s). Re-run with --force to replace its data.`);
    }
  }

  // 1) Schema
  for (const t of tables) {
    const create = t.sql.replace(/^CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?/i, "CREATE TABLE IF NOT EXISTS ");
    await remote.execute(create);
  }

  // Parents before children, so FOREIGN KEY checks pass while copying.
  const deps = new Map();
  for (const t of tables) {
    const fks = await local.all(`PRAGMA foreign_key_list(${q(t.name)})`);
    deps.set(t.name, new Set(fks.map((f) => f.table).filter((x) => x !== t.name)));
  }
  const ordered = [];
  const seen = new Set();
  const visit = (name, stack = new Set()) => {
    if (seen.has(name) || stack.has(name)) return;
    stack.add(name);
    for (const d of deps.get(name) || []) if (deps.has(d)) visit(d, stack);
    seen.add(name);
    ordered.push(tables.find((t) => t.name === name));
  };
  tables.forEach((t) => visit(t.name));

  // Clear the cloud copy (children first). The app seeds a few tables on its
  // first boot; those rows are replaced by your local data.
  for (const t of [...ordered].reverse()) await remote.execute(`DELETE FROM ${q(t.name)}`);

  // 2) Data
  let totalRows = 0;
  for (const t of ordered) {
    const cols = (await local.all(`PRAGMA table_info(${q(t.name)})`)).map((c) => c.name);
    const remoteCols = new Set(
      (await remote.execute(`PRAGMA table_info(${q(t.name)})`)).rows.map((r) => r.name),
    );
    const useCols = cols.filter((c) => remoteCols.has(c));
    const insert = `INSERT INTO ${q(t.name)} (${useCols.map(q).join(",")}) VALUES (${useCols.map(() => "?").join(",")})`;

    const [{ c: count }] = await local.all(`SELECT COUNT(*) AS c FROM ${q(t.name)}`);
    let done = 0;
    const PAGE = 500;
    for (let offset = 0; offset < count; offset += PAGE) {
      const rows = await local.all(`SELECT * FROM ${q(t.name)} LIMIT ${PAGE} OFFSET ${offset}`);
      // Group rows into ~1.5 MB batches so large text/blob rows stay under request limits.
      let batch = [];
      let size = 0;
      const flush = async () => {
        if (!batch.length) return;
        await remote.batch(batch, "write");
        batch = [];
        size = 0;
      };
      for (const row of rows) {
        batch.push({ sql: insert, args: useCols.map((c) => toArg(row[c])) });
        size += approxSize(row);
        if (size > 1.5 * 1024 * 1024 || batch.length >= 200) await flush();
      }
      await flush();
      done += rows.length;
      process.stdout.write(`\r  ${t.name.padEnd(28)} ${done}/${count}`);
    }
    process.stdout.write(`\r  ${t.name.padEnd(28)} ${count} rows ✓\n`);
    totalRows += count;
  }

  // 3) AUTOINCREMENT counters, indexes, triggers, views
  try {
    const seq = await local.all("SELECT name, seq FROM sqlite_sequence");
    for (const s of seq) {
      await remote.execute({ sql: "DELETE FROM sqlite_sequence WHERE name=?", args: [s.name] });
      await remote.execute({ sql: "INSERT INTO sqlite_sequence(name, seq) VALUES(?,?)", args: [s.name, s.seq] });
    }
  } catch {}
  for (const o of others) {
    const sql = o.sql.replace(
      /^CREATE\s+(UNIQUE\s+)?(INDEX|TRIGGER|VIEW)\s+(IF\s+NOT\s+EXISTS\s+)?/i,
      (_m, u, kind) => `CREATE ${u || ""}${kind.toUpperCase()} IF NOT EXISTS `,
    );
    try {
      await remote.execute(sql);
    } catch (e) {
      console.warn(`  ! could not create ${o.type} ${o.name}: ${e.message}`);
    }
  }

  // 4) Uploaded files (avatars, Studio media) — they are not in git, so copy
  //    them into the database where the live site restores them from.
  const UPLOADS = path.join(__dirname, "..", "public", "uploads");
  const walk = (dir) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
        )
      : [];
  const files = walk(UPLOADS);
  if (files.length) {
    await remote.execute(`CREATE TABLE IF NOT EXISTS uploads (
      path TEXT PRIMARY KEY, size INTEGER NOT NULL, chunks INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')))`);
    await remote.execute(`CREATE TABLE IF NOT EXISTS upload_chunks (
      path TEXT NOT NULL, idx INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (path, idx))`);
    const CHUNK = 256 * 1024;
    const MAX = (Number(process.env.UPLOAD_PERSIST_MAX_MB) || 50) * 1024 * 1024;
    let copied = 0;
    for (const file of files) {
      const key = path.relative(UPLOADS, file).split(path.sep).join("/");
      const data = fs.readFileSync(file);
      if (data.length > MAX) {
        console.warn(`  ! skipped ${key} (${(data.length / 1048576).toFixed(1)} MB > UPLOAD_PERSIST_MAX_MB)`);
        continue;
      }
      const n = Math.max(1, Math.ceil(data.length / CHUNK));
      await remote.execute({ sql: "DELETE FROM upload_chunks WHERE path=?", args: [key] });
      for (let i = 0; i < n; i += 8) {
        const stmts = [];
        for (let j = i; j < Math.min(n, i + 8); j++) {
          stmts.push({
            sql: "INSERT INTO upload_chunks(path, idx, data) VALUES(?,?,?)",
            args: [key, j, data.subarray(j * CHUNK, (j + 1) * CHUNK)],
          });
        }
        await remote.batch(stmts, "write");
      }
      await remote.execute({
        sql: `INSERT INTO uploads(path, size, chunks) VALUES(?,?,?)
              ON CONFLICT(path) DO UPDATE SET size=excluded.size, chunks=excluded.chunks`,
        args: [key, data.length, n],
      });
      copied++;
      process.stdout.write(`\r  uploads                      ${copied}/${files.length}`);
    }
    process.stdout.write(`\r  uploads                      ${copied} files ✓\n`);
  }

  // 5) Verify
  let mismatches = 0;
  for (const t of tables) {
    const [{ c: a }] = await local.all(`SELECT COUNT(*) AS c FROM ${q(t.name)}`);
    const b = (await remote.execute(`SELECT COUNT(*) AS c FROM ${q(t.name)}`)).rows[0].c;
    if (a !== b) {
      mismatches++;
      console.warn(`  ! ${t.name}: local ${a} vs cloud ${b}`);
    }
  }
  local.close();
  if (mismatches) die(`${mismatches} table(s) differ — re-run the script.`);
  console.log(`\n✓ Copied ${tables.length} tables / ${totalRows} rows to Turso. Your live site now has this data.\n`);
})().catch((e) => die(e.message));
