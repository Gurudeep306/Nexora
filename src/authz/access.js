// Per-request access control, run on EVERY request after the session:
//
//   1. Loads the signed-in user's effective role + permissions + active ban
//      (one query, usually read in the same round trip as the session — see
//      DbSessionStore.takeUserRow) and attaches them as req.access.
//   2. Banned / suspended users are signed out; their API calls get 403
//      `account_banned`.
//   3. Private mode: everyone except the owner, admins and early_access
//      holders gets the coming-soon page (pages) or 403 `site_private` (API).
//      Health, sign-in, OAuth and static assets stay reachable.
//   4. Feature flags: a switched-off section's API answers 403
//      `feature_disabled` (the owner keeps access to everything).
const { get, run } = require("../db");
const { comingSoonHtml } = require("./coming-soon");
const sitemap = require("../sitemap");
const {
  ACCESS_COLUMNS,
  attachAccess,
  buildAccess,
  hasAnyAdminPerm,
  mayEnterPrivateSite,
  mayUseHive,
} = require("./permissions");
const { getSettings, ownerSource, privateModeActive, setSetting, DEFAULT_PRIVATE_MESSAGE } = require("./site-settings");

const USER_ACCESS_SQL = `SELECT ${ACCESS_COLUMNS} FROM users u WHERE u.username = ?`;

async function loadUserAccess(username) {
  const row = await get(USER_ACCESS_SQL, [username]);
  return row ? buildAccess(username, row) : null;
}

// Reachable by anyone, even while the site is private.
const PUBLIC_API = new Set([
  "/api/health",
  "/api/auth/status",
  "/api/auth/providers",
  "/api/auth/logout",
  "/api/user/login",
  "/api/user/register",
  "/api/user/check-username",
  "/api/site/status",
]);
// Express routes case-insensitively and ignores trailing slashes, so compare
// a canonical form (see src/middleware/authz.js).
const canon = (p) => String(p || "/").replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
const isApi = (p) => /^\/api(\/|$)/i.test(canon(p));
// The Hive bridge authenticates with its own machine token (src/routes/hive.js).
// A handwriting link (/pad, /snap) is opened on a tablet or phone that is not
// signed in: its token stands for the member (src/routes/hand.js).
const isHandDevice = (p) => /^\/api\/hand\/device\/[A-Za-z0-9_-]{20,64}(\/preview)?$/.test(canon(p));
// A tablet added to a Live room by QR: its token is the key (src/routes/live-rooms.js).
const isLiveDevice = (p) => /^\/api\/live\/device\/[A-Za-z0-9_-]{20,64}$/.test(canon(p));
// A tablet recording an explanation by QR: its token is the key (src/routes/explain.js).
const isExplainDevice = (p) => /^\/api\/explain\/device\/[A-Za-z0-9_-]{20,64}(\/videos(\/[A-Za-z0-9_-]{16,32}\/(data|finish))?)?$/.test(canon(p));
const isPublicApi = (p) => isHandDevice(p) || isLiveDevice(p) || isExplainDevice(p) || PUBLIC_API.has(canon(p).toLowerCase()) || (/^\/api\/hive-bridge\/(hello|poll|result|script|approve|setup\.sh)$/i.test(canon(p)) || /^\/api\/hive-mcp$/i.test(canon(p)));
function isPublicPath(p) {
  if (isApi(p)) return isPublicApi(p);
  if (p === "/auth" || p.startsWith("/auth/")) return true; // sign-in page + OAuth
  if (/^\/(pad|snap)\/[A-Za-z0-9_-]{20,64}\/?$/.test(p)) return true; // handwriting device pages
  if (/^\/live\/d\/[A-Za-z0-9_-]{20,64}\/?$/.test(p)) return true; // a tablet joining a Live room
  if (/^\/explain\/pad\/[A-Za-z0-9_-]{20,64}\/?$/.test(p)) return true; // a tablet recording an explanation
  if (p.startsWith("/uploads/")) return false;
  // Static assets (scripts, styles, fonts, images, manifest) — not pages.
  return /\.(js|mjs|css|map|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico|webmanifest|json|txt|wasm)$/i.test(p);
}

// Section → API paths switched off with it.
const FEATURE_ROUTES = [
  // More specific first: GATE notes can be off while GATE practice stays on.
  ["notes", /^\/api\/gate\/notes(\/|$)/i],
  ["gate", /^\/api\/gate(\/|$)/i],
  ["learn", /^\/api\/(learn|learning|nexus)(\/|$)/i],
  ["workshop", /^\/api\/forge(\/|$)/i],
  ["contests", /^\/api\/(contests|live)(\/|$)/i],
  ["social", /^\/api\/(friends|messages|rooms|feed|social)(\/|$)/i],
  ["ai_tutor", /^\/api\/(agent|ai)(\/|$)/i],
  ["practice", /^\/api\/(problems|problem-statement)(\/|$)/i],
];
function featureFor(p) {
  const c = canon(p);
  for (const [flag, re] of FEATURE_ROUTES) if (re.test(c)) return flag;
  return null;
}

/* ── DAU tracking: one INSERT OR IGNORE per user per day per process ── */
const seenToday = new Set();
let seenDay = "";
function markActive(username) {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== seenDay) {
    seenDay = day;
    seenToday.clear();
  }
  if (seenToday.has(username)) return;
  seenToday.add(username);
  run("INSERT OR IGNORE INTO user_daily_active(username, day) VALUES(?,?)", [username, day]).catch(() => {
    seenToday.delete(username);
  });
}

/* ── Server errors in the last 24 h (admin overview) ── */
const errorTimes = [];
function recordServerError() {
  errorTimes.push(Date.now());
  if (errorTimes.length > 5000) errorTimes.splice(0, errorTimes.length - 5000);
}
function errorCount(windowMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  while (errorTimes.length && errorTimes[0] < cutoff) errorTimes.shift();
  return errorTimes.length;
}

function banPayload(ban) {
  const until = ban.expires_at ? new Date(Number(ban.expires_at)).toISOString() : null;
  return {
    ok: false,
    code: "account_banned",
    error: until
      ? `Your account is suspended until ${until.slice(0, 16).replace("T", " ")} UTC${ban.reason ? ` — ${ban.reason}` : ""}`
      : `Your account has been banned${ban.reason ? ` — ${ban.reason}` : ""}`,
    ban: { kind: ban.kind, reason: ban.reason || "", until },
  };
}

function privatePayload(settings) {
  return {
    ok: false,
    code: "site_private",
    error: "NexoraGuru is private right now",
    message: settings.private_mode.message,
  };
}

function wantsHtml(req) {
  return req.method === "GET" && /text\/html/.test(req.headers.accept || "");
}

function createAccessControl() {
  return async (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 500) recordServerError();
    });
    let settings;
    try {
      settings = await getSettings();
      const cached = req.session?.user;
      if (cached?.username) {
        // Usually read with the session in the same round trip.
        const pre = req.sessionStore?.takeUserRow?.(req.sessionID, cached.username);
        const access =
          pre !== undefined && (pre === null || "perms" in pre)
            ? pre && buildAccess(cached.username, pre)
            : await loadUserAccess(cached.username);
        if (!access) {
          delete req.session.user; // account deleted
        } else if (access.ban) {
          delete req.session.user;
          req.accountBan = access.ban;
        } else {
          if (cached.role !== access.role) req.session.user = { ...cached, role: access.role };
          attachAccess(req, access);
          markActive(cached.username);
        }
      }
      req.accessResolved = true;
    } catch (e) {
      return next(e); // fail closed rather than trust a stale role
    }

    const p = req.path;
    if (req.accountBan && isApi(p) && !isPublicApi(p)) {
      return res.status(403).json(banPayload(req.accountBan));
    }

    if (privateModeActive(settings) && !mayEnterPrivateSite(req) && !isPublicPath(p)) {
      res.set("Cache-Control", "no-store");
      if (isApi(p)) return res.status(403).json(privatePayload(settings));
      if (wantsHtml(req)) {
        return res.status(403).type("html").send(comingSoonHtml({ message: settings.private_mode.message }));
      }
      return res.status(403).type("text").send("NexoraGuru is private right now");
    }

    // Admin → Site map (src/sitemap.js): parts switched off, staff only or
    // coming soon. The older feature flags are the same switch.
    const part = isApi(p) && sitemap.partForApi(canon(p));
    if (part) {
      const mode = sitemap.effectiveModes(settings)[part.id];
      const who = { owner: req.access?.role === "owner", staff: hasAnyAdminPerm(req), hive: mayUseHive(req) };
      // Hive doesn't exist to anyone but admins and the owner: the plain 404.
      if (sitemap.isHive(part) && !who.hive && !who.owner) return res.status(404).json({ ok: false, error: "API endpoint not found" });
      if (!sitemap.allowed(mode, who, part)) {
        return res.status(403).json({
          ok: false,
          code: "feature_disabled",
          feature: sitemap.flagOf(part) || part.id,
          part: part.id,
          mode,
          error: mode === "soon" ? `${part.label} is coming soon` : "This section is switched off right now",
        });
      }
    }
    next();
  };
}

/** May this user open a realtime socket? (ban + private mode) */
async function socketAccess(username) {
  const settings = await getSettings();
  const access = await loadUserAccess(username);
  if (!access) return { ok: false, reason: "Authentication required" };
  if (access.ban) return { ok: false, reason: "Account banned" };
  if (privateModeActive(settings) && !mayEnterPrivateSite(access)) return { ok: false, reason: "Site is private" };
  return { ok: true, access };
}

/**
 * Boot: make the configured owner (OWNER_USERNAME > CLI setting >
 * config/site.json) the only 'owner' row, and turn private mode on at the
 * first boot where that owner's account exists. Without an owner account,
 * warn loudly and leave the site public so nobody is locked out.
 */
async function initAdminSystem() {
  const settings = await getSettings();
  const owner = settings.owner_username;
  if (!owner) {
    console.warn(
      "\n⚠️  ─────────────────────────────────────────────────────────────\n" +
        "⚠️  No site owner is configured (OWNER_USERNAME / config/site.json).\n" +
        "⚠️  Private mode stays OFF so nobody gets locked out.\n" +
        "⚠️  Set OWNER_USERNAME (or run: node scripts/admin/set-owner.mjs <username>).\n" +
        "⚠️  ─────────────────────────────────────────────────────────────\n",
    );
    return settings;
  }
  // Runs on every boot (free hosts restart often), so it only reads by index
  // (idx_users_role, the username key) and only writes when something is off.
  await run("UPDATE users SET role='admin' WHERE role='owner' AND username <> ? COLLATE NOCASE", [owner]);
  const exact = await get("SELECT username, role FROM users WHERE username = ?", [owner]);
  // A case variant of the configured name (rare) still needs the NOCASE match.
  const row0 = exact || (await get("SELECT username, role FROM users WHERE username = ? COLLATE NOCASE", [owner]));
  if (row0 && row0.role !== "owner") {
    await run("UPDATE users SET role='owner' WHERE username = ?", [row0.username]);
  }
  const exists = !!row0;
  const row = await get("SELECT value FROM site_settings WHERE key='private_mode'");
  if (String(process.env.SITE_PRIVATE || "") === "1") {
    console.log(`🔒 SITE_PRIVATE=1: this site is private. Only ${owner}, admins and early-access users can get in.`);
  }
  if (!exists) {
    console.warn(
      `\n⚠️  Owner "${owner}" (from ${ownerSource()}) has no account yet — private mode stays ${row ? "as set" : "OFF"}.\n` +
        "⚠️  Sign up with that exact username; private mode turns on at the next boot.\n",
    );
    return getSettings();
  }
  if (!row) {
    await setSetting("private_mode", { enabled: true, message: DEFAULT_PRIVATE_MESSAGE }, "system:first-boot");
    console.log(`🔒 Private mode is ON (first boot with the owner's account). Only ${owner}, admins and early-access users can get in.`);
  } else {
    const s = await getSettings();
    console.log(`🔐 Owner: ${owner} (${ownerSource()}) · private mode ${s.private_mode.enabled ? "ON" : "off"}`);
  }
  return getSettings();
}

module.exports = {
  PUBLIC_API,
  USER_ACCESS_SQL,
  banPayload,
  createAccessControl,
  errorCount,
  featureFor,
  initAdminSystem,
  isPublicPath,
  loadUserAccess,
  privatePayload,
  socketAccess,
};
