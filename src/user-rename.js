// Moving an account to a new username.
//
// Usernames are the key of everything a user owns (no numeric user id), so a
// rename has to move every row that names the user. A hand-kept table list
// went stale as features were added, and whoever registered the freed old name
// then inherited the leftovers: staff permission grants, bans, private AI chat
// history, notes, social profile and posts. This walks the live schema instead,
// so new tables are covered automatically as long as their user column uses
// one of the names below.
const { all, run } = require("./db");

// Columns that hold a username, anywhere in the schema.
const USER_COLUMNS = new Set([
  "username", "from_user", "to_user", "creator", "created_by", "updated_by",
  "granted_by", "resolved_by", "removed_by", "lifted_by", "reporter",
  "target_user", "actor", "follower", "followee", "blocker", "blocked",
  "muter", "muted", "teacher_id", "user_id",
]);
// Never rewritten here: the users row itself is renamed by the caller, and
// sessions are keyed by session id (the signed-in user is re-stored after).
const SKIP_TABLES = new Set(["users", "sessions"]);

let schemaCache = null;
async function userColumnsBySchema() {
  if (schemaCache) return schemaCache;
  const tables = await all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'",
  );
  const out = [];
  for (const { name } of tables) {
    if (SKIP_TABLES.has(name) || !/^[A-Za-z0-9_]+$/.test(name)) continue;
    const cols = await all(`PRAGMA table_info(${name})`);
    for (const c of cols) if (USER_COLUMNS.has(c.name)) out.push([name, c.name]);
  }
  // The schema only grows at boot, but keep the cache short so a table created
  // lazily (e.g. learn_progress) is picked up.
  schemaCache = out;
  setTimeout(() => (schemaCache = null), 60_000).unref?.();
  return out;
}

/** Point every row that names `from` at `to` (users table excluded). */
async function renameUserEverywhere(from, to) {
  if (!from || !to || from === to) return 0;
  let moved = 0;
  for (const [table, col] of await userColumnsBySchema()) {
    // A row that would collide with one the new name already has (unique keys)
    // is dropped rather than failing the whole rename.
    try {
      await run(`UPDATE OR IGNORE ${table} SET ${col}=? WHERE ${col}=?`, [to, from]);
      await run(`DELETE FROM ${table} WHERE ${col}=?`, [from]);
      moved++;
    } catch (e) {
      console.warn(`[rename] ${table}.${col}: ${e.message}`);
    }
  }
  return moved;
}

module.exports = { renameUserEverywhere, USER_COLUMNS };
