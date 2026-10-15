// Generic content registry for reports and moderation.
//
// Reports and removals are keyed by (content_type, content_id), so any feature
// can plug in: register its type here (or call registerContentType() from the
// feature's own module) and moderators can remove / restore it. Types with a
// table get their text swapped for a placeholder (the original is kept in
// moderated_content for restore); types without one (e.g. future posts that
// render their own "removed" state) just record the removal — the feature asks
// isRemoved() / removedIds().
const { all, get, run } = require("../db");

const REMOVED_TEXT = "[removed by a moderator]";

const TYPES = new Map();

/**
 * @param {string} name   content_type ("post", "comment", "message", …)
 * @param {{table?: string, id?: string, text?: string, owner?: string, label?: string}} def
 */
function registerContentType(name, def = {}) {
  TYPES.set(name, { label: def.label || name, ...def });
}

registerContentType("message", { table: "messages", id: "id", text: "content", owner: "from_user", label: "Direct message" });
registerContentType("room_message", { table: "room_messages", id: "id", text: "content", owner: "username", label: "Room message" });
registerContentType("profile", { table: "users", id: "username", text: "bio", owner: "username", label: "Profile bio" });
registerContentType("custom_problem", { table: "custom_problems", id: "id", text: "statement", owner: "creator", label: "Workshop problem" });
// The social feed (next) — no table yet; removal state only.
registerContentType("post", { label: "Post" });
registerContentType("comment", { label: "Comment" });

const CONTENT_TYPE_RE = /^[a-z][a-z0-9_]{1,31}$/;
const isValidType = (t) => typeof t === "string" && CONTENT_TYPE_RE.test(t);
const isValidId = (id) => (typeof id === "string" || typeof id === "number") && String(id).length > 0 && String(id).length <= 128;

/** The content's text and author, when the type has a table. */
async function lookupContent(type, id) {
  const def = TYPES.get(type);
  if (!def?.table) return null;
  return get(`SELECT ${def.text} AS text, ${def.owner} AS owner FROM ${def.table} WHERE ${def.id} = ?`, [String(id)]);
}

async function isRemoved(type, id) {
  return !!(await get("SELECT 1 AS x FROM moderated_content WHERE content_type=? AND content_id=?", [type, String(id)]));
}

/** Which of `ids` are removed — one query for a whole page of content. */
async function removedIds(type, ids) {
  if (!ids.length) return new Set();
  const rows = await all(
    `SELECT content_id FROM moderated_content WHERE content_type=? AND content_id IN (${ids.map(() => "?").join(",")})`,
    [type, ...ids.map(String)],
  );
  return new Set(rows.map((r) => r.content_id));
}

async function removeContent(type, id, { by, reason = "" }) {
  const def = TYPES.get(type);
  id = String(id);
  if (await isRemoved(type, id)) return { changed: false };
  const current = def?.table ? await lookupContent(type, id) : null;
  if (def?.table && !current) return { notFound: true };
  await run(
    "INSERT INTO moderated_content(content_type, content_id, original, reason, removed_by, removed_at) VALUES(?,?,?,?,?,?)",
    [type, id, current ? current.text : null, reason, by, Date.now()],
  );
  if (def?.table) {
    // A profile's bio is cleared rather than replaced with the placeholder.
    const replacement = type === "profile" ? "" : REMOVED_TEXT;
    await run(`UPDATE ${def.table} SET ${def.text} = ? WHERE ${def.id} = ?`, [replacement, id]);
  }
  return { changed: true, owner: current?.owner || null, before: current?.text ?? null };
}

async function restoreContent(type, id) {
  const def = TYPES.get(type);
  id = String(id);
  const row = await get("SELECT original FROM moderated_content WHERE content_type=? AND content_id=?", [type, id]);
  if (!row) return { changed: false };
  if (def?.table && row.original != null) {
    await run(`UPDATE ${def.table} SET ${def.text} = ? WHERE ${def.id} = ?`, [row.original, id]);
  }
  await run("DELETE FROM moderated_content WHERE content_type=? AND content_id=?", [type, id]);
  return { changed: true };
}

function contentTypes() {
  return [...TYPES.entries()].map(([key, d]) => ({ key, label: d.label, stored: !!d.table }));
}

module.exports = {
  REMOVED_TEXT,
  contentTypes,
  isRemoved,
  isValidId,
  isValidType,
  lookupContent,
  registerContentType,
  removeContent,
  removedIds,
  restoreContent,
};
