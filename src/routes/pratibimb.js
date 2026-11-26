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
//   PUT    /api/pratibimb/models/:id/files/:kind   add a photo (?shot=front…), a voice clip, the consent
//                                                   video or an optional capture video (raw body, streamed)
//   POST   /api/pratibimb/models/:id/link          a one-time phone link (/pratibimb/capture/<token>, 2 hours)
//   GET    /api/pratibimb/device/:token            the phone: which shots are done
//   PUT    /api/pratibimb/device/:token/files/:kind  the phone adds a photo or video (same rules)
//   DELETE /api/pratibimb/models/:id/files/:name   remove one file before building
//   POST   /api/pratibimb/models/:id/build         queue the build (height, body, style)
//   GET    /api/pratibimb/models/:id/model.vrm     the finished model (the person only)
//   GET    /api/pratibimb/models/:id/pack          download the identity pack (.pbpack), reusable on any account
//   POST   /api/pratibimb/import                   a new model from a pack (raw body; ?permission=1)
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
const { checkPack } = require("../pratibimb/pack");

const DIR = process.env.PRATIBIMB_DIR || path.join(__dirname, "..", "..", "data", "pratibimb");
const KINDS = {
  photo: { max: 24, bytes: 15 * 1024 * 1024, types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } },
  voice: { max: 8, bytes: 12 * 1024 * 1024, types: { "audio/wav": "wav", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3" } },
  consent: { max: 1, bytes: 40 * 1024 * 1024, types: { "video/webm": "webm", "video/mp4": "mp4" } },
  // Optional: a short guided video (turning the head, smiling, speaking) makes the model better.
  video: { max: 3, bytes: 300 * 1024 * 1024, types: { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" } },
};
const SHOT_RE = /^[a-z][a-z0-9-]{1,30}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;
const LINK_TTL_MS = 2 * 60 * 60 * 1000;
const RESULTS = { "model.vrm": 60 * 1024 * 1024, "report.json": 2 * 1024 * 1024, "preview.jpg": 4 * 1024 * 1024, "pack.pbpack": 300 * 1024 * 1024 };
const PACK_BYTES = 300 * 1024 * 1024;
const ID_RE = /^[a-f0-9]{24}$/;
const FILE_RE = /^(photo|voice|consent|video)-[a-f0-9]{8}\.[a-z0-9]{2,4}$/;
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
      await run(`CREATE TABLE IF NOT EXISTS pratibimb_links (
        token TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`);
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

const shotsPath = (id) => path.join(folder(id), "shots.json");
function readShots(id) {
  try {
    return JSON.parse(fs.readFileSync(shotsPath(id), "utf8"));
  } catch {
    return {};
  }
}
function writeShots(id, shots) {
  fs.writeFileSync(shotsPath(id), JSON.stringify(shots));
}

/** Stream a request body to a file in the model's folder, stopping at the kind's size limit. */
function saveUpload(req, row, kindName) {
  const kind = KINDS[kindName];
  if (!kind) bad("Unknown file kind");
  const type = String(req.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = kind.types[type];
  if (!ext) bad("That file type is not supported here.");
  const declared = Number(req.get("content-length") || 0);
  if (declared > kind.bytes) bad("That file is too large.");
  const have = listFiles(row.id).filter((f) => f.startsWith(kindName + "-"));
  if (have.length >= kind.max) bad(`At most ${kind.max} ${kindName} files.`);
  const name = `${kindName}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const dest = path.join(folder(row.id), name);
  const part = dest + ".part";
  return new Promise((resolve, reject) => {
    let size = 0;
    let failed = false;
    const out = fs.createWriteStream(part);
    const fail = (e) => {
      if (failed) return;
      failed = true;
      out.destroy();
      fs.rmSync(part, { force: true });
      reject(e);
    };
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > kind.bytes) {
        req.unpipe(out);
        req.resume();
        fail(new HttpError(400, "That file is too large."));
      }
    });
    req.on("error", fail);
    out.on("error", fail);
    out.on("finish", () => {
      if (failed) return;
      if (!size) {
        fs.rmSync(part, { force: true });
        return reject(new HttpError(400, "Empty file"));
      }
      fs.renameSync(part, dest);
      resolve(name);
    });
    req.pipe(out);
  });
}

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
    subject: (() => {
      try {
        const c = JSON.parse(row.consent || "{}");
        return c.subject === "other" ? { kind: "other", name: c.name || "" } : { kind: "self", name: "" };
      } catch {
        return { kind: "self", name: "" };
      }
    })(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: files.filter((f) => f.startsWith("photo-")),
    voices: files.filter((f) => f.startsWith("voice-")),
    consentVideo: files.some((f) => f.startsWith("consent-")),
    videos: files.filter((f) => f.startsWith("video-")),
    shots: (() => {
      const all_ = readShots(row.id);
      return Object.fromEntries(Object.entries(all_).filter(([f]) => files.includes(f)));
    })(),
    hasModel: files.includes("model.vrm"),
    hasPack: files.includes("pack.pbpack"),
    pack: (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(folder(row.id), "pack.json"), "utf8"));
      } catch {
        return null;
      }
    })(),
    report: report && { stages: report.stages ? Object.fromEntries(Object.entries(report.stages).map(([k, v]) => [k, { note: (v && v.note) || null, seconds: v && Number.isFinite(v.seconds) ? v.seconds : null }])) : {} },
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
    // A model of yourself, or of someone you know who has agreed (they read the consent sentence on
    // camera themselves; the build checks that face against the photos).
    const other = c.subject === "other";
    if (c.adult !== true || c.understood !== true || (other ? c.permission !== true : c.ownFace !== true)) bad("Please confirm all three consent points first.");
    const mine = await all(`SELECT id FROM pratibimb_models WHERE username = ?`, [req.sessionUser.username]);
    if (mine.length >= MAX_MODELS) bad(`You can keep up to ${MAX_MODELS} models. Delete one first.`);
    const id = crypto.randomBytes(12).toString("hex");
    const now = Date.now();
    fs.mkdirSync(folder(id), { recursive: true });
    const consent = other
      ? { subject: "other", name: String(c.name || "").trim().slice(0, 60), adult: true, permission: true, understood: true, sentence: String(c.sentence || "").slice(0, 200), at: now }
      : { subject: "self", adult: true, ownFace: true, understood: true, sentence: String(c.sentence || "").slice(0, 200), at: now };
    await run(`INSERT INTO pratibimb_models (id, username, status, consent, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?, ?)`, [id, req.sessionUser.username, JSON.stringify(consent), now, now]);
    res.json({ ok: true, model: view({ id, username: req.sessionUser.username, status: "draft", consent: JSON.stringify(consent), created_at: now, updated_at: now }) });
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

  async function addFile(req, row) {
    if (row.status !== "draft" && row.status !== "failed") bad("This model is being built. Delete it to start again.");
    const name = await saveUpload(req, row, req.params.kind);
    const shot = String(req.query.shot || "");
    if (req.params.kind === "photo" && SHOT_RE.test(shot)) {
      const shots = readShots(row.id);
      shots[name] = shot;
      writeShots(row.id, shots);
    }
    await run(`UPDATE pratibimb_models SET updated_at = ? WHERE id = ?`, [Date.now(), row.id]);
    return name;
  }

  router.put("/api/pratibimb/models/:id/files/:kind", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    res.json({ ok: true, name: await addFile(req, row) });
  }));

  // --- a phone or tablet adds photos by QR (not signed in: the token stands for this one model) ----
  router.post("/api/pratibimb/models/:id/link", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    const token = crypto.randomBytes(18).toString("base64url");
    const now = Date.now();
    await run(`DELETE FROM pratibimb_links WHERE expires_at < ?`, [now]);
    await run(`INSERT INTO pratibimb_links (token, model_id, username, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`, [token, row.id, row.username, now, now + LINK_TTL_MS]);
    res.json({ ok: true, token, path: `/pratibimb/capture/${token}`, expiresAt: now + LINK_TTL_MS });
  }));

  async function deviceModel(token) {
    if (!TOKEN_RE.test(String(token))) bad("This link is not valid.", 404);
    const link = await get(`SELECT * FROM pratibimb_links WHERE token = ?`, [token]);
    if (!link) bad("This link is not valid.", 404);
    if (link.expires_at < Date.now()) bad("This link has expired. Make a new one on the computer.", 410);
    const row = await get(`SELECT * FROM pratibimb_models WHERE id = ?`, [link.model_id]);
    if (!row || row.username !== link.username) bad("This link is not valid.", 404);
    return row;
  }
  const hits = new Map();
  const deviceLimit = (req, res, next) => {
    const k = String(req.params.token || "");
    const now = Date.now();
    const h = (hits.get(k) || []).filter((t) => now - t < 60 * 1000);
    if (h.length >= 40) return res.status(429).json({ ok: false, error: "Too many requests; wait a minute." });
    h.push(now);
    hits.set(k, h);
    next();
  };

  router.get("/api/pratibimb/device/:token", deviceLimit, wrap(async (req, res) => {
    await ensureTables();
    const row = await deviceModel(req.params.token);
    const v = view(row);
    res.json({ ok: true, model: { photos: v.photos.length, shots: v.shots, videos: v.videos.length, status: v.status } });
  }));

  router.put("/api/pratibimb/device/:token/files/:kind", deviceLimit, wrap(async (req, res) => {
    await ensureTables();
    if (!["photo", "video"].includes(req.params.kind)) bad("Not allowed from a phone link", 403);
    const row = await deviceModel(req.params.token);
    res.json({ ok: true, name: await addFile(req, row) });
  }));

  router.delete("/api/pratibimb/models/:id/files/:name", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    if (!FILE_RE.test(req.params.name)) bad("Not found", 404);
    fs.rmSync(path.join(folder(row.id), req.params.name), { force: true });
    const shots = readShots(row.id);
    if (shots[req.params.name]) {
      delete shots[req.params.name];
      writeShots(row.id, shots);
    }
    res.json({ ok: true });
  }));

  router.post("/api/pratibimb/models/:id/build", ...user, express.json({ limit: "4kb" }), wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    const files = listFiles(row.id);
    const hasPack = files.includes("pack.pbpack");
    if (!hasPack && files.filter((f) => f.startsWith("photo-")).length < 3) bad("Add at least 3 photos first.");
    if (!hasPack && !files.some((f) => f.startsWith("consent-"))) bad("Record the consent sentence first.");
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

  router.get("/api/pratibimb/models/:id/pack", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    const p = path.join(folder(row.id), "pack.pbpack");
    if (!fs.existsSync(p)) bad("The pack is made during the build. Build the model first.", 404);
    res.set("Cache-Control", "private, no-store");
    res.attachment(`pratibimb-${row.id.slice(0, 8)}.pbpack`);
    res.type("application/zip").sendFile(p);
  }));

  // A model from a pack made earlier (on this account or another). The pack carries the person's consent
  // record; whoever imports it confirms they have that person's permission to use it here too.
  router.post("/api/pratibimb/import", ...user, express.raw({ type: () => true, limit: PACK_BYTES }), wrap(async (req, res) => {
    await ensureTables();
    if (req.query.permission !== "1") bad("Confirm you have this person's permission to use their pack.");
    const mine = await all(`SELECT id FROM pratibimb_models WHERE username = ?`, [req.sessionUser.username]);
    if (mine.length >= MAX_MODELS) bad(`You can keep up to ${MAX_MODELS} models. Delete one first.`);
    if (!Buffer.isBuffer(req.body) || !req.body.length) bad("Empty file");
    let checked;
    try {
      checked = checkPack(req.body);
    } catch (e) {
      bad(e.message || "This pack cannot be used.");
    }
    // Only packs made and signed by this site's build machine: an unsigned pack has no proof of where its
    // face and voice came from, so its consent record cannot be trusted.
    if (!checked.signed) bad("This pack was not made by NexoraGuru (no valid signature), so a model cannot be made from it.");
    if (!checked.manifest.consent) bad("This pack has no consent record, so a model cannot be made from it.");
    const id = crypto.randomBytes(12).toString("hex");
    const now = Date.now();
    fs.mkdirSync(folder(id), { recursive: true });
    fs.writeFileSync(path.join(folder(id), "pack.pbpack"), req.body);
    fs.writeFileSync(path.join(folder(id), "pack.json"), JSON.stringify({ ...checked.summary, imported: true }));
    const c = checked.manifest.consent;
    const consent = { subject: "pack", packConsent: { subject: c.subject || null, at: c.at || null, sentence: c.sentence || null }, permission: true, signed: checked.signed, at: now };
    await run(`INSERT INTO pratibimb_models (id, username, status, consent, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?, ?)`, [id, req.sessionUser.username, JSON.stringify(consent), now, now]);
    const row = await get(`SELECT * FROM pratibimb_models WHERE id = ?`, [id]);
    res.json({ ok: true, model: view(row), signed: checked.signed });
  }));

  router.delete("/api/pratibimb/models/:id", ...user, wrap(async (req, res) => {
    await ensureTables();
    const row = await own(req, req.params.id);
    fs.rmSync(folder(row.id), { recursive: true, force: true });
    await run(`DELETE FROM pratibimb_models WHERE id = ?`, [row.id]);
    await run(`DELETE FROM pratibimb_links WHERE model_id = ?`, [row.id]);
    res.json({ ok: true });
  }));

  // --- build worker --------------------------------------------------------------------------------
  router.post("/api/pratibimb/worker/next", workerAuth, wrap(async (_req, res) => {
    await ensureTables();
    const row = await get(`SELECT * FROM pratibimb_models WHERE status = 'queued' ORDER BY updated_at ASC LIMIT 1`);
    if (!row) return res.json({ ok: true, job: null });
    await run(`UPDATE pratibimb_models SET status = 'building', stage = 'starting', updated_at = ? WHERE id = ? AND status = 'queued'`, [Date.now(), row.id]);
    const files = listFiles(row.id).filter((f) => FILE_RE.test(f) || f === "pack.pbpack");
    let consent = null;
    try {
      const c = JSON.parse(row.consent || "{}");
      // The pack keeps who agreed and when (never the account's name or email).
      consent = { subject: c.subject || "self", at: c.at || null, sentence: c.sentence || null, from_pack: c.packConsent || null };
    } catch {
      /* none */
    }
    res.json({ ok: true, job: { id: row.id, options: row.options ? JSON.parse(row.options) : {}, files, shots: readShots(row.id), consent } });
  }));

  router.get("/api/pratibimb/worker/:id/files/:name", workerAuth, wrap(async (req, res) => {
    if (!ID_RE.test(req.params.id) || !(FILE_RE.test(req.params.name) || req.params.name === "pack.pbpack")) bad("Not found", 404);
    const p = path.join(folder(req.params.id), req.params.name);
    if (!fs.existsSync(p)) bad("Not found", 404);
    res.sendFile(p);
  }));

  router.put("/api/pratibimb/worker/:id/result/:name", workerAuth, express.raw({ type: () => true, limit: "301mb" }), wrap(async (req, res) => {
    await ensureTables();
    const max = RESULTS[req.params.name];
    if (!ID_RE.test(req.params.id) || max === undefined) bad("Not found", 404);
    if (!(await get(`SELECT id FROM pratibimb_models WHERE id = ?`, [req.params.id]))) bad("Not found", 404);
    if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > max) bad("Bad file");
    fs.writeFileSync(path.join(folder(req.params.id), req.params.name), req.body);
    if (req.params.name === "pack.pbpack") {
      try {
        fs.writeFileSync(path.join(folder(req.params.id), "pack.json"), JSON.stringify(checkPack(req.body).summary));
      } catch (e) {
        fs.rmSync(path.join(folder(req.params.id), "pack.pbpack"), { force: true });
        bad(`The pack is not valid: ${e.message}`);
      }
    }
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
