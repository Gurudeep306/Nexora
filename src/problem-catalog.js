// In-memory copy of the `problems` table (the problem catalog).
//
// The catalog (~28k Codeforces/CodeChef/AtCoder/… rows) only changes when a
// sync, an import or the Studio editor writes to it, yet listing, filtering,
// searching, counting and tag lists used to run as SQL over the whole table —
// and on Turso every scanned row is billed as a read (~28k per `COUNT(*)`).
// So the catalog is held in memory and every list/filter/search/sort/count/
// tag/random pick is answered from it; per-user progress is joined from an
// indexed lookup of only that user's rows.
//
// Loading costs ~nothing, too:
//  • `catalog_meta.problems` is a version number bumped by triggers on every
//    INSERT/UPDATE/DELETE of `problems` — whoever makes the change (this
//    server, the scraper, scripts/, a manual edit). Checking it is a 1-row read.
//  • `catalog_snapshot` holds the catalog as compressed JSON in a handful of
//    rows, stamped with the version it was built from. A cold start reads the
//    version and the snapshot (≈5 rows) instead of 28k; only after the
//    catalog really changed does one process rebuild it from `problems`.
//  • Within a process the catalog is loaded once (concurrent callers share
//    the load); the version is re-checked at most every CHECK_MS.
const zlib = require("node:zlib");
const { all, get, runBatch, onWrite } = require("./db");

const IS_TEST = process.env.NODE_ENV === "test";
// How often a read re-checks the version (a 1-row read). Tests write to the
// database file directly and expect the next request to see it.
const CHECK_MS = Number(process.env.CATALOG_CHECK_MS ?? (IS_TEST ? 0 : 5000));
// Without the version table (a bare test database) fall back to a TTL.
const FALLBACK_TTL_MS = 10 * 60 * 1000;
const SNAPSHOT_PART = 400 * 1024; // base64 chars per snapshot row
const COLUMNS = ["id", "platform", "problem_id", "title", "url", "rating", "tags", "category"];

const PROBLEM_WRITE =
  /^\s*(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|ALTER\s+TABLE)\s+["`]?problems["`]?(?![\w])/i;

let localVersion = 0; // bumped by writes made through this process
let cache = null; // see build()
let loading = null; // { localVersion, promise }
let checking = null; // in-flight version check

onWrite(PROBLEM_WRITE, () => {
  localVersion++;
});

/** Schema: version row + triggers + snapshot table (idempotent, from initDb). */
async function initCatalogTables() {
  await runBatch([
    ["CREATE TABLE IF NOT EXISTS catalog_meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)"],
    ["INSERT OR IGNORE INTO catalog_meta(k, v) VALUES('problems', 1)"],
    ["CREATE TABLE IF NOT EXISTS catalog_snapshot (part INTEGER PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL)"],
    [`CREATE TRIGGER IF NOT EXISTS trg_problems_ver_ins AFTER INSERT ON problems
      BEGIN UPDATE catalog_meta SET v = v + 1 WHERE k = 'problems'; END`],
    [`CREATE TRIGGER IF NOT EXISTS trg_problems_ver_upd AFTER UPDATE ON problems
      BEGIN UPDATE catalog_meta SET v = v + 1 WHERE k = 'problems'; END`],
    [`CREATE TRIGGER IF NOT EXISTS trg_problems_ver_del AFTER DELETE ON problems
      BEGIN UPDATE catalog_meta SET v = v + 1 WHERE k = 'problems'; END`],
  ]);
}

/** The stored catalog version, or null when there is no version table. */
async function dbVersion() {
  try {
    const row = await get("SELECT v FROM catalog_meta WHERE k = 'problems'");
    return row ? Number(row.v) : null;
  } catch {
    return null;
  }
}

function build(rows, version) {
  const lowerTags = rows.map((r) => (r.tags == null ? null : String(r.tags).toLowerCase()));
  const byId = new Map(rows.map((r, i) => [r.id, i]));
  return {
    version: localVersion,
    dbVersion: version,
    loadedAt: Date.now(),
    checkedAt: Date.now(),
    rows,
    lowerTags,
    byId,
    pools: new Map(),
    memo: new Map(),
  };
}

async function readSnapshot(version) {
  if (version == null) return null;
  try {
    const parts = await all("SELECT part, version, data FROM catalog_snapshot ORDER BY part");
    if (!parts.length || parts.some((p) => Number(p.version) !== version)) return null;
    const json = zlib.gunzipSync(Buffer.from(parts.map((p) => p.data).join(""), "base64")).toString("utf8");
    const { columns, data } = JSON.parse(json);
    return data.map((vals) => {
      const o = {};
      columns.forEach((c, i) => {
        o[c] = vals[i];
      });
      return o;
    });
  } catch {
    return null;
  }
}

async function writeSnapshot(rows, version) {
  if (version == null) return;
  const data = rows.map((r) => COLUMNS.map((c) => r[c]));
  const b64 = zlib.gzipSync(JSON.stringify({ columns: COLUMNS, data }), { level: 9 }).toString("base64");
  const stmts = [["DELETE FROM catalog_snapshot"]];
  for (let i = 0, part = 0; i < b64.length; i += SNAPSHOT_PART, part++) {
    stmts.push(["INSERT INTO catalog_snapshot(part, version, data) VALUES(?,?,?)", [part, version, b64.slice(i, i + SNAPSHOT_PART)]]);
  }
  await runBatch(stmts);
}

async function load() {
  const version = await dbVersion();
  let rows = await readSnapshot(version);
  if (!rows) {
    // An unpublished NexoraGuru problem keeps its row (submissions point at it) but leaves the catalog.
    // (Filtered here, not in SQL: this one full read stays the plain query tests/db-usage.test.js allows.)
    rows = (await all(`SELECT ${COLUMNS.join(", ")} FROM problems ORDER BY id`)).filter((r) => r.category !== "__hidden");
    // Best effort: the next cold start (any process) reads ~5 rows instead.
    writeSnapshot(rows, version).catch((e) => console.warn("[catalog] snapshot write failed:", e.message));
  }
  return build(rows, version);
}

async function isCurrent(c) {
  if (c.version !== localVersion) return false;
  const age = Date.now() - c.checkedAt;
  if (c.dbVersion == null) return Date.now() - c.loadedAt < FALLBACK_TTL_MS;
  if (age < CHECK_MS) return true;
  checking ||= dbVersion().finally(() => {
    checking = null;
  });
  const v = await checking;
  if (v === c.dbVersion) {
    c.checkedAt = Date.now();
    return true;
  }
  return false;
}

/** The current catalog — loads (once, shared by concurrent callers) when stale. */
async function getCatalog() {
  if (cache && (await isCurrent(cache))) return cache;
  if (!loading || loading.localVersion !== localVersion) {
    const lv = localVersion;
    const promise = load().then(
      (c) => {
        c.version = lv;
        if (!cache || c.loadedAt >= cache.loadedAt) cache = c;
        if (loading?.promise === promise) loading = null;
        return c;
      },
      (err) => {
        if (loading?.promise === promise) loading = null;
        throw err;
      },
    );
    loading = { localVersion: lv, promise };
  }
  return loading.promise;
}

/** Drop the cached catalog (tests). */
function invalidateCatalog() {
  localVersion++;
}

/** Memoise a value derived from one catalog version. */
function memo(catalog, key, fn) {
  if (!catalog.memo.has(key)) catalog.memo.set(key, fn());
  return catalog.memo.get(key);
}

/**
 * SQLite `LIKE` as a JS predicate: `%` and `_` wildcards, ASCII
 * case-insensitive, no escape character. NULL never matches.
 */
function likeMatcher(pattern) {
  const p = String(pattern);
  // Fast path: '%text%' without other wildcards (the common case).
  const inner = p.length >= 2 && p.startsWith("%") && p.endsWith("%") ? p.slice(1, -1) : null;
  const asciiLower = (s) => s.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
  if (inner != null && !/[%_]/.test(inner)) {
    const needle = asciiLower(inner);
    return (v) => v != null && asciiLower(String(v)).includes(needle);
  }
  let src = "";
  for (const ch of p) {
    if (ch === "%") src += "[\\s\\S]*";
    else if (ch === "_") src += "[\\s\\S]";
    else if (/[a-z]/i.test(ch)) src += `[${ch.toLowerCase()}${ch.toUpperCase()}]`;
    else src += ch.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
  }
  const re = new RegExp(`^${src}$`, "u");
  return (v) => v != null && re.test(String(v));
}

/**
 * Indices of catalog rows whose tags contain any of `tags` (case-insensitive
 * substring — the same match as SQL `tags LIKE '%tag%'`) with
 * minR <= rating <= maxR and rating > 0, ordered by rating DESC then id DESC
 * (the order SQLite returns when it walks idx_problems_rating backwards).
 * Memoised per catalog version.
 */
function topicPool(catalog, tags, minR, maxR) {
  const key = `${minR}|${maxR}|${tags.join("\u0000")}`;
  const hit = catalog.pools.get(key);
  if (hit) return hit;
  const needles = tags.map((t) => String(t).toLowerCase());
  const out = [];
  const { rows, lowerTags } = catalog;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].rating;
    if (typeof r !== "number" || !(r > 0) || r < minR || r > maxR) continue;
    const lt = lowerTags[i];
    if (lt == null) continue;
    if (needles.some((n) => lt.includes(n))) out.push(i);
  }
  out.sort((a, b) => rows[b].rating - rows[a].rating || rows[b].id - rows[a].id);
  catalog.pools.set(key, out);
  return out;
}

// SQL comparison semantics: NULL compared with anything is not true.
const num = (v) => (typeof v === "number" ? v : v == null ? null : Number(v));
const ge = (a, b) => a != null && b != null && a >= b;
const le = (a, b) => a != null && b != null && a <= b;

/** Cache key for a filter set (NaN kept distinct from "no filter"). */
function filterKey({ platform, minRating, maxRating, tag, search, exclude } = {}) {
  const n = (v) => (v == null ? "" : Number.isNaN(v) ? "NaN" : String(v));
  return [platform || "", n(minRating), n(maxRating), tag || "", search || "", exclude && exclude.size ? [...exclude].sort().join(",") : ""].join("");
}

/**
 * Row indices matching the /api/problems filters (everything except the
 * per-user status filter). `minRating`/`maxRating` are numbers (NaN = SQL
 * NULL, which matches nothing), `tag`/`search` are raw LIKE needles.
 */
function filterIndices(catalog, { platform, minRating, maxRating, tag, search, exclude } = {}) {
  const key = filterKey({ platform, minRating, maxRating, tag, search, exclude });
  return memo(catalog, `f:${key}`, () => {
    const tagLike = tag ? likeMatcher(`%${tag}%`) : null;
    const searchLike = search ? likeMatcher(`%${search}%`) : null;
    const minR = minRating == null ? null : Number.isNaN(minRating) ? NaN : minRating;
    const maxR = maxRating == null ? null : Number.isNaN(maxRating) ? NaN : maxRating;
    const out = [];
    const { rows } = catalog;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (platform && r.platform !== platform) continue;
      if (exclude && exclude.size && exclude.has(r.platform)) continue;
      if (minR != null && (Number.isNaN(minR) || !ge(num(r.rating), minR))) continue;
      if (maxR != null && (Number.isNaN(maxR) || !le(num(r.rating), maxR))) continue;
      if (tagLike && !tagLike(r.tags)) continue;
      if (searchLike && !searchLike(r.title) && !searchLike(r.problem_id)) continue;
      out.push(i);
    }
    return out;
  });
}

const cmp = (a, b) => {
  // SQLite ordering: NULL < numbers < text.
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const ta = typeof a === "number" ? 0 : 1;
  const tb = typeof b === "number" ? 0 : 1;
  if (ta !== tb) return ta - tb;
  return a < b ? -1 : a > b ? 1 : 0;
};

/**
 * Sort row indices like `ORDER BY [(p.rating = 0),] <col> <dir>` (ties by id,
 * which is the order SQLite's scan feeds the sorter). Memoised.
 */
function sortIndices(catalog, indices, sort, desc, cacheKey) {
  const col = { rating: "rating", title: "title", id: "problem_id" }[sort] || "rating";
  const run_ = () => {
    const { rows } = catalog;
    const dir = desc ? -1 : 1;
    // (p.rating = 0): 1 for unrated, 0 for rated, NULL (first) for a NULL rating.
    const zeroKey = (r) => (r.rating == null ? null : num(r.rating) === 0 ? 1 : 0);
    return [...indices].sort((ia, ib) => {
      const a = rows[ia];
      const b = rows[ib];
      if (col === "rating") {
        const z = cmp(zeroKey(a), zeroKey(b));
        if (z) return z;
      }
      return dir * cmp(col === "rating" ? num(a.rating) : a[col], col === "rating" ? num(b.rating) : b[col]) || a.id - b.id;
    });
  };
  return cacheKey ? memo(catalog, `s:${col}:${desc ? 1 : 0}:${cacheKey}`, run_) : run_();
}

/**
 * The tag list of GET /api/tags: tags of the first 500 distinct non-'[]'
 * tag strings in table order (what `SELECT DISTINCT tags … LIMIT 500` gave).
 */
function tagList(catalog) {
  return memo(catalog, "tags", () => {
    const seen = new Set();
    const tagSet = new Set();
    for (const r of catalog.rows) {
      if (r.tags == null || r.tags === "[]" || seen.has(r.tags)) continue;
      seen.add(r.tags);
      try {
        JSON.parse(r.tags).forEach((t) => tagSet.add(t));
      } catch {}
      if (seen.size >= 500) break;
    }
    return [...tagSet].sort();
  });
}

/** A uniformly random problem with minR <= rating <= maxR and rating > 0. */
function randomPick(catalog, minR, maxR) {
  const pool = memo(catalog, `r:${minR}:${maxR}`, () => {
    const out = [];
    catalog.rows.forEach((r, i) => {
      const v = num(r.rating);
      if (v != null && v > 0 && v >= minR && v <= maxR) out.push(i);
    });
    return out;
  });
  return pool.length ? catalog.rows[pool[Math.floor(Math.random() * pool.length)]] : null;
}

/** Catalog row by id (or undefined). */
function byId(catalog, id) {
  const i = catalog.byId.get(Number(id));
  return i == null ? undefined : catalog.rows[i];
}

module.exports = {
  PROBLEM_WRITE,
  byId,
  filterIndices,
  filterKey,
  getCatalog,
  initCatalogTables,
  invalidateCatalog,
  likeMatcher,
  randomPick,
  sortIndices,
  tagList,
  topicPool,
};
