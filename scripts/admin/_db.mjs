// Shared setup for the emergency admin CLIs: load .env, pick the database
// (local tracker.db / DB_PATH, or the live Turso DB with --cloud), make sure
// the admin tables exist, and expose the db helpers.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });

export const args = process.argv.slice(2);
export const cloud = args.includes("--cloud");
export const positional = args.filter((a) => !a.startsWith("--"));

if (cloud) {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error("✗ --cloud needs TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) in .env");
    process.exit(1);
  }
  process.env.USE_CLOUD_DB = "1";
}

const db = require(path.join(root, "src", "db.js"));
export const { get, run, all } = db;
export const where = cloud ? "cloud (Turso)" : `local (${db.dbInfo().target})`;

export async function ready() {
  await db.initAdminTables();
}

export async function setSetting(key, value, by) {
  await run(
    `INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    [key, JSON.stringify(value), by, Date.now()],
  );
}

export async function audit(action, target, after) {
  await run(
    `INSERT INTO audit_log(actor, actor_role, action, target_type, target, after, ip, created_at)
     VALUES('cli', 'owner', ?, 'site', ?, ?, 'cli', ?)`,
    [action, target, JSON.stringify(after), Date.now()],
  ).catch(() => {});
}
