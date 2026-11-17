// Roles and permissions — the single source of truth for "may this user do X".
// Per-section staff access (Admin → Staff access) sits on top: see ./sections.js.
//
//   owner      exactly one, named by OWNER_USERNAME (or the CLI). Every
//              permission, always; cannot be demoted, banned or granted.
//   admin      every permission except site.settings (owner grants that).
//   moderator  user lookup, bans and content moderation.
//   member     nothing extra (legacy 'teacher' ranks with members).
//
// On top of the role, any user can be granted or denied individual
// permissions (user_permissions). The access middleware (./access.js) loads a
// signed-in user's effective permissions once per request; can() reads them.
const { getSessionUser } = require("../middleware/auth");
const { peekSettings } = require("./site-settings");
const { parseSections } = require("./sections");

const PERMISSIONS = [
  { key: "users.view", label: "View users", group: "Users", description: "Search users and open their admin profile." },
  { key: "users.manage", label: "Manage users", group: "Users", description: "Change roles and permissions, reset profiles, sign users out." },
  { key: "users.ban", label: "Ban & suspend", group: "Users", description: "Ban or suspend users and lift bans." },
  { key: "users.verify", label: "Verify & early access", group: "Users", description: "Give or remove the verified badge and early access." },
  { key: "content.moderate", label: "Moderate content", group: "Content", description: "Work the reports queue, remove and restore content, warn users." },
  { key: "content.feature", label: "Feature content", group: "Content", description: "Feature content and use the ForgeBuilder page editor." },
  { key: "announcements.post", label: "Announcements", group: "Site", description: "Post the announcement bar and broadcast notifications." },
  { key: "site.settings", label: "Site settings", group: "Site", description: "Private mode, registrations, feature flags, maintenance banner. Owner grants only." },
  { key: "ai.manage", label: "AI models", group: "Site", description: "AI providers and their keys, a model for each feature, the daily budget. Owner grants only." },
  { key: "runners.manage", label: "Code runners", group: "Site", description: "Our code runners, their keys, and which compiler versions are used. Owner grants only." },
  { key: "analytics.view", label: "Analytics", group: "Site", description: "See the admin overview: totals, trends and activity." },
  { key: "audit.view", label: "Audit log", group: "Site", description: "Read the audit log of admin actions (below your own role)." },
  { key: "contests.manage", label: "Contests & live", group: "Platform", description: "Delete any contest and manage live classes." },
  { key: "problems.manage", label: "Problems", group: "Platform", description: "Problem sources and sync, the judge self-test, any Workshop problem." },
  { key: "problems.author", label: "Write problems", group: "Platform", description: "Admin → Add a problem: write, check and publish our own coding problems." },
  { key: "gate.manage", label: "GATE", group: "Platform", description: "Manage GATE content." },
  { key: "early_access", label: "Early access", group: "Access", description: "May use the site while it is private." },
  { key: "staff.access", label: "Staff access", group: "Site", description: "Open Admin → Staff access: set team titles and choose which Admin sections each person below them can see or change. Owner grants only." },
];
const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
const PERMISSION_SET = new Set(PERMISSION_KEYS);

/** Only the owner may grant these. */
const OWNER_GRANT_ONLY = new Set(["site.settings", "ai.manage", "runners.manage", "staff.access"]);

const ROLES = ["member", "moderator", "admin", "owner"];
/** Roles that can be assigned through the API (the owner comes from env/CLI). */
const ASSIGNABLE_ROLES = ["member", "moderator", "admin"];
const RANK = { member: 0, teacher: 0, moderator: 1, admin: 2, owner: 3 };

const ROLE_DEFAULTS = {
  member: [],
  teacher: [],
  moderator: ["users.view", "users.ban", "content.moderate"],
  admin: PERMISSION_KEYS.filter((k) => !OWNER_GRANT_ONLY.has(k)),
  owner: PERMISSION_KEYS,
};

const rankOf = (role) => RANK[role] ?? 0;
const sameName = (a, b) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();

function ownerUsername() {
  return peekSettings().owner_username;
}
function isOwnerName(username) {
  return sameName(username, ownerUsername());
}

/**
 * The role a user really has: the configured owner is 'owner' whatever the
 * row says, and a stale 'owner' row (the owner was changed) counts as admin.
 */
function effectiveRole(username, storedRole) {
  if (isOwnerName(username)) return "owner";
  if (storedRole === "owner") return "admin";
  return storedRole || "member";
}

/** "perm=1,perm=0" (group_concat of user_permissions) → { perm: bool } */
function parseOverrides(raw) {
  const out = {};
  if (!raw) return out;
  for (const part of String(raw).split(",")) {
    const [k, v] = part.split("=");
    if (PERMISSION_SET.has(k)) out[k] = v === "1";
  }
  return out;
}

function permissionsFor(role, overrides = {}) {
  if (role === "owner") return new Set(PERMISSION_KEYS);
  const set = new Set(ROLE_DEFAULTS[role] || []);
  for (const [k, granted] of Object.entries(overrides)) {
    if (granted) set.add(k);
    else set.delete(k);
  }
  return set;
}

/** Build an access object from a users row joined with overrides/ban. */
function buildAccess(username, row) {
  const role = effectiveRole(username, row?.role);
  const overrides = parseOverrides(row?.perms);
  let ban = null;
  if (row?.ban && role !== "owner") {
    try {
      ban = typeof row.ban === "string" ? JSON.parse(row.ban) : row.ban;
    } catch {
      ban = { kind: "ban", reason: "" };
    }
  }
  return {
    username,
    role,
    overrides,
    perms: permissionsFor(role, overrides),
    sections: role === "owner" ? {} : parseSections(row?.sections),
    verified: !!row?.verified,
    ban,
  };
}

/** SQL columns (for a `users` row aliased `u`) that buildAccess() reads. */
const ACCESS_COLUMNS = `u.role AS role, u.verified AS verified,
  (SELECT group_concat(p.perm || '=' || p.granted) FROM user_permissions p WHERE p.username = u.username) AS perms,
  (SELECT group_concat(s.section || '=' || s.level) FROM staff_section_access s WHERE s.username = u.username) AS sections,
  (SELECT json_object('kind', b.kind, 'reason', b.reason, 'expires_at', b.expires_at)
     FROM user_bans b
    WHERE b.username = u.username AND b.lifted_at IS NULL
      AND (b.expires_at IS NULL OR b.expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000)
    ORDER BY b.id DESC LIMIT 1) AS ban`;

// Access computed for this request, keyed by the session user object (so code
// that only has `req.session.user` — e.g. live classes — sees the overrides).
const accessByUser = new WeakMap();

function attachAccess(req, access) {
  req.access = access;
  if (req.session?.user && access) accessByUser.set(req.session.user, access);
}

/** Access for a request, an access object, or a session user. */
function accessOf(subject) {
  if (!subject) return null;
  if (subject.perms instanceof Set) return subject;
  if (subject.access !== undefined || subject.session !== undefined) {
    if (subject.access) return subject.access;
    const u = getSessionUser(subject);
    return u ? accessOf(u) : null;
  }
  if (subject.username) {
    return accessByUser.get(subject) || buildAccess(subject.username, { role: subject.role });
  }
  return null;
}

/** May this request / user do `perm`? */
function can(subject, perm) {
  // Inside an Admin section the person was given (view/edit; sectionGate
  // already refused writes to a view-only one), that section's permissions
  // count for this request only.
  if (subject?.sectionGrant?.perms?.has(perm)) return true;
  const a = accessOf(subject);
  if (!a) return false;
  if (a.role === "owner") return true;
  return a.perms.has(perm);
}

/** Any admin-panel permission (early_access alone doesn't count). */
function hasAnyAdminPerm(subject) {
  const a = accessOf(subject);
  if (!a) return false;
  if (a.role === "owner") return true;
  for (const p of a.perms) if (p !== "early_access") return true;
  // Someone given a section in Admin → Staff access opens the panel too.
  for (const level of Object.values(a.sections || {})) if (level !== "none") return true;
  return false;
}

/** Hive (the team's AI workspace) is for admins and the owner only. */
function mayUseHive(subject) {
  const a = accessOf(subject);
  return !!a && (a.role === "owner" || a.role === "admin");
}

/** Owner, admins and early_access holders may use the site while it is private. */
function mayEnterPrivateSite(subject) {
  const a = accessOf(subject);
  if (!a) return false;
  return a.role === "owner" || a.role === "admin" || a.perms.has("early_access");
}

/**
 * May `actor` act on a user with `targetRole`? Nobody acts on the owner; the
 * owner acts on everyone else; otherwise you must outrank the target.
 */
function canActOn(actor, targetUsername, targetRole) {
  const a = accessOf(actor);
  if (!a) return false;
  const role = effectiveRole(targetUsername, targetRole);
  if (role === "owner") return false;
  if (a.role === "owner") return true;
  if (sameName(a.username, targetUsername)) return false;
  return rankOf(a.role) > rankOf(role);
}

/** May `actor` give someone `role`? */
function canAssignRole(actor, role) {
  const a = accessOf(actor);
  if (!a || !ASSIGNABLE_ROLES.includes(role)) return false;
  if (a.role === "owner") return true;
  return rankOf(a.role) > rankOf(role);
}

/** May `actor` grant or revoke `perm` for someone? */
function canGrantPerm(actor, perm) {
  const a = accessOf(actor);
  if (!a || !PERMISSION_SET.has(perm)) return false;
  if (a.role === "owner") return true;
  if (OWNER_GRANT_ONLY.has(perm)) return false;
  return a.perms.has(perm); // you can only hand out what you have
}

/** Express middleware: 401 when signed out, 403 without `perm`. */
function requirePerm(perm) {
  return (req, res, next) => {
    const user = getSessionUser(req);
    if (!user?.username) return res.status(401).json({ ok: false, error: "Please sign in first" });
    if (!can(req, perm)) return res.status(403).json({ ok: false, error: "You don't have permission to do that", code: "forbidden", perm });
    req.sessionUser = user;
    next();
  };
}

/** Express middleware: the owner only. */
function requireOwner(req, res, next) {
  const user = getSessionUser(req);
  if (!user?.username) return res.status(401).json({ ok: false, error: "Please sign in first" });
  if (accessOf(req)?.role !== "owner") return res.status(403).json({ ok: false, error: "Only the owner can do that", code: "owner_only" });
  req.sessionUser = user;
  next();
}

module.exports = {
  ACCESS_COLUMNS,
  ASSIGNABLE_ROLES,
  OWNER_GRANT_ONLY,
  PERMISSIONS,
  PERMISSION_KEYS,
  RANK,
  ROLES,
  ROLE_DEFAULTS,
  accessOf,
  attachAccess,
  buildAccess,
  can,
  canActOn,
  canAssignRole,
  canGrantPerm,
  effectiveRole,
  hasAnyAdminPerm,
  isOwnerName,
  mayEnterPrivateSite,
  mayUseHive,
  ownerUsername,
  permissionsFor,
  rankOf,
  requireOwner,
  requirePerm,
};
