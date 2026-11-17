// Social network + public profiles.
//
//   /api/social/*    posts (text, markdown, code, images, polls, share cards,
//                    quotes, reposts), comments with one level of replies,
//                    likes, bookmarks, follows (with requests for
//                    followers-only profiles), blocks, mutes, notifications,
//                    search, hashtags, suggestions, uploads, featuring.
//   /api/profiles/*  the public profile (cover, links, privacy, pins) and its
//                    showcase (stats, heatmap, topics, achievements, …).
//
// Rules that hold everywhere:
//   - identity is the session user; nothing trusts a username in the body;
//   - blocks are two-way invisibility; mutes hide someone from your feeds and
//     notifications only;
//   - a followers-only profile shows its posts and showcase to accepted
//     followers (and staff with content.moderate) only;
//   - content removed by a moderator (src/authz/content.js, types "post" and
//     "comment") disappears for everyone but moderators, who see it flagged;
//   - text is stored as plain text and rendered as text by the client (never
//     as HTML), image URLs must be our own uploads, links must be http(s).
// Pages are built with a fixed number of queries (no per-row lookups).
const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { errMessage } = require("../http-error");
const { getSessionUser } = require("../middleware/auth");
const { can } = require("../authz/permissions");
const content = require("../authz/content");
const { persistUpload } = require("../upload-store");
const { isSetAvatar } = require("../avatar-set");
const { getCatalog, byId: catalogById } = require("../problem-catalog");
const { sharedCache } = require("../shared-cache");

// Who-to-follow per user: several aggregates over users/progress/follows, so
// cached for 10 minutes and dropped the moment a follow/block/friendship or
// a new account lands.
const suggestionsCache = sharedCache({
  name: "social-suggestions",
  ttlMs: 10 * 60 * 1000,
  tables: ["social_follows", "social_blocks", "friendships", "users"],
  max: 2000,
});

/* ── content types for reports / moderation ── */
content.registerContentType("post", { table: "social_posts", id: "id", text: "body", owner: "username", label: "Post" });
content.registerContentType("comment", { table: "social_comments", id: "id", text: "body", owner: "username", label: "Comment" });

/* ── limits ── */
const POST_MAX = 2000;
const COMMENT_MAX = 1000;
const CODE_MAX = 6000;
const MAX_IMAGES = 4;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // same as avatars (src/routes/auth.js)
const PAGE = 15;
const DAY = 86400000;
const CODE_LANGS = new Set(["cpp", "c", "python", "java", "javascript", "typescript", "go", "rust", "kotlin", "sql", "bash", "text"]);
const COVER_PRESETS = new Set(["plain", "aurora", "nebula", "ember", "lagoon", "orchid", "graphite", "dawn", "matrix"]);
const ACCENTS = new Set(["brand", "info", "success", "warning", "danger"]);
const NAME_RE = /^[A-Za-z0-9_]{1,40}$/;
const TAG_RE = /(^|[^\w&/#])#([A-Za-z][A-Za-z0-9_]{1,39})/g;
const MENTION_RE = /(^|[^\w@/])@([A-Za-z0-9_]{2,40})/g;
const UPLOAD_URL_RE = /^\/uploads\/social\/[a-z0-9_-]{8,80}\.(png|jpg|webp|gif)$/;

class BadInput extends Error {}
const bad = (msg, status = 400) => {
  const e = new BadInput(msg);
  e.status = status;
  throw e;
};

/** Plain text: no control characters (bar newline/tab), normalised newlines, trimmed. */
function cleanText(v, max, field = "text") {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") bad(`${field} must be text`);
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\n{4,}/g, "\n\n\n").trim();
  if (s.length > max) bad(`${field} must be at most ${max} characters`);
  return s;
}
function httpUrl(v, field = "link") {
  const s = cleanText(v, 300, field);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if ((u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".")) return u.toString();
  } catch {}
  bad(`${field} must be a web address`);
}
const intParam = (v, dflt = 0) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
};
const parseJson = (v, dflt = null) => {
  if (v == null || v === "") return dflt;
  try {
    return JSON.parse(v);
  } catch {
    return dflt;
  }
};
const ph = (n) => Array.from({ length: n }, () => "?").join(",");
const hashtagsOf = (text) => {
  const out = new Set();
  for (const m of String(text || "").matchAll(TAG_RE)) out.add(m[2].toLowerCase());
  return [...out].slice(0, 15);
};
const mentionsOf = (text) => {
  const out = new Set();
  for (const m of String(text || "").matchAll(MENTION_RE)) out.add(m[2]);
  return [...out].slice(0, 10);
};

function createSocialRouter(deps) {
  const { all, get, run, realtime, isTrustedOrigin, calcLevel, calcStreak } = deps;
  const router = express.Router();

  const me = (req) => getSessionUser(req)?.username || null;
  const isMod = (req) => can(req, "content.moderate");
  const h = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof BadInput) return res.status(e.status || 400).json({ ok: false, error: e.message });
      console.error("[social]", req.method, req.path, e.message);
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  };

  // Writes need a session and must come from the site itself (CSRF).
  router.use(["/api/social", "/api/profiles"], (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.method === "GET") return next();
    if (!me(req)) return res.status(401).json({ ok: false, error: "Please sign in first" });
    if (isTrustedOrigin && !isTrustedOrigin(req)) return res.status(403).json({ ok: false, error: "Untrusted origin" });
    next();
  });
  const requireMe = (req, res, next) => (me(req) ? next() : res.status(401).json({ ok: false, error: "Please sign in first" }));

  const limiter = (name, envKey, dflt, windowMin, msg) =>
    rateLimit({
      windowMs: windowMin * 60 * 1000,
      limit: Number(process.env[envKey]) || dflt,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `${name}:${me(req)}`,
      validate: { keyGeneratorIpFallback: false },
      // Only what actually got created counts (a rejected draft isn't spam).
      skipFailedRequests: true,
      message: { ok: false, error: msg, code: "rate_limited" },
    });
  const postLimiter = limiter("post", "SOCIAL_POST_LIMIT", 10, 10, "You're posting a lot — take a breather and try again in a few minutes.");
  const commentLimiter = limiter("comment", "SOCIAL_COMMENT_LIMIT", 30, 10, "Too many comments in a row — try again in a few minutes.");
  const uploadLimiter = limiter("upload", "SOCIAL_UPLOAD_LIMIT", 30, 10, "Too many uploads — try again later.");
  const actionLimiter = limiter("action", "SOCIAL_ACTION_LIMIT", 400, 10, "Slow down a little — try again shortly.");

  /* ═════════════ relationships ═════════════ */

  async function relation(viewer, target) {
    if (!viewer || viewer === target) return { self: viewer === target, following: null, followsMe: false, blockedByMe: false, blocksMe: false, muted: false };
    const r = await get(
      `SELECT
        (SELECT status FROM social_follows WHERE follower=? AND followee=?) AS following,
        (SELECT status FROM social_follows WHERE follower=? AND followee=?) AS follows_me,
        EXISTS(SELECT 1 FROM social_blocks WHERE blocker=? AND blocked=?) AS blocked_by_me,
        EXISTS(SELECT 1 FROM social_blocks WHERE blocker=? AND blocked=?) AS blocks_me,
        EXISTS(SELECT 1 FROM social_mutes WHERE muter=? AND muted=?) AS muted`,
      [viewer, target, target, viewer, viewer, target, target, viewer, viewer, target],
    );
    return {
      self: false,
      following: r?.following || null,
      followsMe: r?.follows_me === "accepted",
      blockedByMe: !!r?.blocked_by_me,
      blocksMe: !!r?.blocks_me,
      muted: !!r?.muted,
    };
  }
  const isBlockedEither = async (a, b) =>
    !!(await get("SELECT 1 AS x FROM social_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)", [a, b, b, a]));

  /** May `viewer` see `author`'s posts and showcase? */
  async function canSee(req, author, rel) {
    const viewer = me(req);
    if (viewer === author) return true;
    rel ||= await relation(viewer, author);
    if (rel.blockedByMe || rel.blocksMe) return isMod(req);
    const vis = (await get("SELECT visibility FROM social_profiles WHERE username=?", [author]))?.visibility || "public";
    return vis === "public" || rel.following === "accepted" || isMod(req);
  }

  /** SQL (alias p) + args: posts `viewer` may see. Moderators also see removed posts. */
  function visibleSql(viewer, mod, { mutes = false, publicOnly = false } = {}) {
    const v = viewer || "";
    let sql = `p.deleted = 0
      AND NOT EXISTS (SELECT 1 FROM social_blocks b WHERE (b.blocker = ? AND b.blocked = p.username) OR (b.blocker = p.username AND b.blocked = ?))
      ${mod ? "" : "AND NOT EXISTS (SELECT 1 FROM moderated_content mc WHERE mc.content_type = 'post' AND mc.content_id = CAST(p.id AS TEXT))"}`;
    const args = [v, v];
    if (publicOnly) {
      sql += ` AND COALESCE((SELECT visibility FROM social_profiles sp WHERE sp.username = p.username), 'public') = 'public'`;
    } else {
      sql += ` AND (p.username = ?${mod ? " OR 1=1" : ""}
        OR COALESCE((SELECT visibility FROM social_profiles sp WHERE sp.username = p.username), 'public') = 'public'
        OR EXISTS (SELECT 1 FROM social_follows f WHERE f.follower = ? AND f.followee = p.username AND f.status = 'accepted'))`;
      args.push(v, v);
    }
    if (mutes && viewer) {
      sql += " AND NOT EXISTS (SELECT 1 FROM social_mutes m WHERE m.muter = ? AND m.muted = p.username)";
      args.push(v);
    }
    return { sql, args };
  }

  const POST_COLS = `p.*, u.display_name, u.avatar, u.avatar_url, u.role, u.verified,
    EXISTS (SELECT 1 FROM moderated_content mc WHERE mc.content_type = 'post' AND mc.content_id = CAST(p.id AS TEXT)) AS removed`;

  const author = (r) => ({
    username: r.username,
    display_name: r.display_name || null,
    avatar: r.avatar || null,
    avatar_url: r.avatar_url || null,
    role: r.role || "member",
    verified: !!r.verified,
  });

  /** Posts by id that the viewer may see (one query). */
  async function fetchVisible(ids, viewer, mod) {
    if (!ids.length) return new Map();
    const vis = visibleSql(viewer, mod);
    const rows = await all(
      `SELECT ${POST_COLS} FROM social_posts p JOIN users u ON u.username = p.username
       WHERE p.id IN (${ph(ids.length)}) AND ${vis.sql}`,
      [...ids, ...vis.args],
    );
    return new Map(rows.map((r) => [r.id, r]));
  }

  /**
   * Turn post rows (some may be reposts) into feed items, with everything the
   * card needs: original/quoted posts, my like/bookmark/repost, poll results.
   * A fixed number of queries per page whatever its size.
   */
  async function hydrate(rows, req) {
    const viewer = me(req);
    const mod = isMod(req);
    const originals = await fetchVisible(
      [...new Set(rows.filter((r) => r.kind === "repost" && r.repost_of).map((r) => r.repost_of))],
      viewer,
      mod,
    );
    const contentRows = new Map();
    for (const r of rows) if (r.kind !== "repost") contentRows.set(r.id, r);
    for (const [id, r] of originals) contentRows.set(id, r);
    const quoteIds = [...new Set([...contentRows.values()].map((r) => r.quote_of).filter(Boolean))];
    const quotes = await fetchVisible(quoteIds, viewer, mod);
    const ids = [...contentRows.keys()];
    const pollIds = [...contentRows.values()].filter((r) => r.poll).map((r) => r.id);
    const [likes, marks, reposts, votes, myVotes] = ids.length && viewer
      ? await Promise.all([
          all(`SELECT post_id FROM social_likes WHERE username = ? AND post_id IN (${ph(ids.length)})`, [viewer, ...ids]),
          all(`SELECT post_id FROM social_bookmarks WHERE username = ? AND post_id IN (${ph(ids.length)})`, [viewer, ...ids]),
          all(`SELECT repost_of FROM social_posts WHERE username = ? AND kind = 'repost' AND deleted = 0 AND repost_of IN (${ph(ids.length)})`, [viewer, ...ids]),
          pollIds.length
            ? all(`SELECT post_id, option, COUNT(*) AS n FROM social_poll_votes WHERE post_id IN (${ph(pollIds.length)}) GROUP BY post_id, option`, pollIds)
            : [],
          pollIds.length ? all(`SELECT post_id, option FROM social_poll_votes WHERE username = ? AND post_id IN (${ph(pollIds.length)})`, [viewer, ...pollIds]) : [],
        ])
      : [[], [], [], [], []];
    const liked = new Set(likes.map((r) => r.post_id));
    const marked = new Set(marks.map((r) => r.post_id));
    const reposted = new Set(reposts.map((r) => r.repost_of));
    const voteMap = new Map();
    for (const v of votes) {
      if (!voteMap.has(v.post_id)) voteMap.set(v.post_id, {});
      voteMap.get(v.post_id)[v.option] = v.n;
    }
    const mine = new Map(myVotes.map((v) => [v.post_id, v.option]));

    const serialize = (r, withQuote = true) => {
      const poll = parseJson(r.poll);
      let pollOut = null;
      if (poll && Array.isArray(poll.options)) {
        const counts = voteMap.get(r.id) || {};
        const total = Object.values(counts).reduce((s, n) => s + n, 0);
        pollOut = {
          options: poll.options.map((text, i) => ({ text, votes: counts[i] || 0 })),
          total,
          my_vote: mine.has(r.id) ? mine.get(r.id) : null,
          closes_at: poll.closes_at || null,
          closed: !!poll.closes_at && poll.closes_at < Date.now(),
        };
      }
      const q = withQuote && r.quote_of ? quotes.get(r.quote_of) : null;
      return {
        id: r.id,
        author: author(r),
        body: r.body,
        code: r.code ? { lang: r.code_lang || "text", source: r.code } : null,
        images: parseJson(r.images, []) || [],
        poll: pollOut,
        share: parseJson(r.share),
        quote: q ? serialize(q, false) : r.quote_of ? { unavailable: true } : null,
        created_at: r.created_at,
        edited_at: r.edited_at || null,
        featured: !!r.featured_at,
        removed: !!r.removed,
        counts: { likes: r.like_count, comments: r.comment_count, reposts: r.repost_count },
        me: { liked: liked.has(r.id), bookmarked: marked.has(r.id), reposted: reposted.has(r.id) },
      };
    };

    const items = [];
    const shown = new Set(); // a post appears once per page (its newest repost wins)
    for (const r of rows) {
      const pid = r.kind === "repost" ? r.repost_of : r.id;
      if (shown.has(pid)) continue;
      shown.add(pid);
      if (r.kind === "repost") {
        const o = originals.get(r.repost_of);
        if (!o) continue;
        items.push({ key: `r${r.id}`, cursor: r.id, post: serialize(o), reposted_by: author(r), reposted_at: r.created_at });
      } else {
        items.push({ key: `p${r.id}`, cursor: r.id, post: serialize(r) });
      }
    }
    return items;
  }

  /* ═════════════ notifications ═════════════ */

  async function notify(recipient, actor, type, { post_id = null, comment_id = null } = {}) {
    if (!recipient || !actor || recipient === actor) return;
    const skip = await get(
      `SELECT 1 AS x WHERE EXISTS (SELECT 1 FROM social_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?))
          OR EXISTS (SELECT 1 FROM social_mutes WHERE muter=? AND muted=?)
          OR NOT EXISTS (SELECT 1 FROM users WHERE username=?)`,
      [recipient, actor, actor, recipient, recipient, actor, recipient],
    );
    if (skip) return;
    // One row per (actor, type, target): liking twice doesn't notify twice.
    if (["like", "repost", "follow", "follow_request", "comment_like"].includes(type)) {
      await run(
        "DELETE FROM social_notifications WHERE username=? AND actor=? AND type=? AND COALESCE(post_id,0)=? AND COALESCE(comment_id,0)=?",
        [recipient, actor, type, post_id || 0, comment_id || 0],
      );
    }
    await run(
      "INSERT INTO social_notifications(username, actor, type, post_id, comment_id, created_at) VALUES(?,?,?,?,?,?)",
      [recipient, actor, type, post_id, comment_id, Date.now()],
    );
    realtime?.emitToUser?.(recipient, "social:notification", { type, actor, post_id });
  }
  const unnotify = (recipient, actor, type, post_id = null, comment_id = null) =>
    run(
      "DELETE FROM social_notifications WHERE username=? AND actor=? AND type=? AND COALESCE(post_id,0)=? AND COALESCE(comment_id,0)=?",
      [recipient, actor, type, post_id || 0, comment_id || 0],
    );

  async function notifyMentions(text, actor, { post_id, comment_id, exclude = [] }) {
    const names = mentionsOf(text).filter((n) => n !== actor && !exclude.includes(n));
    if (!names.length) return;
    const found = await all(`SELECT username FROM users WHERE username IN (${ph(names.length)})`, names);
    for (const { username } of found) await notify(username, actor, "mention", { post_id, comment_id });
  }

  /* ═════════════ share cards (built from the server's own data) ═════════════ */

  async function buildShare(u, s) {
    if (!s || typeof s !== "object") return null;
    const type = String(s.type || "");
    if (type === "solved") {
      const row = await get(
        `SELECT pb.id, pb.title, pb.rating, pb.platform, pr.solved_at FROM progress pr JOIN problems pb ON pb.id = pr.problem_rowid
         WHERE pr.username = ? AND pr.status = 'solved' AND pb.id = ?`,
        [u, intParam(s.id)],
      );
      if (!row) bad("You haven't solved that problem yet");
      return { type, title: row.title, subtitle: `${row.platform || "Problem"}${row.rating ? ` · ${row.rating}` : ""}`, stat: "Solved", link: `/solve/${row.id}`, at: row.solved_at };
    }
    if (type === "gate_test") {
      const row = await get(
        `SELECT id, title, score, json_extract(result, '$.maxScore') AS max, json_extract(result, '$.percentile') AS pct, submitted_at
         FROM gate_tests WHERE username = ? AND id = ? AND submitted_at IS NOT NULL`,
        [u, String(s.id || "").slice(0, 80)],
      );
      if (!row) bad("That test isn't finished");
      return {
        type,
        title: row.title,
        subtitle: row.pct != null ? `Percentile ${Math.round(row.pct)}` : "GATE mock test",
        stat: `${row.score}${row.max ? ` / ${row.max}` : ""}`,
        link: "/gate/tests",
        at: row.submitted_at,
      };
    }
    if (type === "streak") {
      const st = await calcStreak(u);
      if (!st.current) bad("No active streak to share yet");
      return { type, title: `${st.current}-day streak`, subtitle: `Best ${st.best} days`, stat: `${st.current}d`, link: "/analytics" };
    }
    if (type === "lesson") {
      const row = await get(
        `SELECT t.id, t.title, t.category, tp.completed_at FROM tutorial_progress tp JOIN tutorials t ON t.id = tp.tutorial_id
         WHERE tp.username = ? AND tp.completed = 1 AND t.id = ?`,
        [u, intParam(s.id)],
      );
      if (!row) bad("Finish that lesson first");
      return { type, title: row.title, subtitle: row.category || "Lesson", stat: "Completed", link: "/learn", at: row.completed_at };
    }
    if (type === "achievement") {
      const row = await get(
        `SELECT a.id, a.title, a.description, a.icon, ua.unlocked_at FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.username = ? AND ua.achievement_id = ? AND ua.unlocked_at IS NOT NULL`,
        [u, String(s.id || "").slice(0, 80)],
      );
      if (!row) bad("That achievement is still locked");
      return { type, title: row.title, subtitle: row.description, stat: "Unlocked", icon: row.icon, link: "/achievements", at: row.unlocked_at };
    }
    bad("Unknown share card");
  }

  router.get(
    "/api/social/shareables",
    requireMe,
    h(async (req, res) => {
      const u = me(req);
      const [solved, tests, lessons, achievements, streak] = await Promise.all([
        all(
          `SELECT pb.id, pb.title, pb.rating, pb.platform FROM progress pr JOIN problems pb ON pb.id = pr.problem_rowid
           WHERE pr.username = ? AND pr.status = 'solved' ORDER BY pr.solved_at DESC LIMIT 8`,
          [u],
        ),
        all(
          `SELECT id, title, score, json_extract(result, '$.maxScore') AS max FROM gate_tests
           WHERE username = ? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC LIMIT 5`,
          [u],
        ),
        all(
          `SELECT t.id, t.title, t.category FROM tutorial_progress tp JOIN tutorials t ON t.id = tp.tutorial_id
           WHERE tp.username = ? AND tp.completed = 1 ORDER BY tp.completed_at DESC LIMIT 5`,
          [u],
        ).catch(() => []),
        all(
          `SELECT a.id, a.title, a.icon FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
           WHERE ua.username = ? AND ua.unlocked_at IS NOT NULL ORDER BY ua.unlocked_at DESC LIMIT 6`,
          [u],
        ),
        calcStreak(u),
      ]);
      res.json({ ok: true, solved, tests, lessons, achievements, streak: { current: streak.current, best: streak.best } });
    }),
  );

  /* ═════════════ posts ═════════════ */

  async function indexTags(postId, text, at) {
    await run("DELETE FROM social_hashtags WHERE post_id = ?", [postId]);
    for (const tag of hashtagsOf(text)) {
      await run("INSERT OR IGNORE INTO social_hashtags(tag, post_id, created_at) VALUES(?,?,?)", [tag, postId, at]);
    }
  }

  async function loadOne(req, id) {
    const map = await fetchVisible([id], me(req), isMod(req));
    const row = map.get(id);
    if (!row) return null;
    return (await hydrate([row], req))[0]?.post || null;
  }

  async function fanOutNewPost(author, id) {
    if (!realtime?.emitToUser) return;
    const followers = await all("SELECT follower FROM social_follows WHERE followee = ? AND status = 'accepted' LIMIT 5000", [author]);
    for (const f of followers) realtime.emitToUser(f.follower, "social:post", { id, author });
  }

  router.post(
    "/api/social/posts",
    requireMe,
    postLimiter,
    h(async (req, res) => {
      const u = me(req);
      const b = req.body || {};
      const body = cleanText(b.body, POST_MAX, "Post");
      const code = b.code ? cleanText(b.code.source ?? b.code, CODE_MAX, "Code") : "";
      const codeLang = code ? (CODE_LANGS.has(b.code?.lang) ? b.code.lang : "text") : null;
      const images = Array.isArray(b.images) ? b.images : [];
      if (images.length > MAX_IMAGES) bad(`At most ${MAX_IMAGES} images`);
      for (const img of images) if (typeof img !== "string" || !UPLOAD_URL_RE.test(img)) bad("Images must be uploaded first");
      let poll = null;
      if (b.poll) {
        const opts = Array.isArray(b.poll.options) ? b.poll.options.map((o) => cleanText(o, 60, "Poll option")).filter(Boolean) : [];
        if (opts.length < 2 || opts.length > 4) bad("A poll needs 2 to 4 options");
        if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) bad("Poll options must be different");
        const hours = Math.min(168, Math.max(1, intParam(b.poll.hours, 24)));
        poll = { options: opts, closes_at: Date.now() + hours * 3600000 };
        if (!body) bad("Ask your poll question in the post");
      }
      const share = b.share ? await buildShare(u, b.share) : null;
      let quoteOf = null;
      if (b.quote_of != null) {
        quoteOf = intParam(b.quote_of);
        const q = (await fetchVisible([quoteOf], u, false)).get(quoteOf);
        if (!q || q.kind === "repost") bad("That post can't be quoted", 404);
      }
      if (!body && !code && !images.length && !share) bad("Write something first");
      const now = Date.now();
      const r = await run(
        `INSERT INTO social_posts(username, kind, body, code, code_lang, images, poll, share, quote_of, created_at)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [u, "post", body, code || null, codeLang, images.length ? JSON.stringify(images) : null, poll ? JSON.stringify(poll) : null, share ? JSON.stringify(share) : null, quoteOf, now],
      );
      const id = r.lastID;
      await indexTags(id, body, now);
      if (quoteOf) {
        await run("UPDATE social_posts SET repost_count = repost_count + 1 WHERE id = ?", [quoteOf]);
        const q = await get("SELECT username FROM social_posts WHERE id = ?", [quoteOf]);
        await notify(q?.username, u, "quote", { post_id: id });
      }
      await notifyMentions(body, u, { post_id: id });
      fanOutNewPost(u, id).catch(() => {});
      res.json({ ok: true, post: await loadOne(req, id) });
    }),
  );

  router.get(
    "/api/social/posts/:id",
    h(async (req, res) => {
      const post = await loadOne(req, intParam(req.params.id));
      if (!post) return res.status(404).json({ ok: false, error: "Post not found" });
      res.json({ ok: true, post });
    }),
  );

  async function ownPost(req, id) {
    const row = await get("SELECT * FROM social_posts WHERE id = ? AND deleted = 0", [id]);
    if (!row) bad("Post not found", 404);
    if (row.username !== me(req)) bad("You can only change your own posts", 403);
    return row;
  }

  router.patch(
    "/api/social/posts/:id",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const row = await ownPost(req, id);
      if (row.kind === "repost") bad("Reposts can't be edited");
      if (await content.isRemoved("post", id)) bad("A moderator removed this post", 403);
      const b = req.body || {};
      const body = b.body !== undefined ? cleanText(b.body, POST_MAX, "Post") : row.body;
      let code = row.code;
      let lang = row.code_lang;
      if (b.code !== undefined) {
        code = b.code ? cleanText(b.code.source ?? b.code, CODE_MAX, "Code") || null : null;
        lang = code ? (CODE_LANGS.has(b.code?.lang) ? b.code.lang : row.code_lang || "text") : null;
      }
      if (!body && !code && !row.images && !row.share) bad("A post can't be empty");
      await run("UPDATE social_posts SET body = ?, code = ?, code_lang = ?, edited_at = ? WHERE id = ?", [body, code, lang, Date.now(), id]);
      await indexTags(id, body, row.created_at);
      res.json({ ok: true, post: await loadOne(req, id) });
    }),
  );

  router.delete(
    "/api/social/posts/:id",
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const row = await ownPost(req, id);
      await run("UPDATE social_posts SET deleted = 1 WHERE id = ?", [id]);
      await run("DELETE FROM social_hashtags WHERE post_id = ?", [id]);
      await run("DELETE FROM social_notifications WHERE post_id = ?", [id]);
      const target = row.repost_of || row.quote_of;
      if (target) await run("UPDATE social_posts SET repost_count = MAX(repost_count - 1, 0) WHERE id = ?", [target]);
      // Pins pointing at it go too.
      const prof = await get("SELECT pinned FROM social_profiles WHERE username = ?", [row.username]);
      const pins = parseJson(prof?.pinned, []) || [];
      if (pins.some((p) => p.type === "post" && Number(p.id) === id)) {
        await run("UPDATE social_profiles SET pinned = ? WHERE username = ?", [JSON.stringify(pins.filter((p) => !(p.type === "post" && Number(p.id) === id))), row.username]);
      }
      res.json({ ok: true });
    }),
  );

  /** The post must exist and be visible to me; interacting with blocked users is refused. */
  async function interactable(req, id) {
    const row = (await fetchVisible([id], me(req), false)).get(id);
    if (!row || row.kind === "repost") bad("Post not found", 404);
    return row;
  }

  // Likes, bookmarks and reposts are idempotent PUT/DELETE (safe for optimistic UI).
  router.put(
    "/api/social/posts/:id/like",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const row = await interactable(req, id);
      const r = await run("INSERT OR IGNORE INTO social_likes(post_id, username, created_at) VALUES(?,?,?)", [id, me(req), Date.now()]);
      if (r.changes) {
        await run("UPDATE social_posts SET like_count = like_count + 1 WHERE id = ?", [id]);
        await notify(row.username, me(req), "like", { post_id: id });
      }
      const c = await get("SELECT like_count FROM social_posts WHERE id = ?", [id]);
      res.json({ ok: true, liked: true, likes: c.like_count });
    }),
  );
  router.delete(
    "/api/social/posts/:id/like",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const r = await run("DELETE FROM social_likes WHERE post_id = ? AND username = ?", [id, me(req)]);
      if (r.changes) {
        await run("UPDATE social_posts SET like_count = MAX(like_count - 1, 0) WHERE id = ?", [id]);
        const p = await get("SELECT username FROM social_posts WHERE id = ?", [id]);
        if (p) await unnotify(p.username, me(req), "like", id);
      }
      const c = await get("SELECT like_count FROM social_posts WHERE id = ?", [id]);
      res.json({ ok: true, liked: false, likes: c?.like_count ?? 0 });
    }),
  );
  router.get(
    "/api/social/posts/:id/likes",
    h(async (req, res) => {
      const id = intParam(req.params.id);
      await interactable(req, id);
      const users = await all(
        `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.verified FROM social_likes l JOIN users u ON u.username = l.username
         WHERE l.post_id = ? AND NOT EXISTS (SELECT 1 FROM social_blocks b WHERE (b.blocker = ? AND b.blocked = l.username) OR (b.blocker = l.username AND b.blocked = ?))
         ORDER BY l.created_at DESC LIMIT 100`,
        [id, me(req) || "", me(req) || ""],
      );
      res.json({ ok: true, users: users.map(author) });
    }),
  );

  router.put(
    "/api/social/posts/:id/bookmark",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      await interactable(req, id);
      await run("INSERT OR IGNORE INTO social_bookmarks(username, post_id, created_at) VALUES(?,?,?)", [me(req), id, Date.now()]);
      res.json({ ok: true, bookmarked: true });
    }),
  );
  router.delete(
    "/api/social/posts/:id/bookmark",
    h(async (req, res) => {
      await run("DELETE FROM social_bookmarks WHERE username = ? AND post_id = ?", [me(req), intParam(req.params.id)]);
      res.json({ ok: true, bookmarked: false });
    }),
  );

  router.put(
    "/api/social/posts/:id/repost",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const row = await interactable(req, id);
      const u = me(req);
      const existing = await get("SELECT id FROM social_posts WHERE username = ? AND kind = 'repost' AND repost_of = ? AND deleted = 0", [u, id]);
      if (!existing) {
        const r = await run("INSERT INTO social_posts(username, kind, repost_of, created_at) VALUES(?,?,?,?)", [u, "repost", id, Date.now()]);
        await run("UPDATE social_posts SET repost_count = repost_count + 1 WHERE id = ?", [id]);
        await notify(row.username, u, "repost", { post_id: id });
        fanOutNewPost(u, r.lastID).catch(() => {});
      }
      const c = await get("SELECT repost_count FROM social_posts WHERE id = ?", [id]);
      res.json({ ok: true, reposted: true, reposts: c.repost_count });
    }),
  );
  router.delete(
    "/api/social/posts/:id/repost",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const u = me(req);
      const r = await run("UPDATE social_posts SET deleted = 1 WHERE username = ? AND kind = 'repost' AND repost_of = ? AND deleted = 0", [u, id]);
      if (r.changes) {
        await run("UPDATE social_posts SET repost_count = MAX(repost_count - 1, 0) WHERE id = ?", [id]);
        const p = await get("SELECT username FROM social_posts WHERE id = ?", [id]);
        if (p) await unnotify(p.username, u, "repost", id);
      }
      const c = await get("SELECT repost_count FROM social_posts WHERE id = ?", [id]);
      res.json({ ok: true, reposted: false, reposts: c?.repost_count ?? 0 });
    }),
  );

  router.post(
    "/api/social/posts/:id/vote",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const row = await interactable(req, id);
      const poll = parseJson(row.poll);
      if (!poll) bad("This post has no poll");
      if (poll.closes_at && poll.closes_at < Date.now()) bad("This poll has closed");
      const option = intParam(req.body?.option, -1);
      if (option < 0 || option >= poll.options.length) bad("Pick one of the options");
      const r = await run("INSERT OR IGNORE INTO social_poll_votes(post_id, username, option, created_at) VALUES(?,?,?,?)", [id, me(req), option, Date.now()]);
      if (!r.changes) bad("You already voted", 409);
      res.json({ ok: true, post: await loadOne(req, id) });
    }),
  );

  router.post(
    "/api/social/posts/:id/feature",
    h(async (req, res) => {
      if (!can(req, "content.feature")) return res.status(403).json({ ok: false, error: "You don't have permission to do that", code: "forbidden" });
      const id = intParam(req.params.id);
      const row = await get("SELECT id FROM social_posts WHERE id = ? AND deleted = 0 AND kind <> 'repost'", [id]);
      if (!row) bad("Post not found", 404);
      const on = req.body?.on !== false;
      await run("UPDATE social_posts SET featured_at = ? WHERE id = ?", [on ? Date.now() : null, id]);
      await run(
        `INSERT INTO audit_log(actor, actor_role, action, target_type, target, before, after, ip, created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
        [me(req), req.access?.role || null, on ? "content.feature" : "content.unfeature", "post", String(id), null, null, req.ip || null, Date.now()],
      ).catch(() => {});
      res.json({ ok: true, featured: on });
    }),
  );

  /* ═════════════ feeds ═════════════ */

  const FEED_FROM = "FROM social_posts p JOIN users u ON u.username = p.username";

  router.get(
    "/api/social/feed",
    requireMe,
    h(async (req, res) => {
      const u = me(req);
      const mod = isMod(req);
      const tab = req.query.tab === "explore" ? "explore" : "home";
      const limit = Math.min(30, Math.max(1, intParam(req.query.limit, PAGE)));
      if (tab === "home") {
        const before = intParam(req.query.cursor, 0);
        const vis = visibleSql(u, mod, { mutes: true });
        const rows = await all(
          `SELECT ${POST_COLS} ${FEED_FROM}
           WHERE (p.username = ? OR p.username IN (SELECT followee FROM social_follows WHERE follower = ? AND status = 'accepted'))
             AND ${vis.sql} ${before ? "AND p.id < ?" : ""}
           ORDER BY p.id DESC LIMIT ?`,
          [u, u, ...vis.args, ...(before ? [before] : []), limit + 1],
        );
        const more = rows.length > limit;
        const page = rows.slice(0, limit);
        const items = await hydrate(page, req);
        return res.json({ ok: true, items, next: more ? String(page[page.length - 1].id) : null });
      }
      // Explore: engagement over time-decay, last 14 days, public authors only.
      const offset = intParam(req.query.cursor, 0);
      const vis = visibleSql(u, mod, { mutes: true, publicOnly: true });
      const [cands, featured] = await Promise.all([
        all(
          `SELECT p.id, p.like_count, p.comment_count, p.repost_count, p.created_at FROM social_posts p
           WHERE p.kind <> 'repost' AND p.featured_at IS NULL AND p.created_at > ? AND ${vis.sql}
           ORDER BY p.created_at DESC, p.id DESC LIMIT 800`,
          [Date.now() - 14 * DAY, ...vis.args],
        ),
        offset === 0
          ? all(`SELECT ${POST_COLS} ${FEED_FROM} WHERE p.featured_at IS NOT NULL AND p.kind <> 'repost' AND ${vis.sql} ORDER BY p.featured_at DESC LIMIT 5`, vis.args)
          : [],
      ]);
      const now = Date.now();
      const score = (r) => (r.like_count + 2 * r.comment_count + 3 * r.repost_count + 1) / Math.pow((now - r.created_at) / 3600000 + 2, 1.5);
      cands.sort((a, b) => score(b) - score(a) || b.id - a.id);
      const slice = cands.slice(offset, offset + limit).map((r) => r.id);
      const byId = await fetchVisible(slice, u, mod);
      const rows = slice.map((id) => byId.get(id)).filter(Boolean);
      const items = await hydrate([...featured, ...rows], req);
      res.json({ ok: true, items, next: offset + limit < cands.length ? String(offset + limit) : null });
    }),
  );

  router.get(
    "/api/social/tags/:tag",
    h(async (req, res) => {
      const tag = String(req.params.tag || "").toLowerCase().replace(/^#/, "");
      if (!/^[a-z][a-z0-9_]{1,39}$/.test(tag)) bad("Invalid hashtag");
      const before = intParam(req.query.cursor, 0);
      const vis = visibleSql(me(req), isMod(req), { mutes: true });
      const [rows, stats] = await Promise.all([
        all(
          `SELECT ${POST_COLS} ${FEED_FROM} JOIN social_hashtags t ON t.post_id = p.id
           WHERE t.tag = ? AND ${vis.sql} ${before ? "AND p.id < ?" : ""} ORDER BY p.id DESC LIMIT ?`,
          [tag, ...vis.args, ...(before ? [before] : []), PAGE + 1],
        ),
        get("SELECT COUNT(*) AS posts, COUNT(DISTINCT p.username) AS people FROM social_hashtags t JOIN social_posts p ON p.id = t.post_id WHERE t.tag = ? AND p.deleted = 0", [tag]),
      ]);
      const more = rows.length > PAGE;
      const page = rows.slice(0, PAGE);
      res.json({ ok: true, tag, stats, items: await hydrate(page, req), next: more ? String(page[page.length - 1].id) : null });
    }),
  );

  router.get(
    "/api/social/trending",
    h(async (_req, res) => {
      const tags = await all(
        `SELECT t.tag, COUNT(*) AS posts FROM social_hashtags t JOIN social_posts p ON p.id = t.post_id
         WHERE t.created_at > ? AND p.deleted = 0 GROUP BY t.tag ORDER BY posts DESC, MAX(t.created_at) DESC LIMIT 8`,
        [Date.now() - 7 * DAY],
      );
      res.json({ ok: true, tags });
    }),
  );

  router.get(
    "/api/social/bookmarks",
    requireMe,
    h(async (req, res) => {
      const u = me(req);
      const vis = visibleSql(u, isMod(req));
      const rows = await all(
        `SELECT ${POST_COLS} ${FEED_FROM} JOIN social_bookmarks bm ON bm.post_id = p.id AND bm.username = ?
         WHERE ${vis.sql} ORDER BY bm.created_at DESC LIMIT 100`,
        [u, ...vis.args],
      );
      res.json({ ok: true, items: await hydrate(rows, req), next: null });
    }),
  );

  router.get(
    "/api/social/users/:username/posts",
    h(async (req, res) => {
      const target = req.params.username;
      if (!NAME_RE.test(target)) bad("User not found", 404);
      if (!(await canSee(req, target))) return res.json({ ok: true, locked: true, items: [], next: null });
      const tab = ["posts", "replies", "media"].includes(req.query.tab) ? req.query.tab : "posts";
      const before = intParam(req.query.cursor, 0);
      const vis = visibleSql(me(req), isMod(req));
      if (tab === "replies") {
        const rows = await all(
          `SELECT c.id, c.post_id, c.parent_id, c.body, c.like_count, c.created_at, c.edited_at,
             p.body AS post_body, p.username AS post_author
           FROM social_comments c JOIN social_posts p ON p.id = c.post_id
           WHERE c.username = ? AND c.deleted = 0 AND ${vis.sql}
             AND (? OR NOT EXISTS (SELECT 1 FROM moderated_content mc WHERE mc.content_type = 'comment' AND mc.content_id = CAST(c.id AS TEXT)))
             ${before ? "AND c.id < ?" : ""}
           ORDER BY c.id DESC LIMIT ?`,
          [target, ...vis.args, isMod(req) ? 1 : 0, ...(before ? [before] : []), PAGE + 1],
        );
        const more = rows.length > PAGE;
        const page = rows.slice(0, PAGE);
        return res.json({
          ok: true,
          replies: page.map((r) => ({ ...r, post_body: String(r.post_body || "").slice(0, 160) })),
          next: more ? String(page[page.length - 1].id) : null,
        });
      }
      let where = "p.username = ?";
      if (tab === "media") where += " AND p.kind <> 'repost' AND (p.images IS NOT NULL OR p.code IS NOT NULL)";
      const rows = await all(
        `SELECT ${POST_COLS} ${FEED_FROM} WHERE ${where} AND ${vis.sql} ${before ? "AND p.id < ?" : ""} ORDER BY p.id DESC LIMIT ?`,
        [target, ...vis.args, ...(before ? [before] : []), PAGE + 1],
      );
      const more = rows.length > PAGE;
      const page = rows.slice(0, PAGE);
      res.json({ ok: true, items: await hydrate(page, req), next: more ? String(page[page.length - 1].id) : null });
    }),
  );

  /* ═════════════ comments ═════════════ */

  const commentAuthorCols = "u.display_name, u.avatar, u.avatar_url, u.role, u.verified";

  router.get(
    "/api/social/posts/:id/comments",
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const u = me(req) || "";
      const mod = isMod(req);
      if (!(await fetchVisible([id], u, mod)).get(id)) bad("Post not found", 404);
      const rows = await all(
        `SELECT c.*, ${commentAuthorCols},
           EXISTS (SELECT 1 FROM moderated_content mc WHERE mc.content_type = 'comment' AND mc.content_id = CAST(c.id AS TEXT)) AS removed,
           EXISTS (SELECT 1 FROM social_comment_likes cl WHERE cl.comment_id = c.id AND cl.username = ?) AS liked
         FROM social_comments c JOIN users u ON u.username = c.username
         WHERE c.post_id = ?
           AND NOT EXISTS (SELECT 1 FROM social_blocks b WHERE (b.blocker = ? AND b.blocked = c.username) OR (b.blocker = c.username AND b.blocked = ?))
         ORDER BY c.id ASC LIMIT 500`,
        [u, id, u, u],
      );
      const hasReplies = new Set(rows.filter((r) => r.parent_id && !r.deleted).map((r) => r.parent_id));
      const out = [];
      for (const r of rows) {
        const hidden = r.deleted || (r.removed && !mod);
        if (hidden && !(r.parent_id == null && hasReplies.has(r.id))) continue;
        out.push({
          id: r.id,
          post_id: r.post_id,
          parent_id: r.parent_id,
          author: author(r),
          body: hidden ? "" : r.body,
          tombstone: hidden ? (r.deleted ? "deleted" : "removed") : null,
          removed: !!r.removed,
          likes: r.like_count,
          liked: !!r.liked,
          created_at: r.created_at,
          edited_at: r.edited_at || null,
        });
      }
      res.json({ ok: true, comments: out });
    }),
  );

  router.post(
    "/api/social/posts/:id/comments",
    requireMe,
    commentLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const u = me(req);
      const post = await interactable(req, id);
      const body = cleanText(req.body?.body, COMMENT_MAX, "Comment");
      if (!body) bad("Write a comment first");
      let parentId = null;
      let parentAuthor = null;
      if (req.body?.parent_id != null) {
        const parent = await get("SELECT id, parent_id, username, deleted FROM social_comments WHERE id = ? AND post_id = ?", [intParam(req.body.parent_id), id]);
        if (!parent || parent.deleted) bad("That comment is gone", 404);
        if (await isBlockedEither(u, parent.username)) bad("You can't reply to this comment", 403);
        parentId = parent.parent_id || parent.id; // one level of threading
        parentAuthor = parent.username;
      }
      const now = Date.now();
      const r = await run("INSERT INTO social_comments(post_id, parent_id, username, body, created_at) VALUES(?,?,?,?,?)", [id, parentId, u, body, now]);
      await run("UPDATE social_posts SET comment_count = comment_count + 1 WHERE id = ?", [id]);
      if (parentAuthor && parentAuthor !== u) await notify(parentAuthor, u, "reply", { post_id: id, comment_id: r.lastID });
      if (post.username !== parentAuthor) await notify(post.username, u, "comment", { post_id: id, comment_id: r.lastID });
      await notifyMentions(body, u, { post_id: id, comment_id: r.lastID, exclude: [post.username, parentAuthor].filter(Boolean) });
      const row = await get(`SELECT c.*, ${commentAuthorCols} FROM social_comments c JOIN users u ON u.username = c.username WHERE c.id = ?`, [r.lastID]);
      res.json({
        ok: true,
        comment: { id: row.id, post_id: id, parent_id: parentId, author: author(row), body, tombstone: null, removed: false, likes: 0, liked: false, created_at: now, edited_at: null },
      });
    }),
  );

  async function ownComment(req, id) {
    const row = await get("SELECT * FROM social_comments WHERE id = ? AND deleted = 0", [id]);
    if (!row) bad("Comment not found", 404);
    if (row.username !== me(req)) bad("You can only change your own comments", 403);
    return row;
  }
  router.patch(
    "/api/social/comments/:id",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      await ownComment(req, id);
      if (await content.isRemoved("comment", id)) bad("A moderator removed this comment", 403);
      const body = cleanText(req.body?.body, COMMENT_MAX, "Comment");
      if (!body) bad("A comment can't be empty");
      await run("UPDATE social_comments SET body = ?, edited_at = ? WHERE id = ?", [body, Date.now(), id]);
      res.json({ ok: true, body, edited_at: Date.now() });
    }),
  );
  router.delete(
    "/api/social/comments/:id",
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const row = await ownComment(req, id);
      await run("UPDATE social_comments SET deleted = 1 WHERE id = ?", [id]);
      await run("UPDATE social_posts SET comment_count = MAX(comment_count - 1, 0) WHERE id = ?", [row.post_id]);
      await run("DELETE FROM social_notifications WHERE comment_id = ?", [id]);
      res.json({ ok: true });
    }),
  );
  router.put(
    "/api/social/comments/:id/like",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const c = await get("SELECT id, post_id, username FROM social_comments WHERE id = ? AND deleted = 0", [id]);
      if (!c) bad("Comment not found", 404);
      await interactable(req, c.post_id);
      if (await isBlockedEither(me(req), c.username)) bad("Comment not found", 404);
      const r = await run("INSERT OR IGNORE INTO social_comment_likes(comment_id, username, created_at) VALUES(?,?,?)", [id, me(req), Date.now()]);
      if (r.changes) {
        await run("UPDATE social_comments SET like_count = like_count + 1 WHERE id = ?", [id]);
        await notify(c.username, me(req), "comment_like", { post_id: c.post_id, comment_id: id });
      }
      res.json({ ok: true, liked: true });
    }),
  );
  router.delete(
    "/api/social/comments/:id/like",
    actionLimiter,
    h(async (req, res) => {
      const id = intParam(req.params.id);
      const r = await run("DELETE FROM social_comment_likes WHERE comment_id = ? AND username = ?", [id, me(req)]);
      if (r.changes) await run("UPDATE social_comments SET like_count = MAX(like_count - 1, 0) WHERE id = ?", [id]);
      res.json({ ok: true, liked: false });
    }),
  );

  /* ═════════════ follows, blocks, mutes ═════════════ */

  async function targetUser(name) {
    if (!NAME_RE.test(String(name || ""))) bad("User not found", 404);
    const row = await get("SELECT username FROM users WHERE username = ?", [name]);
    if (!row) bad("User not found", 404);
    return row.username;
  }

  router.put(
    "/api/social/follow/:username",
    actionLimiter,
    h(async (req, res) => {
      const u = me(req);
      const t = await targetUser(req.params.username);
      if (t === u) bad("You can't follow yourself");
      if (await isBlockedEither(u, t)) bad("You can't follow this account", 403);
      const vis = (await get("SELECT visibility FROM social_profiles WHERE username = ?", [t]))?.visibility || "public";
      const status = vis === "followers" ? "pending" : "accepted";
      const r = await run("INSERT OR IGNORE INTO social_follows(follower, followee, status, created_at) VALUES(?,?,?,?)", [u, t, status, Date.now()]);
      if (r.changes) await notify(t, u, status === "pending" ? "follow_request" : "follow");
      const row = await get("SELECT status FROM social_follows WHERE follower = ? AND followee = ?", [u, t]);
      res.json({ ok: true, following: row.status });
    }),
  );
  router.delete(
    "/api/social/follow/:username",
    actionLimiter,
    h(async (req, res) => {
      const u = me(req);
      const t = String(req.params.username || "");
      await run("DELETE FROM social_follows WHERE follower = ? AND followee = ?", [u, t]);
      await run("DELETE FROM social_notifications WHERE username = ? AND actor = ? AND type IN ('follow','follow_request')", [t, u]);
      res.json({ ok: true, following: null });
    }),
  );
  // Remove a follower / decline or accept a request.
  router.post(
    "/api/social/followers/:username/:action",
    actionLimiter,
    h(async (req, res) => {
      const u = me(req);
      const f = String(req.params.username || "");
      const action = req.params.action;
      if (action === "accept") {
        const r = await run("UPDATE social_follows SET status = 'accepted' WHERE follower = ? AND followee = ? AND status = 'pending'", [f, u]);
        if (!r.changes) bad("No pending request", 404);
        await run("DELETE FROM social_notifications WHERE username = ? AND actor = ? AND type = 'follow_request'", [u, f]);
        await notify(f, u, "follow_accepted");
      } else if (action === "decline" || action === "remove") {
        await run("DELETE FROM social_follows WHERE follower = ? AND followee = ?", [f, u]);
        await run("DELETE FROM social_notifications WHERE username = ? AND actor = ? AND type = 'follow_request'", [u, f]);
      } else bad("Unknown action");
      res.json({ ok: true });
    }),
  );
  router.get(
    "/api/social/follow-requests",
    requireMe,
    h(async (req, res) => {
      const rows = await all(
        `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.verified, f.created_at FROM social_follows f JOIN users u ON u.username = f.follower
         WHERE f.followee = ? AND f.status = 'pending' ORDER BY f.created_at DESC LIMIT 100`,
        [me(req)],
      );
      res.json({ ok: true, requests: rows.map((r) => ({ ...author(r), created_at: r.created_at })) });
    }),
  );

  router.get(
    "/api/social/users/:username/:list(followers|following)",
    h(async (req, res) => {
      const t = await targetUser(req.params.username);
      if (!(await canSee(req, t))) return res.json({ ok: true, locked: true, users: [] });
      const v = me(req) || "";
      const followers = req.params.list === "followers";
      const rows = await all(
        `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.verified, u.bio,
           EXISTS (SELECT 1 FROM social_follows x WHERE x.follower = ? AND x.followee = u.username AND x.status = 'accepted') AS i_follow
         FROM social_follows f JOIN users u ON u.username = ${followers ? "f.follower" : "f.followee"}
         WHERE ${followers ? "f.followee" : "f.follower"} = ? AND f.status = 'accepted'
           AND NOT EXISTS (SELECT 1 FROM social_blocks b WHERE (b.blocker = ? AND b.blocked = u.username) OR (b.blocker = u.username AND b.blocked = ?))
         ORDER BY f.created_at DESC LIMIT 200`,
        [v, t, v, v],
      );
      res.json({ ok: true, users: rows.map((r) => ({ ...author(r), bio: String(r.bio || "").slice(0, 140), i_follow: !!r.i_follow })) });
    }),
  );

  router.put(
    "/api/social/block/:username",
    actionLimiter,
    h(async (req, res) => {
      const u = me(req);
      const t = await targetUser(req.params.username);
      if (t === u) bad("You can't block yourself");
      await run("INSERT OR IGNORE INTO social_blocks(blocker, blocked, created_at) VALUES(?,?,?)", [u, t, Date.now()]);
      // A block ends the follow relationship both ways and clears their notifications.
      await run("DELETE FROM social_follows WHERE (follower = ? AND followee = ?) OR (follower = ? AND followee = ?)", [u, t, t, u]);
      await run("DELETE FROM social_notifications WHERE (username = ? AND actor = ?) OR (username = ? AND actor = ?)", [u, t, t, u]);
      res.json({ ok: true, blocked: true });
    }),
  );
  router.delete(
    "/api/social/block/:username",
    h(async (req, res) => {
      await run("DELETE FROM social_blocks WHERE blocker = ? AND blocked = ?", [me(req), String(req.params.username || "")]);
      res.json({ ok: true, blocked: false });
    }),
  );
  router.put(
    "/api/social/mute/:username",
    actionLimiter,
    h(async (req, res) => {
      const u = me(req);
      const t = await targetUser(req.params.username);
      if (t === u) bad("You can't mute yourself");
      await run("INSERT OR IGNORE INTO social_mutes(muter, muted, created_at) VALUES(?,?,?)", [u, t, Date.now()]);
      res.json({ ok: true, muted: true });
    }),
  );
  router.delete(
    "/api/social/mute/:username",
    h(async (req, res) => {
      await run("DELETE FROM social_mutes WHERE muter = ? AND muted = ?", [me(req), String(req.params.username || "")]);
      res.json({ ok: true, muted: false });
    }),
  );
  router.get(
    "/api/social/restrictions",
    requireMe,
    h(async (req, res) => {
      const u = me(req);
      const [blocked, muted] = await Promise.all([
        all("SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.verified FROM social_blocks b JOIN users u ON u.username = b.blocked WHERE b.blocker = ? ORDER BY b.created_at DESC", [u]),
        all("SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.verified FROM social_mutes m JOIN users u ON u.username = m.muted WHERE m.muter = ? ORDER BY m.created_at DESC", [u]),
      ]);
      res.json({ ok: true, blocked: blocked.map(author), muted: muted.map(author) });
    }),
  );

  router.get(
    "/api/social/suggestions",
    requireMe,
    h(async (req, res) => {
      const u = me(req);
      res.json(await suggestionsCache.get(u, () => computeSuggestions(u)));
    }),
  );

  async function computeSuggestions(u) {
    {
      const exclude = `c.username <> ?
        AND NOT EXISTS (SELECT 1 FROM social_follows f WHERE f.follower = ? AND f.followee = c.username)
        AND NOT EXISTS (SELECT 1 FROM social_blocks b WHERE (b.blocker = ? AND b.blocked = c.username) OR (b.blocker = c.username AND b.blocked = ?))`;
      const ex = [u, u, u, u];
      const myCats = await all(
        `SELECT pb.category, COUNT(*) AS n FROM progress pr JOIN problems pb ON pb.id = pr.problem_rowid
         WHERE pr.username = ? AND pr.status = 'solved' AND pb.category <> '' GROUP BY pb.category ORDER BY n DESC LIMIT 3`,
        [u],
      );
      const [mutual, friends, topical, popular] = await Promise.all([
        all(
          `SELECT c.username, COUNT(*) AS n, MIN(f1.followee) AS via FROM social_follows f1 JOIN social_follows f2 ON f2.follower = f1.followee AND f2.status = 'accepted'
           JOIN users c ON c.username = f2.followee
           WHERE f1.follower = ? AND f1.status = 'accepted' AND ${exclude} GROUP BY c.username ORDER BY n DESC LIMIT 10`,
          [u, ...ex],
        ),
        all(
          `SELECT c.username FROM friendships fr JOIN users c ON c.username = CASE WHEN fr.from_user = ? THEN fr.to_user ELSE fr.from_user END
           WHERE (fr.from_user = ? OR fr.to_user = ?) AND fr.status = 'accepted' AND ${exclude} LIMIT 10`,
          [u, u, u, ...ex],
        ),
        myCats.length
          ? all(
              `SELECT c.username, COUNT(*) AS n FROM progress pr JOIN problems pb ON pb.id = pr.problem_rowid JOIN users c ON c.username = pr.username
               WHERE pr.status = 'solved' AND pb.category IN (${ph(myCats.length)}) AND ${exclude} GROUP BY c.username ORDER BY n DESC LIMIT 10`,
              [...myCats.map((x) => x.category), ...ex],
            )
          : [],
        all(
          `SELECT c.username, (SELECT COUNT(*) FROM social_follows f WHERE f.followee = c.username AND f.status = 'accepted') AS n FROM users c
           WHERE ${exclude} ORDER BY n DESC, c.created_at DESC LIMIT 10`,
          ex,
        ),
      ]);
      const reasons = new Map();
      const add = (rows, why) => {
        for (const r of rows) if (!reasons.has(r.username)) reasons.set(r.username, why(r));
      };
      add(mutual, (r) => (r.n > 1 ? `Followed by ${r.via} and ${r.n - 1} more you follow` : `Followed by ${r.via}`));
      add(friends, () => "Your friend");
      add(topical, () => (myCats[0] ? `Also into ${myCats[0].category}` : "Similar topics"));
      add(popular, (r) => (r.n ? "Popular on NexoraGuru" : "New on NexoraGuru"));
      const names = [...reasons.keys()].slice(0, 8);
      const users = names.length
        ? await all(`SELECT username, display_name, avatar, avatar_url, role, verified, bio FROM users WHERE username IN (${ph(names.length)})`, names)
        : [];
      const byName = new Map(users.map((x) => [x.username, x]));
      return {
        ok: true,
        users: names.filter((n) => byName.has(n)).map((n) => ({ ...author(byName.get(n)), bio: String(byName.get(n).bio || "").slice(0, 120), reason: reasons.get(n) })),
      };
    }
  }

  /* ═════════════ search ═════════════ */

  router.get(
    "/api/social/search",
    h(async (req, res) => {
      const q = cleanText(String(req.query.q || ""), 60, "Search").replace(/^[@#]/, "");
      if (q.length < 1) return res.json({ ok: true, users: [], tags: [], posts: [] });
      const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      const v = me(req) || "";
      const vis = visibleSql(v, isMod(req), { mutes: true });
      const [users, tags, posts] = await Promise.all([
        all(
          `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.role, u.verified,
             (SELECT COUNT(*) FROM social_follows f WHERE f.followee = u.username AND f.status = 'accepted') AS followers
           FROM users u WHERE (u.username LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')
             AND NOT EXISTS (SELECT 1 FROM social_blocks b WHERE (b.blocker = ? AND b.blocked = u.username) OR (b.blocker = u.username AND b.blocked = ?))
           ORDER BY (u.username = ?) DESC, followers DESC LIMIT 8`,
          [like, like, v, v, q],
        ),
        all(`SELECT tag, COUNT(*) AS posts FROM social_hashtags WHERE tag LIKE ? ESCAPE '\\' GROUP BY tag ORDER BY posts DESC LIMIT 6`, [`${q.toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`)}%`]),
        q.length >= 2
          ? all(`SELECT ${POST_COLS} ${FEED_FROM} WHERE p.kind <> 'repost' AND p.body LIKE ? ESCAPE '\\' AND ${vis.sql} ORDER BY p.id DESC LIMIT 10`, [like, ...vis.args])
          : [],
      ]);
      res.json({ ok: true, users: users.map((r) => ({ ...author(r), followers: r.followers })), tags, items: await hydrate(posts, req) });
    }),
  );

  /* ═════════════ notifications (grouped) ═════════════ */

  const GROUPED = new Set(["like", "repost", "follow", "comment_like"]);

  router.get(
    "/api/social/notifications",
    requireMe,
    h(async (req, res) => {
      const u = me(req);
      const rows = await all(
        `SELECT n.*, a.display_name, a.avatar, a.avatar_url, a.role, a.verified,
           p.body AS post_body, c.body AS comment_body
         FROM social_notifications n JOIN users a ON a.username = n.actor
         LEFT JOIN social_posts p ON p.id = n.post_id
         LEFT JOIN social_comments c ON c.id = n.comment_id
         WHERE n.username = ? ORDER BY n.id DESC LIMIT 200`,
        [u],
      );
      const groups = [];
      const byKey = new Map();
      for (const r of rows) {
        const key = GROUPED.has(r.type) ? `${r.type}:${r.post_id || ""}:${r.comment_id || ""}:${r.read_at ? "r" : "u"}` : `n${r.id}`;
        let g = byKey.get(key);
        if (!g) {
          g = {
            id: r.id,
            type: r.type,
            post_id: r.post_id,
            comment_id: r.comment_id,
            actors: [],
            actor_count: 0,
            created_at: r.created_at,
            read: !!r.read_at,
            snippet: String(r.comment_body ?? r.post_body ?? "").slice(0, 140),
          };
          byKey.set(key, g);
          groups.push(g);
        }
        g.actor_count++;
        if (g.actors.length < 3) g.actors.push({ username: r.actor, display_name: r.display_name, avatar: r.avatar, avatar_url: r.avatar_url, role: r.role, verified: !!r.verified });
      }
      const unread = rows.filter((r) => !r.read_at).length;
      res.json({ ok: true, groups: groups.slice(0, 60), unread });
    }),
  );
  router.get(
    "/api/social/notifications/unread",
    requireMe,
    h(async (req, res) => {
      const r = await get("SELECT COUNT(*) AS n FROM social_notifications WHERE username = ? AND read_at IS NULL", [me(req)]);
      res.json({ ok: true, unread: r?.n || 0 });
    }),
  );
  router.post(
    "/api/social/notifications/read",
    h(async (req, res) => {
      await run("UPDATE social_notifications SET read_at = ? WHERE username = ? AND read_at IS NULL", [Date.now(), me(req)]);
      res.json({ ok: true });
    }),
  );

  /* ═════════════ uploads (post images, covers) ═════════════ */

  const MAGIC = [
    ["png", (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
    ["jpg", (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
    ["gif", (b) => b.slice(0, 4).toString("ascii") === "GIF8"],
    ["webp", (b) => b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP"],
  ];
  router.post(
    "/api/social/upload",
    uploadLimiter,
    h(async (req, res) => {
      const image = req.body?.image;
      const m = typeof image === "string" && image.match(/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
      if (!m) bad("Use a PNG, JPG, WebP or GIF image");
      const data = Buffer.from(m[2], "base64");
      if (data.length > IMAGE_MAX_BYTES) bad("Image too large (max 2MB)", 413);
      const kind = MAGIC.find(([, test]) => test(data))?.[0];
      if (!kind) bad("That file isn't a valid image");
      const name = `${crypto.randomBytes(12).toString("hex")}.${kind}`;
      const dir = path.join(__dirname, "..", "..", "public", "uploads", "social");
      fs.mkdirSync(dir, { recursive: true });
      const abs = path.join(dir, name);
      fs.writeFileSync(abs, data);
      const url = `/uploads/social/${name}`;
      await persistUpload(url, abs);
      res.json({ ok: true, url });
    }),
  );

  /* ═════════════ profiles ═════════════ */

  async function profileCard(req, username) {
    const row = await get(
      `SELECT u.username, u.display_name, u.avatar, u.avatar_url, u.bio, u.status, u.role, u.verified, u.created_at, u.last_seen,
         sp.cover, sp.accent, sp.location, sp.pronouns, sp.website, sp.links, sp.visibility, sp.pinned,
         (SELECT COUNT(*) FROM social_follows f WHERE f.followee = u.username AND f.status = 'accepted') AS followers,
         (SELECT COUNT(*) FROM social_follows f WHERE f.follower = u.username AND f.status = 'accepted') AS following,
         (SELECT COUNT(*) FROM social_posts p WHERE p.username = u.username AND p.deleted = 0 AND p.kind <> 'repost') AS posts,
         (SELECT COUNT(*) FROM friendships fr WHERE (fr.from_user = u.username OR fr.to_user = u.username) AND fr.status = 'accepted') AS friends
       FROM users u LEFT JOIN social_profiles sp ON sp.username = u.username WHERE u.username = ?`,
      [username],
    );
    return row;
  }

  router.get(
    "/api/profiles/:username",
    h(async (req, res) => {
      const name = String(req.params.username || "");
      if (!NAME_RE.test(name)) return res.status(404).json({ ok: false, error: "User not found" });
      const row = await profileCard(req, name);
      if (!row) return res.status(404).json({ ok: false, error: "User not found" });
      const viewer = me(req);
      const rel = await relation(viewer, row.username);
      const visible = await canSee(req, row.username, rel);
      res.json({
        ok: true,
        profile: {
          username: row.username,
          display_name: row.display_name || null,
          avatar: row.avatar || null,
          avatar_url: row.avatar_url || null,
          bio: row.bio || "",
          status: row.status,
          role: row.role || "member",
          verified: !!row.verified,
          created_at: row.created_at,
          last_seen: visible ? row.last_seen : null,
          cover: row.cover || "plain",
          accent: row.accent || "brand",
          location: row.location || "",
          pronouns: row.pronouns || "",
          website: row.website || "",
          links: parseJson(row.links, []) || [],
          visibility: row.visibility || "public",
          counts: { followers: row.followers, following: row.following, posts: row.posts, friends: row.friends },
        },
        relation: rel,
        locked: !visible,
      });
    }),
  );

  router.get(
    "/api/profiles/:username/showcase",
    h(async (req, res) => {
      const name = String(req.params.username || "");
      if (!NAME_RE.test(name)) return res.status(404).json({ ok: false, error: "User not found" });
      const user = await get("SELECT username, xp_override, solved_override FROM users WHERE username = ?", [name]);
      if (!user) return res.status(404).json({ ok: false, error: "User not found" });
      if (!(await canSee(req, user.username))) return res.json({ ok: true, locked: true });
      const u = user.username;
      const since = new Date(Date.now() - 371 * DAY).toISOString().slice(0, 10);
      // This user's progress is read ONCE (by index) and joined with the
      // in-memory problem catalog for the totals, difficulty split, topics
      // and recent solves (was four passes over progress + a lookup per row).
      const [progRows, catalog, heat, gate, gateTests, contests, langs, achievements, prof, recentPosts, feed, streak, linked] = await Promise.all([
        all("SELECT problem_rowid, status, solved_at, xp_earned FROM progress WHERE username = ?", [u]),
        getCatalog(),
        all(
          `SELECT date, problems_solved AS s, problems_attempted AS a, COALESCE(gate_attempts,0) AS g, xp_earned AS xp
           FROM daily_activity WHERE username = ? AND date >= ? ORDER BY date`,
          [u, since],
        ),
        get(
          `SELECT COUNT(*) AS n, SUM(CASE WHEN outcome='correct' THEN 1 ELSE 0 END) AS c
           FROM gate_attempts WHERE username = ? AND outcome IN ('correct','wrong')`,
          [u],
        ).catch(() => null),
        get(
          `SELECT COUNT(*) AS n, MAX(score) AS best, MAX(json_extract(result,'$.percentile')) AS pct FROM gate_tests WHERE username = ? AND submitted_at IS NOT NULL`,
          [u],
        ).catch(() => null),
        all(
          `SELECT cp.contest_id, cp.score,
             (SELECT COUNT(*) FROM contest_participants c2 WHERE c2.contest_id = cp.contest_id AND c2.score > cp.score) AS better,
             (SELECT COUNT(*) FROM contest_participants c3 WHERE c3.contest_id = cp.contest_id) AS total
           FROM contest_participants cp WHERE cp.username = ? ORDER BY cp.id LIMIT 200`,
          [u],
        ).catch(() => []),
        all(
          `SELECT language, COUNT(*) AS n, SUM(CASE WHEN verdict='AC' THEN 1 ELSE 0 END) AS ac
           FROM submissions WHERE username = ? GROUP BY language ORDER BY n DESC LIMIT 6`,
          [u],
        ).catch(() => []),
        all(
          `SELECT a.id, a.title, a.description, a.icon, a.category, a.target, a.xp_reward,
             COALESCE(ua.progress, 0) AS progress, ua.unlocked_at
           FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.username = ?
           ORDER BY (ua.unlocked_at IS NULL), ua.unlocked_at DESC, a.category, a.target`,
          [u],
        ),
        get("SELECT pinned FROM social_profiles WHERE username = ?", [u]),
        all(
          `SELECT p.id, p.body, p.created_at FROM social_posts p WHERE p.username = ? AND p.deleted = 0 AND p.kind = 'post'
             AND NOT EXISTS (SELECT 1 FROM moderated_content mc WHERE mc.content_type = 'post' AND mc.content_id = CAST(p.id AS TEXT))
           ORDER BY p.id DESC LIMIT 5`,
          [u],
        ),
        all(`SELECT id, type, content, created_at FROM activity_feed WHERE username = ? ORDER BY id DESC LIMIT 8`, [u]),
        calcStreak(u),
        // Verified judge accounts only (the owner proved them; handles are public on the judges).
        all(
          `SELECT platform, handle, rating, max_rating, rank, solved, last_import FROM linked_accounts
           WHERE username = ? AND verified_at IS NOT NULL ORDER BY platform`,
          [u],
        ).catch(() => []),
      ]);
      const totals = { xp: 0, solved: 0, attempted: progRows.length };
      const solvedRows = [];
      for (const r of progRows) {
        totals.xp += Number(r.xp_earned) || 0;
        if (r.status !== "solved") continue;
        totals.solved++;
        const pb = catalogById(catalog, r.problem_rowid);
        if (pb) solvedRows.push({ pr: r, pb });
      }
      const diffCount = new Map();
      for (const { pb } of solvedRows) {
        const rt = pb.rating;
        const d = rt == null || rt === 0 ? "unrated" : rt < 1200 ? "easy" : rt < 1800 ? "medium" : "hard";
        diffCount.set(d, (diffCount.get(d) || 0) + 1);
      }
      const diff = [...diffCount.entries()].map(([d, n]) => ({ d, n }));
      // ORDER BY solved_at DESC (NULLs last), as the SQL did.
      const bySolvedDesc = solvedRows
        .slice()
        .sort((a, b) => (a.pr.solved_at == null) - (b.pr.solved_at == null) || (a.pr.solved_at < b.pr.solved_at ? 1 : a.pr.solved_at > b.pr.solved_at ? -1 : 0));
      const solvedTags = bySolvedDesc.slice(0, 3000).map(({ pb }) => ({ tags: pb.tags, category: pb.category }));
      const recentSolved = bySolvedDesc
        .filter(({ pr }) => pr.solved_at != null)
        .slice(0, 8)
        .map(({ pr, pb }) => ({ id: pb.id, title: pb.title, rating: pb.rating, platform: pb.platform, solved_at: pr.solved_at }));

      const solved = (totals?.solved || 0) + (user.solved_override || 0);
      const xp = (totals?.xp || 0) + (user.xp_override || 0);
      const level = calcLevel(xp, solved);

      // Topic mastery: tags across solved problems (top 8 → radar).
      const tagCount = new Map();
      for (const r of solvedTags) {
        const tags = parseJson(r.tags, []) || [];
        const list = tags.length ? tags : r.category ? [r.category] : [];
        for (const t of list) {
          const k = String(t).toLowerCase().trim();
          if (k) tagCount.set(k, (tagCount.get(k) || 0) + 1);
        }
      }
      const topics = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([topic, n]) => ({ topic, solved: n }));

      // House contest rating: everyone starts at 1200; each contest with ≥2
      // players moves it by up to ±100 depending on where you finished.
      let rating = 1200;
      let rated = 0;
      for (const c of contests) {
        if (c.total < 2) continue;
        rated++;
        rating += Math.round(100 * (1 - (2 * c.better) / (c.total - 1)));
      }

      const pins = (parseJson(prof?.pinned, []) || []).slice(0, 3);
      const pinnedPostIds = pins.filter((p) => p.type === "post").map((p) => Number(p.id));
      const pinnedPosts = await fetchVisible(pinnedPostIds, me(req), isMod(req));
      const hydratedPins = await hydrate([...pinnedPosts.values()], req);
      const pinPost = new Map(hydratedPins.map((i) => [i.post.id, i.post]));
      const achById = new Map(achievements.map((a) => [a.id, a]));
      const pinned = pins
        .map((p) => (p.type === "post" ? (pinPost.get(Number(p.id)) ? { type: "post", post: pinPost.get(Number(p.id)) } : null) : achById.get(p.id)?.unlocked_at ? { type: "achievement", achievement: achById.get(p.id) } : null))
        .filter(Boolean);

      const timeline = [
        ...recentSolved.map((r) => ({ kind: "solved", at: Date.parse(r.solved_at) || 0, title: r.title, meta: `${r.platform || ""}${r.rating ? ` · ${r.rating}` : ""}`, link: `/solve/${r.id}` })),
        ...recentPosts.map((r) => ({ kind: "post", at: r.created_at, title: String(r.body || "Shared a post").replace(/```[\s\S]*?(```|$)/g, " ").replace(/(\*\*|__|\*|`)/g, "").replace(/\s+/g, " ").trim().slice(0, 100) || "Shared a post", link: `/social/post/${r.id}` })),
        ...achievements.filter((a) => a.unlocked_at).slice(0, 5).map((a) => ({ kind: "achievement", at: Date.parse(a.unlocked_at) || 0, title: a.title, meta: a.description })),
        ...feed.filter((f) => !/friend/.test(f.type)).map((f) => ({ kind: f.type, at: Date.parse(f.created_at) || 0, title: f.content })),
      ]
        .filter((t) => t.at)
        .sort((a, b) => b.at - a.at)
        .slice(0, 12);

      const byDiff = { easy: 0, medium: 0, hard: 0, unrated: 0 };
      for (const r of diff) byDiff[r.d] = r.n;

      res.json({
        ok: true,
        locked: false,
        stats: {
          xp,
          solved,
          attempted: totals?.attempted || 0,
          level,
          streak: { current: streak.current, best: streak.best },
          difficulty: byDiff,
          gate: { attempted: gate?.n || 0, correct: gate?.c || 0, accuracy: gate?.n ? Math.round((100 * (gate.c || 0)) / gate.n) : null, tests: gateTests?.n || 0, best_score: gateTests?.best ?? null, best_percentile: gateTests?.pct ?? null },
          contests: { joined: contests.length, rated, rating: rated ? rating : null },
        },
        heatmap: heat.map((d) => ({ date: d.date, count: (d.s || 0) + (d.g || 0), solved: d.s || 0, gate: d.g || 0, xp: d.xp || 0 })),
        topics,
        languages: langs.map((l) => ({ language: l.language || "unknown", submissions: l.n, accepted: l.ac || 0 })),
        achievements,
        pinned,
        timeline,
        linked: linked.map((l) => ({ platform: l.platform, handle: l.handle, rating: l.rating ?? null, max_rating: l.max_rating ?? null, rank: l.rank || null, solved: l.solved ?? null, last_import: l.last_import ?? null })),
      });
    }),
  );

  router.put(
    "/api/profiles/me",
    actionLimiter,
    h(async (req, res) => {
      const u = me(req);
      const b = req.body || {};
      const cur = (await get("SELECT * FROM social_profiles WHERE username = ?", [u])) || {};
      const next = {
        cover: cur.cover || null,
        accent: cur.accent || null,
        location: cur.location || "",
        pronouns: cur.pronouns || "",
        website: cur.website || "",
        links: cur.links || null,
        visibility: cur.visibility || "public",
        pinned: cur.pinned || null,
      };
      if (b.cover !== undefined) {
        const c = String(b.cover || "");
        if (!COVER_PRESETS.has(c) && !UPLOAD_URL_RE.test(c)) bad("Pick a cover preset or upload an image");
        next.cover = c;
      }
      if (b.accent !== undefined) {
        if (!ACCENTS.has(b.accent)) bad("Unknown accent");
        next.accent = b.accent;
      }
      if (b.location !== undefined) next.location = cleanText(b.location, 60, "Location").replace(/\n/g, " ");
      if (b.pronouns !== undefined) next.pronouns = cleanText(b.pronouns, 24, "Pronouns").replace(/\n/g, " ");
      if (b.website !== undefined) next.website = httpUrl(b.website, "Website");
      if (b.links !== undefined) {
        if (!Array.isArray(b.links) || b.links.length > 4) bad("Up to 4 links");
        const links = b.links
          .map((l) => ({ label: cleanText(l?.label, 24, "Link label").replace(/\n/g, " "), url: httpUrl(l?.url, "Link") }))
          .filter((l) => l.url);
        next.links = JSON.stringify(links);
      }
      if (b.visibility !== undefined) {
        if (!["public", "followers"].includes(b.visibility)) bad("Visibility must be public or followers");
        next.visibility = b.visibility;
      }
      if (b.pinned !== undefined) {
        if (!Array.isArray(b.pinned) || b.pinned.length > 3) bad("Pin up to 3 items");
        const pins = [];
        for (const p of b.pinned) {
          if (p?.type === "post") {
            const row = await get("SELECT id FROM social_posts WHERE id = ? AND username = ? AND deleted = 0 AND kind = 'post'", [intParam(p.id), u]);
            if (!row) bad("You can only pin your own posts");
            pins.push({ type: "post", id: row.id });
          } else if (p?.type === "achievement") {
            const row = await get("SELECT achievement_id FROM user_achievements WHERE username = ? AND achievement_id = ? AND unlocked_at IS NOT NULL", [u, String(p.id || "")]);
            if (!row) bad("You can only pin achievements you've unlocked");
            pins.push({ type: "achievement", id: row.achievement_id });
          } else bad("Unknown pin");
        }
        next.pinned = JSON.stringify(pins);
      }
      // Name and bio live on users (shared with the account settings form).
      if (b.display_name !== undefined) {
        const dn = cleanText(b.display_name, 40, "Display name").replace(/\n/g, " ");
        await run("UPDATE users SET display_name = ? WHERE username = ?", [dn, u]);
        if (req.session?.user) req.session.user = { ...req.session.user, display_name: dn };
      }
      if (b.bio !== undefined) {
        await run("UPDATE users SET bio = ? WHERE username = ?", [cleanText(b.bio, 280, "Bio"), u]);
      }
      // The picture: one of the avatar set, and/or a photo. A photo must be one
      // this account uploaded (POST /api/user/avatar names files <username>_<time>);
      // "" removes the photo so the avatar shows.
      if (b.avatar !== undefined || b.avatar_url !== undefined) {
        const row = await get("SELECT avatar, avatar_url FROM users WHERE username = ?", [u]);
        let avatar = row?.avatar ?? null;
        let photo = row?.avatar_url ?? null;
        if (b.avatar !== undefined) {
          if (!isSetAvatar(b.avatar)) bad("Pick one of the avatars");
          avatar = b.avatar;
        }
        if (b.avatar_url !== undefined) {
          const url = String(b.avatar_url || "");
          const esc = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (url && url !== row?.avatar_url && !new RegExp(`^/uploads/${esc}_\\d+\\.(png|jpg|webp)$`).test(url)) bad("Upload the photo first");
          photo = url || null;
        }
        await run("UPDATE users SET avatar = ?, avatar_url = ? WHERE username = ?", [avatar, photo, u]);
        if (req.session?.user) req.session.user = { ...req.session.user, avatar, avatar_url: photo };
      }
      await run(
        `INSERT INTO social_profiles(username, cover, accent, location, pronouns, website, links, visibility, pinned, updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(username) DO UPDATE SET cover=excluded.cover, accent=excluded.accent, location=excluded.location,
           pronouns=excluded.pronouns, website=excluded.website, links=excluded.links, visibility=excluded.visibility,
           pinned=excluded.pinned, updated_at=excluded.updated_at`,
        [u, next.cover, next.accent, next.location, next.pronouns, next.website, next.links, next.visibility, next.pinned, Date.now()],
      );
      // Going public lets everyone who asked in.
      if (next.visibility === "public" && cur.visibility === "followers") {
        await run("UPDATE social_follows SET status = 'accepted' WHERE followee = ? AND status = 'pending'", [u]);
        await run("UPDATE social_notifications SET type = 'follow' WHERE username = ? AND type = 'follow_request'", [u]);
      }
      res.json({ ok: true });
    }),
  );

  return { router };
}

/** Tables keyed by username, for the account rename in src/routes/auth.js. */
const SOCIAL_USER_COLUMNS = [
  ["social_posts", "username"], ["social_comments", "username"], ["social_likes", "username"],
  ["social_comment_likes", "username"], ["social_bookmarks", "username"], ["social_poll_votes", "username"],
  ["social_follows", "follower"], ["social_follows", "followee"], ["social_blocks", "blocker"],
  ["social_blocks", "blocked"], ["social_mutes", "muter"], ["social_mutes", "muted"],
  ["social_notifications", "username"], ["social_notifications", "actor"], ["social_profiles", "username"],
];

module.exports = { createSocialRouter, SOCIAL_USER_COLUMNS, hashtagsOf, mentionsOf };
