// Shared project memory and personal facts: one place that writes them, so a
// fact learned twice is kept once.
const { get, run, newId, now } = require("./db");

// Matches SQLite's lower(trim(x)) on the stored side.
const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * Save a project note. A note with the same title (ignoring case and spacing)
 * is updated in place — it keeps its pin and moves to the top as newest —
 * instead of adding a second copy. Returns { id, updated }.
 */
async function rememberProject(projectId, title, body, author, { pinned = false } = {}) {
  const t = String(title || "").trim().slice(0, 120);
  const b = String(body || "").trim().slice(0, 1500);
  const same = await get("SELECT id, pinned FROM hive_memory WHERE project_id=? AND lower(trim(title))=? LIMIT 1", [projectId, norm(t)]);
  if (same) {
    await run("UPDATE hive_memory SET body=?, author=?, pinned=?, created_at=? WHERE id=?", [b, author, same.pinned || (pinned ? 1 : 0), now(), same.id]);
    return { id: same.id, updated: true };
  }
  const id = newId("mem");
  await run("INSERT INTO hive_memory(id, project_id, title, body, author, pinned, created_at) VALUES(?,?,?,?,?,?,?)", [id, projectId, t, b, author, pinned ? 1 : 0, now()]);
  return { id, updated: false };
}

/** Save a fact about a person; the same fact again is not added twice. */
async function rememberPerson(username, fact, source) {
  const f = String(fact || "").trim().slice(0, 400);
  const same = await get("SELECT id FROM hive_user_memory WHERE username=? AND lower(trim(fact))=? LIMIT 1", [username, norm(f)]);
  if (same) return { id: same.id, updated: true };
  const id = newId("um");
  await run("INSERT INTO hive_user_memory(id, username, fact, source, created_at) VALUES(?,?,?,?,?)", [id, username, f, source, now()]);
  return { id, updated: false };
}

module.exports = { rememberProject, rememberPerson };
