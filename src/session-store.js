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

class DbSessionStore extends session.Store {
  constructor({ ttlMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
    super();
    this.ttlMs = ttlMs;
    this.lastTouch = new Map();
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
      .then(() => get("SELECT sess, expires FROM sessions WHERE sid=?", [sid]))
      .then((row) => {
        if (!row) return cb(null, null);
        if (row.expires <= Date.now()) {
          this.destroy(sid, () => {});
          return cb(null, null);
        }
        cb(null, JSON.parse(row.sess));
      })
      .catch((e) => cb(e));
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
  }
}

module.exports = { DbSessionStore };
