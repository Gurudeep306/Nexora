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
    store.run({ username: u?.username || "" }, next);
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

module.exports = { requestContext, me, meSql, runAs };
