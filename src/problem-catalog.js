// In-memory copy of the `problems` table.
//
// The problem catalog (~28k Codeforces/CodeChef rows) only changes when a sync
// or the Studio editor writes to it, yet the Nexus pages used to re-scan it
// with ~100 `tags LIKE '%…%'` queries per request — every one a full table
// scan and, on Turso, a separate network round trip returning thousands of
// rows. Instead the catalog is read once, kept in memory and filtered in JS.
//
// Freshness: every write to `problems` made through db.run/runMany bumps a
// version (see db.onWrite), which forces a reload on the next read; a TTL
// covers out-of-process edits (scripts run against the same database).
const { all, onWrite } = require("./db");

const TTL_MS = 10 * 60 * 1000;
const PROBLEM_WRITE =
  /^\s*(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|ALTER\s+TABLE)\s+["`]?problems["`]?(?![\w])/i;

let version = 0;
let cache = null; // { version, loadedAt, rows, lowerTags, byId, pools }
let loading = null; // { version, promise }

onWrite(PROBLEM_WRITE, () => {
  version++;
});

async function load() {
  const v = version;
  const rows = await all(
    "SELECT id, problem_id, title, rating, platform, tags, url FROM problems ORDER BY id",
  );
  const lowerTags = rows.map((r) => (r.tags == null ? null : String(r.tags).toLowerCase()));
  const byId = new Map(rows.map((r, i) => [r.id, i]));
  return { version: v, loadedAt: Date.now(), rows, lowerTags, byId, pools: new Map() };
}

/** The current catalog — loads (once, shared by concurrent callers) when stale. */
async function getCatalog() {
  if (cache && cache.version === version && Date.now() - cache.loadedAt < TTL_MS) return cache;
  if (!loading || loading.version !== version) {
    const v = version;
    const promise = load().then(
      (c) => {
        if (!cache || c.loadedAt >= cache.loadedAt) cache = c;
        if (loading?.promise === promise) loading = null;
        return c;
      },
      (err) => {
        if (loading?.promise === promise) loading = null;
        throw err;
      },
    );
    loading = { version: v, promise };
  }
  return loading.promise;
}

/** Drop the cached catalog (tests). */
function invalidateCatalog() {
  version++;
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

module.exports = { getCatalog, topicPool, invalidateCatalog, PROBLEM_WRITE };
