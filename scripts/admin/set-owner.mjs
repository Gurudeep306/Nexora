#!/usr/bin/env node
/**
 * Emergency escape hatch: make <username> the site owner, directly in the DB.
 *
 *   node scripts/admin/set-owner.mjs <username>            # local tracker.db (or DB_PATH)
 *   node scripts/admin/set-owner.mjs <username> --cloud    # live site (Turso, uses .env)
 *
 * OWNER_USERNAME in the server's environment always wins over this setting:
 * if it is set to someone else, change it there (and restart) instead.
 * A running server picks the change up within a minute (SITE_SETTINGS_TTL_MS).
 */
import { audit, get, positional, ready, run, setSetting, where } from "./_db.mjs";

const username = positional[0];
if (!username || !/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
  console.error("Usage: node scripts/admin/set-owner.mjs <username> [--cloud]");
  process.exit(1);
}

await ready();
const user = await get("SELECT username FROM users WHERE username = ? COLLATE NOCASE", [username]);
const name = user?.username || username;
await setSetting("owner_username", name, "cli:set-owner");
await run("UPDATE users SET role = 'admin' WHERE role = 'owner' AND username <> ? COLLATE NOCASE", [name]);
if (user) await run("UPDATE users SET role = 'owner' WHERE username = ?", [name]);
await audit("site.owner", "owner_username", { owner: name });

console.log(`✓ Owner set to "${name}" in the ${where} database.`);
if (!user) console.log(`  No account named "${name}" yet — sign up with that exact username to claim it.`);
const env = String(process.env.OWNER_USERNAME || "").trim();
if (env && env.toLowerCase() !== name.toLowerCase()) {
  console.log(`  ⚠ OWNER_USERNAME="${env}" in this environment overrides it — update that too.`);
}
process.exit(0);
