// Small in-process cache for site-wide read endpoints (leaderboards, trends,
// announcements…), the same answer for every visitor.
//
// Entries expire after `ttlMs`. A write through db.run to one of `tables`
// marks entries stale: a stale entry is recomputed on the next read once it is
// `minAgeMs` old — so a busy site recomputes a leaderboard at most once per
// `minAgeMs` however many solves land, and a quiet one sees a change at once.
// Concurrent readers share one computation.
const { onWrite } = require("./db");

const caches = [];

function tableWriteRe(tables) {
  return new RegExp(
    `^\\s*(?:INSERT|REPLACE|UPDATE|DELETE|WITH)\\b[\\s\\S]*?\\b(?:INTO|UPDATE|FROM)\\s+["\`]?(?:${tables.join("|")})["\`]?(?![\\w])`,
    "i",
  );
}

function sharedCache({ name, ttlMs, minAgeMs = 0, tables = [], max = 200 }) {
  const entries = new Map(); // key -> { at, promise, stale }
  if (tables.length) {
    onWrite(tableWriteRe(tables), () => {
      for (const e of entries.values()) e.stale = true;
    });
  }
  const cache = {
    name,
    /** The cached value for `key`, computing it with `fn` when missing/expired. */
    get(key, fn) {
      const e = entries.get(key);
      const now = Date.now();
      if (e && now - e.at < (e.stale ? minAgeMs : ttlMs)) return e.promise;
      const promise = Promise.resolve().then(fn);
      entries.set(key, { at: now, promise, stale: false });
      promise.catch(() => {
        if (entries.get(key)?.promise === promise) entries.delete(key);
      });
      if (entries.size > max) entries.delete(entries.keys().next().value);
      return promise;
    },
    clear() {
      entries.clear();
    },
    size: () => entries.size,
  };
  caches.push(cache);
  return cache;
}

/** Drop every shared cache (tests, admin tools). */
function clearAll() {
  for (const c of caches) c.clear();
}

module.exports = { sharedCache, clearAll, tableWriteRe };
