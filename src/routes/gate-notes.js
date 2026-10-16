const express = require("express");
const fs = require("fs");
const path = require("path");
const { all, run } = require("../db");
const { requireAuthenticatedUser } = require("../middleware/auth");
const { hasAnyAdminPerm } = require("../authz/permissions");

/*
 * GATE Notes — the course reader's API.
 *
 * Content is compiled by scripts/build-gate-notes.js into src/gate/notes/
 * (<subject>.json + _search.json) and served read-only from memory:
 *
 *   GET /api/gate/notes                       subjects (cards for the grid)
 *   GET /api/gate/notes/search?q=             lessons matching every term
 *   GET /api/gate/notes/:subject              chapter / lesson tree
 *   GET /api/gate/notes/:subject/:lesson      one lesson: AST, its practice
 *                                             questions and viz specs, prev/next
 *
 * Subjects marked hidden (the pipeline demo) exist only for staff. Lesson
 * `sources` never reach the compiled files, so they cannot leak from here.
 *
 * Per-user study state (signed in only, scoped to the session user):
 *
 *   GET /api/gate/me/notes-progress[?subject=]          { "subject/lesson": { completed, scrollPct, bookmarked, updatedAt } }
 *   PUT /api/gate/me/notes-progress/:subject/:lesson    { completed?, scrollPct?, bookmarked? }
 */

const DIR = path.join(__dirname, "..", "gate", "notes");
const RELOAD = process.env.NODE_ENV !== "production";

let store = null;
let signature = "";

function currentSignature() {
  try {
    return fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => `${f}:${fs.statSync(path.join(DIR, f)).mtimeMs}`)
      .join("|");
  } catch {
    return "";
  }
}

function build() {
  const subjects = new Map();
  let search = [];
  let files = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  } catch {
    /* no notes compiled yet */
  }
  for (const f of files) {
    try {
      const doc = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
      if (f === "_search.json") {
        search = (doc.entries || []).map((e) => ({ ...e, _hay: [e.title, e.chapter, ...(e.headings || []), e.text].join(" \u0000 ").toLowerCase() }));
      } else if (!f.startsWith("_") && doc.version === 1 && doc.subject?.id) {
        subjects.set(doc.subject.id, view(doc));
      }
    } catch (err) {
      console.error(`[gate-notes] cannot read ${f}: ${err.message}`);
    }
  }
  return { subjects, search };
}

/** Derived, response-ready shapes for one compiled subject. */
function view(doc) {
  const s = doc.subject;
  const order = [];
  const chapters = doc.chapters.map((ch) => ({
    id: ch.id,
    n: ch.n,
    title: ch.title,
    ...(ch.summary ? { summary: ch.summary } : {}),
    lessons: ch.lessons.map((id) => {
      const l = doc.lessons[id];
      order.push(id);
      return {
        id,
        title: l.title,
        order: l.order,
        est_minutes: l.est_minutes,
        difficulty: l.difficulty,
        ...(l.status !== "published" ? { status: l.status } : {}),
        prerequisites: l.prerequisites,
        pyq_topics: l.pyq_topics,
        pyqCount: l.pyqs.length,
        practiceCount: l.practice.length,
      };
    }),
  }));
  const lessonCount = order.length;
  const card = {
    id: s.id,
    title: s.title,
    order: s.order,
    icon: s.icon,
    color: s.color,
    description: s.description,
    exam: s.exam,
    ...(s.hidden ? { hidden: true } : {}),
    chapterCount: chapters.length,
    lessonCount,
    est_minutes: order.reduce((n, id) => n + (doc.lessons[id].est_minutes || 0), 0),
  };
  const brief = (id) => (id ? { id, title: doc.lessons[id].title, chapter: doc.lessons[id].chapter } : null);
  const lessons = new Map();
  order.forEach((id, i) => {
    const l = doc.lessons[id];
    const ch = chapters.find((c) => c.id === l.chapter);
    lessons.set(id, {
      lesson: l,
      chapter: { id: ch.id, n: ch.n, title: ch.title },
      practice: Object.fromEntries(l.practice.map((q) => [q, doc.practice[q]]).filter(([, q]) => q)),
      viz: Object.fromEntries(l.viz.map((v) => [v, doc.viz[v]]).filter(([, v]) => v)),
      prev: brief(order[i - 1]),
      next: brief(order[i + 1]),
    });
  });
  return { card, tree: { subject: card, chapters }, lessons };
}

function load() {
  if (store && !RELOAD) return store;
  const sig = currentSignature();
  if (!store || sig !== signature) {
    signature = sig;
    store = build();
  }
  return store;
}

/** Visible subject view, or null (unknown, or hidden from this visitor). */
function subjectFor(req, id) {
  const s = load().subjects.get(String(id || ""));
  if (!s) return null;
  if (s.card.hidden && !hasAnyAdminPerm(req)) return null;
  return s;
}

/** Quoted phrases stay together; everything else is an AND term. */
function terms(q) {
  const out = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(q))) {
    const t = (m[1] || m[2]).toLowerCase().trim();
    if (t) out.push(t);
  }
  return out.slice(0, 8);
}

function snippet(text, words) {
  const lower = text.toLowerCase();
  let at = -1;
  for (const w of words) {
    at = lower.indexOf(w);
    if (at >= 0) break;
  }
  if (at < 0) return text.slice(0, 160);
  const start = Math.max(0, at - 60);
  return `${start > 0 ? "…" : ""}${text.slice(start, start + 180).trim()}${start + 180 < text.length ? "…" : ""}`;
}

const fail = (res, status, error) => res.status(status).json({ ok: false, error });
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[gate-notes] ${req.method} ${req.path}: ${err.message}`);
    if (!res.headersSent) fail(res, 500, "Something went wrong");
  });

/* Small per-user fixed-window limiter (keyed by the session username). */
function userLimiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.sessionUser.username;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      h = { start: now, n: 0 };
      hits.set(key, h);
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    }
    if (++h.n > max) return fail(res, 429, "Too many requests — please slow down.");
    next();
  };
}

const progressShape = (r) => ({
  completed: !!r.completed,
  scrollPct: Number(r.scroll_pct) || 0,
  bookmarked: !!r.bookmarked,
  updatedAt: Number(r.updated_at) || 0,
});

function createGateNotesRouter() {
  const router = express.Router();
  const auth = requireAuthenticatedUser;
  const progressLimit = userLimiter(60, 60 * 1000);
  const cache = (_req, res, next) => {
    res.set("Cache-Control", "private, max-age=60");
    next();
  };

  router.get("/api/gate/notes", cache, (req, res) => {
    const staff = hasAnyAdminPerm(req);
    const subjects = [...load().subjects.values()]
      .map((s) => s.card)
      .filter((c) => staff || !c.hidden)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    res.json({ ok: true, subjects });
  });

  router.get("/api/gate/notes/search", (req, res) => {
    const words = terms(String(req.query.q || "").slice(0, 200));
    if (!words.length) return res.json({ ok: true, results: [] });
    const staff = hasAnyAdminPerm(req);
    const { subjects, search } = load();
    const results = [];
    for (const e of search) {
      if (e.hidden && !staff) continue;
      if (!words.every((w) => e._hay.includes(w))) continue;
      const s = subjects.get(e.s);
      if (!s) continue;
      const inTitle = words.filter((w) => e.title.toLowerCase().includes(w)).length;
      results.push({
        subject: e.s,
        subjectTitle: s.card.title,
        lesson: e.l,
        title: e.title,
        chapter: e.chapter,
        snippet: snippet(e.text, words),
        _rank: inTitle,
      });
    }
    results.sort((a, b) => b._rank - a._rank);
    res.set("Cache-Control", "private, max-age=60");
    res.json({ ok: true, results: results.slice(0, 20).map(({ _rank, ...r }) => r) });
  });

  router.get("/api/gate/notes/:subject", cache, (req, res) => {
    const s = subjectFor(req, req.params.subject);
    if (!s) return fail(res, 404, "Unknown subject");
    res.json({ ok: true, ...s.tree });
  });

  router.get("/api/gate/notes/:subject/:lesson", cache, (req, res) => {
    const s = subjectFor(req, req.params.subject);
    if (!s) return fail(res, 404, "Unknown subject");
    const l = s.lessons.get(req.params.lesson);
    if (!l) return fail(res, 404, "Unknown lesson");
    res.json({ ok: true, subject: s.card, ...l });
  });

  /* ── Per-user study state ── */

  router.get("/api/gate/me/notes-progress", auth, wrap(async (req, res) => {
    const subject = typeof req.query.subject === "string" && req.query.subject ? req.query.subject : null;
    const rows = await all(
      `SELECT subject, lesson, completed, scroll_pct, bookmarked, updated_at FROM gate_notes_progress
       WHERE username=?${subject ? " AND subject=?" : ""} LIMIT 5000`,
      subject ? [req.sessionUser.username, subject] : [req.sessionUser.username],
    );
    const progress = {};
    for (const r of rows) progress[`${r.subject}/${r.lesson}`] = progressShape(r);
    res.json({ ok: true, progress });
  }));

  router.put("/api/gate/me/notes-progress/:subject/:lesson", auth, progressLimit, wrap(async (req, res) => {
    const s = subjectFor(req, req.params.subject);
    if (!s || !s.lessons.has(req.params.lesson)) return fail(res, 404, "Unknown lesson");
    const b = req.body;
    if (!b || typeof b !== "object" || Array.isArray(b)) return fail(res, 400, "Body required");
    const set = {};
    if (b.completed !== undefined) {
      if (typeof b.completed !== "boolean") return fail(res, 400, "completed must be a boolean");
      set.completed = b.completed ? 1 : 0;
    }
    if (b.bookmarked !== undefined) {
      if (typeof b.bookmarked !== "boolean") return fail(res, 400, "bookmarked must be a boolean");
      set.bookmarked = b.bookmarked ? 1 : 0;
    }
    if (b.scrollPct !== undefined) {
      if (typeof b.scrollPct !== "number" || !Number.isFinite(b.scrollPct) || b.scrollPct < 0 || b.scrollPct > 100) {
        return fail(res, 400, "scrollPct must be 0–100");
      }
      set.scroll_pct = Math.round(b.scrollPct);
    }
    const cols = Object.keys(set);
    if (!cols.length) return fail(res, 400, "Nothing to update");
    const now = Date.now();
    const row = { completed: 0, scroll_pct: 0, bookmarked: 0, ...set };
    if (set.completed === 1) row.completed_at = now;
    await run(
      `INSERT INTO gate_notes_progress(username, subject, lesson, completed, scroll_pct, bookmarked, completed_at, updated_at)
       VALUES(?,?,?,?,?,?,?,?)
       ON CONFLICT(username, subject, lesson) DO UPDATE SET
         ${cols.map((c) => `${c}=excluded.${c}`).join(", ")},
         ${set.completed === 1 ? "completed_at=COALESCE(gate_notes_progress.completed_at, excluded.completed_at)," : ""}
         updated_at=excluded.updated_at`,
      [req.sessionUser.username, s.card.id, req.params.lesson, row.completed, row.scroll_pct, row.bookmarked, row.completed_at || null, now],
    );
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createGateNotesRouter, loadGateNotes: load };
