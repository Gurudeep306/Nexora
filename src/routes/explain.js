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
const KINDS = new Set(["gate", "lesson"]);
const SOURCES = new Set(["camera", "screen", "screen+camera", "board", "upload"]);
const MIMES = { "video/webm": "webm", "video/mp4": "mp4" };
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
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** What a video is attached to, with a title for lists (null if unknown). */
function targetInfo(kind, target) {
  if (!KINDS.has(kind) || typeof target !== "string" || !target || target.length > 160) return null;
  if (kind === "gate") {
    const q = require("./gate").loadGateBank().byId.get(target);
    if (!q) return null;
    return { title: `GATE ${q.exam || "CSE"} ${q.year}${q.set ? ` Set ${q.set}` : ""} · ${q.section === "ga" ? "GA " : ""}Q${q.number ?? ""}`, link: `/gate/practice?ids=${encodeURIComponent(target)}` };
  }
  const [subject, lesson] = target.split("/");
  const s = require("./gate-notes").loadGateNotes().subjects.get(subject || "");
  const l = s?.lessons.get(lesson || "");
  if (!l) return null;
  return { title: `${s.card.title} · ${l.lesson.title}`, link: `/gate/notes/${subject}/${lesson}` };
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

  router.post("/api/explain/videos", auth, make, express.json(), wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const b = req.body || {};
    const info = targetInfo(b.kind, b.target);
    if (!info) bad("Unknown question or lesson", 404);
    const ext = MIMES[String(b.mime || "").split(";")[0]];
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
      `INSERT INTO explain_videos(id, username, kind, target, title, note, source, mime, size, duration_ms, trim_start_ms, trim_end_ms, chapters, visibility, created_at, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, me, b.kind, b.target, title, String(b.note || "").trim().slice(0, NOTE_MAX), source, String(b.mime).split(";")[0], size, durationMs, ts, te, JSON.stringify(cleanChapters(b.chapters, durationMs)), b.visibility === "private" ? "private" : "public", now, now],
    );
    fs.writeFileSync(path.join(DIR, `${id}.${ext}`), Buffer.alloc(0));
    res.json({ ok: true, id, piece: PIECE });
  }));

  // One piece of the file, appended at byte `at`. A wrong `at` answers with
  // where the file really is, so the browser can resume from there.
  router.put("/api/explain/videos/:id/data", auth, express.raw({ type: () => true, limit: PIECE + 1024 }), wrap(async (req, res) => {
    const v = await own(req, req.params.id);
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
  }));

  router.post("/api/explain/videos/:id/finish", auth, express.json({ limit: "1mb" }), wrap(async (req, res) => {
    const v = await own(req, req.params.id);
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
    const p = String(req.body?.poster || "");
    const m = p.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (m) {
      const buf = Buffer.from(m[1], "base64");
      if (buf.length <= POSTER_BYTES && buf[0] === 0xff && buf[1] === 0xd8) {
        fs.writeFileSync(posterOf(v), buf);
        poster = 1;
      }
    }
    await run("UPDATE explain_videos SET status='ready', poster=?, updated_at=? WHERE id=?", [poster, Date.now(), v.id]);
    const row = await get("SELECT * FROM explain_videos WHERE id=?", [v.id]);
    res.json({ ok: true, video: view(row, v.username, await people([v.username]), { votes: 0, voted: false }) });
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
      videos: rows.map((r) => view(r, me, who, { votes: counts.get(r.id) || 0, voted: mine.has(r.id), about: targetInfo(r.kind, r.target) })),
    });
  }));

  router.get("/api/explain/videos/:id", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    if (!ID_RE.test(req.params.id)) bad("Not found", 404);
    const r = await get("SELECT * FROM explain_videos WHERE id=?", [req.params.id]);
    if (!r || r.status !== "ready" || (r.visibility !== "public" && r.username !== me)) bad("Not found", 404);
    const { counts, mine } = await votesFor([r.id], me);
    res.json({ ok: true, video: view(r, me, await people([r.username]), { votes: counts.get(r.id) || 0, voted: mine.has(r.id), about: targetInfo(r.kind, r.target) }) });
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
