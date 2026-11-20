// Handwritten solutions (client: components/hand, pages/hand).
//
// A member attaches their own handwritten working to a question, three ways:
//   - a tablet (iPad, drawing pad): a one-time link / QR opens the writing pad
//     at /pad/<token> on that device, and Submit sends the pages here;
//   - a phone camera: the link opens /snap/<token>, which takes photos of
//     working done on paper and sends them;
//   - an upload from the device they are on.
// The tablet or phone is not signed in: the link's token stands for the member,
// for one question, for a limited time (LINK_TTL_MS), and can only add
// solutions. Solutions are private until their author shares them; public ones
// are shown to others on that question (the client shows them after the
// person has answered, so they never spoil it).
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { all, get, run, runBatch } = require("../db");
const { requireAuthenticatedUser } = require("../middleware/auth");
const { hasAnyAdminPerm } = require("../authz/permissions");
const { persistUpload } = require("../upload-store");
const { loadGateBank } = require("./gate");

// Long enough to solve a whole paper on the tablet in one sitting.
const LINK_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SOLUTIONS_PER_TARGET = 30;
const NOTE_MAX = 500;
const KINDS = new Set(["gate"]);
const MODES = new Set(["pad", "photo"]);
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const DIR = path.join(__dirname, "..", "..", "public", "uploads", "hand");

const MAGIC = [
  ["png", (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ["jpg", (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ["webp", (b) => b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP"],
];

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
    console.error(`[hand] ${req.method} ${req.path}: ${e.message}`);
    if (!res.headersSent) res.status(500).json({ ok: false, error: "Something went wrong" });
  });

/* Small per-key fixed-window limiter. */
function limiter(max, windowMs, keyOf) {
  const hits = new Map();
  return (req, res, next) => {
    const key = keyOf(req);
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

async function ensureTables() {
  await run(`CREATE TABLE IF NOT EXISTS hand_links (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    mode TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    opened_at INTEGER,
    last_solution TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS hand_solutions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    source TEXT NOT NULL,
    images TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  await run(`CREATE TABLE IF NOT EXISTS hand_votes (
    solution_id TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (solution_id, username)
  )`);
  await run(`CREATE INDEX IF NOT EXISTS idx_hand_solutions_target ON hand_solutions(kind, target, visibility)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_hand_solutions_user ON hand_solutions(username, kind, target)`);
}

/** What the solution is for, checked against the real catalogue. */
function targetInfo(kind, target) {
  if (!KINDS.has(kind) || typeof target !== "string" || !target || target.length > 120) return null;
  if (kind === "gate") {
    const q = loadGateBank().byId.get(target);
    if (!q) return null;
    const label = `GATE ${q.exam || "CSE"} ${q.year}${q.set ? ` Set ${q.set}` : ""} · ${q.section === "ga" ? "GA " : ""}Q${q.number ?? ""}`;
    return {
      kind,
      target,
      title: label,
      // What the tablet shows above the page, so the question is in view.
      question: {
        text: String(q.text || ""),
        type: q.type,
        marks: q.marks,
        options: Array.isArray(q.options) ? q.options.map((o) => ({ l: o.l, t: o.t })) : [],
        figures: Array.isArray(q.figures) ? q.figures.map((f) => ({ src: `/gate-fig/${f.svg || f.f}`, alt: f.alt || "" })) : [],
      },
    };
  }
  return null;
}

/** Decode and check images (data URLs), write them under /uploads/hand. */
async function saveImages(list) {
  if (!Array.isArray(list) || list.length < 1) bad("Add at least one page or photo.");
  if (list.length > MAX_IMAGES) bad(`At most ${MAX_IMAGES} pages or photos at a time.`);
  const decoded = list.map((img) => {
    const m = typeof img === "string" && img.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) bad("Pages must be PNG, JPG or WebP images.");
    const data = Buffer.from(m[2], "base64");
    if (data.length > MAX_IMAGE_BYTES) bad("One of the images is too large (max 5 MB each).", 413);
    const kind = MAGIC.find(([, test]) => test(data))?.[0];
    if (!kind) bad("One of the files isn't a valid image.");
    return { data, kind };
  });
  fs.mkdirSync(DIR, { recursive: true });
  const urls = [];
  for (const { data, kind } of decoded) {
    const name = `${crypto.randomBytes(16).toString("hex")}.${kind}`;
    const abs = path.join(DIR, name);
    fs.writeFileSync(abs, data);
    const url = `/uploads/hand/${name}`;
    await persistUpload(url, abs);
    urls.push(url);
  }
  return urls;
}

async function createSolution({ username, kind, target, source, images, note }) {
  const n = await get("SELECT COUNT(*) AS n FROM hand_solutions WHERE username=? AND kind=? AND target=?", [username, kind, target]);
  if (Number(n?.n) >= MAX_SOLUTIONS_PER_TARGET) bad("You have reached the limit for this question. Remove an old one first.", 409);
  const urls = await saveImages(images);
  const now = Date.now();
  const row = {
    id: `hs_${crypto.randomBytes(9).toString("base64url")}`,
    username,
    kind,
    target,
    source,
    images: JSON.stringify(urls),
    note: typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "",
    visibility: "private",
    created_at: now,
    updated_at: now,
  };
  await run(
    `INSERT INTO hand_solutions(id, username, kind, target, source, images, note, visibility, created_at, updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    Object.values(row),
  );
  return row;
}

const shape = (r, mine, extra = {}) => ({
  id: r.id,
  kind: r.kind,
  target: r.target,
  source: r.source,
  images: (() => {
    try {
      return JSON.parse(r.images);
    } catch {
      return [];
    }
  })(),
  note: r.note || "",
  visibility: r.visibility,
  createdAt: Number(r.created_at) || 0,
  mine,
  author: mine ? undefined : { username: r.username, displayName: r.display_name || null, avatar: r.avatar || null, avatarUrl: r.avatar_url || null },
  votes: Number(r.votes) || 0,
  voted: !!Number(r.voted),
  ...extra,
});

/* Live view: the tablet sends a small picture of the page now and then while
   you write, and the computer shows it. Kept in memory only, for a short time. */
const previews = new Map();
const PREVIEW_TTL_MS = 10 * 60 * 1000;
function putPreview(token, image) {
  const now = Date.now();
  previews.set(token, { image, at: now });
  if (previews.size > 500) for (const [k, v] of previews) if (now - v.at > PREVIEW_TTL_MS) previews.delete(k);
}

async function liveLink(token) {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const link = await get("SELECT * FROM hand_links WHERE token=?", [token]);
  if (!link || Number(link.expires_at) < Date.now()) return null;
  // The member behind the link must still exist and not be banned.
  const access = await require("../authz/access").loadUserAccess(link.username);
  if (!access || access.ban) return null;
  return link;
}

function createHandRouter() {
  const router = express.Router();
  const auth = requireAuthenticatedUser;
  const ready = ensureTables().catch((e) => console.error("[hand] table init failed:", e.message));
  // Load the question bank now, not on the first click.
  setImmediate(() => {
    try {
      loadGateBank();
    } catch {
      /* loaded on first use instead */
    }
  });
  router.use("/api/hand", (_req, _res, next) => ready.then(() => next(), next));
  const userLimit = limiter(40, 60 * 1000, (req) => req.sessionUser?.username || req.ip);
  const deviceLimit = limiter(30, 60 * 1000, (req) => String(req.params.token || ""));
  const previewLimit = limiter(40, 60 * 1000, (req) => String(req.params.token || ""));

  /* ── The member, signed in ── */

  // A one-time link for a tablet (pad) or a phone camera (photo).
  // One-time links for a tablet (pad) and/or a phone camera (photo). The
  // window asks for both at once (modes), so switching tabs is instant; the
  // page asks before the click (on hover/press), so the code is ready when the
  // window opens. One batched write; clearing old links never delays it.
  router.post("/api/hand/links", auth, userLimit, wrap(async (req, res) => {
    const b = req.body || {};
    const modes = Array.isArray(b.modes) ? [...new Set(b.modes)] : [b.mode];
    if (!modes.length || modes.length > 2 || !modes.every((m) => MODES.has(m))) bad("Unknown mode");
    const { kind, target } = b;
    if (!targetInfo(kind, target)) bad("Unknown question", 404);
    const user = req.sessionUser.username;
    const now = Date.now();
    const links = {};
    const rows = modes.map((mode) => {
      // 128 random bits: short, so the QR code has fewer modules and scans fast.
      const token = crypto.randomBytes(16).toString("base64url");
      links[mode] = { token, path: `/${mode === "pad" ? "pad" : "snap"}/${token}`, expiresAt: now + LINK_TTL_MS };
      return [`INSERT INTO hand_links(token, username, kind, target, mode, created_at, expires_at) VALUES(?,?,?,?,?,?,?)`, [token, user, kind, target, mode, now, now + LINK_TTL_MS]];
    });
    await (rows.length > 1 ? runBatch(rows) : run(rows[0][0], rows[0][1]));
    res.json({ ok: true, links, ...links[modes[0]] });
    // Expired links are cleared after the answer is sent.
    run("DELETE FROM hand_links WHERE username=? AND expires_at < ?", [user, now]).catch(() => {});
  }));

  // The computer waits on this while the tablet or phone works.
  router.get("/api/hand/links/:token", auth, wrap(async (req, res) => {
    const link = await get("SELECT * FROM hand_links WHERE token=? AND username=?", [String(req.params.token), req.sessionUser.username]);
    if (!link) bad("Link not found", 404);
    const expired = Number(link.expires_at) < Date.now();
    res.json({
      ok: true,
      state: link.last_solution ? "sent" : expired ? "expired" : link.opened_at ? "opened" : "waiting",
      solutionId: link.last_solution || null,
      expiresAt: Number(link.expires_at),
      previewAt: previews.get(link.token)?.at || 0,
    });
  }));

  // Upload from the device the member is on.
  router.post("/api/hand/solutions", auth, userLimit, wrap(async (req, res) => {
    const { kind, target, images, note } = req.body || {};
    if (!targetInfo(kind, target)) bad("Unknown question", 404);
    const row = await createSolution({ username: req.sessionUser.username, kind, target, source: "upload", images, note });
    res.json({ ok: true, solution: shape(row, true) });
  }));

  // Mine and, shared by others, the public ones for a question.
  router.get("/api/hand/solutions", auth, wrap(async (req, res) => {
    const kind = String(req.query.kind || "");
    const target = String(req.query.target || "");
    if (!targetInfo(kind, target)) bad("Unknown question", 404);
    const me = req.sessionUser.username;
    const VOTES = `(SELECT COUNT(*) FROM hand_votes v WHERE v.solution_id = h.id) AS votes,
       (SELECT COUNT(*) FROM hand_votes v WHERE v.solution_id = h.id AND v.username = ?) AS voted`;
    const mine = await all(`SELECT h.*, ${VOTES} FROM hand_solutions h WHERE h.username=? AND h.kind=? AND h.target=? ORDER BY h.created_at DESC`, [me, me, kind, target]);
    // The most helpful first, then the newest.
    const others = await all(
      `SELECT h.*, u.display_name, u.avatar, u.avatar_url, ${VOTES} FROM hand_solutions h LEFT JOIN users u ON u.username = h.username
       WHERE h.kind=? AND h.target=? AND h.visibility='public' AND h.username <> ? ORDER BY votes DESC, h.created_at DESC LIMIT 50`,
      [me, kind, target, me],
    );
    res.json({ ok: true, mine: mine.map((r) => shape(r, true)), community: others.map((r) => shape(r, false)) });
  }));

  router.patch("/api/hand/solutions/:id", auth, userLimit, wrap(async (req, res) => {
    const b = req.body || {};
    const set = {};
    if (b.visibility !== undefined) {
      if (b.visibility !== "private" && b.visibility !== "public") bad("visibility must be private or public");
      set.visibility = b.visibility;
    }
    if (b.note !== undefined) {
      if (typeof b.note !== "string") bad("note must be text");
      set.note = b.note.trim().slice(0, NOTE_MAX);
    }
    if (!Object.keys(set).length) bad("Nothing to update");
    set.updated_at = Date.now();
    const cols = Object.keys(set);
    const r = await run(`UPDATE hand_solutions SET ${cols.map((c) => `${c}=?`).join(", ")} WHERE id=? AND username=?`, [
      ...cols.map((c) => set[c]),
      String(req.params.id),
      req.sessionUser.username,
    ]);
    if (!r?.changes) bad("Not found", 404);
    const row = await get(
      `SELECT h.*, (SELECT COUNT(*) FROM hand_votes v WHERE v.solution_id = h.id) AS votes FROM hand_solutions h WHERE h.id=?`,
      [String(req.params.id)],
    );
    res.json({ ok: true, solution: shape(row, true) });
  }));

  // Its author removes it; staff can remove a public one that breaks the rules.
  router.delete("/api/hand/solutions/:id", auth, userLimit, wrap(async (req, res) => {
    const row = await get("SELECT * FROM hand_solutions WHERE id=?", [String(req.params.id)]);
    const staff = hasAnyAdminPerm(req);
    if (!row || (row.username !== req.sessionUser.username && !(staff && row.visibility === "public"))) bad("Not found", 404);
    await run("DELETE FROM hand_solutions WHERE id=?", [row.id]);
    await run("DELETE FROM hand_votes WHERE solution_id=?", [row.id]);
    res.json({ ok: true });
  }));

  // "Helpful": one vote per member on someone else's public solution.
  router.put("/api/hand/solutions/:id/vote", auth, userLimit, wrap(async (req, res) => {
    const row = await get("SELECT username, visibility FROM hand_solutions WHERE id=?", [String(req.params.id)]);
    if (!row || row.visibility !== "public") bad("Not found", 404);
    if (row.username === req.sessionUser.username) bad("You can't vote for your own solution.");
    await run("INSERT OR IGNORE INTO hand_votes(solution_id, username, created_at) VALUES(?,?,?)", [String(req.params.id), req.sessionUser.username, Date.now()]);
    const n = await get("SELECT COUNT(*) AS n FROM hand_votes WHERE solution_id=?", [String(req.params.id)]);
    res.json({ ok: true, votes: Number(n?.n) || 0, voted: true });
  }));
  router.delete("/api/hand/solutions/:id/vote", auth, userLimit, wrap(async (req, res) => {
    await run("DELETE FROM hand_votes WHERE solution_id=? AND username=?", [String(req.params.id), req.sessionUser.username]);
    const n = await get("SELECT COUNT(*) AS n FROM hand_votes WHERE solution_id=?", [String(req.params.id)]);
    res.json({ ok: true, votes: Number(n?.n) || 0, voted: false });
  }));

  // Every handwritten solution of mine, newest first (GATE → Notebook).
  router.get("/api/hand/mine", auth, wrap(async (req, res) => {
    const rows = await all(
      `SELECT h.*, (SELECT COUNT(*) FROM hand_votes v WHERE v.solution_id = h.id) AS votes FROM hand_solutions h WHERE h.username=? ORDER BY h.created_at DESC LIMIT 500`,
      [req.sessionUser.username],
    );
    const out = [];
    for (const r of rows) {
      const info = targetInfo(r.kind, r.target);
      if (info) out.push(shape(r, true, { title: info.title }));
    }
    res.json({ ok: true, solutions: out });
  }));

  // The live view of what the tablet is writing.
  router.get("/api/hand/links/:token/preview", auth, wrap(async (req, res) => {
    const link = await get("SELECT token FROM hand_links WHERE token=? AND username=?", [String(req.params.token), req.sessionUser.username]);
    if (!link) bad("Link not found", 404);
    const p = previews.get(link.token);
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, image: p && Date.now() - p.at < PREVIEW_TTL_MS ? p.image : null, at: p?.at || 0 });
  }));

  /* ── The tablet or phone, holding a link ── */

  router.get("/api/hand/device/:token", deviceLimit, wrap(async (req, res) => {
    const link = await liveLink(req.params.token);
    if (!link) bad("This link has expired. Make a new one on your computer.", 410);
    const info = targetInfo(link.kind, link.target);
    if (!info) bad("This question is no longer available.", 410);
    if (!link.opened_at) await run("UPDATE hand_links SET opened_at=? WHERE token=?", [Date.now(), link.token]);
    const user = await get("SELECT display_name FROM users WHERE username=?", [link.username]);
    res.json({ ok: true, mode: link.mode, title: info.title, question: info.question, name: user?.display_name || link.username, expiresAt: Number(link.expires_at) });
  }));

  router.put("/api/hand/device/:token/preview", previewLimit, wrap(async (req, res) => {
    const link = await liveLink(req.params.token);
    if (!link) bad("This link has expired.", 410);
    const img = req.body?.image;
    if (typeof img !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(img) || img.length > 400_000) bad("Preview must be a small image");
    putPreview(link.token, img);
    res.json({ ok: true });
  }));

  router.post("/api/hand/device/:token", deviceLimit, wrap(async (req, res) => {
    const link = await liveLink(req.params.token);
    if (!link) bad("This link has expired. Make a new one on your computer.", 410);
    if (!targetInfo(link.kind, link.target)) bad("This question is no longer available.", 410);
    const { images, note } = req.body || {};
    const row = await createSolution({ username: link.username, kind: link.kind, target: link.target, source: link.mode, images, note });
    await run("UPDATE hand_links SET last_solution=? WHERE token=?", [row.id, link.token]);
    res.json({ ok: true, id: row.id });
  }));

  return router;
}

module.exports = { createHandRouter, LINK_TTL_MS };
