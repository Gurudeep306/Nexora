// express-session store backed by the app database (local SQLite or Turso).
//
// The default MemoryStore forgets every login whenever the server restarts —
// and free hosts restart/sleep often — so sessions live in the `sessions`
// table instead. Writes are throttled: an unchanged session only has its
// expiry refreshed at most once per TOUCH_INTERVAL, which keeps the free
// database's monthly write quota for real data.
const session = require("express-session");
const { run, get } = require("./db");

const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const USER_ROW_MAX_AGE_MS = 5000;
const SESSION_WITH_USER_SQL = `SELECT s.sess, s.expires,
    json_extract(s.sess, '$.user.username') AS sess_user,
    u.role AS user_role, (u.username IS NOT NULL) AS user_found
  FROM sessions s
  LEFT JOIN users u ON u.username = json_extract(s.sess, '$.user.username')
  WHERE s.sid=?`;

class DbSessionStore extends session.Store {
  constructor({ ttlMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
    super();
    this.ttlMs = ttlMs;
    this.lastTouch = new Map();
    this.userRows = new Map(); // sid -> { username, row, at } (see takeUserRow)
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

  expiryOf(sess) {
    const exp = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : NaN;
    return Number.isFinite(exp) ? exp : Date.now() + this.ttlMs;
  }

  get(sid, cb) {
    this.ready
      .then(() =>
        // The signed-in user's current role is read in the SAME round trip
        // (authz re-checks it on every request — see takeUserRow), so a
        // request pays one DB round trip before its handler instead of two.
        get(SESSION_WITH_USER_SQL, [sid]).catch(() =>
          get("SELECT sess, expires FROM sessions WHERE sid=?", [sid]),
        ),
      )
      .then((row) => {
        if (!row) return cb(null, null);
        if (row.expires <= Date.now()) {
          this.destroy(sid, () => {});
          return cb(null, null);
        }
        if (row.sess_user != null) {
          this.userRows.set(sid, {
            username: row.sess_user,
            row: row.user_found ? { role: row.user_role } : null,
            at: Date.now(),
          });
        }
        cb(null, JSON.parse(row.sess));
      })
      .catch((e) => cb(e));
  }

  /**
   * The `users` row (just `{ role }`, or null when the account no longer
   * exists) read alongside this request's session, if it was for `username`
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
    this.lastTouch.set(sid, Date.now());
    this.ready
      .then(() =>
        run(
          `INSERT INTO sessions(sid, sess, expires) VALUES(?,?,?)
           ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess, expires=excluded.expires`,
          [sid, JSON.stringify(sess), this.expiryOf(sess)],
        ),
      )
      .then(() => cb(null))
      .catch((e) => cb(e));
  }

  touch(sid, sess, cb = () => {}) {
    const last = this.lastTouch.get(sid) || 0;
    if (Date.now() - last < TOUCH_INTERVAL_MS) return cb(null);
    this.lastTouch.set(sid, Date.now());
    this.ready
      .then(() => run("UPDATE sessions SET expires=? WHERE sid=?", [this.expiryOf(sess), sid]))
      .then(() => cb(null))
      .catch((e) => cb(e));
  }

  destroy(sid, cb = () => {}) {
    this.lastTouch.delete(sid);
    this.ready
      .then(() => run("DELETE FROM sessions WHERE sid=?", [sid]))
      .then(() => cb(null))
      .catch((e) => cb(e));
  }

  prune() {
    this.ready
      .then(() => run("DELETE FROM sessions WHERE expires <= ?", [Date.now()]))
      .catch(() => {});
    // Forget touch timestamps older than the throttle window.
    const cutoff = Date.now() - TOUCH_INTERVAL_MS;
    for (const [sid, t] of this.lastTouch) if (t < cutoff) this.lastTouch.delete(sid);
    const rowCutoff = Date.now() - USER_ROW_MAX_AGE_MS;
    for (const [sid, e] of this.userRows) if (e.at < rowCutoff) this.userRows.delete(sid);
  }
}

module.exports = { DbSessionStore };
