// Pratibimb (docs/pratibimb/SPEC.md): a person's own talking model, made from their photos and voice.
//
// Private by design: every file lives on the server's disk under PRATIBIMB_DIR (default
// data/pratibimb, git-ignored), one folder per model, never in the database and never in the repo;
// the database only keeps a small index row. Only the person (and the build worker) can read their
// files, and DELETE removes the folder and the row at once.
//
// While Pratibimb is being built and checked it is for staff with the "ai.manage" permission only
// (PRATIBIMB_OPEN=1 opens it to every signed-in adult once the owner approves).
//
//   POST   /api/pratibimb/models                   start a model (consent answers required)
//   GET    /api/pratibimb/models                   mine
//   GET    /api/pratibimb/models/:id               one: status, files, report
//   PUT    /api/pratibimb/models/:id/files/:kind   add a photo, a voice clip or the consent video (raw body)
//   DELETE /api/pratibimb/models/:id/files/:name   remove one file before building
//   POST   /api/pratibimb/models/:id/build         queue the build (height, body, style)
//   GET    /api/pratibimb/models/:id/model.vrm     the finished model (the person only)
//   DELETE /api/pratibimb/models/:id               delete everything, at once
//
// The build runs on a machine with Blender and the models (scripts/teacher/maker/worker.py), which
// signs in with PRATIBIMB_WORKER_KEY:
//   POST   /api/pratibimb/worker/next                      claim the oldest queued build
//   GET    /api/pratibimb/worker/:id/files/:name           download one input file
//   PUT    /api/pratibimb/worker/:id/result/:name          upload model.vrm, report.json or preview.jpg
//   POST   /api/pratibimb/worker/:id/status                stage, note, done or failed
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { all, get, run } = require("../db");
const { requireAuthenticatedUser } = require("../middleware/auth");
const { requirePerm } = require("../authz/permissions");

const DIR = process.env.PRATIBIMB_DIR || path.join(__dirname, "..", "..", "data", "pratibimb");
const KINDS = {
  photo: { max: 24, bytes: 15 * 1024 * 1024, types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } },
  voice: { max: 8, bytes: 12 * 1024 * 1024, types: { "audio/wav": "wav", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3" } },
  consent: { max: 1, bytes: 40 * 1024 * 1024, types: { "video/webm": "webm", "video/mp4": "mp4" } },
};
const RESULTS = { "model.vrm": 60 * 1024 * 1024, "report.json": 2 * 1024 * 1024, "preview.jpg": 4 * 1024 * 1024 };
const ID_RE = /^[a-f0-9]{24}$/;
const FILE_RE = /^(photo|voice|consent)-[a-f0-9]{8}\.[a-z0-9]{2,4}$/;
const STATUSES = new Set(["draft", "queued", "building", "done", "failed"]);
const MAX_MODELS = 3;

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
    console.error(`[pratibimb] ${req.method} ${req.path}: ${e.message}`);
    if (!res.headersSent) res.status(500).json({ ok: false, error: "Something went wrong" });
  });

let ready = null;
function ensureTables() {
  if (!ready) {
    ready = (async () => {
      fs.mkdirSync(DIR, { recursive: true });
      await run(`CREATE TABLE IF NOT EXISTS pratibimb_models (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        stage TEXT,
        note TEXT,
        options TEXT,
        consent TEXT,
        likeness REAL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
      await run(`CREATE INDEX IF NOT EXISTS pratibimb_models_user ON pratibimb_models(username)`);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const folder = (id) => path.join(DIR, id);
const listFiles = (id) => {
  try {
    return fs.readdirSync(folder(id)).filter((f) => FILE_RE.test(f) || RESULTS[f] !== undefined);
  } catch {
    return [];
  }
};

async function own(req, id) {
  if (!ID_RE.test(id)) bad("Not found", 404);
  const row = await get(`SELECT * FROM pratibimb_models WHERE id = ?`, [id]);
  if (!row || row.username !== req.sessionUser.username) bad("Not found", 404);
  return row;
}

function view(row) {
  const files = listFiles(row.id);
  let report = null;
  try {
    report = JSON.parse(fs.readFileSync(path.join(folder(row.id), "report.json"), "utf8"));
  } catch {
    /* not built yet */
  }
  return {
    id: row.id,
    status: row.status,
    stage: row.stage,
    note: row.note,
    likeness: row.likeness,
    options: row.options ? JSON.parse(row.options) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: files.filter((f) => f.startsWith("photo-")),
    voices: files.filter((f) => f.startsWith("voice-")),
    consentVideo: files.some((f) => f.startsWith("consent-")),
    hasModel: files.includes("model.vrm"),
    report: report && { stages: report.stages ? Object.fromEntries(Object.entries(report.stages).map(([k, v]) => [k, v && v.note])) : {} },
  };
}

function workerAuth(req, res, next) {
  const key = process.env.PRATIBIMB_WORKER_KEY || "";
  const given = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!key || given.length !== key.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key))) {
    return res.status(401).json({ ok: false, error: "Worker key required" });
  }
  next();
}

function createPratibimbRouter() {
  const router = express.Router();
  // Staff only until the owner opens it (PRATIBIMB_OPEN=1).
  const gate = (req, res, next) => (process.env.PRATIBIMB_OPEN === "1" ? next() : requirePerm("ai.manage")(req, res, next));
  const user = [requireAuthenticatedUser, gate];

  router.post("/api/pratibimb/models", ...user, express.json({ limit: "4kb" }), wrap(async (req, res) => {
    await ensureTables();
    const c = req.body?.consent || {};
    if (c.adult !== true || c.ownFace !== true || c.understood !== true) bad("Please confirm all three consent points first.");
    const mine = await all(`SELECT id FROM pratibimb_models WHERE username = ?`, [req.sessionUser.username]);
    if (mine.length >= MAX_MODELS) bad(`You can keep up to ${MAX_MODELS} models. Delete one first.`);
    const id = crypto.randomBytes(12).toString("hex");
    const now = Date.now();
    fs.mkdirSync(folder(id), { recursive: true });
    const consent = { adult: true, ownFace: true, understood: true, sentence: String(c.sentence || "").slice(0, 200), at: now };
    await run(`INSERT INTO pratibimb_models (id, username, status, consent, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?, ?)`, [id, req.sessionUser.username, JSON.stringify(consent), now, now]);
    res.json({ ok: true, model: view({ id, username: req.sessionUser.username, status: "draft", created_at: now, updated_at: now }) });
  }));

  router.get("/api/pratibimb/models", ...user, wrap(async (req, res) => {
    await ensureTables();
    const rows = await all(`SELECT * FROM pratibimb_models WHERE username = ? ORDER BY created_at DESC`, [req.sessionUser.username]);
    res.json({ ok: true, models: rows.map(view) });
  }));

  router.get("/api/pratibimb/models/:id", ...user, wrap(async (req, res) => {
    await ensureTables();
    res.json({ ok: true, model: view(await own(req, req.params.id)) });
  }));

  router.put("/api/pratibimb/models/:id/files/:kind", ...user, express.raw({ type: () => true, limit: "41mb" }), wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    if (row.status !== "draft" && row.status !== "failed") bad("This model is being built. Delete it to start again.");
    const kind = KINDS[req.params.kind];
    if (!kind) bad("Unknown file kind");
    const type = String(req.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = kind.types[type];
    if (!ext) bad("That file type is not supported here.");
    const body = req.body;
    if (!Buffer.isBuffer(body) || !body.length) bad("Empty file");
    if (body.length > kind.bytes) bad("That file is too large.");
    const have = listFiles(row.id).filter((f) => f.startsWith(req.params.kind + "-"));
    if (have.length >= kind.max) bad(`At most ${kind.max} ${req.params.kind} files.`);
    const name = `${req.params.kind}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(folder(row.id), name), body);
    await run(`UPDATE pratibimb_models SET updated_at = ? WHERE id = ?`, [Date.now(), row.id]);
    res.json({ ok: true, name });
  }));

  router.delete("/api/pratibimb/models/:id/files/:name", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    if (!FILE_RE.test(req.params.name)) bad("Not found", 404);
    fs.rmSync(path.join(folder(row.id), req.params.name), { force: true });
    res.json({ ok: true });
  }));

  router.post("/api/pratibimb/models/:id/build", ...user, express.json({ limit: "4kb" }), wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    const files = listFiles(row.id);
    if (files.filter((f) => f.startsWith("photo-")).length < 3) bad("Add at least 3 photos first.");
    if (!files.some((f) => f.startsWith("consent-"))) bad("Record the consent sentence first.");
    const b = req.body || {};
    const options = {
      body: ["female", "male", "neutral"].includes(b.body) ? b.body : "neutral",
      heightCm: Number.isFinite(+b.heightCm) ? Math.min(210, Math.max(130, Math.round(+b.heightCm))) : null,
      style: ["painted", "real", "anime"].includes(b.style) ? b.style : "painted",
      outfit: String(b.outfit || "").slice(0, 40),
    };
    await run(`UPDATE pratibimb_models SET status = 'queued', stage = NULL, note = NULL, options = ?, updated_at = ? WHERE id = ?`, [JSON.stringify(options), Date.now(), row.id]);
    res.json({ ok: true, model: view({ ...row, status: "queued", options: JSON.stringify(options) }) });
  }));

  router.get("/api/pratibimb/models/:id/model.vrm", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    const p = path.join(folder(row.id), "model.vrm");
    if (!fs.existsSync(p)) bad("Not built yet", 404);
    res.set("Cache-Control", "private, no-store");
    res.type("model/gltf-binary").sendFile(p);
  }));

  router.delete("/api/pratibimb/models/:id", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    fs.rmSync(folder(row.id), { recursive: true, force: true });
    await run(`DELETE FROM pratibimb_models WHERE id = ?`, [row.id]);
    res.json({ ok: true });
  }));

  // --- build worker --------------------------------------------------------------------------------
  router.post("/api/pratibimb/worker/next", workerAuth, wrap(async (_req, res) => {
    await ensureTables();
    const row = await get(`SELECT * FROM pratibimb_models WHERE status = 'queued' ORDER BY updated_at ASC LIMIT 1`);
    if (!row) return res.json({ ok: true, job: null });
    await run(`UPDATE pratibimb_models SET status = 'building', stage = 'starting', updated_at = ? WHERE id = ? AND status = 'queued'`, [Date.now(), row.id]);
    res.json({ ok: true, job: { id: row.id, options: row.options ? JSON.parse(row.options) : {}, files: listFiles(row.id).filter((f) => FILE_RE.test(f)) } });
  }));

  router.get("/api/pratibimb/worker/:id/files/:name", workerAuth, wrap(async (req, res) => {
    if (!ID_RE.test(req.params.id) || !FILE_RE.test(req.params.name)) bad("Not found", 404);
    const p = path.join(folder(req.params.id), req.params.name);
    if (!fs.existsSync(p)) bad("Not found", 404);
    res.sendFile(p);
  }));

  router.put("/api/pratibimb/worker/:id/result/:name", workerAuth, express.raw({ type: () => true, limit: "61mb" }), wrap(async (req, res) => {
    await ensureTables();
    const max = RESULTS[req.params.name];
    if (!ID_RE.test(req.params.id) || max === undefined) bad("Not found", 404);
    if (!(await get(`SELECT id FROM pratibimb_models WHERE id = ?`, [req.params.id]))) bad("Not found", 404);
    if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > max) bad("Bad file");
    fs.writeFileSync(path.join(folder(req.params.id), req.params.name), req.body);
    res.json({ ok: true });
  }));

  router.post("/api/pratibimb/worker/:id/status", workerAuth, express.json({ limit: "8kb" }), wrap(async (req, res) => {
    await ensureTables();
    if (!ID_RE.test(req.params.id)) bad("Not found", 404);
    const b = req.body || {};
    const status = STATUSES.has(b.status) ? b.status : "building";
    const likeness = Number.isFinite(+b.likeness) ? +b.likeness : null;
    await run(`UPDATE pratibimb_models SET status = ?, stage = ?, note = ?, likeness = COALESCE(?, likeness), updated_at = ? WHERE id = ?`,
      [status, String(b.stage || "").slice(0, 40) || null, String(b.note || "").slice(0, 300) || null, likeness, Date.now(), req.params.id]);
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createPratibimbRouter, KINDS, RESULTS };
