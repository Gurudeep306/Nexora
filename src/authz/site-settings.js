// Site-wide settings (private mode, registrations, feature flags, maintenance
// banner, owner) stored as JSON in the `site_settings` table.
//
// Every request consults these (the private-mode gate runs before routing),
// so they are cached in memory. A write through this process invalidates the
// cache at once (db onWrite hook); a write from elsewhere — the emergency CLI
// in scripts/admin/, another instance — is picked up within CACHE_TTL_MS.
// (Each re-read is a full read of the table, on every request's path, so the
// TTL is a minute rather than seconds: ~1.4k reads a day instead of ~17k×rows.)
const { all, run, onWrite } = require("../db");

const CACHE_TTL_MS = Number(process.env.SITE_SETTINGS_TTL_MS) || 60_000;

const FEATURE_FLAGS = ["gate", "contests", "social", "ai_tutor", "practice", "learn", "nexus", "notes", "workshop"];

const DEFAULT_PRIVATE_MESSAGE = "We're putting the finishing touches on NexoraGuru. Check back soon.";

function envOwner() {
  const v = String(process.env.OWNER_USERNAME || "").trim();
  return v || null;
}

/** The committed default owner (config/site.json), used when OWNER_USERNAME is unset. */
function configOwner() {
  try {
    // eslint-disable-next-line global-require
    const cfg = require("../../config/site.json");
    const v = typeof cfg.owner === "string" ? cfg.owner.trim() : "";
    return v || null;
  } catch {
    return null;
  }
}

/** Where the owner comes from: env > CLI (DB setting) > config/site.json. */
function ownerSource(raw = cache?.raw || {}) {
  if (envOwner()) return "env";
  if (typeof raw.owner_username === "string" && raw.owner_username.trim()) return "cli";
  if (configOwner()) return "config";
  return null;
}

let cache = null; // { at, raw: {key: value} }
let loading = null;
let generation = 0;

onWrite(/site_settings/i, () => {
  generation++;
  cache = null;
});

async function loadRaw() {
  const gen = generation;
  const rows = await all("SELECT key, value FROM site_settings").catch(() => []);
  const raw = {};
  for (const r of rows) {
    try {
      raw[r.key] = JSON.parse(r.value);
    } catch {
      /* a corrupt row: the default applies */
    }
  }
  if (gen === generation) cache = { at: Date.now(), raw };
  return raw;
}

const objectAt = (raw, k) => (raw[k] && typeof raw[k] === "object" && !Array.isArray(raw[k]) ? raw[k] : {});

function build(raw) {
  const stored = typeof raw.owner_username === "string" ? raw.owner_username.trim() : "";
  const owner = envOwner() || stored || configOwner() || null;
  const flagsRaw = objectAt(raw, "feature_flags");
  const flags = {};
  for (const f of FEATURE_FLAGS) flags[f] = flagsRaw[f] !== false;
  // No row yet: public. initAdminSystem() turns it on at the first boot where
  // the owner's account exists (so nobody is ever locked out).
  const pm = "private_mode" in raw ? objectAt(raw, "private_mode") : { enabled: false };
  const maint = objectAt(raw, "maintenance");
  return {
    owner_username: owner,
    private_mode: { enabled: !!pm.enabled, message: String(pm.message || DEFAULT_PRIVATE_MESSAGE) },
    registrations: { open: objectAt(raw, "registrations").open !== false },
    feature_flags: flags,
    maintenance: { enabled: !!maint.enabled, message: String(maint.message || "") },
    // The design style new visitors see until they pick their own (Admin → Site).
    default_style: typeof raw.default_style === "string" && /^[a-z-]{2,40}$/.test(raw.default_style) ? raw.default_style : null,
  };
}

/** Current settings (cached for a few seconds). */
async function getSettings() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return build(cache.raw);
  loading ||= loadRaw().finally(() => {
    loading = null;
  });
  return build(await loading);
}

/** Last loaded settings without touching the database (may be slightly stale). */
function peekSettings() {
  return build(cache?.raw || {});
}

async function setSetting(key, value, by = null) {
  await run(
    `INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    [key, JSON.stringify(value), by, Date.now()],
  );
}

/**
 * Private mode only applies when there is an owner who can still get in.
 * SITE_PRIVATE=1 (e.g. on a staging copy) keeps the site private regardless of
 * the stored setting, even before the owner's account exists there; the owner's
 * reserved username can still sign up.
 */
function privateModeActive(settings) {
  if (!settings.owner_username) return false;
  return String(process.env.SITE_PRIVATE || "") === "1" || !!settings.private_mode.enabled;
}

module.exports = {
  CACHE_TTL_MS,
  DEFAULT_PRIVATE_MESSAGE,
  FEATURE_FLAGS,
  configOwner,
  envOwner,
  ownerSource,
  getSettings,
  peekSettings,
  privateModeActive,
  setSetting,
};
