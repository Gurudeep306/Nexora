// express-session store backed by the app database (local SQLite or Turso).
//
// The default MemoryStore forgets every login whenever the server restarts —
// and free hosts restart/sleep often — so sessions live in the `sessions`
// table instead. Turso bills every row read and written, so the store is
// frugal:
//
//  • Writes only happen when a session changes (sign-in, sign-out, a real
//    change to its data). An unchanged session's expiry (rolling, 7 days) is
//    pushed forward at most once per TOUCH_INTERVAL — judged against the expiry
//    stored in the row, so a restart doesn't trigger a fresh round of writes.
//  • Reads go through a small in-process LRU cache with a short TTL. The
//    signed-in user's role / permissions / ban are read in the same query and
//    cached with it. Everything that changes them in this process invalidates
//    the cache at once: sign-out (destroy), sign-in (set), role / verified
//    changes, permission overrides, bans and force-sign-out (db write hooks).
//    A change made outside the process (a manual DB edit) applies within the
//    TTL. SESSION_CACHE_TTL_MS=0 disables the cache (the default in tests,
//    which edit the database file directly and expect the next request to
//    see it).
//  • A read waits for any write to the same session still in flight.
//    express-session sends the response headers (with the new cookie) before
//    the store's write has finished, so a client that acts on the headers
//    alone (a fetch() that never reads the body, or a page firing its next
//    request at once) could otherwise reach the server before the session
//    row exists and be treated as signed out. express-session calls set()
//    synchronously before it writes anything, so the write is always
//    registered here first. One process holds the sessions (ecosystem
//    config: one instance), so waiting in-process is enough.
const session = require("express-session");
const { run, get, onWrite } = require("./db");
const { ACCESS_COLUMNS } = require("./authz/permissions");

const IS_TEST = process.env.NODE_ENV === "test";
const TOUCH_INTERVAL_MS = Number(process.env.SESSION_TOUCH_INTERVAL_MS) || 6 * 60 * 60 * 1000; // 6 hours
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const USER_ROW_MAX_AGE_MS = 5000;
const CACHE_TTL_MS = Number(process.env.SESSION_CACHE_TTL_MS ?? (IS_TEST ? 0 : 30_000));
const CACHE_MAX = 5000;
// The user's role, permission overrides and any active ban come along too
// (see src/authz/access.js), so access control costs no extra round trip.
const SESSION_WITH_USER_SQL = `SELECT s.sess, s.expires,
    json_extract(s.sess, '$.user.username') AS sess_user,
    ${ACCESS_COLUMNS}, (u.username IS NOT NULL) AS user_found
  FROM sessions s
  LEFT JOIN users u ON u.username = json_extract(s.sess, '$.user.username')
  WHERE s.sid=?`;

// Writes that change who is signed in or what they may do: drop every cached
// session (they are cheap to re-read; these writes are rare).
const ACCESS_WRITE = [
  /\b(user_permissions|user_bans|staff_section_access)\b/i,
  /^\s*DELETE\s+FROM\s+["`]?(users|sessions)["`]?\b/i,
  /^\s*(?:INSERT|REPLACE)\b[\s\S]*?\bINTO\s+["`]?users["`]?\s*\(/i,
  /^\s*UPDATE(?:\s+OR\s+\w+)?\s+["`]?users["`]?\s+SET\b[\s\S]*\b(role|verified|username)\s*=/i,
];
const stores = new Set();
for (const re of ACCESS_WRITE) {
  onWrite(re, () => {
    for (const s of stores) s.clearCache();
  });
}

class DbSessionStore extends session.Store {
  constructor({ ttlMs = 7 * 24 * 60 * 60 * 1000, cacheTtlMs = CACHE_TTL_MS } = {}) {
    super();
    this.ttlMs = ttlMs;
    this.cacheTtlMs = cacheTtlMs;
    this.cache = new Map(); // sid -> { row, at } (LRU by insertion order)
    this.storedExpiry = new Map(); // sid -> expires in the row (ms)
    this.lastTouch = new Map();
    this.userRows = new Map(); // sid -> { username, row, at } (see takeUserRow)
    this.stats = { hits: 0, misses: 0, writes: 0, touchesSkipped: 0 };
    this.gen = 0; // bumped by every invalidation: a read that raced one is not cached
    this.pending = new Map(); // sid -> promise of the write in flight (see track)
    stores.add(this);
    this.ready = run(
      `CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expires INTEGER NOT NULL
      )`,
    )
      .then(() => run("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires)"))
      .catch((e) => console.error("[sessions] table init failed:", e.message));
    this.pruneTimer = setInterval(() => this.prune(), PRUNE_INTERVAL_MS);
    this.pruneTimer.unref?.();
  }

  /** Remember a write to `sid` until it settles, so get() can wait for it. */
  track(sid, p) {
    const done = p.then(
      () => {},
      () => {},
    );
    this.pending.set(sid, done);
    done.then(() => {
      if (this.pending.get(sid) === done) this.pending.delete(sid);
    });
    return p;
  }

  clearCache() {
    this.gen++;
    this.cache.clear();
  }

  expiryOf(sess) {
    const exp = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : NaN;
    return Number.isFinite(exp) ? exp : Date.now() + this.ttlMs;
  }

  cached(sid) {
    if (!(this.cacheTtlMs > 0)) return null;
    const hit = this.cache.get(sid);
    if (!hit) return null;
    if (Date.now() - hit.at > this.cacheTtlMs) {
      this.cache.delete(sid);
      return null;
    }
    // LRU: most recently used last.
    this.cache.delete(sid);
    this.cache.set(sid, hit);
    return hit.row;
  }

  remember(sid, row, gen) {
    if (!(this.cacheTtlMs > 0) || gen !== this.gen) return;
    this.cache.delete(sid);
    this.cache.set(sid, { row, at: Date.now() });
    while (this.cache.size > CACHE_MAX) this.cache.delete(this.cache.keys().next().value);
  }

  get(sid, cb) {
    // A write to this session still in flight: read after it lands.
    const pending = this.pending.get(sid);
    if (pending) return void pending.then(() => this.get(sid, cb));
    const hit = this.cached(sid);
    if (hit !== null) this.stats.hits++;
    const gen = this.gen;
    const rowP = hit !== null
      ? Promise.resolve(hit)
      : this.ready
          .then(() =>
            // The signed-in user's current role is read in the SAME round trip
            // (authz re-checks it on every request — see takeUserRow), so a
            // request pays one DB round trip before its handler instead of two.
            get(SESSION_WITH_USER_SQL, [sid]).catch(() =>
              get("SELECT sess, expires FROM sessions WHERE sid=?", [sid]),
            ),
          )
          .then((row) => {
            this.stats.misses++;
            // A miss is cached too (a stale cookie keeps knocking).
            this.remember(sid, row || false, gen);
            return row || false;
          });
    rowP
      .then((row) => {
        if (!row) return cb(null, null);
        if (row.expires <= Date.now()) {
          this.destroy(sid, () => {});
          return cb(null, null);
        }
        this.storedExpiry.set(sid, Number(row.expires));
        if (row.sess_user != null) {
          this.userRows.set(sid, {
            username: row.sess_user,
            row: row.user_found
              ? { role: row.role, verified: row.verified, perms: row.perms, sections: row.sections, ban: row.ban }
              : null,
            at: Date.now(),
          });
        }
        // A fresh object every time: express-session mutates it.
        cb(null, JSON.parse(row.sess));
      })
      .catch((e) => cb(e));
  }

  /**
   * The `users` access row (`{ role, verified, perms, sections, ban }`, or null when
   * the account no longer exists) read alongside this request's session, if it was for `username`
   * and is only moments old. Consumed on read; undefined when unavailable.
   */
  takeUserRow(sid, username) {
    const hit = this.userRows.get(sid);
    if (!hit) return undefined;
    this.userRows.delete(sid);
    if (hit.username !== username || Date.now() - hit.at > USER_ROW_MAX_AGE_MS) return undefined;
    return hit.row;
  }

  set(sid, sess, cb = () => {}) {
    const expires = this.expiryOf(sess);
    this.lastTouch.set(sid, Date.now());
    this.gen++;
    this.cache.delete(sid);
    this.stats.writes++;
    const write = this.ready
      .then(() =>
        run(
          `INSERT INTO sessions(sid, sess, expires) VALUES(?,?,?)
           ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess, expires=excluded.expires`,
          [sid, JSON.stringify(sess), expires],
        ),
      )
      .then(() => {
        this.storedExpiry.set(sid, expires);
        this.cache.delete(sid); // a read that raced the write may have cached the old row
      });
    this.track(sid, write).then(() => cb(null), (e) => cb(e));
  }

  touch(sid, sess, cb = () => {}) {
    const next = this.expiryOf(sess);
    const stored = this.storedExpiry.get(sid);
    // Only push the expiry forward once it has fallen TOUCH_INTERVAL behind.
    if (stored != null ? next - stored < TOUCH_INTERVAL_MS : Date.now() - (this.lastTouch.get(sid) || 0) < TOUCH_INTERVAL_MS) {
      this.stats.touchesSkipped++;
      return cb(null);
    }
    this.lastTouch.set(sid, Date.now());
    this.storedExpiry.set(sid, next);
    this.stats.writes++;
    this.ready
      .then(() => run("UPDATE sessions SET expires=? WHERE sid=?", [next, sid]))
      .then(() => {
        const hit = this.cache.get(sid);
        if (hit?.row) hit.row = { ...hit.row, expires: next };
        cb(null);
      })
      .catch((e) => cb(e));
  }

  destroy(sid, cb = () => {}) {
    this.lastTouch.delete(sid);
    this.storedExpiry.delete(sid);
    this.gen++;
    this.cache.delete(sid);
    const write = this.ready
      .then(() => run("DELETE FROM sessions WHERE sid=?", [sid]))
      .then(() => {
        this.cache.delete(sid);
      });
    this.track(sid, write).then(() => cb(null), (e) => cb(e));
  }

  prune() {
    this.ready
      .then(() => run("DELETE FROM sessions WHERE expires <= ?", [Date.now()]))
      .catch(() => {});
    // Forget bookkeeping for sessions not seen for a while.
    const cutoff = Date.now() - TOUCH_INTERVAL_MS;
    for (const [sid, t] of this.lastTouch) if (t < cutoff) this.lastTouch.delete(sid);
    const now = Date.now();
    for (const [sid, exp] of this.storedExpiry) if (exp <= now) this.storedExpiry.delete(sid);
    if (this.storedExpiry.size > 50_000) this.storedExpiry.clear();
    const rowCutoff = Date.now() - USER_ROW_MAX_AGE_MS;
    for (const [sid, e] of this.userRows) if (e.at < rowCutoff) this.userRows.delete(sid);
  }
}

module.exports = { DbSessionStore, ACCESS_WRITE, TOUCH_INTERVAL_MS };
