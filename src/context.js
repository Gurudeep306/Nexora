// Per-request "who is this" context.
//
// Progress, submissions, XP, streaks, achievements and settings are stored per
// user. Rather than thread a `username` argument through every helper
// (calcStreak, checkAchievements, …), the current request's user is kept in
// AsyncLocalStorage and read wherever a query needs it.
const { AsyncLocalStorage } = require("node:async_hooks");

const store = new AsyncLocalStorage();

/** Express middleware — must run after the session middleware. */
function requestContext(getUser) {
  return (req, _res, next) => {
    const u = getUser(req);
    // Keep the request's DB accounting (see trackRequest) across the nesting.
    store.run({ username: u?.username || "", acct: store.getStore()?.acct }, next);
  };
}

/** Username of the signed-in user for this request ("" when anonymous). */
function me() {
  return store.getStore()?.username || "";
}

/** Run fn as a specific user (background jobs, scripts, tests). */
function runAs(username, fn) {
  return store.run({ username: username || "" }, fn);
}

/** me() as a safe SQL string literal, for places where a bound ? would
 *  shift the positional parameter order (e.g. inside a JOIN … ON clause). */
function meSql() {
  return `'${me().replace(/'/g, "''")}'`;
}

/** Count one DB round trip against the current request (see DB_QUERY_STATS). */
function countQuery() {
  const s = store.getStore();
  if (s) s.dbq = (s.dbq || 0) + 1;
}

/**
 * DB_STATS: open an accounting scope for the whole request (before the
 * session is loaded), so its session/access queries are attributed too.
 */
function trackRequest(makeAcct) {
  return (req, res, next) => store.run({ username: "", acct: makeAcct(req, res) }, next);
}

/** The current request's accounting object (DB_STATS), if any. */
function currentAcct() {
  return store.getStore()?.acct || null;
}

/** Number of DB round trips the current request has made so far. */
function queryCount() {
  return store.getStore()?.dbq || 0;
}

module.exports = { requestContext, me, meSql, runAs, countQuery, queryCount, trackRequest, currentAcct };
