// "Invite to solve": ask friends or a group to solve a problem with you.
//
// An invite is one problem, the person who sent it, the people invited (the
// sender too, so everyone races on the same clock) and, for each, when they
// first got Accepted after the invite. The card in the chat is built from
// these rows every time it is read, so it always shows who has solved it and
// how long it took. `race` only changes how the card reads ("who's first"):
// the times are real either way, never invented.
//
// Tables: solve_invites, solve_invite_people, solve_invite_messages (the chat
// messages that carry the card, so they can be refreshed when someone solves).
const { run, get, all } = require("./db");

const MAX_PEOPLE = 50;
const OPEN_DAYS = 14; // an Accepted counts for an invite for two weeks
const ph = (n) => Array(n).fill("?").join(",");

let ready = null;
function init() {
  ready ||= (async () => {
    await run(`CREATE TABLE IF NOT EXISTS solve_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id INTEGER NOT NULL,
      inviter TEXT NOT NULL,
      race INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`);
    await run(`CREATE TABLE IF NOT EXISTS solve_invite_people (
      invite_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      solved_at TEXT,
      full INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (invite_id, username)
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_solve_invite_people_user ON solve_invite_people(username, solved_at)");
    await run(`CREATE TABLE IF NOT EXISTS solve_invite_messages (
      invite_id INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      PRIMARY KEY (invite_id, message_id)
    )`);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** Make an invite for `people` (the inviter is added). Returns its id. */
async function create(inviter, problemId, people, { race = false, note = "" } = {}) {
  await init();
  const everyone = [...new Set([inviter, ...people])].slice(0, MAX_PEOPLE + 1);
  const now = new Date().toISOString();
  const r = await run("INSERT INTO solve_invites(problem_id, inviter, race, note, created_at) VALUES(?,?,?,?,?)", [
    Number(problemId),
    inviter,
    race ? 1 : 0,
    String(note || "").slice(0, 200),
    now,
  ]);
  const id = r.lastID;
  // Someone who already solved it before the invite isn't "racing": they show as solved earlier.
  const before = new Map(
    (
      await all(
        `SELECT username, solved_at FROM progress WHERE problem_rowid=? AND status IN ('solved','examples') AND username IN (${ph(everyone.length)})`,
        [Number(problemId), ...everyone],
      )
    ).map((x) => [x.username, x.solved_at]),
  );
  for (const u of everyone) {
    await run("INSERT OR IGNORE INTO solve_invite_people(invite_id, username, solved_at, full) VALUES(?,?,?,?)", [id, u, null, 0]);
    if (before.has(u)) await run("UPDATE solve_invite_people SET solved_at=?, full=-1 WHERE invite_id=? AND username=?", [before.get(u) || now, id, u]);
  }
  return id;
}

async function linkMessage(inviteId, messageId) {
  await init();
  await run("INSERT OR IGNORE INTO solve_invite_messages(invite_id, message_id) VALUES(?,?)", [inviteId, messageId]);
}

/**
 * Someone got Accepted on a problem: mark them in every open invite for it.
 * Returns [{ inviteId, inviter, messageIds, first }] for the ones that changed.
 */
async function markSolved(username, problemId, { full = true } = {}) {
  await init();
  const since = new Date(Date.now() - OPEN_DAYS * 86400000).toISOString();
  const open = await all(
    `SELECT i.id, i.inviter FROM solve_invites i JOIN solve_invite_people p ON p.invite_id = i.id
     WHERE i.problem_id=? AND p.username=? AND p.solved_at IS NULL AND i.created_at >= ?`,
    [Number(problemId), username, since],
  );
  const changed = [];
  const now = new Date().toISOString();
  for (const inv of open) {
    const r = await run("UPDATE solve_invite_people SET solved_at=?, full=? WHERE invite_id=? AND username=? AND solved_at IS NULL", [now, full ? 1 : 0, inv.id, username]);
    if (!r.changes) continue;
    const firstRow = await get(
      "SELECT COUNT(*) AS n FROM solve_invite_people WHERE invite_id=? AND solved_at IS NOT NULL AND full >= 0 AND username <> ?",
      [inv.id, username],
    );
    const messageIds = (await all("SELECT message_id FROM solve_invite_messages WHERE invite_id=?", [inv.id])).map((x) => x.message_id);
    changed.push({ inviteId: inv.id, inviter: inv.inviter, messageIds, first: !firstRow?.n });
  }
  // Passing the examples first and the full check later: the time stays, the mark rises.
  if (full) {
    await run(
      `UPDATE solve_invite_people SET full=1 WHERE username=? AND full=0 AND solved_at IS NOT NULL
       AND invite_id IN (SELECT id FROM solve_invites WHERE problem_id=? AND created_at >= ?)`,
      [username, Number(problemId), since],
    );
  }
  return changed;
}

/**
 * After a judged Accepted: mark the open invites, tell each inviter, and
 * refresh the invite cards for everyone in those chats. Never throws: the
 * submission's own result matters more than the invite's card.
 */
async function afterSolve(realtime, username, problemId, { full = true } = {}) {
  try {
    const changed = await markSolved(username, problemId, { full });
    if (!changed.length) return changed;
    const chat = require("./chat");
    const p = await get("SELECT title FROM problems WHERE id=?", [Number(problemId)]);
    for (const c of changed) {
      const messages = await chat.hydrateIds(c.messageIds);
      for (const message of messages) {
        for (const n of await chat.memberNames(message.conversationId)) {
          realtime?.emitToUser?.(n, "chat:update", { message: await chat.viewFor(n, message) });
        }
      }
      const where = messages.find((m) => m.username === c.inviter)?.conversationId;
      await notify(realtime, c.inviter, username, "invite_solved", { link: where ? `/social?tab=messages&c=${where}` : `/solve/${problemId}`, title: p?.title || "" });
    }
    return changed;
  } catch (e) {
    console.error("[solve-invites] after solve", e.message);
    return [];
  }
}

/** The live state of invites for their cards: id → { startedAt, race, people[] }. */
async function live(ids) {
  const list = [...new Set(ids.map(Number).filter(Boolean))];
  if (!list.length) return new Map();
  await init();
  const inv = await all(`SELECT id, race, created_at, inviter FROM solve_invites WHERE id IN (${ph(list.length)})`, list);
  const people = await all(
    `SELECT p.invite_id, p.username, p.solved_at, p.full, u.display_name, u.avatar, u.avatar_url FROM solve_invite_people p
     LEFT JOIN users u ON u.username = p.username WHERE p.invite_id IN (${ph(list.length)})`,
    list,
  );
  const out = new Map();
  for (const i of inv) out.set(i.id, { startedAt: i.created_at, race: !!i.race, inviter: i.inviter, people: [] });
  for (const p of people) {
    const o = out.get(p.invite_id);
    if (!o) continue;
    o.people.push({
      username: p.username,
      displayName: p.display_name || p.username,
      avatar: p.avatar || null,
      avatarUrl: p.avatar_url || null,
      solvedAt: p.solved_at || null,
      // "earlier": solved before the invite; "examples": only the examples ran.
      how: p.solved_at ? (p.full === -1 ? "earlier" : p.full ? "solved" : "examples") : null,
    });
  }
  for (const o of out.values()) {
    // Solved in the race first, by time; then those who solved it before; then the rest.
    const rank = (x) => (x.how === "earlier" ? 1 : x.solvedAt ? 0 : 2);
    o.people.sort((a, b) => rank(a) - rank(b) || String(a.solvedAt || "").localeCompare(String(b.solvedAt || "")) || a.username.localeCompare(b.username));
  }
  return out;
}

/**
 * A bell notification about an invite ("invite_solve", "invite_solved"),
 * skipped for blocked or muted pairs like every social notification.
 * `ref` is { link, title }: where it opens (a path on this site) and the problem.
 */
async function notify(realtime, recipient, actor, type, ref) {
  if (!recipient || !actor || recipient === actor) return;
  try {
    const skip = await get(
      `SELECT 1 AS x WHERE EXISTS (SELECT 1 FROM social_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?))
          OR EXISTS (SELECT 1 FROM social_mutes WHERE muter=? AND muted=?)`,
      [recipient, actor, actor, recipient, recipient, actor],
    );
    if (skip) return;
    await run("INSERT INTO social_notifications(username, actor, type, post_id, comment_id, created_at, ref) VALUES(?,?,?,?,?,?,?)", [
      recipient,
      actor,
      type,
      null,
      null,
      Date.now(),
      JSON.stringify({ link: String(ref?.link || ""), title: String(ref?.title || "").slice(0, 140) }),
    ]);
    realtime?.emitToUser?.(recipient, "social:notification", { type, actor, post_id: null });
  } catch (e) {
    console.error("[solve-invites] notify", e.message); // a missing bell never blocks the invite
  }
}

module.exports = { init, create, linkMessage, markSolved, afterSolve, live, notify, MAX_PEOPLE, OPEN_DAYS };
