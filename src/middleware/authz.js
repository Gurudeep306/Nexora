// Authorization layer for the public deployment.
//
// Many endpoints were written for a single local user and trusted whatever
// identity the request claimed (`req.body.username`, `from`, `creator`,
// `:username`...). On the internet that let anyone read other people's DMs or
// act as them. This middleware runs before every route and:
//
//   1. PINS identity fields to the logged-in user (the client already sends
//      its own username, so it keeps working — but a forged name is replaced).
//   2. Restricts private reads (DMs, unread counts, friend requests) to the
//      people involved.
//   3. Checks ownership before deleting/editing someone else's rows.
//   4. Requires login for code execution / AI, and admin for site-wide actions.
const { get } = require("../db");
const { getSessionUser } = require("./auth");

const deny = (res, status, error) => res.status(status).json({ ok: false, error });
const isAdmin = (u) => u?.role === "admin";

/** [method, path regex, rule] — first match wins. */
const RULES = [
  // ── identity pinning ────────────────────────────────────────────
  ["POST", /^\/api\/bookmarks$/, { pin: { body: ["username"] } }],
  ["GET", /^\/api\/bookmarks$/, { pin: { query: ["username"] } }],
  ["DELETE", /^\/api\/bookmarks\/[^/]+$/, { pin: { query: ["username"] } }],
  ["POST", /^\/api\/messages$/, { pin: { body: ["from"] } }],
  ["POST", /^\/api\/messages\/[^/]+\/react$/, { pin: { body: ["username"] } }],
  ["POST", /^\/api\/friends\/request$/, { pin: { body: ["from"] } }],
  ["POST", /^\/api\/rooms$/, { pin: { body: ["creator"] } }],
  ["POST", /^\/api\/contests\/create$/, { pin: { body: ["creator"] } }],
  ["POST", /^\/api\/contests\/join$/, { pin: { body: ["username"] } }],
  ["DELETE", /^\/api\/contests\/[^/]+$/, { pin: { body: ["username"] }, adminBypass: true }],
  ["POST", /^\/api\/custom-problems$/, { pin: { body: ["creator"] } }],

  // ── private reads ───────────────────────────────────────────────
  ["GET", /^\/api\/messages\/unread\/([^/]+)$/, { self: 1 }],
  ["GET", /^\/api\/friends\/([^/]+)\/requests$/, { self: 1, adminBypass: true }],
  ["GET", /^\/api\/messages\/[^/]+\/reactions$/, { login: true }],
  ["GET", /^\/api\/messages\/([^/]+)\/([^/]+)$/, { participant: [1, 2] }],

  // ── ownership checks ────────────────────────────────────────────
  ["POST", /^\/api\/friends\/(accept|reject)$/, {
    owner: async (req, me) => {
      const f = await get("SELECT to_user FROM friendships WHERE id=?", [req.body?.id]);
      return !f || f.to_user === me; // 404 handled by the route
    },
  }],
  ["DELETE", /^\/api\/friends\/([^/]+)$/, {
    owner: async (req, me) => {
      const f = await get("SELECT from_user, to_user FROM friendships WHERE id=?", [req.params0[1]]);
      return !f || f.from_user === me || f.to_user === me;
    },
  }],
  ["DELETE", /^\/api\/rooms\/([^/]+)$/, {
    adminBypass: true,
    owner: async (req, me) => {
      const r = await get("SELECT creator FROM solve_rooms WHERE id=?", [req.params0[1]]);
      return !r || r.creator === me;
    },
  }],
  ["PUT|DELETE", /^\/api\/custom-problems\/([^/]+)$/, {
    adminBypass: true,
    owner: async (req, me) => {
      const p = await get("SELECT creator FROM custom_problems WHERE id=?", [req.params0[1]]);
      return !p || !p.creator || p.creator === me;
    },
  }],

  // ── site-wide actions ──────────────────────────────────────────
  ["POST", /^\/api\/sync$/, { admin: true }],
  // Personal settings / reset / Codeforces sync act only on your own data.
  ["POST", /^\/api\/(settings|reset-progress|sync-solved)$/, { login: true }],

  // ── login required: code execution, AI, personal data writes ────
  ["POST", /^\/api\/(ai\/coach|translate\/detect|judge|run|translate|ai-chat|ai-complete|ai-fix|decomposition|code-replay|testcases|ai-battle\/start|ai-battle\/complete|dashboard-layout)$/, { login: true }],
  ["PUT|DELETE", /^\/api\/testcases\/[^/]+$/, { login: true }],
  ["POST", /^\/api\/(ai-problems|tutorials|forge\/topic)\/[^/]+\/(progress|complete|status)$/, { login: true }],
];

function authz() {
  return async (req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    const rule = RULES.find(([m, re]) => m.split("|").includes(req.method) && re.test(req.path));
    if (!rule) return next();
    const [, re, r] = rule;
    req.params0 = req.path.match(re);
    const user = getSessionUser(req);
    const me = user?.username;
    if (!me) return deny(res, 401, "Please sign in first");
    if (r.admin && !isAdmin(user)) return deny(res, 403, "Admin only");

    if (r.pin) {
      for (const f of r.pin.body || []) {
        if (req.body && typeof req.body === "object") req.body[f] = me;
      }
      for (const f of r.pin.query || []) req.query[f] = me;
      // Admins may delete contests they don't own (moderation).
      if (r.adminBypass && isAdmin(user) && req.method === "DELETE") {
        const c = await get("SELECT creator FROM custom_contests WHERE id=?", [req.params0[0].split("/").pop()]).catch(() => null);
        if (c?.creator && req.body) req.body.username = c.creator;
      }
    }
    if (r.self && decodeURIComponent(req.params0[r.self]) !== me && !(r.adminBypass && isAdmin(user))) {
      return deny(res, 403, "You can only view your own data");
    }
    if (r.participant) {
      const people = r.participant.map((i) => decodeURIComponent(req.params0[i]));
      if (!people.includes(me)) return deny(res, 403, "You can only read your own conversations");
    }
    if (r.owner && !(r.adminBypass && isAdmin(user))) {
      try {
        if (!(await r.owner(req, me))) return deny(res, 403, "You can only change your own items");
      } catch (e) {
        return next(e);
      }
    }
    next();
  };
}

module.exports = { authz, RULES };
