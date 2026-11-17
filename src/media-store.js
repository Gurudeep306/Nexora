// Statement media that stays put.
//
// Problem statements reference images and diagrams on the judges' own CDNs.
// Those can vanish, move, or start refusing our server (Codeforces sits behind
// Cloudflare), and then a problem whose whole point is its figure becomes
// unreadable. So every statement image the proxy fetches successfully is
// also saved here, in the database (chunked like uploads), and served from
// here ever after. Fetching happens once per image, ever.
//
// Only what the image proxy already allows is stored: raster images, video
// and audio from the judges' hosts (see statement-media.js). A total budget
// (STATEMENT_MEDIA_MAX_MB, default 512) keeps the database bounded; past it,
// new media is still proxied, just not saved.
const crypto = require("crypto");
const { run, get, all, runMany } = require("./db");

const CHUNK = 256 * 1024;
const BUDGET = (Number(process.env.STATEMENT_MEDIA_MAX_MB) || 512) * 1024 * 1024;
const PER_ITEM_MAX = 8 * 1024 * 1024;

let ready = null;
let usedBytes = null; // lazily summed, then tracked
function init() {
  ready ||= (async () => {
    await run(`CREATE TABLE IF NOT EXISTS statement_media (
      key TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      ctype TEXT NOT NULL,
      size INTEGER NOT NULL,
      chunks INTEGER NOT NULL,
      etag TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    )`);
    await run(`CREATE TABLE IF NOT EXISTS statement_media_chunks (
      key TEXT NOT NULL,
      idx INTEGER NOT NULL,
      data BLOB NOT NULL,
      PRIMARY KEY (key, idx)
    )`);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const keyOf = (url) => crypto.createHash("sha1").update(String(url)).digest("hex");

/** The saved copy of `url`, as the image proxy's cache entry, or null. */
async function load(url) {
  await init();
  const key = keyOf(url);
  const meta = await get("SELECT ctype, size, chunks, etag, fetched_at FROM statement_media WHERE key=?", [key]);
  if (!meta) return null;
  const rows = await all("SELECT idx, data FROM statement_media_chunks WHERE key=? ORDER BY idx", [key]);
  if (rows.length !== meta.chunks) return null; // half-written: refetch
  const buf = Buffer.concat(rows.map((r) => Buffer.from(r.data)));
  if (buf.length !== meta.size) return null;
  return { buf, ctype: meta.ctype, etag: meta.etag, at: meta.fetched_at };
}

/** Save a fetched copy (once; within the budget). Never throws. */
async function save(url, entry) {
  try {
    await init();
    if (!entry?.buf?.length || entry.buf.length > PER_ITEM_MAX) return false;
    const key = keyOf(url);
    if (await get("SELECT 1 FROM statement_media WHERE key=?", [key])) return true;
    if (usedBytes == null) usedBytes = Number((await get("SELECT COALESCE(SUM(size),0) AS n FROM statement_media"))?.n || 0);
    if (usedBytes + entry.buf.length > BUDGET) return false;
    const parts = [];
    for (let i = 0; i * CHUNK < entry.buf.length; i++) parts.push([key, i, entry.buf.subarray(i * CHUNK, (i + 1) * CHUNK)]);
    // Chunks first, then the row that makes them visible: a crash leaves no half-image behind.
    await runMany("INSERT OR REPLACE INTO statement_media_chunks(key, idx, data) VALUES(?,?,?)", parts);
    await run("INSERT OR REPLACE INTO statement_media(key, url, ctype, size, chunks, etag, fetched_at) VALUES(?,?,?,?,?,?,?)", [
      key,
      String(url).slice(0, 2000),
      entry.ctype,
      entry.buf.length,
      parts.length,
      entry.etag,
      entry.at || Date.now(),
    ]);
    usedBytes += entry.buf.length;
    return true;
  } catch (e) {
    console.error("[media] save failed:", e.message);
    return false;
  }
}

/** Media URLs in a statement's HTML (img/video/audio/source), absolute https only. */
function mediaUrls(html) {
  const out = new Set();
  const re = /<(?:img|video|audio|source)\b[^>]*?\s(?:src|data-proxy-src|poster)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    let u = m[1].replace(/&amp;/g, "&");
    // Our own proxy URL: the real target is in ?url=
    if (u.startsWith("/api/imgproxy?")) {
      try {
        u = new URL(u, "https://x").searchParams.get("url") || "";
      } catch {
        u = "";
      }
    }
    if (/^https:\/\//i.test(u)) out.add(u);
  }
  return [...out];
}

/** Which of these URLs already have a saved copy (one indexed read per 200). */
async function storedSet(urls) {
  await init();
  const keys = [...new Set(urls.map((u) => keyOf(u)))];
  const have = new Set();
  for (let i = 0; i < keys.length; i += 200) {
    const part = keys.slice(i, i + 200);
    const rows = await all(`SELECT key FROM statement_media WHERE key IN (${part.map(() => "?").join(",")})`, part);
    for (const r of rows) have.add(r.key);
  }
  return new Set(urls.filter((u) => have.has(keyOf(u))));
}

async function stats() {
  await init();
  const r = await get("SELECT COUNT(*) AS n, COALESCE(SUM(size),0) AS bytes FROM statement_media");
  return { items: Number(r?.n || 0), bytes: Number(r?.bytes || 0), budget: BUDGET };
}

module.exports = { load, save, mediaUrls, storedSet, stats, init, keyOf };
