// Persists user uploads (avatars, Studio/ExplainLab media) in the database.
//
// Free hosts give you a throwaway disk: everything under public/uploads is
// deleted on every restart or redeploy. Each uploaded file is therefore also
// saved to the database in 256 KB chunks. When a request for /uploads/... hits
// a file that is no longer on disk, it is restored from the database, cached
// back to disk, and served. Locally (on your Mac) this is a harmless backup.
const fs = require("fs");
const path = require("path");
const { run, get, all, runMany } = require("./db");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const CHUNK = 256 * 1024;
const MAX_BYTES = (Number(process.env.UPLOAD_PERSIST_MAX_MB) || 50) * 1024 * 1024;

const MIME = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
};

let ready = null;
function init() {
  if (!ready) {
    ready = run(`CREATE TABLE IF NOT EXISTS uploads (
        path TEXT PRIMARY KEY,
        size INTEGER NOT NULL,
        chunks INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`)
      .then(() => run(`CREATE TABLE IF NOT EXISTS upload_chunks (
        path TEXT NOT NULL,
        idx INTEGER NOT NULL,
        data BLOB NOT NULL,
        PRIMARY KEY (path, idx)
      )`))
      .catch((e) => console.error("[uploads] table init failed:", e.message));
  }
  return ready;
}

/** "/uploads/studio/a.png" → safe relative key "studio/a.png" (or null). */
function keyFromUrl(url) {
  let rel;
  try {
    rel = decodeURIComponent(String(url).split("?")[0]);
  } catch {
    return null;
  }
  rel = rel.replace(/^\/+/, "").replace(/^uploads\//, "");
  const norm = path.posix.normalize(rel);
  if (!norm || norm.startsWith("..") || norm.includes("\0")) return null;
  return norm;
}

/** Save a file that was just written under public/uploads (by URL like /uploads/x.png). */
async function persistUpload(url, absPath) {
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await init();
    const data = fs.readFileSync(absPath || path.join(UPLOADS_DIR, key));
    if (data.length > MAX_BYTES) {
      console.warn(`[uploads] ${key} is ${(data.length / 1048576).toFixed(1)} MB — over UPLOAD_PERSIST_MAX_MB, not persisted`);
      return;
    }
    const parts = [];
    for (let i = 0; i * CHUNK < data.length || i === 0; i++) {
      parts.push([key, i, data.subarray(i * CHUNK, (i + 1) * CHUNK)]);
    }
    await run("DELETE FROM upload_chunks WHERE path=?", [key]);
    await runMany("INSERT INTO upload_chunks(path, idx, data) VALUES(?,?,?)", parts, 8);
    await run(
      `INSERT INTO uploads(path, size, chunks) VALUES(?,?,?)
       ON CONFLICT(path) DO UPDATE SET size=excluded.size, chunks=excluded.chunks`,
      [key, data.length, parts.length],
    );
  } catch (e) {
    console.error(`[uploads] could not persist ${key}:`, e.message);
  }
}

async function removeUpload(url) {
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await init();
    await run("DELETE FROM upload_chunks WHERE path=?", [key]);
    await run("DELETE FROM uploads WHERE path=?", [key]);
  } catch {}
}

/** List persisted uploads under a folder, e.g. listUploads("studio"). */
async function listUploads(folder) {
  await init();
  const rows = await all(
    "SELECT path FROM uploads WHERE path LIKE ? ORDER BY created_at DESC",
    [`${folder.replace(/\/$/, "")}/%`],
  );
  return rows.map((r) => r.path.slice(folder.length + 1)).filter((n) => n && !n.includes("/"));
}

/** Express middleware: restore /uploads/* files missing from disk. Mount before express.static. */
function restoreUploads() {
  return async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const key = keyFromUrl(req.path);
    if (!key) return next();
    const abs = path.join(UPLOADS_DIR, key);
    if (!abs.startsWith(UPLOADS_DIR + path.sep) || fs.existsSync(abs)) return next();
    try {
      await init();
      const meta = await get("SELECT size, chunks FROM uploads WHERE path=?", [key]);
      if (!meta) return next();
      const chunks = await all("SELECT data FROM upload_chunks WHERE path=? ORDER BY idx", [key]);
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c.data)));
      try {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, buf);
      } catch {}
      res.setHeader("Content-Type", MIME[path.extname(key).toLowerCase()] || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(req.method === "HEAD" ? undefined : buf);
    } catch (e) {
      next();
    }
  };
}

module.exports = { persistUpload, removeUpload, listUploads, restoreUploads, UPLOADS_DIR };
