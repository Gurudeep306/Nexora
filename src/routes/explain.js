// Video explanations (client: client/src/explain). Members record a video on
// a question or a lesson (camera, screen, both, or a whiteboard) in the
// browser and upload it here, so others can learn from it.
//
// Files live on the server's disk (EXPLAIN_DIR, default data/explain), not in
// the database: a video is far too large for the chunked uploads store.
// Uploads are resumable: the file is sent in pieces, and a lost connection
// picks up where it stopped. Trimming and chapters are stored as numbers, and
// the player honours them, so nothing is re-encoded on the server.
//
//   POST   /api/explain/videos                 start an upload (checks, quota)
//   PUT    /api/explain/videos/:id/data?at=N   append a piece at byte N
//   POST   /api/explain/videos/:id/finish      check the file, poster, publish
//   GET    /api/explain/videos?kind&target     mine + public ones, most helpful first
//   GET    /api/explain/videos/:id             one
//   PATCH  /api/explain/videos/:id             title, note, chapters, trim, visibility
//   DELETE /api/explain/videos/:id             the author (or staff) removes it
//   PUT|DELETE /api/explain/videos/:id/vote    "helpful"
//   POST   /api/explain/videos/:id/view        counted once per person
//   POST   /api/explain/videos/:id/report      three reports hide it until staff look
//   GET    /api/explain/mine                   all of mine
//   GET    /api/explain/media/:file            the video (byte ranges) or its poster
//   GET    /api/explain/counts?kind&target     how many videos each part of a lesson has
//
// A part of a lesson (a subtopic) is the lesson's target plus "#<heading id>".
//
// Explaining on a tablet: the computer asks for a one-time link (QR), the
// tablet opens /explain/pad/<token> (not signed in; the token stands for the
// member and one lesson or question for 12 hours, and can only add videos),
// records there and uploads through /api/explain/device/<token>/…
//   POST   /api/explain/links                  a tablet link for kind+target
//   GET    /api/explain/links/:token           opened yet? the video it posted
//   GET    /api/explain/device/:token          what the tablet is explaining
//   POST   /api/explain/device/:token/videos   (then …/:id/data and …/:id/finish)
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { all, get, run } = require("../db");
const { requireAuthenticatedUser } = require("../middleware/auth");
const { hasAnyAdminPerm } = require("../authz/permissions");

const DIR = process.env.EXPLAIN_DIR || path.join(__dirname, "..", "..", "data", "explain");
const MAX_BYTES = (Number(process.env.EXPLAIN_MAX_MB) || 300) * 1024 * 1024;
const MAX_MS = 20 * 60 * 1000;
const USER_BYTES = (Number(process.env.EXPLAIN_USER_MB) || 2048) * 1024 * 1024;
const TOTAL_BYTES = (Number(process.env.EXPLAIN_TOTAL_GB) || 8) * 1024 * 1024 * 1024;
const PIECE = 8 * 1024 * 1024;
const POSTER_BYTES = 600 * 1024;
const TITLE_MAX = 120;
const NOTE_MAX = 1000;
const MAX_CHAPTERS = 30;
const HIDE_AFTER_REPORTS = 3;
const KINDS = new Set(["gate", "lesson", "learn"]);
const SECTION_RE = /^[A-Za-z0-9_-]{1,80}$/;
const LEARN_RE = /^[a-z0-9-]{1,60}\/[a-z0-9-]{1,60}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const LINK_TTL_MS = 12 * 60 * 60 * 1000;
const ABOUT_MAX = 160;
const SOURCES = new Set(["camera", "screen", "screen+camera", "board", "upload"]);
const MIMES = { "video/webm": "webm", "video/mp4": "mp4" };
// A file picked on an iPad (its own screen recording) can be QuickTime: the
// same MP4 family (an "ftyp" box), played as MP4 by browsers.
const MIME_ALIAS = { "video/quicktime": "video/mp4" };
const ID_RE = /^[A-Za-z0-9_-]{16,32}$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (message, status = 400) => {
  throw new HttpError(status, message);
};
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    if (e instanceof HttpError) return res.status(e.status).json({ ok: false, error: e.message });
    console.error(`[explain] ${req.method} ${req.path}: ${e.message}`);
    if (!res.headersSent) res.status(500).json({ ok: false, error: "Something went wrong" });
  });

function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.sessionUser?.username || req.ip;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      h = { start: now, n: 0 };
      hits.set(key, h);
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    }
    if (++h.n > max) return res.status(429).json({ ok: false, error: "Too many requests — please slow down." });
    next();
  };
}

/** Like limiter, keyed by something else (a tablet link's token). */
function limiterBy(max, windowMs, keyOf) {
  const hits = new Map();
  return (req, res, next) => {
    const key = keyOf(req) || req.ip;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      h = { start: now, n: 0 };
      hits.set(key, h);
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    }
    if (++h.n > max) return res.status(429).json({ ok: false, error: "Too many requests — please slow down." });
    next();
  };
}

let ready = null;
function ensureTables() {
  if (!ready) {
    ready = (async () => {
      fs.mkdirSync(DIR, { recursive: true });
      await run(`CREATE TABLE IF NOT EXISTS explain_videos (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        kind TEXT NOT NULL,
        target TEXT NOT NULL,
        title TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        trim_start_ms INTEGER NOT NULL DEFAULT 0,
        trim_end_ms INTEGER,
        chapters TEXT NOT NULL DEFAULT '[]',
        poster INTEGER NOT NULL DEFAULT 0,
        visibility TEXT NOT NULL DEFAULT 'public',
        status TEXT NOT NULL DEFAULT 'uploading',
        views INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
      await run("CREATE INDEX IF NOT EXISTS idx_explain_target ON explain_videos(kind, target, status)");
      await run("CREATE INDEX IF NOT EXISTS idx_explain_user ON explain_videos(username, created_at)");
      await run(`CREATE TABLE IF NOT EXISTS explain_votes (
        video_id TEXT NOT NULL, username TEXT NOT NULL, created_at INTEGER NOT NULL,
        PRIMARY KEY (video_id, username)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS explain_views (
        video_id TEXT NOT NULL, username TEXT NOT NULL, created_at INTEGER NOT NULL,
        PRIMARY KEY (video_id, username)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS explain_reports (
        video_id TEXT NOT NULL, username TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL,
        PRIMARY KEY (video_id, username)
      )`);
      // The DSA course's lessons live in the client, so their names come with the upload.
      await run("ALTER TABLE explain_videos ADD COLUMN about TEXT").catch(() => {});
      await run(`CREATE TABLE IF NOT EXISTS explain_links (
        token TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        kind TEXT NOT NULL,
        target TEXT NOT NULL,
        about TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        opened_at INTEGER,
        last_video TEXT
      )`);
      await run("CREATE INDEX IF NOT EXISTS idx_explain_links_user ON explain_links(username, created_at)");
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const cleanAbout = (a) => String(a || "").replace(/\s+/g, " ").trim().slice(0, ABOUT_MAX);

/**
 * What a video is attached to, with a title for lists (null if unknown).
 * `target` may end in "#<heading id>": one part of a lesson. `about` is the
 * stored name, used for DSA lessons (their content lives in the client).
 */
function targetInfo(kind, target, about) {
  if (!KINDS.has(kind) || typeof target !== "string" || !target || target.length > 200) return null;
  const hash = target.indexOf("#");
  const base = hash < 0 ? target : target.slice(0, hash);
  const section = hash < 0 ? null : target.slice(hash + 1);
  if (section !== null && !SECTION_RE.test(section)) return null;
  if (kind === "gate") {
    if (section !== null) return null;
    const q = require("./gate").loadGateBank().byId.get(base);
    if (!q) return null;
    return { title: `GATE ${q.exam || "CSE"} ${q.year}${q.set ? ` Set ${q.set}` : ""} · ${q.section === "ga" ? "GA " : ""}Q${q.number ?? ""}`, link: `/gate/practice?ids=${encodeURIComponent(base)}` };
  }
  if (kind === "learn") {
    if (!LEARN_RE.test(base)) return null;
    const [topic, page] = base.split("/");
    const name = cleanAbout(about) || `${topic.replace(/-/g, " ")} · ${page.replace(/-/g, " ")}`;
    return { title: name, link: `/learn/dsa/${topic}/${page}${section ? `#${section}` : ""}` };
  }
  const [subject, lesson] = base.split("/");
  const s = require("./gate-notes").loadGateNotes().subjects.get(subject || "");
  const l = s?.lessons.get(lesson || "");
  if (!l) return null;
  let title = `${s.card.title} · ${l.lesson.title}`;
  if (section !== null) {
    const h = (l.lesson.outline || []).find((x) => x.id === section);
    if (!h) return null;
    title += ` · ${h.text}`;
  }
  return { title, link: `/gate/notes/${subject}/${lesson}${section ? `#n-${section}` : ""}` };
}

const fileOf = (v) => path.join(DIR, `${v.id}.${MIMES[v.mime]}`);
const posterOf = (v) => path.join(DIR, `${v.id}.jpg`);

function cleanChapters(list, durationMs) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_CHAPTERS)
    .map((c) => ({ at: Math.max(0, Math.min(durationMs, Math.round(Number(c?.at) || 0))), title: String(c?.title || "").replace(/\s+/g, " ").trim().slice(0, 80) }))
    .filter((c) => c.title)
    .sort((a, b) => a.at - b.at);
}

function cleanTrim(start, end, durationMs) {
  const s = Math.max(0, Math.min(durationMs, Math.round(Number(start) || 0)));
  const e = end == null ? null : Math.max(s + 1000, Math.min(durationMs, Math.round(Number(end) || durationMs)));
  return [s, e != null && e >= durationMs ? null : e];
}

function view(v, me, people, extra = {}) {
  const ext = MIMES[v.mime];
  const author = people.get(v.username);
  return {
    id: v.id,
    kind: v.kind,
    target: v.target,
    title: v.title,
    note: v.note,
    source: v.source,
    durationMs: v.duration_ms,
    trimStartMs: v.trim_start_ms,
    trimEndMs: v.trim_end_ms,
    chapters: JSON.parse(v.chapters || "[]"),
    src: `/api/explain/media/${v.id}.${ext}`,
    poster: v.poster ? `/api/explain/media/${v.id}.jpg?v=${v.updated_at}` : null,
    visibility: v.visibility,
    status: v.status,
    views: v.views,
    createdAt: v.created_at,
    mine: v.username === me,
    author: author || { username: v.username, displayName: null, avatar: null, avatarUrl: null },
    ...extra,
  };
}

async function people(usernames) {
  const list = [...new Set(usernames)];
  if (!list.length) return new Map();
  const rows = await all(`SELECT username, display_name, avatar, avatar_url FROM users WHERE username IN (${list.map(() => "?").join(",")})`, list);
  return new Map(rows.map((u) => [u.username, { username: u.username, displayName: u.display_name || null, avatar: u.avatar || null, avatarUrl: u.avatar_url || null }]));
}

async function votesFor(ids, me) {
  if (!ids.length) return { counts: new Map(), mine: new Set() };
  const q = ids.map(() => "?").join(",");
  const counts = new Map((await all(`SELECT video_id, COUNT(*) AS n FROM explain_votes WHERE video_id IN (${q}) GROUP BY video_id`, ids)).map((r) => [r.video_id, Number(r.n)]));
  const mine = new Set((await all(`SELECT video_id FROM explain_votes WHERE username=? AND video_id IN (${q})`, [me, ...ids])).map((r) => r.video_id));
  return { counts, mine };
}

/** Is the file what it says (WebM/Matroska or MP4)? */
function looksLikeVideo(file, mime) {
  const fd = fs.openSync(file, "r");
  const b = Buffer.alloc(12);
  try {
    fs.readSync(fd, b, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (mime === "video/webm") return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  return b.slice(4, 8).toString("ascii") === "ftyp";
}

function createExplainRouter() {
  const router = express.Router();
  const auth = requireAuthenticatedUser;
  const light = limiter(240, 60 * 1000);
  const make = limiter(20, 60 * 60 * 1000);
  router.use("/api/explain", (req, res, next) => ensureTables().then(() => next(), next));

  async function own(req, id, { staff = false } = {}) {
    if (!ID_RE.test(id || "")) bad("Not found", 404);
    const v = await get("SELECT * FROM explain_videos WHERE id=?", [id]);
    if (!v) bad("Not found", 404);
    if (v.username !== req.sessionUser.username && !(staff && hasAnyAdminPerm(req))) bad("Not yours", 403);
    return v;
  }

  /** Starts an upload for `me` (checks, quota); returns the new id. */
  async function startUpload(me, b) {
    const info = targetInfo(b.kind, b.target, b.about);
    if (!info) bad("Unknown question or lesson", 404);
    const rawMime = String(b.mime || "").split(";")[0];
    const mime = MIME_ALIAS[rawMime] || rawMime;
    const ext = MIMES[mime];
    if (!ext) bad("Videos must be WebM or MP4.");
    const size = Math.round(Number(b.size));
    if (!(size > 0)) bad("The video is empty.");
    if (size > MAX_BYTES) bad(`Videos can be up to ${Math.round(MAX_BYTES / 1024 / 1024)} MB. Try a shorter one, or record at a lower quality.`);
    const durationMs = Math.round(Number(b.durationMs));
    if (!(durationMs >= 3000)) bad("Record at least a few seconds.");
    if (durationMs > MAX_MS + 30_000) bad("Videos can be up to 20 minutes.");
    const title = String(b.title || "").replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
    if (!title) bad("Give the video a title.");
    const source = SOURCES.has(b.source) ? b.source : "camera";
    const used = await get("SELECT COALESCE(SUM(size), 0) AS n FROM explain_videos WHERE username=? AND status != 'deleted'", [me]);
    if (Number(used.n) + size > USER_BYTES) bad("You have used your video space. Delete an old video to add a new one.", 413);
    const total = await get("SELECT COALESCE(SUM(size), 0) AS n FROM explain_videos WHERE status != 'deleted'");
    if (Number(total.n) + size > TOTAL_BYTES) bad("Video space on NexoraGuru is full right now. Please try again later.", 507);
    const id = crypto.randomBytes(12).toString("base64url");
    const now = Date.now();
    const [ts, te] = cleanTrim(b.trimStartMs, b.trimEndMs, durationMs);
    await run(
      `INSERT INTO explain_videos(id, username, kind, target, about, title, note, source, mime, size, duration_ms, trim_start_ms, trim_end_ms, chapters, visibility, created_at, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, me, b.kind, b.target, b.kind === "learn" ? cleanAbout(b.about) || null : null, title, String(b.note || "").trim().slice(0, NOTE_MAX), source, mime, size, durationMs, ts, te, JSON.stringify(cleanChapters(b.chapters, durationMs)), b.visibility === "private" ? "private" : "public", now, now],
    );
    fs.writeFileSync(path.join(DIR, `${id}.${ext}`), Buffer.alloc(0));
    return id;
  }

  // One piece of the file, appended at byte `at`. A wrong `at` answers with
  // where the file really is, so the browser can resume from there.
  function appendPiece(v, req, res) {
    if (v.status !== "uploading") bad("This upload is finished.", 409);
    const file = fileOf(v);
    const have = fs.existsSync(file) ? fs.statSync(file).size : 0;
    const at = Number(req.query.at);
    if (at !== have) return res.status(409).json({ ok: false, error: "Out of step", have });
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!body.length) bad("Empty piece.");
    if (have + body.length > v.size) bad("More data than the video's size.");
    fs.appendFileSync(file, body);
    res.json({ ok: true, have: have + body.length });
  }

  async function finishUpload(v, posterData) {
    if (v.status !== "uploading") bad("This upload is finished.", 409);
    const file = fileOf(v);
    const have = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (have !== v.size) bad(`The upload is not complete (${have} of ${v.size} bytes).`, 409);
    if (!looksLikeVideo(file, v.mime)) {
      fs.rmSync(file, { force: true });
      await run("DELETE FROM explain_videos WHERE id=?", [v.id]);
      bad("That file is not a video we can play.");
    }
    let poster = 0;
    const m = String(posterData || "").match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (m) {
      const buf = Buffer.from(m[1], "base64");
      if (buf.length <= POSTER_BYTES && buf[0] === 0xff && buf[1] === 0xd8) {
        fs.writeFileSync(posterOf(v), buf);
        poster = 1;
      }
    }
    await run("UPDATE explain_videos SET status='ready', poster=?, updated_at=? WHERE id=?", [poster, Date.now(), v.id]);
    const row = await get("SELECT * FROM explain_videos WHERE id=?", [v.id]);
    return view(row, v.username, await people([v.username]), { votes: 0, voted: false });
  }

  router.post("/api/explain/videos", auth, make, express.json(), wrap(async (req, res) => {
    const id = await startUpload(req.sessionUser.username, req.body || {});
    res.json({ ok: true, id, piece: PIECE });
  }));

  router.put("/api/explain/videos/:id/data", auth, express.raw({ type: () => true, limit: PIECE + 1024 }), wrap(async (req, res) => {
    appendPiece(await own(req, req.params.id), req, res);
  }));

  router.post("/api/explain/videos/:id/finish", auth, express.json({ limit: "1mb" }), wrap(async (req, res) => {
    const v = await own(req, req.params.id);
    res.json({ ok: true, video: await finishUpload(v, req.body?.poster) });
  }));

  /* ── Explaining on a tablet (one-time link) ── */

  async function liveLink(token) {
    if (typeof token !== "string" || !TOKEN_RE.test(token)) bad("This link is not valid.", 404);
    const link = await get("SELECT * FROM explain_links WHERE token=?", [token]);
    if (!link) bad("This link is not valid.", 404);
    if (link.expires_at < Date.now()) bad("This link has expired. Make a new one on your computer.", 410);
    return link;
  }
  const deviceLimit = limiterBy(60, 60 * 1000, (req) => String(req.params.token || ""));

  router.post("/api/explain/links", auth, make, express.json(), wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const b = req.body || {};
    if (!targetInfo(b.kind, b.target, b.about)) bad("Unknown question or lesson", 404);
    const token = crypto.randomBytes(18).toString("base64url");
    const now = Date.now();
    await run("DELETE FROM explain_links WHERE expires_at < ?", [now]);
    await run(
      "INSERT INTO explain_links(token, username, kind, target, about, created_at, expires_at) VALUES(?,?,?,?,?,?,?)",
      [token, me, b.kind, b.target, cleanAbout(b.about) || null, now, now + LINK_TTL_MS],
    );
    res.json({ ok: true, token, path: `/explain/pad/${token}`, expiresAt: now + LINK_TTL_MS });
  }));

  router.get("/api/explain/links/:token", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const link = await get("SELECT * FROM explain_links WHERE token=? AND username=?", [String(req.params.token), me]);
    if (!link) bad("Not found", 404);
    let video = null;
    if (link.last_video) {
      const r = await get("SELECT * FROM explain_videos WHERE id=?", [link.last_video]);
      if (r && r.status === "ready") video = view(r, me, await people([me]), { votes: 0, voted: false });
    }
    const up = link.last_video ? null : await get("SELECT size FROM explain_videos WHERE id=(SELECT id FROM explain_videos WHERE username=? AND kind=? AND target=? AND status='uploading' AND created_at>=? ORDER BY created_at DESC LIMIT 1)", [me, link.kind, link.target, link.opened_at || link.created_at]);
    res.json({ ok: true, opened: !!link.opened_at, uploading: !!up, expiresAt: link.expires_at, video });
  }));

  router.get("/api/explain/device/:token", deviceLimit, wrap(async (req, res) => {
    const link = await liveLink(req.params.token);
    if (!link.opened_at) await run("UPDATE explain_links SET opened_at=? WHERE token=?", [Date.now(), link.token]);
    const info = targetInfo(link.kind, link.target, link.about);
    if (!info) bad("This lesson or question is no longer here.", 404);
    const who = (await people([link.username])).get(link.username);
    res.json({ ok: true, about: info.title, name: who?.displayName || link.username, maxMs: MAX_MS, maxBytes: MAX_BYTES, expiresAt: link.expires_at });
  }));

  router.post("/api/explain/device/:token/videos", deviceLimit, express.json(), wrap(async (req, res) => {
    const link = await liveLink(req.params.token);
    const b = req.body || {};
    const id = await startUpload(link.username, { ...b, kind: link.kind, target: link.target, about: link.about });
    res.json({ ok: true, id, piece: PIECE });
  }));

  async function deviceVideo(req) {
    const link = await liveLink(req.params.token);
    if (!ID_RE.test(req.params.id || "")) bad("Not found", 404);
    const v = await get("SELECT * FROM explain_videos WHERE id=?", [req.params.id]);
    if (!v || v.username !== link.username || v.kind !== link.kind || v.target !== link.target) bad("Not found", 404);
    return { link, v };
  }

  router.put("/api/explain/device/:token/videos/:id/data", deviceLimit, express.raw({ type: () => true, limit: PIECE + 1024 }), wrap(async (req, res) => {
    appendPiece((await deviceVideo(req)).v, req, res);
  }));

  router.post("/api/explain/device/:token/videos/:id/finish", deviceLimit, express.json({ limit: "1mb" }), wrap(async (req, res) => {
    const { link, v } = await deviceVideo(req);
    const video = await finishUpload(v, req.body?.poster);
    await run("UPDATE explain_links SET last_video=? WHERE token=?", [v.id, link.token]);
    res.json({ ok: true, video: { ...video, src: null, poster: null } });
  }));

  /** How many videos each part of a lesson has: { "": n, "<heading id>": n }. */
  router.get("/api/explain/counts", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const { kind, target } = req.query;
    if (typeof target !== "string" || target.includes("#") || !targetInfo(kind, target)) bad("Unknown question or lesson", 404);
    const rows = await all(
      `SELECT target, COUNT(*) AS n FROM explain_videos WHERE kind=? AND (target=? OR target LIKE ? ESCAPE '\\') AND status='ready' AND (visibility='public' OR username=?) GROUP BY target`,
      [kind, target, `${target.replace(/[\\%_]/g, (c) => `\\${c}`)}#%`, me],
    );
    const counts = {};
    for (const r of rows) counts[r.target === target ? "" : r.target.slice(target.length + 1)] = Number(r.n);
    res.json({ ok: true, counts });
  }));

  router.get("/api/explain/videos", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const { kind, target } = req.query;
    if (!targetInfo(kind, target)) bad("Unknown question or lesson", 404);
    const rows = await all(
      `SELECT * FROM explain_videos WHERE kind=? AND target=? AND status='ready' AND (visibility='public' OR username=?) ORDER BY created_at DESC LIMIT 100`,
      [kind, target, me],
    );
    const { counts, mine } = await votesFor(rows.map((r) => r.id), me);
    const who = await people(rows.map((r) => r.username));
    const videos = rows
      .map((r) => view(r, me, who, { votes: counts.get(r.id) || 0, voted: mine.has(r.id) }))
      .sort((a, b) => Number(b.mine) - Number(a.mine) || b.votes - a.votes || b.createdAt - a.createdAt);
    res.json({ ok: true, videos });
  }));

  router.get("/api/explain/mine", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const rows = await all("SELECT * FROM explain_videos WHERE username=? AND status IN ('ready','hidden') ORDER BY created_at DESC LIMIT 200", [me]);
    const { counts, mine } = await votesFor(rows.map((r) => r.id), me);
    const who = await people([me]);
    const used = rows.reduce((n, r) => n + r.size, 0);
    res.json({
      ok: true,
      used,
      limit: USER_BYTES,
      videos: rows.map((r) => view(r, me, who, { votes: counts.get(r.id) || 0, voted: mine.has(r.id), about: targetInfo(r.kind, r.target, r.about) })),
    });
  }));

  router.get("/api/explain/videos/:id", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    if (!ID_RE.test(req.params.id)) bad("Not found", 404);
    const r = await get("SELECT * FROM explain_videos WHERE id=?", [req.params.id]);
    if (!r || r.status !== "ready" || (r.visibility !== "public" && r.username !== me)) bad("Not found", 404);
    const { counts, mine } = await votesFor([r.id], me);
    res.json({ ok: true, video: view(r, me, await people([r.username]), { votes: counts.get(r.id) || 0, voted: mine.has(r.id), about: targetInfo(r.kind, r.target, r.about) }) });
  }));

  router.patch("/api/explain/videos/:id", auth, light, express.json(), wrap(async (req, res) => {
    const v = await own(req, req.params.id);
    const b = req.body || {};
    const sets = [];
    const vals = [];
    if (b.title !== undefined) {
      const t = String(b.title).replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
      if (!t) bad("Give the video a title.");
      sets.push("title=?");
      vals.push(t);
    }
    if (b.note !== undefined) (sets.push("note=?"), vals.push(String(b.note).trim().slice(0, NOTE_MAX)));
    if (b.visibility !== undefined) (sets.push("visibility=?"), vals.push(b.visibility === "private" ? "private" : "public"));
    if (b.chapters !== undefined) (sets.push("chapters=?"), vals.push(JSON.stringify(cleanChapters(b.chapters, v.duration_ms))));
    if (b.trimStartMs !== undefined || b.trimEndMs !== undefined) {
      const [ts, te] = cleanTrim(b.trimStartMs ?? v.trim_start_ms, b.trimEndMs === undefined ? v.trim_end_ms : b.trimEndMs, v.duration_ms);
      sets.push("trim_start_ms=?", "trim_end_ms=?");
      vals.push(ts, te);
    }
    if (!sets.length) bad("Nothing to change.");
    await run(`UPDATE explain_videos SET ${sets.join(", ")}, updated_at=? WHERE id=?`, [...vals, Date.now(), v.id]);
    const r = await get("SELECT * FROM explain_videos WHERE id=?", [v.id]);
    const { counts, mine } = await votesFor([r.id], v.username);
    res.json({ ok: true, video: view(r, req.sessionUser.username, await people([r.username]), { votes: counts.get(r.id) || 0, voted: mine.has(r.id) }) });
  }));

  router.delete("/api/explain/videos/:id", auth, light, wrap(async (req, res) => {
    const v = await own(req, req.params.id, { staff: true });
    fs.rmSync(fileOf(v), { force: true });
    fs.rmSync(posterOf(v), { force: true });
    await run("DELETE FROM explain_videos WHERE id=?", [v.id]);
    await run("DELETE FROM explain_votes WHERE video_id=?", [v.id]);
    await run("DELETE FROM explain_views WHERE video_id=?", [v.id]);
    await run("DELETE FROM explain_reports WHERE video_id=?", [v.id]);
    res.json({ ok: true });
  }));

  async function visible(req, id) {
    if (!ID_RE.test(id || "")) bad("Not found", 404);
    const v = await get("SELECT * FROM explain_videos WHERE id=?", [id]);
    if (!v || v.status !== "ready" || (v.visibility !== "public" && v.username !== req.sessionUser.username)) bad("Not found", 404);
    return v;
  }

  const vote = (on) =>
    wrap(async (req, res) => {
      const me = req.sessionUser.username;
      const v = await visible(req, req.params.id);
      if (v.username === me) bad("You can't mark your own video.");
      if (on) await run("INSERT OR IGNORE INTO explain_votes(video_id, username, created_at) VALUES(?,?,?)", [v.id, me, Date.now()]);
      else await run("DELETE FROM explain_votes WHERE video_id=? AND username=?", [v.id, me]);
      const n = await get("SELECT COUNT(*) AS n FROM explain_votes WHERE video_id=?", [v.id]);
      res.json({ ok: true, votes: Number(n.n), voted: on });
    });
  router.put("/api/explain/videos/:id/vote", auth, light, vote(true));
  router.delete("/api/explain/videos/:id/vote", auth, light, vote(false));

  router.post("/api/explain/videos/:id/view", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const v = await visible(req, req.params.id);
    if (v.username !== me) {
      const r = await run("INSERT OR IGNORE INTO explain_views(video_id, username, created_at) VALUES(?,?,?)", [v.id, me, Date.now()]);
      if (r.changes) await run("UPDATE explain_videos SET views=views+1 WHERE id=?", [v.id]);
    }
    res.json({ ok: true });
  }));

  router.post("/api/explain/videos/:id/report", auth, light, express.json(), wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const v = await visible(req, req.params.id);
    if (v.username === me) bad("You can delete your own video instead.");
    const reason = String(req.body?.reason || "").trim().slice(0, 300) || "No reason given";
    await run("INSERT OR IGNORE INTO explain_reports(video_id, username, reason, created_at) VALUES(?,?,?,?)", [v.id, me, reason, Date.now()]);
    const n = await get("SELECT COUNT(*) AS n FROM explain_reports WHERE video_id=?", [v.id]);
    if (Number(n.n) >= HIDE_AFTER_REPORTS) await run("UPDATE explain_videos SET status='hidden' WHERE id=?", [v.id]);
    res.json({ ok: true });
  }));

  // The file itself, with byte ranges so the player can seek. Signed in only;
  // private videos only for their author.
  router.get("/api/explain/media/:file", auth, wrap(async (req, res) => {
    const m = String(req.params.file).match(/^([A-Za-z0-9_-]{16,32})\.(webm|mp4|jpg)$/);
    if (!m) bad("Not found", 404);
    const v = await get("SELECT * FROM explain_videos WHERE id=?", [m[1]]);
    const me = req.sessionUser.username;
    const may = v && (v.username === me || (v.status === "ready" && v.visibility === "public") || hasAnyAdminPerm(req));
    if (!may) bad("Not found", 404);
    const file = m[2] === "jpg" ? posterOf(v) : fileOf(v);
    if (m[2] !== "jpg" && m[2] !== MIMES[v.mime]) bad("Not found", 404);
    if (!fs.existsSync(file)) bad("Not found", 404);
    res.setHeader("Cache-Control", v.visibility === "public" ? "private, max-age=86400" : "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(file, { acceptRanges: true, headers: { "Content-Type": m[2] === "jpg" ? "image/jpeg" : v.mime } });
  }));

  return router;
}

module.exports = { createExplainRouter, targetInfo };
