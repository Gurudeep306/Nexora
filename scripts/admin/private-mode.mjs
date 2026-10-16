#!/usr/bin/env node
/**
 * Emergency escape hatch: switch private mode ("coming soon" lockdown) on or
 * off directly in the DB — e.g. when nobody can sign in to the admin panel.
 *
 *   node scripts/admin/private-mode.mjs on|off|status [--message "…"] [--cloud]
 *
 * A running server picks the change up within a minute (SITE_SETTINGS_TTL_MS).
 */
import { args, audit, configOwner, get, positional, ready, setSetting, where } from "./_db.mjs";

const cmd = (positional[0] || "").toLowerCase();
if (!["on", "off", "status"].includes(cmd)) {
  console.error('Usage: node scripts/admin/private-mode.mjs on|off|status [--message "…"] [--cloud]');
  process.exit(1);
}

await ready();
const row = await get("SELECT value FROM site_settings WHERE key = 'private_mode'");
let current = {};
try {
  current = row ? JSON.parse(row.value) : {};
} catch {}

if (cmd === "status") {
  const owner = await get("SELECT value FROM site_settings WHERE key = 'owner_username'");
  console.log(`Private mode (${where}): ${row ? (current.enabled ? "ON" : "off") : "not set (turns ON at the first boot where the owner account exists)"}`);
  console.log(`Owner: ${process.env.OWNER_USERNAME || (owner ? JSON.parse(owner.value) : null) || `${configOwner() || "— none —"} (config/site.json)`}`);
  process.exit(0);
}

const i = args.indexOf("--message");
const message = i >= 0 && args[i + 1] ? String(args[i + 1]).slice(0, 280) : current.message;
const next = { enabled: cmd === "on", ...(message ? { message } : {}) };
await setSetting("private_mode", next, "cli:private-mode");
await audit("site.private_mode", "private_mode", next);
console.log(`✓ Private mode ${next.enabled ? "ON" : "OFF"} in the ${where} database.`);
if (next.enabled) {
  const owner = process.env.OWNER_USERNAME || (await get("SELECT value FROM site_settings WHERE key = 'owner_username'")) || configOwner();
  if (!owner) console.log("  ⚠ No owner is configured, so the server keeps the site public. Run set-owner.mjs first.");
}
process.exit(0);
