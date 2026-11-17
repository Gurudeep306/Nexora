// Owner / admin API: /api/admin/* (permission-gated, audited, rate limited)
// plus the public /api/site/* status the client reads and the generic
// /api/reports endpoint.
//
// Every admin endpoint checks a permission server-side (requirePerm) and,
// when it touches a user, that the actor outranks them (canActOn). Every
// change writes an audit_log row (who, what, target, before/after, IP).
const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { errMessage } = require("../http-error");
const { getSessionUser } = require("../middleware/auth");
const P = require("../authz/permissions");
const S = require("../authz/sections");
const sitemap = require("../sitemap");
const fs = require("fs");
const path = require("path");
const { errorCount } = require("../authz/access");
const content = require("../authz/content");
const dbStats = require("../db-stats");
const { sharedCache } = require("../shared-cache");

const announcementCache = sharedCache({ name: "announcements", ttlMs: 5 * 60 * 1000, tables: ["announcements"] });
const { defaultAvatar } = require("../avatar-set");
const {
  FEATURE_FLAGS,
  ownerSource,
  getSettings,
  privateModeActive,
  setSetting,
} = require("../authz/site-settings");

const { requirePerm, requireOwner } = P;

/* ── input validation ── */
class BadInput extends Error {}
const bad = (msg) => {
  throw new BadInput(msg);
};
function str(v, { max = 500, min = 0, field = "value", optional = false } = {}) {
  if (v === undefined || v === null) {
    if (optional) return null;
    bad(`${field} is required`);
  }
  if (typeof v !== "string") bad(`${field} must be text`);
  const s = v.trim();
  if (s.length < min) bad(min <= 1 ? `${field} is required` : `${field} must be at least ${min} characters`);
  if (s.length > max) bad(`${field} must be at most ${max} characters`);
  return s;
}
function bool(v, field) {
  if (typeof v !== "boolean") bad(`${field} must be true or false`);
  return v;
}
function intIn(v, lo, hi, dflt) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}
const USERNAME_RE = /^[a-zA-Z0-9_]{2,20}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,20}$/;
function safeLink(v) {
  const s = str(v, { max: 500, field: "link", optional: true });
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
  } catch {}
  bad("link must be a path like /learn or an http(s) URL");
}
const COLORS = ["brand", "info", "success", "warning", "danger"];
const json = (v) => (v === undefined ? null : JSON.stringify(v));
const day = (offsetDays = 0) => new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);
const sidTag = (sid) => crypto.createHash("sha256").update(String(sid)).digest("hex").slice(0, 10);

/** Rows of the active-ban subquery as objects. */
function parseBan(raw) {
  if (!raw) return null;
  try {
    const b = typeof raw === "string" ? JSON.parse(raw) : raw;
    return { kind: b.kind, reason: b.reason || "", until: b.expires_at ? new Date(Number(b.expires_at)).toISOString() : null };
  } catch {
    return { kind: "ban", reason: "", until: null };
  }
}

const ACTIVE_BAN_SQL = `(SELECT json_object('kind', b.kind, 'reason', b.reason, 'expires_at', b.expires_at)
    FROM user_bans b WHERE b.username = u.username AND b.lifted_at IS NULL
     AND (b.expires_at IS NULL OR b.expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000)
   ORDER BY b.id DESC LIMIT 1)`;
const ACTIVE_BAN_EXISTS = `EXISTS (SELECT 1 FROM user_bans b WHERE b.username = u.username AND b.lifted_at IS NULL
     AND (b.expires_at IS NULL OR b.expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000))`;

function createAdminRouter(deps) {
  const { all, get, run, runBatch, realtime, isTrustedOrigin } = deps;
  const router = express.Router();

  /* ── badge directory (owner, staff, verified) — cached, tiny ── */
  let badgeCache = null;
  const invalidateBadges = () => {
    badgeCache = null;
  };
  async function badges() {
    if (badgeCache && Date.now() - badgeCache.at < 30000) return badgeCache.data;
    const rows = await all(
      "SELECT username, role, verified FROM users WHERE role IN ('owner','admin','moderator') OR verified = 1 LIMIT 2000",
    );
    const owner = (await getSettings()).owner_username;
    const staff = {};
    const verified = [];
    let ownerName = null;
    for (const r of rows) {
      const role = P.effectiveRole(r.username, r.role);
      if (role === "owner") ownerName = r.username;
      else if (role === "admin" || role === "moderator") staff[r.username] = role;
      if (r.verified) verified.push(r.username);
    }
    const data = { owner: ownerName || owner || null, staff, verified };
    badgeCache = { at: Date.now(), data };
    return data;
  }

  async function audit(req, action, { targetType = null, target = null, before, after } = {}) {
    const actor = req.access?.username || getSessionUser(req)?.username || "?";
    await run(
      `INSERT INTO audit_log(actor, actor_role, action, target_type, target, before, after, ip, created_at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [actor, req.access?.role || null, action, targetType, target, json(before), json(after), req.ip || null, Date.now()],
    );
  }

  /** Wrap a handler: validation errors → 400, others → 500. */
  const h = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof BadInput) return res.status(400).json({ ok: false, error: e.message });
      console.error("[admin]", req.method, req.path, e.message);
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  };

  async function loadTarget(req, res) {
    const username = req.params.username;
    if (!USERNAME_RE.test(username || "")) {
      res.status(400).json({ ok: false, error: "Invalid username" });
      return null;
    }
    const row = await get(
      `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.bio, u.role, u.verified,
        (SELECT group_concat(p.perm || '=' || p.granted) FROM user_permissions p WHERE p.username = u.username) AS perms
       FROM users u WHERE u.username = ?`,
      [username],
    );
    if (!row) {
      res.status(404).json({ ok: false, error: "User not found" });
      return null;
    }
    row.role = P.effectiveRole(row.username, row.role);
    return row;
  }

  /** The actor must outrank the target (the owner is untouchable). */
  function guardTarget(req, res, target, { allowOwnerSelf = false } = {}) {
    if (allowOwnerSelf && req.access?.role === "owner" && target.role === "owner") return true;
    if (P.canActOn(req, target.username, target.role)) return true;
    res.status(403).json({
      ok: false,
      code: "rank",
      error: target.role === "owner" ? "Nobody can do that to the owner" : "You can only act on users below your own role",
    });
    return false;
  }

  async function signOutEverywhere(username) {
    await run("DELETE FROM sessions WHERE json_extract(sess, '$.user.username') = ?", [username]);
    realtime?.disconnectUser?.(username);
  }

  /* ── guards for every /api/admin call ── */
  const notFound = (res) => res.status(404).json({ ok: false, error: "API endpoint not found" });
  const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Too many admin requests — slow down a moment." },
  });
  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "GET",
    message: { ok: false, error: "Too many admin changes — slow down a moment." },
  });
  // To anyone without an admin permission (signed out included) the admin
  // API doesn't exist: the same 404 as any unknown endpoint.
  router.use("/api/admin", (req, res, next) => {
    if (!getSessionUser(req)?.username || !P.hasAnyAdminPerm(req)) return notFound(res);
    next();
  });
  router.use("/api/admin", adminLimiter, writeLimiter, (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      // CSRF: changes must come as JSON (no cross-site form posts) from a
      // trusted origin.
      if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
        return res.status(415).json({ ok: false, error: "Send JSON" });
      }
      if (isTrustedOrigin && !isTrustedOrigin(req)) {
        return res.status(403).json({ ok: false, error: "Origin not allowed" });
      }
    }
    res.set("Cache-Control", "no-store");
    next();
  });

  /* ═════════════ Public site status ═════════════ */

  router.get(
    "/api/site/status",
    h(async (req, res) => {
      const s = await getSettings();
      const a = req.access || null;
      const me = a?.username || null;
      const now = Date.now();
      const [announcements, notices] = await Promise.all([
        // Every page load asks for this: the active announcements are cached
        // (dropped on any announcements write) and the expiry applied here.
        announcementCache
          .get("active", () =>
            all(
              `SELECT id, kind, title, body, link, color, pinned, expires_at, created_at FROM announcements
               WHERE active = 1 ORDER BY pinned DESC, created_at DESC LIMIT 200`,
            ),
          )
          .then((rows) => rows.filter((x) => x.expires_at == null || x.expires_at > now).slice(0, 12).map((x) => ({ ...x }))),
        me
          ? all("SELECT id, reason, created_at FROM user_warnings WHERE username = ? AND acknowledged_at IS NULL ORDER BY id DESC LIMIT 5", [me])
          : Promise.resolve([]),
      ]);
      const priv = privateModeActive(s);
      res.set("Cache-Control", "no-store");
      res.json({
        ok: true,
        private: priv,
        privateMessage: priv ? s.private_mode.message : "",
        allowed: !priv || P.mayEnterPrivateSite(req),
        registrationsOpen: s.registrations.open && !priv,
        // The old section flags and the Site map's blocked parts, for this viewer.
        ...(() => {
          const v = sitemap.viewerParts(s, { owner: a?.role === "owner", staff: !!a && P.hasAnyAdminPerm(a), hive: !!a && P.mayUseHive(a) });
          return { flags: v.flags, parts: v.blocked };
        })(),
        maintenance: s.maintenance.enabled ? { message: s.maintenance.message } : null,
        defaultStyle: s.default_style,
        banners: announcements.filter((x) => x.kind === "banner").slice(0, 3),
        broadcasts: announcements.filter((x) => x.kind === "broadcast").slice(0, 8),
        notices,
        banned: req.accountBan ? parseBan(JSON.stringify(req.accountBan)) : null,
        me: a
          ? {
              username: a.username,
              role: a.role,
              permissions: [...a.perms],
              isOwner: a.role === "owner",
              isStaff: P.hasAnyAdminPerm(a),
              // Hive is for admins and the owner only.
              mayHive: P.mayUseHive(a),
              verified: a.verified,
            }
          : null,
      });
    }),
  );

  router.get(
    "/api/site/badges",
    h(async (_req, res) => {
      res.set("Cache-Control", "private, max-age=30");
      res.json({ ok: true, ...(await badges()) });
    }),
  );

  router.post(
    "/api/site/notices/:id/ack",
    h(async (req, res) => {
      const me = getSessionUser(req)?.username;
      if (!me) return res.status(401).json({ ok: false, error: "Please sign in first" });
      await run("UPDATE user_warnings SET acknowledged_at = ? WHERE id = ? AND username = ?", [Date.now(), intIn(req.params.id, 0, 1e12, 0), me]);
      res.json({ ok: true });
    }),
  );

  /* ═════════════ Reports (any signed-in user) ═════════════ */

  const reportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Too many reports — try again later." },
  });
  router.post(
    "/api/reports",
    reportLimiter,
    h(async (req, res) => {
      const me = getSessionUser(req)?.username;
      if (!me) return res.status(401).json({ ok: false, error: "Please sign in first" });
      const b = req.body || {};
      if (!content.isValidType(b.content_type)) bad("content_type is invalid");
      if (!content.isValidId(b.content_id)) bad("content_id is invalid");
      const reason = str(b.reason, { max: 60, min: 2, field: "reason" });
      const details = str(b.details ?? "", { max: 1000, field: "details" });
      const id = String(b.content_id);
      const found = await content.lookupContent(b.content_type, id).catch(() => null);
      let targetUser = found?.owner || null;
      if (!targetUser && b.target_user && USERNAME_RE.test(b.target_user)) targetUser = b.target_user;
      const r = await run(
        `INSERT OR IGNORE INTO reports(reporter, content_type, content_id, target_user, reason, details, snapshot, status, created_at)
         VALUES(?,?,?,?,?,?,?, 'open', ?)`,
        [me, b.content_type, id, targetUser, reason, details, found?.text != null ? String(found.text).slice(0, 2000) : null, Date.now()],
      );
      res.json({ ok: true, duplicate: !r.changes });
    }),
  );

  /* ═════════════ Admin: me ═════════════ */

  router.get(
    "/api/admin/me",
    h(async (req, res) => {
      const a = req.access;
      // Sidebar counters (one cheap COUNT, only for those who can act on it).
      const openReports = P.can(req, "content.moderate")
        ? Number((await get("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'"))?.c || 0)
        : null;
      res.json({
        ok: true,
        counts: { openReports },
        username: a.username,
        role: a.role,
        isOwner: a.role === "owner",
        permissions: [...a.perms],
        // What this person gets in each Admin section (Staff access).
        sections: S.levelsFor(a),
        canStaff: a.role === "owner" || a.perms.has("staff.access"),
        catalog: P.PERMISSIONS,
        roles: P.ASSIGNABLE_ROLES,
        roleDefaults: P.ROLE_DEFAULTS,
        ownerGrantOnly: [...P.OWNER_GRANT_ONLY],
        contentTypes: content.contentTypes(),
        flags: FEATURE_FLAGS,
      });
    }),
  );

  /* ═════════════ Site map (src/sitemap.js) ═════════════ */

  const REPO = "https://github.com/Gurudeep306/Nexora";
  const ROOT = path.join(__dirname, "..", "..");
  function countFiles(dir, limit = 5000) {
    let n = 0;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (n >= limit) return;
        if (e.isDirectory()) walk(path.join(d, e.name));
        else n++;
      }
    };
    try {
      walk(dir);
    } catch {
      /* unreadable: counted as 0 */
    }
    return n;
  }
  function fileInfo(rel) {
    const abs = path.join(ROOT, rel);
    let stat = null;
    try {
      stat = fs.statSync(abs);
    } catch {
      /* missing on this server */
    }
    const dir = rel.endsWith("/");
    return {
      path: rel,
      kind: dir ? "folder" : "file",
      exists: !!stat,
      files: dir && stat ? countFiles(abs) : undefined,
      url: `${REPO}/${dir ? "tree" : "blob"}/main/${rel.replace(/\/$/, "")}`,
    };
  }

  router.get(
    "/api/admin/sitemap",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const s = await getSettings();
      const chosen = sitemap.chosenModes(s);
      // Hive isn't even listed for someone who can't use it.
      const seesHive = P.mayUseHive(req);
      const effective = sitemap.effectiveModes(s);
      res.json({
        ok: true,
        modes: sitemap.MODES,
        parts: sitemap.PARTS.filter((p) => seesHive || !sitemap.isHive(p)).map((p) => ({
          id: p.id,
          label: p.label,
          parent: p.parent || null,
          core: !!p.core,
          pages: p.pages || null,
          api: p.api || null,
          mode: chosen[p.id],
          effective: effective[p.id],
          files: p.files.map(fileInfo),
        })),
      });
    }),
  );

  router.put(
    "/api/admin/sitemap/:id",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const part = sitemap.BY_ID.get(String(req.params.id));
      if (!part || (sitemap.isHive(part) && !P.mayUseHive(req))) return res.status(404).json({ ok: false, error: "Unknown part" });
      if (part.core) bad(`${part.label} is always on`);
      const mode = str(req.body?.mode, { max: 10, field: "mode" });
      if (!sitemap.MODES.includes(mode)) bad("Mode must be visible, staff, soon or hidden");
      const s = await getSettings();
      const before = sitemap.chosenModes(s)[part.id];
      await setSetting("site_parts", { ...s.site_parts, [part.id]: mode }, req.access.username);
      // Keep the older on/off flag in step for parts that carry one.
      if (part.flag) await setSetting("feature_flags", { ...s.feature_flags, [part.flag]: mode !== "hidden" }, req.access.username);
      await audit(req, "site.part", { targetType: "part", target: part.id, before: { mode: before }, after: { mode } });
      siteChanged();
      const next = await getSettings();
      res.json({ ok: true, effective: sitemap.effectiveModes(next), chosen: sitemap.chosenModes(next) });
    }),
  );

  /* ═════════════ Staff access (src/authz/sections.js) ═════════════ */

  // Only the owner, and admins the owner allows ("staff.access"), may open it.
  const requireStaffAccess = (req, res, next) => {
    if (req.access?.role === "owner" || req.access?.perms.has("staff.access")) return next();
    return res.status(403).json({ ok: false, code: "forbidden", error: "Only the owner, and admins the owner allows, can change staff access" });
  };
  const STAFF_SQL = `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.team_title, ${P.ACCESS_COLUMNS}
    FROM users u
    WHERE u.role IN ('admin', 'moderator', 'owner')
       OR EXISTS (SELECT 1 FROM user_permissions p WHERE p.username = u.username AND p.granted = 1 AND p.perm <> 'early_access')
       OR EXISTS (SELECT 1 FROM staff_section_access s WHERE s.username = u.username)
    ORDER BY CASE u.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END, u.username COLLATE NOCASE`;

  function staffRow(req, row) {
    const a = P.buildAccess(row.username, row);
    return {
      username: row.username,
      display_name: row.display_name || null,
      avatar: row.avatar || defaultAvatar(row.username),
      avatar_url: row.avatar_url || null,
      role: a.role,
      title: row.team_title || null,
      chosen: a.sections,
      effective: S.levelsFor(a),
      managesStaff: a.role === "owner" || a.perms.has("staff.access"),
      // You can't change the owner, yourself, or anyone at or above your role.
      editable: a.role !== "owner" && !sameUser(req, row.username) && P.canActOn(req, row.username, a.role),
      // The owner may title themselves too ("Founder").
      titleEditable: (a.role !== "owner" && !sameUser(req, row.username) && P.canActOn(req, row.username, a.role)) || (req.access.role === "owner" && a.role === "owner"),
    };
  }
  const sameUser = (req, u) => String(req.access?.username || "").toLowerCase() === String(u).toLowerCase();

  router.get(
    "/api/admin/staff-access",
    requireStaffAccess,
    h(async (req, res) => {
      const rows = await all(STAFF_SQL);
      res.json({
        ok: true,
        sections: S.SECTIONS.map(({ id, label, group, perms }) => ({ id, label, group, perms })),
        people: rows.map((r) => staffRow(req, r)),
        isOwner: req.access.role === "owner",
      });
    }),
  );

  router.put(
    "/api/admin/staff-access/:username",
    requireStaffAccess,
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      if (sameUser(req, t.username)) bad("You can't change your own access");
      if (!guardTarget(req, res, t)) return;
      const section = str(req.body?.section, { max: 40, field: "section" });
      if (!S.SECTION_IDS.includes(section)) bad("Unknown section");
      const level = str(req.body?.level, { max: 10, field: "level" });
      if (level !== "default" && !S.LEVELS.includes(level)) bad("Level must be default, none, view or edit");
      // You can hand out only what you have yourself.
      if (req.access.role !== "owner" && level !== "default" && S.RANK[level] > S.RANK[S.levelFor(req.access, section)]) {
        bad("You can't give more access than you have yourself");
      }
      const before = (await get("SELECT level FROM staff_section_access WHERE username = ? AND section = ?", [t.username, section]))?.level || "default";
      if (level === "default") await run("DELETE FROM staff_section_access WHERE username = ? AND section = ?", [t.username, section]);
      else
        await run(
          `INSERT INTO staff_section_access(username, section, level, updated_by, updated_at) VALUES(?,?,?,?,?)
           ON CONFLICT(username, section) DO UPDATE SET level = excluded.level, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
          [t.username, section, level, req.access.username, Date.now()],
        );
      await audit(req, "staff.section", { targetType: "user", target: t.username, before: { section, level: before }, after: { section, level } });
      const row = await get(`SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.team_title, ${P.ACCESS_COLUMNS} FROM users u WHERE u.username = ?`, [t.username]);
      res.json({ ok: true, person: staffRow(req, row) });
    }),
  );

  // A team member's job title, shown on their profile and in Admin.
  router.put(
    "/api/admin/staff-access/:username/title",
    requireStaffAccess,
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      if (!(req.access.role === "owner" && t.role === "owner")) {
        if (sameUser(req, t.username)) bad("You can't change your own title");
        if (!guardTarget(req, res, t)) return;
      }
      const raw = typeof req.body?.title === "string" ? req.body.title : "";
      const title = raw.replace(/\s+/g, " ").trim();
      if (title.length > 40) bad("Keep the title to 40 characters");
      if (/[<>]/.test(title)) bad("Titles can't contain < or >");
      const before = (await get("SELECT team_title FROM users WHERE username = ?", [t.username]))?.team_title || null;
      await run("UPDATE users SET team_title = ? WHERE username = ?", [title || null, t.username]);
      await audit(req, "staff.title", { targetType: "user", target: t.username, before: { title: before }, after: { title: title || null } });
      const row = await get(`SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.team_title, ${P.ACCESS_COLUMNS} FROM users u WHERE u.username = ?`, [t.username]);
      res.json({ ok: true, person: staffRow(req, row) });
    }),
  );

  // Let an admin open Staff access too (for people below them). The owner only.
  router.put(
    "/api/admin/staff-access/:username/top",
    requireOwner,
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      if (t.role === "owner") bad("The owner already has every permission");
      const on = bool(req.body?.on, "on");
      if (on && t.role !== "admin") bad("Only admins can be allowed to manage staff access");
      if (on) {
        await run(
          `INSERT INTO user_permissions(username, perm, granted, granted_by, created_at) VALUES(?, 'staff.access', 1, ?, ?)
           ON CONFLICT(username, perm) DO UPDATE SET granted = 1, granted_by = excluded.granted_by, created_at = excluded.created_at`,
          [t.username, req.access.username, Date.now()],
        );
      } else await run("DELETE FROM user_permissions WHERE username = ? AND perm = 'staff.access'", [t.username]);
      await audit(req, on ? "staff.manage.grant" : "staff.manage.revoke", { targetType: "user", target: t.username });
      const row = await get(`SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.team_title, ${P.ACCESS_COLUMNS} FROM users u WHERE u.username = ?`, [t.username]);
      res.json({ ok: true, person: staffRow(req, row) });
    }),
  );

  /* ═════════════ Overview ═════════════ */

  router.get(
    "/api/admin/overview",
    requirePerm("analytics.view"),
    h(async (_req, res) => {
      const since30 = day(29);
      const since30Iso = `${since30}T00:00:00.000Z`;
      const since30Ms = Date.parse(since30Iso);
      const [totals, signups, dau, subs, gate, ai, recent] = await Promise.all([
        get(
          `SELECT
            (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM users WHERE created_at >= ?) AS signups7,
            (SELECT COUNT(*) FROM user_daily_active WHERE day = ?) AS dau,
            (SELECT COUNT(DISTINCT username) FROM user_daily_active WHERE day >= ?) AS wau,
            (SELECT COUNT(*) FROM submissions) AS submissions,
            (SELECT COUNT(*) FROM gate_attempts) AS gate_attempts,
            (SELECT COALESCE(SUM(tokens), 0) FROM ai_usage) AS ai_tokens,
            (SELECT COUNT(DISTINCT username) FROM ai_usage WHERE day >= ?) AS ai_users7,
            (SELECT COUNT(DISTINCT username) FROM user_bans WHERE lifted_at IS NULL
               AND (expires_at IS NULL OR expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000)) AS banned,
            (SELECT COUNT(*) FROM reports WHERE status = 'open') AS open_reports`,
          [`${day(6)}T00:00:00.000Z`, day(0), day(6), day(6)],
        ),
        all("SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS c FROM users WHERE created_at >= ? GROUP BY d", [since30Iso]),
        all("SELECT day AS d, COUNT(*) AS c FROM user_daily_active WHERE day >= ? GROUP BY day", [since30]),
        all("SELECT substr(submitted_at, 1, 10) AS d, COUNT(*) AS c FROM submissions WHERE submitted_at >= ? GROUP BY d", [since30Iso]),
        all("SELECT date(created_at / 1000, 'unixepoch') AS d, COUNT(*) AS c FROM gate_attempts WHERE created_at >= ? GROUP BY d", [since30Ms]),
        all("SELECT day AS d, SUM(tokens) AS c, COUNT(DISTINCT username) AS u FROM ai_usage WHERE day >= ? GROUP BY day", [since30]),
        all("SELECT username, display_name, avatar, avatar_url, role, verified, created_at FROM users ORDER BY created_at DESC LIMIT 8"),
      ]);
      const days = Array.from({ length: 30 }, (_, i) => day(29 - i));
      const series = (rows, key = "c") => {
        const m = new Map(rows.map((r) => [r.d, Number(r[key]) || 0]));
        return days.map((d) => m.get(d) || 0);
      };
      const online = realtime?.online?.() || null;
      res.json({
        ok: true,
        totals: { ...totals, online: online ? online.length : null, errors24h: errorCount() },
        days,
        series: {
          signups: series(signups),
          dau: series(dau),
          submissions: series(subs),
          gate: series(gate),
          aiTokens: series(ai),
          aiUsers: series(ai, "u"),
        },
        recentSignups: recent.map((u) => ({ ...u, role: P.effectiveRole(u.username, u.role) })),
        online: online ? online.slice(0, 50) : null,
      });
    }),
  );

  /* ═════════════ Database usage (Turso quota) ═════════════ */

  // Rows read / written since boot, the top statements and a monthly
  // projection against the free-plan quota (src/db-stats.js). Costs no query.
  router.get(
    "/api/admin/db-stats",
    requirePerm("analytics.view"),
    h(async (req, res) => {
      const top = intIn(req.query.top, 1, 200, 25);
      res.json({ ok: true, ...dbStats.snapshot({ top }) });
    }),
  );

  /* ═════════════ Users ═════════════ */

  router.get(
    "/api/admin/users",
    requirePerm("users.view"),
    h(async (req, res) => {
      const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
      const where = [];
      const args = [];
      if (q) {
        where.push("(u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?)");
        args.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const role = String(req.query.role || "");
      if (role === "owner") {
        where.push("u.username = ? COLLATE NOCASE");
        args.push(P.ownerUsername() || "");
      } else if (["admin", "moderator", "member", "teacher"].includes(role)) {
        where.push(role === "member" ? "(u.role IS NULL OR u.role = 'member')" : "u.role = ?");
        if (role !== "member") args.push(role);
      }
      const status = String(req.query.status || "");
      if (status === "banned") where.push(ACTIVE_BAN_EXISTS);
      if (status === "active") where.push(`NOT ${ACTIVE_BAN_EXISTS}`);
      if (status === "verified") where.push("u.verified = 1");
      if (status === "early") {
        where.push("EXISTS (SELECT 1 FROM user_permissions p WHERE p.username = u.username AND p.perm = 'early_access' AND p.granted = 1)");
      }
      const joined = intIn(req.query.joined, 0, 3650, 0);
      if (joined) {
        where.push("u.created_at >= ?");
        args.push(`${day(joined - 1)}T00:00:00.000Z`);
      }
      const active = intIn(req.query.active, 0, 3650, 0);
      if (active) {
        where.push("EXISTS (SELECT 1 FROM user_daily_active a WHERE a.username = u.username AND a.day >= ?)");
        args.push(day(active - 1));
      }
      const sorts = {
        joined: "u.created_at DESC",
        seen: "u.last_seen IS NULL, u.last_seen DESC",
        name: "u.username COLLATE NOCASE ASC",
      };
      const order = sorts[req.query.sort] || sorts.joined;
      const limit = intIn(req.query.limit, 1, 200, 50);
      const offset = intIn(req.query.offset, 0, 1e7, 0);
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const showEmail = P.can(req, "users.manage");
      const [rows, count] = await Promise.all([
        all(
          `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.bio, u.role, u.verified, u.status,
                  u.last_seen, u.created_at, u.auth_provider${showEmail ? ", u.email" : ""},
                  ${ACTIVE_BAN_SQL} AS ban,
                  (SELECT group_concat(p.perm || '=' || p.granted) FROM user_permissions p WHERE p.username = u.username) AS perms
             FROM users u ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
          [...args, limit, offset],
        ),
        get(`SELECT COUNT(*) AS c FROM users u ${whereSql}`, args),
      ]);
      res.json({
        ok: true,
        total: Number(count?.c || 0),
        users: rows.map((r) => {
          const role = P.effectiveRole(r.username, r.role);
          const overrides = (r.perms || "").split(",").filter(Boolean);
          return {
            ...r,
            role,
            verified: !!r.verified,
            ban: parseBan(r.ban),
            perms: undefined,
            earlyAccess: P.permissionsFor(role, Object.fromEntries(overrides.map((x) => [x.split("=")[0], x.endsWith("=1")]))).has("early_access"),
          };
        }),
      });
    }),
  );

  router.get(
    "/api/admin/users/:username",
    requirePerm("users.view"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      const u = t.username;
      const showAudit = P.can(req, "audit.view");
      const [full, stats, submissions, sessions, bans, warnings, history, activeDays] = await Promise.all([
        get("SELECT username, display_name, avatar, avatar_url, bio, status, last_seen, created_at, auth_provider, email FROM users WHERE username = ?", [u]),
        get(
          `SELECT
            (SELECT COUNT(*) FROM progress WHERE username = ? AND status = 'solved') AS solved,
            (SELECT COALESCE(SUM(xp_earned), 0) FROM progress WHERE username = ?) AS xp,
            (SELECT COUNT(*) FROM submissions WHERE username = ?) AS submissions,
            (SELECT COUNT(*) FROM gate_attempts WHERE username = ?) AS gate_attempts,
            (SELECT COALESCE(SUM(tokens), 0) FROM ai_usage WHERE username = ?) AS ai_tokens,
            (SELECT COUNT(*) FROM friendships WHERE (from_user = ? OR to_user = ?) AND status = 'accepted') AS friends,
            (SELECT COUNT(*) FROM reports WHERE target_user = ?) AS reports_against`,
          [u, u, u, u, u, u, u, u],
        ),
        all(
          `SELECT s.id, s.verdict, s.language, s.submitted_at, p.title AS title
             FROM submissions s LEFT JOIN problems p ON p.id = s.problem_rowid
            WHERE s.username = ? ORDER BY s.id DESC LIMIT 10`,
          [u],
        ).catch(() => []),
        all("SELECT sid, expires FROM sessions WHERE json_extract(sess, '$.user.username') = ? ORDER BY expires DESC LIMIT 20", [u]),
        all("SELECT id, kind, reason, expires_at, created_by, created_at, lifted_at, lifted_by FROM user_bans WHERE username = ? ORDER BY id DESC LIMIT 20", [u]),
        all("SELECT id, reason, created_by, created_at, acknowledged_at FROM user_warnings WHERE username = ? ORDER BY id DESC LIMIT 20", [u]),
        showAudit
          ? all("SELECT id, actor, actor_role, action, before, after, created_at FROM audit_log WHERE target = ? ORDER BY id DESC LIMIT 20", [u])
          : Promise.resolve([]),
        all("SELECT day FROM user_daily_active WHERE username = ? AND day >= ? ORDER BY day", [u, day(29)]),
      ]);
      const overrides = {};
      for (const part of (t.perms || "").split(",").filter(Boolean)) {
        const [k, v] = part.split("=");
        overrides[k] = v === "1";
      }
      const myRank = P.rankOf(req.access.role);
      res.json({
        ok: true,
        user: {
          ...full,
          email: P.can(req, "users.manage") ? full.email : undefined,
          role: t.role,
          verified: !!t.verified,
        },
        stats,
        overrides,
        permissions: [...P.permissionsFor(t.role, overrides)],
        submissions,
        sessions: sessions.map((s) => ({ id: sidTag(s.sid), expires: s.expires })),
        bans: bans.map((b) => ({ ...b, active: !b.lifted_at && (!b.expires_at || b.expires_at > Date.now()) })),
        warnings,
        history: history.filter((x) => req.access.role === "owner" || P.rankOf(x.actor_role) < myRank || x.actor === req.access.username),
        activeDays: activeDays.map((r) => r.day),
        online: realtime?.online?.()?.includes(u) ?? null,
        canAct: P.canActOn(req, u, t.role),
      });
    }),
  );

  async function changeRole(req, res) {
    const t = await loadTarget(req, res);
    if (!t) return;
    const role = req.body?.role;
    if (!P.ASSIGNABLE_ROLES.includes(role)) bad("role must be member, moderator or admin");
    if (!guardTarget(req, res, t)) return;
    if (!P.canAssignRole(req, role)) {
      return res.status(403).json({
        ok: false,
        code: "rank",
        error: role === "admin" ? "Only the owner can make admins" : "You can only assign roles below your own",
      });
    }
    if (t.role === role) return res.json({ ok: true, role, unchanged: true });
    await run("UPDATE users SET role = ? WHERE username = ?", [role, t.username]);
    await audit(req, "user.role", { targetType: "user", target: t.username, before: { role: t.role }, after: { role } });
    invalidateBadges();
    res.json({ ok: true, role });
  }
  router.post("/api/admin/users/:username/role", requirePerm("users.manage"), h(changeRole));
  // Legacy endpoint (body: { targetUser, role }).
  router.post(
    "/api/admin/set-role",
    requirePerm("users.manage"),
    h(async (req, res) => {
      req.params.username = String(req.body?.targetUser || "");
      return changeRole(req, res);
    }),
  );

  router.put(
    "/api/admin/users/:username/permissions",
    requirePerm("users.manage"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      const grants = req.body?.grants;
      if (!grants || typeof grants !== "object" || Array.isArray(grants)) bad("grants must be an object");
      const entries = Object.entries(grants);
      if (!entries.length || entries.length > P.PERMISSION_KEYS.length) bad("grants is empty");
      for (const [perm, v] of entries) {
        if (!P.PERMISSION_KEYS.includes(perm)) bad(`unknown permission ${perm}`);
        if (v !== true && v !== false && v !== null) bad(`${perm} must be true, false or null`);
      }
      if (!guardTarget(req, res, t)) return;
      const denied = entries.filter(([perm]) => !P.canGrantPerm(req, perm)).map(([perm]) => perm);
      if (denied.length) {
        return res.status(403).json({
          ok: false,
          code: "grant",
          error: denied.some((d) => P.OWNER_GRANT_ONLY.has(d))
            ? "Only the owner can grant site settings"
            : `You can't grant permissions you don't have: ${denied.join(", ")}`,
        });
      }
      const before = {};
      for (const part of (t.perms || "").split(",").filter(Boolean)) {
        const [k, v] = part.split("=");
        before[k] = v === "1";
      }
      const now = Date.now();
      const me = req.access.username;
      await runBatch(
        entries.map(([perm, v]) =>
          v === null
            ? ["DELETE FROM user_permissions WHERE username = ? AND perm = ?", [t.username, perm]]
            : [
                `INSERT INTO user_permissions(username, perm, granted, granted_by, created_at) VALUES(?,?,?,?,?)
                 ON CONFLICT(username, perm) DO UPDATE SET granted = excluded.granted, granted_by = excluded.granted_by, created_at = excluded.created_at`,
                [t.username, perm, v ? 1 : 0, me, now],
              ],
        ),
      );
      const after = { ...before };
      for (const [perm, v] of entries) {
        if (v === null) delete after[perm];
        else after[perm] = v;
      }
      await audit(req, "user.permissions", { targetType: "user", target: t.username, before, after });
      res.json({ ok: true, overrides: after, permissions: [...P.permissionsFor(t.role, after)] });
    }),
  );

  router.post(
    "/api/admin/users/:username/ban",
    requirePerm("users.ban"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      const b = req.body || {};
      const kind = b.kind === "suspend" ? "suspend" : b.kind === "ban" ? "ban" : bad("kind must be ban or suspend");
      const reason = str(b.reason, { max: 500, min: 3, field: "reason" });
      let expiresAt = null;
      if (kind === "suspend") {
        const hours = Number(b.hours);
        if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 365) bad("hours must be between 1 and 8760");
        expiresAt = Date.now() + Math.round(hours * 3600000);
      }
      if (!guardTarget(req, res, t)) return;
      await run(
        "UPDATE user_bans SET lifted_at = ?, lifted_by = ? WHERE username = ? AND lifted_at IS NULL",
        [Date.now(), `${req.access.username} (replaced)`, t.username],
      );
      await run(
        "INSERT INTO user_bans(username, kind, reason, expires_at, created_by, created_at) VALUES(?,?,?,?,?,?)",
        [t.username, kind, reason, expiresAt, req.access.username, Date.now()],
      );
      await signOutEverywhere(t.username);
      await audit(req, `user.${kind}`, {
        targetType: "user",
        target: t.username,
        after: { kind, reason, until: expiresAt ? new Date(expiresAt).toISOString() : null },
      });
      res.json({ ok: true, ban: { kind, reason, until: expiresAt ? new Date(expiresAt).toISOString() : null } });
    }),
  );

  router.post(
    "/api/admin/users/:username/unban",
    requirePerm("users.ban"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      if (!guardTarget(req, res, t)) return;
      const r = await run("UPDATE user_bans SET lifted_at = ?, lifted_by = ? WHERE username = ? AND lifted_at IS NULL", [
        Date.now(),
        req.access.username,
        t.username,
      ]);
      if (r.changes) await audit(req, "user.unban", { targetType: "user", target: t.username });
      res.json({ ok: true, lifted: r.changes });
    }),
  );

  router.post(
    "/api/admin/users/:username/signout",
    requirePerm("users.manage"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      if (!guardTarget(req, res, t)) return;
      await signOutEverywhere(t.username);
      await audit(req, "user.signout", { targetType: "user", target: t.username });
      res.json({ ok: true });
    }),
  );

  router.post(
    "/api/admin/users/:username/reset",
    requirePerm("users.manage"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      const fields = Array.isArray(req.body?.fields) ? req.body.fields.filter((f) => f === "avatar" || f === "bio") : [];
      if (!fields.length) bad("fields must include avatar and/or bio");
      if (!guardTarget(req, res, t, { allowOwnerSelf: true })) return;
      const sets = [];
      const args = [];
      if (fields.includes("avatar")) {
        sets.push("avatar = ?", "avatar_url = NULL");
        args.push(defaultAvatar(t.username)); // the user's default from the avatar set
      }
      if (fields.includes("bio")) sets.push("bio = ''");
      await run(`UPDATE users SET ${sets.join(", ")} WHERE username = ?`, [...args, t.username]);
      await audit(req, "user.reset", {
        targetType: "user",
        target: t.username,
        before: { avatar: t.avatar, avatar_url: t.avatar_url, bio: t.bio },
        after: { fields },
      });
      res.json({ ok: true });
    }),
  );

  router.post(
    "/api/admin/users/:username/verify",
    requirePerm("users.verify"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      const verified = bool(req.body?.verified, "verified");
      if (!guardTarget(req, res, t, { allowOwnerSelf: true })) return;
      await run("UPDATE users SET verified = ? WHERE username = ?", [verified ? 1 : 0, t.username]);
      await audit(req, verified ? "user.verify" : "user.unverify", {
        targetType: "user",
        target: t.username,
        before: { verified: !!t.verified },
        after: { verified },
      });
      invalidateBadges();
      res.json({ ok: true, verified });
    }),
  );

  router.post(
    "/api/admin/users/:username/early-access",
    requirePerm("users.verify"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      const enabled = bool(req.body?.enabled, "enabled");
      if (!P.canGrantPerm(req, "early_access")) return res.status(403).json({ ok: false, error: "You can't grant early access" });
      if (!guardTarget(req, res, t)) return;
      if (enabled) {
        await run(
          `INSERT INTO user_permissions(username, perm, granted, granted_by, created_at) VALUES(?, 'early_access', 1, ?, ?)
           ON CONFLICT(username, perm) DO UPDATE SET granted = 1, granted_by = excluded.granted_by, created_at = excluded.created_at`,
          [t.username, req.access.username, Date.now()],
        );
      } else {
        await run("DELETE FROM user_permissions WHERE username = ? AND perm = 'early_access'", [t.username]);
      }
      await audit(req, enabled ? "user.early_access.grant" : "user.early_access.revoke", { targetType: "user", target: t.username });
      res.json({ ok: true, enabled });
    }),
  );

  router.post(
    "/api/admin/users/:username/warn",
    requirePerm("content.moderate"),
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      const reason = str(req.body?.reason, { max: 500, min: 3, field: "reason" });
      if (!guardTarget(req, res, t)) return;
      const r = await run("INSERT INTO user_warnings(username, reason, created_by, created_at) VALUES(?,?,?,?)", [
        t.username,
        reason,
        req.access.username,
        Date.now(),
      ]);
      realtime?.emitToUser?.(t.username, "site:warning", { id: r.lastID, reason });
      await audit(req, "user.warn", { targetType: "user", target: t.username, after: { reason } });
      res.json({ ok: true, id: r.lastID });
    }),
  );

  router.delete(
    "/api/admin/users/:username",
    requireOwner,
    h(async (req, res) => {
      const t = await loadTarget(req, res);
      if (!t) return;
      if (req.body?.confirm !== t.username) bad("Type the username exactly to confirm");
      if (!guardTarget(req, res, t)) return;
      const u = t.username;
      await signOutEverywhere(u);
      await runBatch(
        [
          "user_permissions",
          "staff_section_access",
          "user_warnings",
          "bookmarks",
          "ai_user_chats",
          "user_daily_active",
          "user_achievements",
        ].map((table) => [`DELETE FROM ${table} WHERE username = ?`, [u]]),
      ).catch(() => {});
      await run("DELETE FROM friendships WHERE from_user = ? OR to_user = ?", [u, u]).catch(() => {});
      await run("DELETE FROM users WHERE username = ?", [u]);
      await audit(req, "user.delete", { targetType: "user", target: u, before: { role: t.role, display_name: t.display_name } });
      invalidateBadges();
      res.json({ ok: true });
    }),
  );

  /* ═════════════ Site ═════════════ */

  router.get(
    "/api/admin/site",
    requirePerm("site.settings"),
    h(async (_req, res) => {
      const s = await getSettings();
      const [allowlist, early] = await Promise.all([
        all("SELECT entry, note, created_by, created_at FROM access_allowlist ORDER BY created_at DESC LIMIT 500"),
        all(
          `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, p.granted_by, p.created_at
             FROM user_permissions p JOIN users u ON u.username = p.username
            WHERE p.perm = 'early_access' AND p.granted = 1 ORDER BY p.created_at DESC LIMIT 500`,
        ),
      ]);
      res.json({
        ok: true,
        settings: s,
        privateActive: privateModeActive(s),
        ownerSource: ownerSource(),
        allowlist,
        earlyAccess: early,
      });
    }),
  );

  const siteChanged = () => realtime?.broadcast?.("site:update", {});

  router.put(
    "/api/admin/site/private-mode",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const before = (await getSettings()).private_mode;
      const enabled = bool(req.body?.enabled, "enabled");
      const message = req.body?.message === undefined ? before.message : str(req.body.message, { max: 280, field: "message" });
      const after = { enabled, message };
      await setSetting("private_mode", after, req.access.username);
      await audit(req, "site.private_mode", { targetType: "site", target: "private_mode", before, after });
      siteChanged();
      res.json({ ok: true, private_mode: after });
    }),
  );

  router.put(
    "/api/admin/site/registrations",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const before = (await getSettings()).registrations;
      const after = { open: bool(req.body?.open, "open") };
      await setSetting("registrations", after, req.access.username);
      await audit(req, "site.registrations", { targetType: "site", target: "registrations", before, after });
      siteChanged();
      res.json({ ok: true, registrations: after });
    }),
  );

  router.put(
    "/api/admin/site/flags",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const before = (await getSettings()).feature_flags;
      const b = req.body || {};
      const after = { ...before };
      let touched = 0;
      for (const f of FEATURE_FLAGS) {
        if (b[f] !== undefined) {
          after[f] = bool(b[f], f);
          touched++;
        }
      }
      if (!touched) bad(`send at least one of ${FEATURE_FLAGS.join(", ")}`);
      await setSetting("feature_flags", after, req.access.username);
      // The Site map is the same switch: an on/off here sets the part too.
      const s0 = await getSettings();
      const parts = { ...s0.site_parts };
      for (const p of sitemap.PARTS) if (p.flag && b[p.flag] !== undefined) parts[p.id] = after[p.flag] ? "visible" : "hidden";
      await setSetting("site_parts", parts, req.access.username);
      await audit(req, "site.feature_flags", { targetType: "site", target: "feature_flags", before, after });
      siteChanged();
      res.json({ ok: true, feature_flags: after });
    }),
  );

  router.put(
    "/api/admin/site/maintenance",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const before = (await getSettings()).maintenance;
      const after = {
        enabled: bool(req.body?.enabled, "enabled"),
        message: str(req.body?.message ?? "", { max: 280, field: "message" }),
      };
      await setSetting("maintenance", after, req.access.username);
      await audit(req, "site.maintenance", { targetType: "site", target: "maintenance", before, after });
      siteChanged();
      res.json({ ok: true, maintenance: after });
    }),
  );

  router.put(
    "/api/admin/site/default-style",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const before = (await getSettings()).default_style;
      const v = req.body?.style;
      const after = v === null || v === "" || v === undefined ? null : str(v, { max: 40, field: "style" });
      if (after !== null && !/^[a-z-]{2,40}$/.test(after)) bad("Unknown style");
      await setSetting("default_style", after, req.access.username);
      await audit(req, "site.default_style", { targetType: "site", target: "default_style", before, after });
      siteChanged();
      res.json({ ok: true, default_style: after });
    }),
  );

  router.post(
    "/api/admin/site/allowlist",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const entry = str(req.body?.entry, { max: 254, min: 2, field: "entry" });
      if (!USERNAME_RE.test(entry) && !EMAIL_RE.test(entry)) bad("entry must be a username or an email address");
      const note = str(req.body?.note ?? "", { max: 200, field: "note" });
      await run(
        `INSERT INTO access_allowlist(entry, note, created_by, created_at) VALUES(?,?,?,?)
         ON CONFLICT(entry) DO UPDATE SET note = excluded.note`,
        [entry, note, req.access.username, Date.now()],
      );
      await audit(req, "site.allowlist.add", { targetType: "allowlist", target: entry, after: { note } });
      res.json({ ok: true });
    }),
  );

  router.delete(
    "/api/admin/site/allowlist/:entry",
    requirePerm("site.settings"),
    h(async (req, res) => {
      const entry = String(req.params.entry || "").slice(0, 254);
      const r = await run("DELETE FROM access_allowlist WHERE entry = ?", [entry]);
      if (r.changes) await audit(req, "site.allowlist.remove", { targetType: "allowlist", target: entry });
      res.json({ ok: true, removed: r.changes });
    }),
  );

  /* ═════════════ AI models: providers, keys, per-feature choice ═════════════ */

  const ai = require("../ai/settings");
  const aiView = async () => {
    const c = await ai.loadConfig();
    const { models: envModels } = require("../ai/groq");
    return {
      presets: ai.PRESETS,
      features: ai.FEATURES.map(({ id, name, hint }) => ({ id, name, hint })),
      providers: c.providers.map(ai.publicProvider),
      slots: c.slots,
      assignments: c.features,
      budget: { dailyTokens: c.budget?.dailyTokens ?? null },
      env: { configured: !!String(process.env.GROQ_API_KEY || "").trim(), models: envModels() },
      active: ai.configuredInAdmin() ? "admin" : String(process.env.GROQ_API_KEY || "").trim() ? "env" : "none",
    };
  };
  const findProvider = (c, id) => {
    const p = c.providers.find((x) => x.id === id);
    if (!p) bad("No such provider");
    return p;
  };
  const urlOk = (u) => {
    try {
      const x = new URL(u);
      return x.protocol === "https:" || (x.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(x.hostname));
    } catch {
      return false;
    }
  };
  const assignment = (c, v, field) => {
    if (v === null || v === "" || v === undefined) return null;
    if (typeof v !== "object") bad(`${field} must be { provider, model }`);
    const provider = str(v.provider, { max: 40, field: `${field}.provider` });
    const model = str(v.model, { max: 200, field: `${field}.model` });
    findProvider(c, provider);
    return { provider, model };
  };

  router.get(
    "/api/admin/ai",
    requirePerm("ai.manage"),
    h(async (_req, res) => res.json({ ok: true, ...(await aiView()) })),
  );

  router.post(
    "/api/admin/ai/providers",
    requirePerm("ai.manage"),
    h(async (req, res) => {
      const b = req.body || {};
      const kind = str(b.kind, { max: 20, field: "kind" });
      if (!ai.PRESETS.some((p) => p.kind === kind)) bad("Unknown provider");
      const apiKey = str(b.apiKey ?? "", { max: 400, field: "apiKey" });
      const baseUrl = str(b.baseUrl ?? "", { max: 300, field: "baseUrl" });
      const p = ai.newProvider({ kind, name: b.name, baseUrl, apiKey });
      if (!urlOk(p.baseUrl)) bad("Base URL must be an https:// address");
      const c = await ai.loadConfig();
      if (c.providers.length >= 20) bad("Up to 20 providers");
      // Test straight away: the admin sees at once whether the key works.
      const t = await ai.testProvider(p);
      p.test = { ok: t.ok, at: Date.now(), ms: t.ms, error: t.error };
      if (t.ok) p.models = t.models;
      await ai.saveConfig({ ...c, providers: [...c.providers, p] }, req.access.username);
      await audit(req, "ai.provider.add", { targetType: "ai", target: p.id, after: { kind: p.kind, name: p.name, baseUrl: p.baseUrl, last4: p.last4 } });
      res.json({ ok: true, provider: ai.publicProvider(p), ...(await aiView()) });
    }),
  );

  router.put(
    "/api/admin/ai/providers/:id",
    requirePerm("ai.manage"),
    h(async (req, res) => {
      const c = await ai.loadConfig();
      const p = { ...findProvider(c, req.params.id) };
      const b = req.body || {};
      const before = ai.publicProvider(p);
      if (b.name !== undefined) p.name = str(b.name, { max: 60, field: "name" });
      if (b.baseUrl !== undefined) {
        const u = str(b.baseUrl, { max: 300, field: "baseUrl" }).replace(/\/+$/, "");
        if (!urlOk(u)) bad("Base URL must be an https:// address");
        p.baseUrl = u;
      }
      if (b.enabled !== undefined) p.enabled = bool(b.enabled, "enabled");
      if (b.apiKey) {
        const fresh = ai.newProvider({ kind: p.kind, baseUrl: p.baseUrl, apiKey: str(b.apiKey, { max: 400, field: "apiKey" }) });
        p.key = fresh.key;
        p.last4 = fresh.last4;
        p.test = null;
      }
      await ai.saveConfig({ ...c, providers: c.providers.map((x) => (x.id === p.id ? p : x)) }, req.access.username);
      await audit(req, "ai.provider.update", { targetType: "ai", target: p.id, before, after: ai.publicProvider(p) });
      res.json({ ok: true, ...(await aiView()) });
    }),
  );

  router.delete(
    "/api/admin/ai/providers/:id",
    requirePerm("ai.manage"),
    h(async (req, res) => {
      const c = await ai.loadConfig();
      const p = findProvider(c, req.params.id);
      const drop = (m) => Object.fromEntries(Object.entries(m || {}).filter(([, v]) => v?.provider !== p.id));
      await ai.saveConfig({ ...c, providers: c.providers.filter((x) => x.id !== p.id), slots: drop(c.slots), features: drop(c.features) }, req.access.username);
      await audit(req, "ai.provider.remove", { targetType: "ai", target: p.id, before: ai.publicProvider(p) });
      res.json({ ok: true, ...(await aiView()) });
    }),
  );

  router.post(
    "/api/admin/ai/providers/:id/test",
    requirePerm("ai.manage"),
    h(async (req, res) => {
      const c = await ai.loadConfig();
      const p = { ...findProvider(c, req.params.id) };
      const t = await ai.testProvider(p);
      p.test = { ok: t.ok, at: Date.now(), ms: t.ms, error: t.error };
      if (t.ok) p.models = t.models;
      await ai.saveConfig({ ...c, providers: c.providers.map((x) => (x.id === p.id ? p : x)) }, req.access.username);
      res.json({ ok: true, test: p.test, ...(await aiView()) });
    }),
  );

  router.post(
    "/api/admin/ai/providers/:id/try",
    requirePerm("ai.manage"),
    h(async (req, res) => {
      const c = await ai.loadConfig();
      const p = findProvider(c, req.params.id);
      const model = str(req.body?.model, { max: 200, field: "model" });
      res.json({ ok: true, result: await ai.tryModel(p, model) });
    }),
  );

  router.put(
    "/api/admin/ai/assignments",
    requirePerm("ai.manage"),
    h(async (req, res) => {
      const c = await ai.loadConfig();
      const b = req.body || {};
      const slots = { ...c.slots };
      const features = { ...c.features };
      for (const k of ai.SLOTS) if (b.slots && k in b.slots) slots[k] = assignment(c, b.slots[k], k);
      for (const f of ai.FEATURES) if (b.features && f.id in b.features) features[f.id] = assignment(c, b.features[f.id], f.id);
      let budget = c.budget;
      if (b.budget && "dailyTokens" in b.budget) {
        const n = b.budget.dailyTokens === null || b.budget.dailyTokens === "" ? null : Number(b.budget.dailyTokens);
        if (n !== null && (!Number.isFinite(n) || n < 1000 || n > 50_000_000)) bad("Daily tokens must be between 1,000 and 50,000,000");
        budget = { dailyTokens: n === null ? null : Math.round(n) };
      }
      const clean = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v));
      await ai.saveConfig({ ...c, slots: clean(slots), features: clean(features), budget }, req.access.username);
      await audit(req, "ai.assignments", { targetType: "ai", target: "assignments", before: { slots: c.slots, features: c.features, budget: c.budget }, after: { slots: clean(slots), features: clean(features), budget } });
      res.json({ ok: true, ...(await aiView()) });
    }),
  );

  /* ═════════════ Code runners: our own Piston servers ═════════════ */

  const runners = require("../runners");
  const runnerView = async () => {
    const list = await runners.loadRunners();
    const piston = require("../piston");
    const remote = require("../remote-exec");
    const judge0 = require("../judge0");
    const envCount = piston.pistonServers(process.env).length - runners.judgeServers().length;
    const health = remote.sandboxHealth();
    let slot = envCount;
    let j0 = 0;
    return {
      hosts: runners.HOSTS,
      kinds: runners.KINDS,
      keyed: runners.KEYED_SERVICES,
      max: runners.MAX_RUNNERS,
      envRunners: Math.max(0, envCount),
      runners: list.map((r) => {
        const pub = runners.publicRunner(r);
        // The judge's name for it, to show whether it is resting after failures.
        const usable = pub.kind === "judge0" ? pub.enabled && r.test && r.test.ok && r.test.map : pub.enabled;
        const engine = !usable ? null : pub.kind === "judge0" ? judge0.engineName(j0++) : piston.pistonEngineName(slot++);
        const h = engine && health[engine];
        return { ...pub, resting: !!(h && h.restingFor > 0), restingFor: h ? h.restingFor || 0 : 0 };
      }),
    };
  };
  const findRunner = (list, id) => {
    const r = list.find((x) => x.id === id);
    if (!r) bad("No such runner");
    return r;
  };

  router.get(
    "/api/admin/runners",
    requirePerm("runners.manage"),
    h(async (_req, res) => res.json({ ok: true, ...(await runnerView()) })),
  );

  router.post(
    "/api/admin/runners",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const b = req.body || {};
      const url = runners.cleanUrl(str(b.url, { max: 300, field: "url" }));
      if (!runners.urlOk(url)) bad("The address must start with https://");
      const token = str(b.token ?? "", { max: 400, field: "token" });
      const kind = str(b.kind ?? "piston", { max: 10, field: "kind" });
      if (!runners.KINDS.includes(kind)) bad("Unknown kind of runner");
      const r = runners.newRunner({ kind, name: str(b.name ?? "", { max: 60, field: "name" }), host: str(b.host ?? "other", { max: 20, field: "host" }), url, token });
      const list = await runners.loadRunners();
      if (list.length >= runners.MAX_RUNNERS) bad(`Up to ${runners.MAX_RUNNERS} runners`);
      if (list.some((x) => x.url === r.url)) bad("That runner is already added");
      // Test straight away: the admin sees at once whether it works.
      const t = await runners.testRunner(r);
      r.test = { ok: t.ok, at: Date.now(), ms: t.ms, error: t.error, languages: t.languages, runtimes: t.runtimes || 0, ...(t.map ? { map: t.map } : {}) };
      await runners.saveRunners([...list, r], req.access.username);
      await audit(req, "runner.add", { targetType: "runner", target: r.id, after: { name: r.name, host: r.host, url: r.url, last4: r.last4 } });
      res.json({ ok: true, runner: runners.publicRunner(r), ...(await runnerView()) });
    }),
  );

  router.put(
    "/api/admin/runners/:id",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const list = await runners.loadRunners();
      const r = { ...findRunner(list, req.params.id) };
      const before = runners.publicRunner(r);
      const b = req.body || {};
      if (b.name !== undefined) r.name = str(b.name, { max: 60, field: "name" }) || r.name;
      if (b.enabled !== undefined) r.enabled = bool(b.enabled, "enabled");
      if (b.url !== undefined) {
        const u = runners.cleanUrl(str(b.url, { max: 300, field: "url" }));
        if (!runners.urlOk(u)) bad("The address must start with https://");
        r.url = u;
        r.test = null;
      }
      if (b.token) {
        const fresh = runners.newRunner({ kind: r.kind, url: r.url, token: str(b.token, { max: 400, field: "token" }) });
        r.token = fresh.token;
        r.last4 = fresh.last4;
        r.test = null;
      }
      await runners.saveRunners(list.map((x) => (x.id === r.id ? r : x)), req.access.username);
      await audit(req, "runner.update", { targetType: "runner", target: r.id, before, after: runners.publicRunner(r) });
      res.json({ ok: true, ...(await runnerView()) });
    }),
  );

  router.post(
    "/api/admin/runners/:id/move",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const list = [...(await runners.loadRunners())];
      const i = list.findIndex((x) => x.id === req.params.id);
      if (i < 0) bad("No such runner");
      const j = req.body?.direction === "up" ? i - 1 : i + 1;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      await runners.saveRunners(list, req.access.username);
      res.json({ ok: true, ...(await runnerView()) });
    }),
  );

  router.delete(
    "/api/admin/runners/:id",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const list = await runners.loadRunners();
      const r = findRunner(list, req.params.id);
      await runners.saveRunners(list.filter((x) => x.id !== r.id), req.access.username);
      await audit(req, "runner.remove", { targetType: "runner", target: r.id, before: runners.publicRunner(r) });
      res.json({ ok: true, ...(await runnerView()) });
    }),
  );

  router.post(
    "/api/admin/runners/:id/test",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const list = await runners.loadRunners();
      const r = { ...findRunner(list, req.params.id) };
      const t = await runners.testRunner(r);
      r.test = { ok: t.ok, at: Date.now(), ms: t.ms, error: t.error, languages: t.languages, runtimes: t.runtimes || 0, ...(t.map ? { map: t.map } : {}) };
      await runners.saveRunners(list.map((x) => (x.id === r.id ? r : x)), req.access.username);
      // A runner that works again should not sit out its rest.
      if (t.ok) require("../remote-exec").resetHealth();
      res.json({ ok: true, test: r.test, ...(await runnerView()) });
    }),
  );

  /* ═════════════ Public runners and their compiler versions ═════════════ */

  const compilers = require("../compilers");
  const LANG_ID = /^[a-z][a-z0-9]{0,20}$/;
  const engineOf = (b) => {
    const e = str(b.engine, { max: 20, field: "engine" });
    if (!compilers.SERVICES.some((x) => x.id === e)) bad("No such service");
    return e;
  };
  const langOf = (b) => {
    const l = str(b.lang, { max: 21, field: "lang" });
    if (!LANG_ID.test(l)) bad("No such language");
    return l;
  };

  router.get(
    "/api/admin/compilers",
    requirePerm("runners.manage"),
    h(async (_req, res) => res.json({ ok: true, ...(await compilers.view()) })),
  );

  router.put(
    "/api/admin/compilers/services/:id",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const id = req.params.id;
      if (!compilers.SERVICES.some((x) => x.id === id)) bad("No such service");
      const on = bool(req.body?.on, "on");
      await compilers.setService(id, on, req.access.username);
      await audit(req, on ? "compilers.service.on" : "compilers.service.off", { targetType: "runner", target: id });
      res.json({ ok: true, ...(await compilers.view()) });
    }),
  );

  // Keep the version in use (it will not be updated), or let the updater choose again.
  router.put(
    "/api/admin/compilers/pin",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const b = req.body || {};
      const engine = engineOf(b);
      const lang = langOf(b);
      const keep = bool(b.keep, "keep");
      const id = b.id === undefined ? null : str(b.id, { max: 80, field: "id" });
      const current = require("../remote-exec").compilerFor(engine, lang);
      if (!current) bad("That service does not run this language");
      await compilers.setPin(engine, lang, keep ? id || current : null, req.access.username);
      await audit(req, keep ? "compilers.pin" : "compilers.unpin", { targetType: "runner", target: `${engine}:${lang}`, after: { id: keep ? id || current : null } });
      res.json({ ok: true, ...(await compilers.view()) });
    }),
  );

  router.post(
    "/api/admin/compilers/reset",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      const b = req.body || {};
      const engine = engineOf(b);
      const lang = langOf(b);
      await compilers.reset(engine, lang, req.access.username);
      await audit(req, "compilers.reset", { targetType: "runner", target: `${engine}:${lang}` });
      res.json({ ok: true, ...(await compilers.view()) });
    }),
  );

  // Look for newer versions now. It runs in the background (a minute or two);
  // the page asks again until it is done.
  router.post(
    "/api/admin/compilers/sync",
    requirePerm("runners.manage"),
    h(async (req, res) => {
      if (!compilers.isSyncing()) {
        compilers.sync({ by: req.access.username }).catch(() => {});
        await audit(req, "compilers.sync", { targetType: "runner", target: "all" });
      }
      const v = await compilers.view();
      res.json({ ok: true, ...v, sync: { ...v.sync, running: true } });
    }),
  );

  /* ═════════════ Announcements & broadcasts ═════════════ */

  router.get(
    "/api/admin/announcements",
    requirePerm("announcements.post"),
    h(async (_req, res) => {
      const rows = await all("SELECT * FROM announcements ORDER BY id DESC LIMIT 100");
      res.json({ ok: true, announcements: rows });
    }),
  );

  router.post(
    "/api/admin/announcements",
    requirePerm("announcements.post"),
    h(async (req, res) => {
      const b = req.body || {};
      const kind = b.kind === "broadcast" ? "broadcast" : "banner";
      const title = str(b.title ?? "", { max: 120, field: "title" });
      const body = str(b.body, { max: 500, min: 2, field: "body" });
      const link = safeLink(b.link);
      const color = COLORS.includes(b.color) ? b.color : "brand";
      const pinned = b.pinned === true;
      if (pinned && req.access.role !== "owner") return res.status(403).json({ ok: false, error: "Only the owner can pin announcements" });
      let expiresAt = null;
      if (b.hours !== undefined && b.hours !== null && b.hours !== "") {
        const hours = Number(b.hours);
        if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 365) bad("hours must be between 1 and 8760");
        expiresAt = Date.now() + Math.round(hours * 3600000);
      }
      const now = Date.now();
      const r = await run(
        `INSERT INTO announcements(kind, title, body, link, color, pinned, active, expires_at, created_by, created_at)
         VALUES(?,?,?,?,?,?,1,?,?,?)`,
        [kind, title, body, link, color, pinned ? 1 : 0, expiresAt, req.access.username, now],
      );
      const row = { id: r.lastID, kind, title, body, link, color, pinned: pinned ? 1 : 0, expires_at: expiresAt, created_at: now };
      await audit(req, `announcement.${kind}`, { targetType: "announcement", target: String(r.lastID), after: row });
      if (kind === "broadcast") realtime?.broadcast?.("site:broadcast", row);
      siteChanged();
      res.json({ ok: true, announcement: row });
    }),
  );

  router.patch(
    "/api/admin/announcements/:id",
    requirePerm("announcements.post"),
    h(async (req, res) => {
      const id = intIn(req.params.id, 1, 1e12, 0);
      const row = await get("SELECT * FROM announcements WHERE id = ?", [id]);
      if (!row) return res.status(404).json({ ok: false, error: "Announcement not found" });
      const b = req.body || {};
      const sets = [];
      const args = [];
      if (b.active !== undefined) {
        sets.push("active = ?");
        args.push(bool(b.active, "active") ? 1 : 0);
      }
      if (b.pinned !== undefined) {
        if (req.access.role !== "owner") return res.status(403).json({ ok: false, error: "Only the owner can pin announcements" });
        sets.push("pinned = ?");
        args.push(bool(b.pinned, "pinned") ? 1 : 0);
      }
      if (row.pinned && req.access.role !== "owner") return res.status(403).json({ ok: false, error: "Only the owner can change a pinned announcement" });
      if (!sets.length) bad("nothing to change");
      await run(`UPDATE announcements SET ${sets.join(", ")} WHERE id = ?`, [...args, id]);
      await audit(req, "announcement.update", { targetType: "announcement", target: String(id), before: { active: row.active, pinned: row.pinned }, after: b });
      siteChanged();
      res.json({ ok: true });
    }),
  );

  router.delete(
    "/api/admin/announcements/:id",
    requirePerm("announcements.post"),
    h(async (req, res) => {
      const id = intIn(req.params.id, 1, 1e12, 0);
      const row = await get("SELECT * FROM announcements WHERE id = ?", [id]);
      if (!row) return res.status(404).json({ ok: false, error: "Announcement not found" });
      if (row.pinned && req.access.role !== "owner") return res.status(403).json({ ok: false, error: "Only the owner can remove a pinned announcement" });
      await run("DELETE FROM announcements WHERE id = ?", [id]);
      await audit(req, "announcement.delete", { targetType: "announcement", target: String(id), before: row });
      siteChanged();
      res.json({ ok: true });
    }),
  );

  /* ═════════════ Moderation ═════════════ */

  router.get(
    "/api/admin/reports",
    requirePerm("content.moderate"),
    h(async (req, res) => {
      const status = ["open", "resolved", "dismissed"].includes(req.query.status) ? req.query.status : req.query.status === "all" ? null : "open";
      const type = content.isValidType(req.query.type) ? req.query.type : null;
      const where = [];
      const args = [];
      if (status) {
        where.push("r.status = ?");
        args.push(status);
      }
      if (type) {
        where.push("r.content_type = ?");
        args.push(type);
      }
      const rows = await all(
        `SELECT r.*,
            (SELECT COUNT(*) FROM reports r2 WHERE r2.content_type = r.content_type AND r2.content_id = r.content_id) AS report_count,
            EXISTS (SELECT 1 FROM moderated_content m WHERE m.content_type = r.content_type AND m.content_id = r.content_id) AS removed
           FROM reports r ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY r.id DESC LIMIT ?`,
        [...args, intIn(req.query.limit, 1, 200, 100)],
      );
      const counts = await all("SELECT status, COUNT(*) AS c FROM reports GROUP BY status");
      res.json({
        ok: true,
        reports: rows.map((r) => ({ ...r, removed: !!r.removed })),
        counts: Object.fromEntries(counts.map((c) => [c.status, c.c])),
      });
    }),
  );

  router.post(
    "/api/admin/reports/:id/resolve",
    requirePerm("content.moderate"),
    h(async (req, res) => {
      const id = intIn(req.params.id, 1, 1e12, 0);
      const report = await get("SELECT * FROM reports WHERE id = ?", [id]);
      if (!report) return res.status(404).json({ ok: false, error: "Report not found" });
      const action = req.body?.action;
      if (!["dismiss", "resolve", "remove"].includes(action)) bad("action must be dismiss, resolve or remove");
      const note = str(req.body?.note ?? "", { max: 500, field: "note" });
      if (action === "remove") {
        await content.removeContent(report.content_type, report.content_id, { by: req.access.username, reason: note || report.reason });
      }
      const status = action === "dismiss" ? "dismissed" : "resolved";
      // Every open report about the same content is settled together.
      await run(
        `UPDATE reports SET status = ?, resolution = ?, resolved_by = ?, resolved_at = ?
          WHERE content_type = ? AND content_id = ? AND status = 'open'`,
        [status, action === "remove" ? `removed${note ? `: ${note}` : ""}` : note || action, req.access.username, Date.now(), report.content_type, report.content_id],
      );
      await audit(req, `report.${action}`, {
        targetType: report.content_type,
        target: report.content_id,
        after: { report: id, note },
      });
      res.json({ ok: true, status });
    }),
  );

  router.get(
    "/api/admin/content/removed",
    requirePerm("content.moderate"),
    h(async (_req, res) => {
      const rows = await all("SELECT * FROM moderated_content ORDER BY removed_at DESC LIMIT 200");
      res.json({ ok: true, removed: rows });
    }),
  );

  router.post(
    "/api/admin/content/remove",
    requirePerm("content.moderate"),
    h(async (req, res) => {
      const { content_type: type, content_id: id } = req.body || {};
      if (!content.isValidType(type) || !content.isValidId(id)) bad("content_type and content_id are required");
      const reason = str(req.body?.reason ?? "", { max: 500, field: "reason" });
      const r = await content.removeContent(type, id, { by: req.access.username, reason });
      if (r.notFound) return res.status(404).json({ ok: false, error: "Content not found" });
      if (r.changed) await audit(req, "content.remove", { targetType: type, target: String(id), before: { text: r.before }, after: { reason } });
      res.json({ ok: true, changed: r.changed });
    }),
  );

  router.post(
    "/api/admin/content/restore",
    requirePerm("content.moderate"),
    h(async (req, res) => {
      const { content_type: type, content_id: id } = req.body || {};
      if (!content.isValidType(type) || !content.isValidId(id)) bad("content_type and content_id are required");
      const r = await content.restoreContent(type, id);
      if (r.changed) await audit(req, "content.restore", { targetType: type, target: String(id) });
      res.json({ ok: true, changed: r.changed });
    }),
  );

  /* ═════════════ Audit log ═════════════ */

  router.get(
    "/api/admin/audit",
    requirePerm("audit.view"),
    h(async (req, res) => {
      const where = [];
      const args = [];
      const me = req.access;
      // Admins see actions by lower roles (and their own); only the owner
      // sees what admins did.
      if (me.role !== "owner") {
        const below = Object.entries(P.RANK)
          .filter(([, r]) => r < P.rankOf(me.role))
          .map(([k]) => k);
        where.push(`(a.actor = ? OR COALESCE(a.actor_role, 'member') IN (${below.map(() => "?").join(",") || "''"}))`);
        args.push(me.username, ...below);
      }
      for (const [param, col] of [
        ["actor", "a.actor"],
        ["target", "a.target"],
      ]) {
        const v = typeof req.query[param] === "string" ? req.query[param].trim().slice(0, 60) : "";
        if (v) {
          where.push(`${col} LIKE ?`);
          args.push(`%${v}%`);
        }
      }
      const action = typeof req.query.action === "string" ? req.query.action.trim().slice(0, 60) : "";
      if (action) {
        where.push("a.action LIKE ?");
        args.push(`${action}%`);
      }
      const beforeId = intIn(req.query.before, 0, 1e12, 0);
      if (beforeId) {
        where.push("a.id < ?");
        args.push(beforeId);
      }
      const limit = intIn(req.query.limit, 1, 200, 50);
      const rows = await all(
        `SELECT a.* FROM audit_log a ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY a.id DESC LIMIT ?`,
        [...args, limit],
      );
      const parse = (v) => {
        if (v == null) return null;
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      };
      res.json({
        ok: true,
        entries: rows.map((r) => ({ ...r, before: parse(r.before), after: parse(r.after) })),
        next: rows.length === limit ? rows[rows.length - 1].id : null,
      });
    }),
  );

  return { router, invalidateBadges };
}

module.exports = { createAdminRouter };
