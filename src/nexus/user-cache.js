/*
 * Per-user cache of the GATE study state the Nexus reads (correct PYQs and
 * finished lessons). Two small queries per user, at most once per TTL; any
 * write to that state (an attempt, a lesson marked done) drops the entry, so
 * the Nexus is never stale after you study and Turso stays quiet otherwise.
 */
const TTL_MS = 10 * 60 * 1000;
const MAX_USERS = 500;
const cache = new Map(); // username → { at, value }

function getCached(username) {
  const hit = cache.get(username);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(username);
    return null;
  }
  return hit.value;
}

function setCached(username, value) {
  if (cache.size >= MAX_USERS) cache.delete(cache.keys().next().value);
  cache.set(username, { at: Date.now(), value });
}

function invalidateNexusUser(username) {
  if (username) cache.delete(username);
}

function clearNexusCache() {
  cache.clear();
}

module.exports = { getCached, setCached, invalidateNexusUser, clearNexusCache, TTL_MS };
