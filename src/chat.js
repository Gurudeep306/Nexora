// Messages: direct messages and groups (create, invite, roles), read
// receipts, reactions, replies, edits, attachments, search and share cards.
//
// Every read and write checks that the person is a member of the
// conversation; a conversation someone is not in answers "not found", so its
// existence never leaks. Blocking (social_blocks) stops direct messages and
// adding someone to a group, both ways.
//
// The old one-to-one `messages` table is copied in once (chat_meta.migrated),
// and src/server.js sends any message still written the old way here too.
const { run, get, all, runBatch } = require("./db");

const MAX_BODY = 4000;
const MAX_TITLE = 60;
const MAX_GROUP = 50;
const ROLES = ["owner", "admin", "member"];
const PAGE = 50;

class ChatError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new ChatError(status, message);
};
const ph = (n) => Array(n).fill("?").join(",");
const now = () => new Date().toISOString();
const isName = (s) => typeof s === "string" && /^[A-Za-z0-9_.-]{1,40}$/.test(s);

let ready = null;
function init() {
  ready ||= (async () => {
    await run(`CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      title TEXT,
      dm_key TEXT UNIQUE,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      invite_token TEXT UNIQUE
    )`);
    await run(`CREATE TABLE IF NOT EXISTS chat_members (
      conversation_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      last_read_id INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      muted INTEGER NOT NULL DEFAULT 0,
      accepted INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (conversation_id, username)
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(username)");
    await run(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',
      body TEXT NOT NULL DEFAULT '',
      attachment TEXT,
      share TEXT,
      reply_to INTEGER,
      edited_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0,
      pinned_at TEXT,
      pinned_by TEXT,
      forwarded INTEGER NOT NULL DEFAULT 0,
      poll TEXT,
      created_at TEXT NOT NULL
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, id)");
    await run(`CREATE TABLE IF NOT EXISTS chat_reactions (
      message_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      emoji TEXT NOT NULL,
      PRIMARY KEY (message_id, username, emoji)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS chat_poll_votes (
      message_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      option_id INTEGER NOT NULL,
      PRIMARY KEY (message_id, username, option_id)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS chat_saved (
      username TEXT NOT NULL,
      message_id INTEGER NOT NULL,
      saved_at TEXT NOT NULL,
      PRIMARY KEY (username, message_id)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS chat_settings (
      username TEXT PRIMARY KEY,
      who TEXT NOT NULL DEFAULT 'everyone'
    )`);
    await run("CREATE TABLE IF NOT EXISTS chat_meta (k TEXT PRIMARY KEY, v TEXT)");
    await migrateLegacy();
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** Copy the old one-to-one messages in, once. */
async function migrateLegacy() {
  if (await get("SELECT v FROM chat_meta WHERE k='migrated'")) return;
  let rows = [];
  try {
    rows = await all("SELECT id, from_user, to_user, content, read, created_at FROM messages ORDER BY id");
  } catch {
    rows = [];
  }
  for (const m of rows) {
    if (!m.from_user || !m.to_user || m.from_user === m.to_user) continue;
    const conv = await ensureDm(m.from_user, m.to_user, m.created_at);
    const r = await run("INSERT INTO chat_messages(conversation_id, username, kind, body, created_at) VALUES(?,?,?,?,?)", [conv, m.from_user, "text", String(m.content || "").slice(0, MAX_BODY), m.created_at]);
    await run("UPDATE chat_conversations SET last_message_at=? WHERE id=? AND last_message_at < ?", [m.created_at, conv, m.created_at]);
    // The sender has read their own message; the reader, if it was marked read.
    await run("UPDATE chat_members SET last_read_id=MAX(last_read_id, ?) WHERE conversation_id=? AND username=?", [r.lastID, conv, m.from_user]);
    if (m.read) await run("UPDATE chat_members SET last_read_id=MAX(last_read_id, ?) WHERE conversation_id=? AND username=?", [r.lastID, conv, m.to_user]);
  }
  await run("INSERT OR REPLACE INTO chat_meta(k, v) VALUES('migrated', ?)", [now()]);
}

/* ── who may talk to whom ── */

async function userExists(name) {
  return isName(name) && !!(await get("SELECT 1 AS x FROM users WHERE username=?", [name]));
}
async function blocked(a, b) {
  try {
    return !!(await get("SELECT 1 AS x FROM social_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)", [a, b, b, a]));
  } catch {
    return false; // no social tables (very old databases): nothing is blocked
  }
}
/** Who may start a conversation with me: everyone (strangers land in Requests), people I follow, or nobody. */
const WHO = ["everyone", "following", "nobody"];
async function settingsFor(u) {
  const row = await get("SELECT who FROM chat_settings WHERE username=?", [u]);
  return { who: WHO.includes(row?.who) ? row.who : "everyone" };
}
async function setSettings(u, { who }) {
  await init();
  if (!WHO.includes(who)) fail(400, "Choose everyone, people you follow, or nobody");
  await run("INSERT INTO chat_settings(username, who) VALUES(?,?) ON CONFLICT(username) DO UPDATE SET who=excluded.who", [u, who]);
  return { who };
}
async function knows(a, b) {
  // a follows b, or they are friends.
  try {
    if (await get("SELECT 1 AS x FROM social_follows WHERE follower=? AND followee=? AND status='accepted'", [a, b])) return true;
  } catch {}
  try {
    return !!(await get("SELECT 1 AS x FROM friendships WHERE ((from_user=? AND to_user=?) OR (from_user=? AND to_user=?)) AND status='accepted'", [a, b, b, a]));
  } catch {
    return false;
  }
}
/** "ok" (straight in), "request" (waits for them to accept) or a refusal message. */
async function reach(sender, recipient) {
  if (await blocked(sender, recipient)) return { refused: "You can't message this person" };
  const { who } = await settingsFor(recipient);
  if (who === "nobody") return { refused: `${recipient} isn't taking new messages` };
  if (await knows(recipient, sender)) return { ok: true };
  if (who === "following") return { refused: `${recipient} only takes messages from people they follow` };
  return { request: true };
}

async function membership(convId, me) {
  const row = await get(
    `SELECT c.id, c.kind, c.title, c.description, c.invite_token, c.created_by, m.role, m.last_read_id, m.muted, m.accepted FROM chat_members m JOIN chat_conversations c ON c.id = m.conversation_id
     WHERE m.conversation_id=? AND m.username=?`,
    [Number(convId) || 0, me],
  );
  if (!row) fail(404, "Conversation not found");
  return row;
}
async function memberNames(convId) {
  return (await all("SELECT username FROM chat_members WHERE conversation_id=?", [Number(convId)])).map((r) => r.username);
}

/* ── conversations ── */

const dmKey = (a, b) => [a, b].sort().join("|");
async function ensureDm(a, b, at = now(), acceptedB = true) {
  const key = dmKey(a, b);
  const found = await get("SELECT id FROM chat_conversations WHERE dm_key=?", [key]);
  if (found) return found.id;
  await run("INSERT OR IGNORE INTO chat_conversations(kind, dm_key, created_by, created_at, last_message_at) VALUES('dm',?,?,?,?)", [key, a, at, at]);
  const id = (await get("SELECT id FROM chat_conversations WHERE dm_key=?", [key])).id;
  await runBatch([
    ["INSERT OR IGNORE INTO chat_members(conversation_id, username, role, joined_at) VALUES(?,?,?,?)", [id, a, "member", at]],
    ["INSERT OR IGNORE INTO chat_members(conversation_id, username, role, joined_at, accepted) VALUES(?,?,?,?,?)", [id, b, "member", at, acceptedB ? 1 : 0]],
  ]);
  return id;
}

/** Open (or find) the direct conversation with someone. */
async function openDm(me, other) {
  await init();
  if (other === me) fail(400, "That's you");
  if (!(await userExists(other))) fail(404, "No such user");
  if (await blocked(me, other)) fail(403, "You can't message this person");
  const existing = await get("SELECT id FROM chat_conversations WHERE dm_key=?", [dmKey(me, other)]);
  if (existing && (await get("SELECT 1 AS x FROM chat_members WHERE conversation_id=? AND username=?", [existing.id, me]))) return existing.id;
  const r = await reach(me, other);
  if (r.refused) fail(403, r.refused);
  return ensureDm(me, other, now(), !r.request);
}

/** Accept a message request (or a group invite). */
async function accept(me, convId) {
  const m = await membership(convId, me);
  if (!m.accepted) await run("UPDATE chat_members SET accepted=1 WHERE conversation_id=? AND username=?", [m.id, me]);
  if (!m.accepted && m.kind === "group") await systemMessage(m.id, me, "joined the group");
}
/** Decline: it leaves my list quietly (the sender is not told). */
async function decline(me, convId) {
  const m = await membership(convId, me);
  if (m.accepted) fail(400, "That isn't a request");
  await run("DELETE FROM chat_members WHERE conversation_id=? AND username=?", [m.id, me]);
}

async function systemMessage(convId, actor, text) {
  const at = now();
  const r = await run("INSERT INTO chat_messages(conversation_id, username, kind, body, created_at) VALUES(?,?,?,?,?)", [convId, actor, "system", text, at]);
  await run("UPDATE chat_conversations SET last_message_at=? WHERE id=?", [at, convId]);
  return r.lastID;
}

async function checkInvitees(me, names, already = []) {
  const want = [...new Set((Array.isArray(names) ? names : []).map(String))].filter((n) => n !== me && !already.includes(n));
  const out = [];
  for (const n of want) {
    if (!(await userExists(n))) fail(404, `No such user: ${n}`);
    const r = await reach(me, n);
    if (r.refused) fail(403, r.refused.startsWith("You can't") ? `You can't add ${n}` : r.refused.replace("new messages", "group invites"));
    out.push({ username: n, accepted: !r.request });
  }
  return out;
}
const memberRow = (id, n, role, at) => ["INSERT OR IGNORE INTO chat_members(conversation_id, username, role, joined_at, accepted) VALUES(?,?,?,?,?)", [id, n.username, role, at, n.accepted ? 1 : 0]];
const joinedText = (list) => {
  const inn = list.filter((n) => n.accepted).map((n) => n.username);
  const asked = list.filter((n) => !n.accepted).map((n) => n.username);
  return [inn.length ? `added ${inn.join(", ")}` : "", asked.length ? `invited ${asked.join(", ")}` : ""].filter(Boolean).join(" and ");
};

async function createGroup(me, { title, members }) {
  await init();
  const name = String(title || "").trim().slice(0, MAX_TITLE);
  if (!name) fail(400, "Give the group a name");
  const invitees = await checkInvitees(me, members);
  if (!invitees.length) fail(400, "Add at least one person");
  if (invitees.length + 1 > MAX_GROUP) fail(400, `A group can have up to ${MAX_GROUP} people`);
  const at = now();
  const r = await run("INSERT INTO chat_conversations(kind, title, created_by, created_at, last_message_at) VALUES('group',?,?,?,?)", [name, me, at, at]);
  const id = r.lastID;
  await runBatch([
    ["INSERT INTO chat_members(conversation_id, username, role, joined_at) VALUES(?,?,?,?)", [id, me, "owner", at]],
    ...invitees.map((n) => memberRow(id, n, "member", at)),
  ]);
  await systemMessage(id, me, `created the group "${name}"`);
  await systemMessage(id, me, joinedText(invitees));
  return id;
}

const canManage = (role) => role === "owner" || role === "admin";

async function rename(me, convId, title, description) {
  const m = await membership(convId, me);
  if (m.kind !== "group") fail(400, "Only groups have names");
  if (!canManage(m.role)) fail(403, "Only the group's owner and admins can change the group");
  if (title !== undefined) {
    const name = String(title || "").trim().slice(0, MAX_TITLE);
    if (!name) fail(400, "Give the group a name");
    if (name !== m.title) {
      await run("UPDATE chat_conversations SET title=? WHERE id=?", [name, m.id]);
      await systemMessage(m.id, me, `renamed the group to "${name}"`);
    }
  }
  if (description !== undefined) {
    const text = String(description || "").trim().slice(0, 300);
    if (text !== m.description) {
      await run("UPDATE chat_conversations SET description=? WHERE id=?", [text, m.id]);
      await systemMessage(m.id, me, text ? "changed the group's description" : "removed the group's description");
    }
  }
}

async function addMembers(me, convId, names) {
  const m = await membership(convId, me);
  if (m.kind !== "group") fail(400, "Start a group to add more people");
  if (!canManage(m.role)) fail(403, "Only the group's owner and admins can add people");
  const current = await memberNames(m.id);
  const invitees = await checkInvitees(me, names, current);
  if (!invitees.length) fail(400, "They are already in the group");
  if (current.length + invitees.length > MAX_GROUP) fail(400, `A group can have up to ${MAX_GROUP} people`);
  const at = now();
  await runBatch(invitees.map((n) => memberRow(m.id, n, "member", at)));
  await systemMessage(m.id, me, joinedText(invitees));
  return invitees.map((n) => n.username);
}

async function removeMember(me, convId, name) {
  const m = await membership(convId, me);
  if (m.kind !== "group") fail(400, "Not a group");
  if (name === me) return leave(me, convId);
  const target = await get("SELECT role FROM chat_members WHERE conversation_id=? AND username=?", [m.id, name]);
  if (!target) fail(404, "Not in this group");
  // Owners remove anyone; admins remove members only.
  if (!(m.role === "owner" || (m.role === "admin" && target.role === "member"))) fail(403, "You can't remove this person");
  await run("DELETE FROM chat_members WHERE conversation_id=? AND username=?", [m.id, name]);
  await systemMessage(m.id, me, `removed ${name}`);
}

async function setRole(me, convId, name, role) {
  const m = await membership(convId, me);
  if (m.kind !== "group") fail(400, "Not a group");
  if (m.role !== "owner") fail(403, "Only the owner changes roles");
  if (!ROLES.includes(role)) fail(400, "Unknown role");
  if (name === me) fail(400, "Make someone else the owner instead");
  const target = await get("SELECT role FROM chat_members WHERE conversation_id=? AND username=?", [m.id, name]);
  if (!target) fail(404, "Not in this group");
  if (role === "owner") {
    // Handing over: the old owner becomes an admin.
    await runBatch([
      ["UPDATE chat_members SET role='admin' WHERE conversation_id=? AND username=?", [m.id, me]],
      ["UPDATE chat_members SET role='owner' WHERE conversation_id=? AND username=?", [m.id, name]],
    ]);
    await systemMessage(m.id, me, `made ${name} the owner`);
    return;
  }
  await run("UPDATE chat_members SET role=? WHERE conversation_id=? AND username=?", [role, m.id, name]);
  await systemMessage(m.id, me, role === "admin" ? `made ${name} an admin` : `made ${name} a member`);
}

async function leave(me, convId) {
  const m = await membership(convId, me);
  if (m.kind !== "group") fail(400, "You can't leave a direct conversation");
  await run("DELETE FROM chat_members WHERE conversation_id=? AND username=?", [m.id, me]);
  await systemMessage(m.id, me, "left the group");
  if (m.role === "owner") {
    // The longest-serving admin (else member) takes over.
    const next = await get(
      "SELECT username FROM chat_members WHERE conversation_id=? ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, joined_at, username LIMIT 1",
      [m.id],
    );
    if (next) {
      await run("UPDATE chat_members SET role='owner' WHERE conversation_id=? AND username=?", [m.id, next.username]);
      await systemMessage(m.id, next.username, "is now the owner");
    }
  }
}

/* ── people (names and pictures for the client) ── */

async function people(names) {
  const list = [...new Set(names)].filter(Boolean);
  if (!list.length) return {};
  const rows = await all(`SELECT username, display_name, avatar, avatar_url, status, last_seen FROM users WHERE username IN (${ph(list.length)})`, list);
  return Object.fromEntries(rows.map((r) => [r.username, r]));
}

/** My conversations, newest first, each with its members, last message and unread count. */
async function listFor(me) {
  await init();
  const convs = await all(
    `SELECT c.id, c.kind, c.title, c.description, c.created_by, c.last_message_at, m.role, m.last_read_id, m.muted, m.accepted FROM chat_members m
     JOIN chat_conversations c ON c.id = m.conversation_id WHERE m.username=? ORDER BY c.last_message_at DESC, c.id DESC LIMIT 200`,
    [me],
  );
  if (!convs.length) return { conversations: [], people: {} };
  const ids = convs.map((c) => c.id);
  const [members, lasts, unread] = await Promise.all([
    all(`SELECT conversation_id, username, role, last_read_id, accepted FROM chat_members WHERE conversation_id IN (${ph(ids.length)})`, ids),
    all(`SELECT * FROM chat_messages WHERE id IN (SELECT MAX(id) FROM chat_messages WHERE conversation_id IN (${ph(ids.length)}) GROUP BY conversation_id)`, ids),
    all(
      `SELECT cm.conversation_id, COUNT(*) AS n FROM chat_messages cm JOIN chat_members m ON m.conversation_id = cm.conversation_id AND m.username = ?
       WHERE cm.conversation_id IN (${ph(ids.length)}) AND cm.id > m.last_read_id AND cm.username <> ? AND cm.deleted = 0 AND cm.kind <> 'system'
       GROUP BY cm.conversation_id`,
      [me, ...ids, me],
    ),
  ]);
  const byConv = new Map(ids.map((id) => [id, []]));
  // Someone who hasn't accepted yet never shows as having read anything.
  for (const m of members) byConv.get(m.conversation_id)?.push({ username: m.username, role: m.role, lastReadId: m.accepted ? m.last_read_id : 0, invited: !m.accepted });
  const lastBy = new Map(lasts.map((l) => [l.conversation_id, l]));
  const unreadBy = new Map(unread.map((u) => [u.conversation_id, Number(u.n)]));
  const who = await people(members.map((m) => m.username));
  return {
    conversations: convs.map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      role: c.role,
      lastReadId: c.last_read_id,
      muted: !!c.muted,
      request: !c.accepted,
      description: c.description || "",
      lastMessageAt: c.last_message_at,
      members: byConv.get(c.id),
      last: lastBy.has(c.id) ? preview(lastBy.get(c.id)) : null,
      unread: unreadBy.get(c.id) || 0,
    })),
    people: who,
  };
}

async function one(me, convId) {
  const m = await membership(convId, me);
  const members = await all("SELECT username, role, last_read_id, joined_at, accepted FROM chat_members WHERE conversation_id=? ORDER BY joined_at, username", [m.id]);
  return {
    conversation: {
      id: m.id,
      kind: m.kind,
      title: m.title,
      description: m.description || "",
      role: m.role,
      lastReadId: m.last_read_id,
      muted: !!m.muted,
      request: !m.accepted,
      // Only the owner and admins see the invite link.
      inviteToken: canManage(m.role) ? m.invite_token || null : null,
      members: members.map((x) => ({ username: x.username, role: x.role, lastReadId: x.accepted ? x.last_read_id : 0, invited: !x.accepted, joinedAt: x.joined_at })),
    },
    people: await people(members.map((x) => x.username)),
  };
}

/* ── messages ── */

const parse = (s) => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};
function preview(m) {
  return {
    id: m.id,
    username: m.username,
    kind: m.kind,
    body: m.deleted ? "" : String(m.body).slice(0, 140),
    deleted: !!m.deleted,
    attachment: m.deleted ? null : parse(m.attachment)?.kind || null,
    share: m.deleted ? null : parse(m.share)?.type || null,
    poll: m.kind === "poll" && !m.deleted ? String(parse(m.poll)?.question || "").slice(0, 140) : null,
    createdAt: m.created_at,
  };
}
function pollView(p, votes) {
  if (!p) return null;
  return { question: p.question, multi: !!p.multi, closed: !!p.closed, options: p.options.map((o) => ({ id: o.id, text: o.text, voters: votes[o.id] || [] })) };
}

async function hydrate(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const reacts = await all(`SELECT message_id, username, emoji FROM chat_reactions WHERE message_id IN (${ph(ids.length)}) ORDER BY rowid`, ids);
  const replyIds = [...new Set(rows.map((r) => r.reply_to).filter(Boolean))];
  const replies = replyIds.length ? await all(`SELECT * FROM chat_messages WHERE id IN (${ph(replyIds.length)})`, replyIds) : [];
  const replyBy = new Map(replies.map((r) => [r.id, preview(r)]));
  const pollIds = rows.filter((r) => r.kind === "poll").map((r) => r.id);
  const votes = pollIds.length ? await all(`SELECT message_id, username, option_id FROM chat_poll_votes WHERE message_id IN (${ph(pollIds.length)})`, pollIds) : [];
  const votesBy = new Map();
  for (const v of votes) {
    const m = votesBy.get(v.message_id) || {};
    (m[v.option_id] ||= []).push(v.username);
    votesBy.set(v.message_id, m);
  }
  const reactBy = new Map();
  for (const r of reacts) {
    const m = reactBy.get(r.message_id) || {};
    (m[r.emoji] ||= []).push(r.username);
    reactBy.set(r.message_id, m);
  }
  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    username: r.username,
    kind: r.kind,
    body: r.deleted ? "" : r.body,
    attachment: r.deleted ? null : parse(r.attachment),
    share: r.deleted ? null : parse(r.share),
    replyTo: r.reply_to ? replyBy.get(r.reply_to) || { id: r.reply_to, deleted: true } : null,
    reactions: reactBy.get(r.id) || {},
    editedAt: r.edited_at,
    deleted: !!r.deleted,
    forwarded: !!r.forwarded,
    poll: r.kind === "poll" && !r.deleted ? pollView(parse(r.poll), votesBy.get(r.id) || {}) : null,
    pinnedAt: r.pinned_at || null,
    pinnedBy: r.pinned_by || null,
    mentions: r.deleted ? [] : mentionsIn(r.body),
    createdAt: r.created_at,
  }));
}

/** A page of messages, oldest first: the newest, or before/after an id, or around one (for search). */
async function messages(me, convId, { before, after, around, limit } = {}) {
  const m = await membership(convId, me);
  const n = Math.min(Math.max(Number(limit) || PAGE, 1), 100);
  let rows;
  if (around) {
    const at = Number(around);
    const older = await all("SELECT * FROM chat_messages WHERE conversation_id=? AND id<=? ORDER BY id DESC LIMIT ?", [m.id, at, Math.ceil(n / 2)]);
    const newer = await all("SELECT * FROM chat_messages WHERE conversation_id=? AND id>? ORDER BY id ASC LIMIT ?", [m.id, at, Math.floor(n / 2)]);
    rows = [...older.reverse(), ...newer];
  } else if (after) {
    rows = await all("SELECT * FROM chat_messages WHERE conversation_id=? AND id>? ORDER BY id ASC LIMIT ?", [m.id, Number(after), n]);
  } else {
    rows = (await all(`SELECT * FROM chat_messages WHERE conversation_id=? ${before ? "AND id<?" : ""} ORDER BY id DESC LIMIT ?`, before ? [m.id, Number(before), n] : [m.id, n])).reverse();
  }
  const first = rows[0]?.id;
  const older = first ? !!(await get("SELECT 1 AS x FROM chat_messages WHERE conversation_id=? AND id<? LIMIT 1", [m.id, first])) : false;
  const last = rows[rows.length - 1]?.id;
  const newer = last ? !!(await get("SELECT 1 AS x FROM chat_messages WHERE conversation_id=? AND id>? LIMIT 1", [m.id, last])) : false;
  return { messages: await hydrate(rows), more: { older, newer } };
}

/** Only files this site stored for messages (src/routes/chat.js upload). */
function cleanAttachment(a) {
  if (!a || typeof a !== "object") return null;
  const url = String(a.url || "");
  if (!/^\/uploads\/chat\/[a-f0-9]{24}\.(png|jpg|gif|webp|pdf|txt|webm|ogg|m4a|mp3)$/.test(url)) fail(400, "That attachment wasn't uploaded here");
  const kind = /\.(png|jpg|gif|webp)$/.test(url) ? "image" : /\.(webm|ogg|m4a|mp3)$/.test(url) ? "audio" : "file";
  return { url, kind, durationSec: kind === "audio" ? Math.max(0, Math.min(600, Math.round(Number(a.durationSec) || 0))) : undefined, width: Math.max(0, Math.min(20000, Number(a.width) || 0)) || undefined, height: Math.max(0, Math.min(20000, Number(a.height) || 0)) || undefined, name: String(a.name || "file").replace(/[\u0000-\u001f]/g, "").slice(0, 120), size: Math.max(0, Math.min(5e7, Number(a.size) || 0)), type: String(a.type || "").slice(0, 60) };
}

async function send(me, convId, { body, attachment, share, replyTo, forwardedShare } = {}, buildShare, { forwarded = false } = {}) {
  const m = await membership(convId, me);
  if (m.kind === "dm") {
    const [a, b] = String((await get("SELECT dm_key FROM chat_conversations WHERE id=?", [m.id])).dm_key).split("|");
    const other = a === me ? b : a;
    if (await blocked(me, other)) fail(403, "You can't message this person");
    const theirs = await get("SELECT accepted FROM chat_members WHERE conversation_id=? AND username=?", [m.id, other]);
    // Until they accept, a request holds at most 3 messages.
    if (theirs && !theirs.accepted) {
      const sent = await get("SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id=? AND username=? AND kind<>'system'", [m.id, me]);
      if (Number(sent.n) >= 3) fail(429, `Wait for ${other} to accept your message request`);
    }
  }
  // Replying to a request accepts it.
  if (!m.accepted) await accept(me, m.id);
  const text = String(body ?? "").replace(/\r\n/g, "\n").slice(0, MAX_BODY);
  const att = cleanAttachment(attachment);
  // A forwarded card is copied as it was (it was built by the server then).
  let card = forwardedShare && typeof forwardedShare === "object" ? forwardedShare : share ? await buildShare(me, share) : null;
  if (!card && text) {
    // A NexoraGuru link in the text becomes its card (problems and GATE questions).
    const link = linkedShare(text);
    if (link) card = await buildShare(me, link).catch(() => null);
  }
  if (!text.trim() && !att && !card) fail(400, "Write a message first");
  let reply = null;
  if (replyTo) {
    const r = await get("SELECT id FROM chat_messages WHERE id=? AND conversation_id=?", [Number(replyTo), m.id]);
    reply = r ? r.id : null;
  }
  const at = now();
  const r = await run(
    "INSERT INTO chat_messages(conversation_id, username, kind, body, attachment, share, reply_to, forwarded, created_at) VALUES(?,?,?,?,?,?,?,?,?)",
    [m.id, me, "text", text, att ? JSON.stringify(att) : null, card ? JSON.stringify(card) : null, reply, forwarded ? 1 : 0, at],
  );
  await runBatch([
    ["UPDATE chat_conversations SET last_message_at=? WHERE id=?", [at, m.id]],
    ["UPDATE chat_members SET last_read_id=MAX(last_read_id, ?) WHERE conversation_id=? AND username=?", [r.lastID, m.id, me]],
  ]);
  return (await hydrate([await get("SELECT * FROM chat_messages WHERE id=?", [r.lastID])]))[0];
}

async function messageFor(me, id) {
  const msg = await get("SELECT * FROM chat_messages WHERE id=?", [Number(id) || 0]);
  if (!msg) fail(404, "Message not found");
  const m = await membership(msg.conversation_id, me);
  return { msg, m };
}

async function edit(me, id, body) {
  const { msg } = await messageFor(me, id);
  if (msg.username !== me || msg.kind !== "text") fail(403, "You can only edit your own messages");
  if (msg.deleted) fail(400, "That message was deleted");
  const text = String(body ?? "").replace(/\r\n/g, "\n").slice(0, MAX_BODY);
  if (!text.trim() && !msg.attachment && !msg.share) fail(400, "Write a message first");
  await run("UPDATE chat_messages SET body=?, edited_at=? WHERE id=?", [text, now(), msg.id]);
  return (await hydrate([await get("SELECT * FROM chat_messages WHERE id=?", [msg.id])]))[0];
}

async function remove(me, id) {
  const { msg, m } = await messageFor(me, id);
  // Your own messages; in a group, the owner and admins may remove anyone's.
  if (msg.kind === "system" || !(msg.username === me || (m.kind === "group" && canManage(m.role)))) fail(403, "You can't delete this message");
  await runBatch([
    ["UPDATE chat_messages SET deleted=1, body='', attachment=NULL, share=NULL WHERE id=?", [msg.id]],
    ["DELETE FROM chat_reactions WHERE message_id=?", [msg.id]],
  ]);
  return (await hydrate([await get("SELECT * FROM chat_messages WHERE id=?", [msg.id])]))[0];
}

// One emoji (with skin tones and joiners): no letters, digits or markup.
const isEmoji = (e) => typeof e === "string" && e.length > 0 && e.length <= 16 && /^[^\x00-\x7f]+$/u.test(e) && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(e);

async function react(me, id, emoji) {
  const { msg } = await messageFor(me, id);
  if (msg.deleted || msg.kind === "system") fail(400, "You can't react to that");
  if (!isEmoji(emoji)) fail(400, "Pick an emoji");
  const had = await get("SELECT 1 AS x FROM chat_reactions WHERE message_id=? AND username=? AND emoji=?", [msg.id, me, emoji]);
  if (had) await run("DELETE FROM chat_reactions WHERE message_id=? AND username=? AND emoji=?", [msg.id, me, emoji]);
  else {
    const kinds = await get("SELECT COUNT(DISTINCT emoji) AS n FROM chat_reactions WHERE message_id=?", [msg.id]);
    if (Number(kinds.n) >= 20) fail(400, "That message has enough reactions");
    await run("INSERT INTO chat_reactions(message_id, username, emoji) VALUES(?,?,?)", [msg.id, me, emoji]);
  }
  const msgOut = (await hydrate([msg]))[0];
  return { conversationId: msg.conversation_id, messageId: msg.id, reactions: msgOut.reactions };
}

async function markRead(me, convId, upTo) {
  const m = await membership(convId, me);
  const top = await get("SELECT MAX(id) AS id FROM chat_messages WHERE conversation_id=?", [m.id]);
  const to = Math.min(Number(upTo) || Number(top?.id) || 0, Number(top?.id) || 0);
  if (to > m.last_read_id) await run("UPDATE chat_members SET last_read_id=? WHERE conversation_id=? AND username=?", [to, m.id, me]);
  return { lastReadId: Math.max(to, m.last_read_id), visible: !!m.accepted };
}

async function unread(me) {
  await init();
  const rows = await all(
    `SELECT cm.conversation_id, COUNT(*) AS n, MAX(cm.id) AS last FROM chat_members m JOIN chat_messages cm ON cm.conversation_id = m.conversation_id
     WHERE m.username = ? AND m.accepted = 1 AND (m.muted = 0 OR cm.body LIKE ?) AND cm.id > m.last_read_id AND cm.username <> ? AND cm.deleted = 0 AND cm.kind <> 'system'
     GROUP BY cm.conversation_id ORDER BY last DESC LIMIT 20`,
    [me, `%@${me}%`, me],
  );
  const req = await get("SELECT COUNT(*) AS n FROM chat_members WHERE username=? AND accepted=0", [me]);
  const requests = Number(req?.n || 0);
  if (!rows.length) return { total: 0, requests, conversations: [] };
  const ids = rows.map((r) => r.conversation_id);
  const convs = await all(`SELECT id, kind, title FROM chat_conversations WHERE id IN (${ph(ids.length)})`, ids);
  const others = await all(`SELECT conversation_id, username FROM chat_members WHERE conversation_id IN (${ph(ids.length)}) AND username <> ?`, [...ids, me]);
  const lasts = await all(`SELECT id, username FROM chat_messages WHERE id IN (${ph(rows.length)})`, rows.map((r) => r.last));
  const byId = new Map(convs.map((c) => [c.id, c]));
  const lastBy = new Map(lasts.map((l) => [l.id, l.username]));
  return {
    total: rows.reduce((s, r) => s + Number(r.n), 0),
    requests,
    conversations: rows.map((r) => {
      const c = byId.get(r.conversation_id) || {};
      return {
        id: r.conversation_id,
        kind: c.kind,
        title: c.kind === "group" ? c.title : others.find((o) => o.conversation_id === r.conversation_id)?.username || "",
        count: Number(r.n),
        from: lastBy.get(r.last) || "",
      };
    }),
  };
}

/** Messages I can see that contain the words. */
async function search(me, q) {
  await init();
  const text = String(q || "").trim().slice(0, 80);
  if (text.length < 2) return { results: [] };
  const like = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await all(
    `SELECT cm.* FROM chat_messages cm JOIN chat_members m ON m.conversation_id = cm.conversation_id AND m.username = ?
     WHERE cm.deleted = 0 AND cm.kind = 'text' AND (cm.body LIKE ? ESCAPE '\\' OR cm.attachment LIKE ? ESCAPE '\\' OR cm.share LIKE ? ESCAPE '\\')
     ORDER BY cm.id DESC LIMIT 40`,
    [me, like, like, like],
  );
  return { results: rows.map((r) => ({ conversationId: r.conversation_id, ...preview(r) })) };
}

/* ── mentions, our own links, pins, mute ── */

/** @names in a message (the client highlights them; the server notifies them). */
function mentionsIn(body) {
  return [...new Set([...String(body || "").matchAll(/(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_.-]{2,40})/g)].map((m) => m[1].replace(/[.-]+$/, "")))].slice(0, 20);
}

/** The first link to one of our own problems or GATE questions, as a share. */
function linkedShare(text) {
  const site = String.raw`(?:https?:\/\/(?:www\.)?nexoraguru\.in)?`;
  const prob = new RegExp(String.raw`(?:^|\s)${site}\/solve\/(\d{1,9})(?=$|[\s?#)])`).exec(text);
  if (prob) return { type: "problem", id: Number(prob[1]) };
  const q = new RegExp(String.raw`(?:^|\s)${site}\/gate\/practice\?ids=([a-z0-9-]{3,60})(?=$|[\s&#)])`).exec(text);
  if (q) return { type: "gate", id: q[1] };
  return null;
}

/** Pin or unpin: anyone in a direct conversation; in a group, the owner and admins. */
async function pin(me, id) {
  const { msg, m } = await messageFor(me, id);
  if (msg.deleted || msg.kind === "system") fail(400, "You can't pin that");
  if (m.kind === "group" && !canManage(m.role)) fail(403, "Only the group's owner and admins can pin");
  if (msg.pinned_at) await run("UPDATE chat_messages SET pinned_at=NULL, pinned_by=NULL WHERE id=?", [msg.id]);
  else {
    const n = await get("SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id=? AND pinned_at IS NOT NULL", [m.id]);
    if (Number(n.n) >= 20) fail(400, "Up to 20 pinned messages: unpin one first");
    await run("UPDATE chat_messages SET pinned_at=?, pinned_by=? WHERE id=?", [now(), me, msg.id]);
  }
  return (await hydrate([await get("SELECT * FROM chat_messages WHERE id=?", [msg.id])]))[0];
}

async function pins(me, convId) {
  const m = await membership(convId, me);
  return hydrate(await all("SELECT * FROM chat_messages WHERE conversation_id=? AND pinned_at IS NOT NULL AND deleted=0 ORDER BY pinned_at DESC LIMIT 20", [m.id]));
}

/* ── polls ── */

async function createPoll(me, convId, { question, options, multi }) {
  const m = await membership(convId, me);
  if (m.kind !== "group") fail(400, "Polls are for groups");
  if (!m.accepted) await accept(me, m.id);
  const q = String(question || "").trim().slice(0, 200);
  if (!q) fail(400, "Write the question");
  const opts = [...new Set((Array.isArray(options) ? options : []).map((o) => String(o || "").trim().slice(0, 100)).filter(Boolean))].slice(0, 10);
  if (opts.length < 2) fail(400, "Give at least two choices");
  const poll = { question: q, multi: !!multi, closed: false, options: opts.map((text, i) => ({ id: i + 1, text })) };
  const at = now();
  const r = await run("INSERT INTO chat_messages(conversation_id, username, kind, body, poll, created_at) VALUES(?,?,?,?,?,?)", [m.id, me, "poll", q, JSON.stringify(poll), at]);
  await runBatch([
    ["UPDATE chat_conversations SET last_message_at=? WHERE id=?", [at, m.id]],
    ["UPDATE chat_members SET last_read_id=MAX(last_read_id, ?) WHERE conversation_id=? AND username=?", [r.lastID, m.id, me]],
  ]);
  return (await hydrate([await get("SELECT * FROM chat_messages WHERE id=?", [r.lastID])]))[0];
}

async function vote(me, id, optionIds) {
  const { msg } = await messageFor(me, id);
  if (msg.kind !== "poll" || msg.deleted) fail(400, "Not a poll");
  const p = parse(msg.poll);
  if (p.closed) fail(400, "This poll is closed");
  const valid = new Set(p.options.map((o) => o.id));
  let picks = [...new Set((Array.isArray(optionIds) ? optionIds : [optionIds]).map(Number))].filter((o) => valid.has(o));
  if (!p.multi) picks = picks.slice(0, 1);
  await runBatch([
    ["DELETE FROM chat_poll_votes WHERE message_id=? AND username=?", [msg.id, me]],
    ...picks.map((o) => ["INSERT INTO chat_poll_votes(message_id, username, option_id) VALUES(?,?,?)", [msg.id, me, o]]),
  ]);
  return (await hydrate([msg]))[0];
}

async function closePoll(me, id) {
  const { msg, m } = await messageFor(me, id);
  if (msg.kind !== "poll") fail(400, "Not a poll");
  if (!(msg.username === me || canManage(m.role))) fail(403, "Only whoever asked, or an admin, can close the poll");
  const p = parse(msg.poll);
  p.closed = true;
  await run("UPDATE chat_messages SET poll=? WHERE id=?", [JSON.stringify(p), msg.id]);
  return (await hydrate([await get("SELECT * FROM chat_messages WHERE id=?", [msg.id])]))[0];
}

/* ── forward, saved ── */

async function forward(me, id, conversationIds) {
  const { msg } = await messageFor(me, id);
  if (msg.deleted || msg.kind !== "text") fail(400, "You can't forward that");
  const targets = [...new Set((Array.isArray(conversationIds) ? conversationIds : []).map(Number))].filter(Boolean).slice(0, 5);
  if (!targets.length) fail(400, "Choose where to send it");
  const out = [];
  for (const t of targets) {
    await membership(t, me);
    out.push(await send(me, t, { body: msg.body, attachment: parse(msg.attachment), share: null, forwardedShare: parse(msg.share) }, async () => null, { forwarded: true }));
  }
  return out;
}

async function toggleSave(me, id) {
  const { msg } = await messageFor(me, id);
  if (msg.kind === "system") fail(400, "You can't save that");
  const had = await get("SELECT 1 AS x FROM chat_saved WHERE username=? AND message_id=?", [me, msg.id]);
  if (had) await run("DELETE FROM chat_saved WHERE username=? AND message_id=?", [me, msg.id]);
  else await run("INSERT INTO chat_saved(username, message_id, saved_at) VALUES(?,?,?)", [me, msg.id, now()]);
  return !had;
}

/** My saved messages, from conversations I'm still in. */
async function saved(me) {
  await init();
  const rows = await all(
    `SELECT cm.* FROM chat_saved s JOIN chat_messages cm ON cm.id = s.message_id JOIN chat_members m ON m.conversation_id = cm.conversation_id AND m.username = s.username
     WHERE s.username=? AND cm.deleted=0 ORDER BY s.saved_at DESC LIMIT 100`,
    [me],
  );
  return hydrate(rows);
}
async function savedIds(me, ids) {
  if (!ids.length) return [];
  return (await all(`SELECT message_id FROM chat_saved WHERE username=? AND message_id IN (${ph(ids.length)})`, [me, ...ids])).map((r) => r.message_id);
}

/* ── invite links ── */

async function setInvite(me, convId, on) {
  const m = await membership(convId, me);
  if (m.kind !== "group") fail(400, "Only groups have invite links");
  if (!canManage(m.role)) fail(403, "Only the group's owner and admins manage the invite link");
  const token = on ? require("crypto").randomBytes(12).toString("hex") : null;
  await run("UPDATE chat_conversations SET invite_token=? WHERE id=?", [token, m.id]);
  return token;
}
async function invitePreview(token) {
  await init();
  if (!/^[a-f0-9]{24}$/.test(String(token || ""))) fail(404, "This invite link doesn't work any more");
  const c = await get("SELECT id, title, description FROM chat_conversations WHERE invite_token=? AND kind='group'", [token]);
  if (!c) fail(404, "This invite link doesn't work any more");
  const n = await get("SELECT COUNT(*) AS n FROM chat_members WHERE conversation_id=? AND accepted=1", [c.id]);
  return { id: c.id, title: c.title, description: c.description || "", members: Number(n.n) };
}
async function joinByInvite(me, token) {
  const c = await invitePreview(token);
  const mine = await get("SELECT accepted FROM chat_members WHERE conversation_id=? AND username=?", [c.id, me]);
  if (mine) {
    if (!mine.accepted) await accept(me, c.id);
    return c.id;
  }
  const owner = await get("SELECT username FROM chat_members WHERE conversation_id=? AND role='owner'", [c.id]);
  if (owner && (await blocked(me, owner.username))) fail(403, "You can't join this group");
  if (c.members >= MAX_GROUP) fail(400, "This group is full");
  await run("INSERT INTO chat_members(conversation_id, username, role, joined_at, accepted) VALUES(?,?,?,?,1)", [c.id, me, "member", now()]);
  await systemMessage(c.id, me, "joined with an invite link");
  return c.id;
}

/* ── reports (to Admin → Moderation) ── */

async function report(me, id, { reason, details }) {
  const { msg } = await messageFor(me, id);
  if (msg.username === me) fail(400, "That's your own message");
  if (msg.kind === "system") fail(400, "You can't report that");
  const why = String(reason || "").trim().slice(0, 60);
  if (why.length < 2) fail(400, "Say why");
  const snapshot = [msg.body, parse(msg.attachment)?.url].filter(Boolean).join("\n").slice(0, 2000);
  const r = await run(
    `INSERT OR IGNORE INTO reports(reporter, content_type, content_id, target_user, reason, details, snapshot, status, created_at)
     VALUES(?,?,?,?,?,?,?, 'open', ?)`,
    [me, "chat_message", String(msg.id), msg.username, why, String(details || "").slice(0, 1000), snapshot, Date.now()],
  );
  return { duplicate: !r.changes };
}

async function mute(me, convId, on) {
  const m = await membership(convId, me);
  await run("UPDATE chat_members SET muted=? WHERE conversation_id=? AND username=?", [on ? 1 : 0, m.id, me]);
  return !!on;
}

module.exports = {
  settingsFor,
  setSettings,
  accept,
  decline,
  createPoll,
  vote,
  closePoll,
  forward,
  toggleSave,
  saved,
  savedIds,
  setInvite,
  invitePreview,
  joinByInvite,
  report,
  pin,
  pins,
  mute,
  mentionsIn,
  linkedShare,
  ChatError,
  MAX_BODY,
  MAX_GROUP,
  init,
  openDm,
  createGroup,
  rename,
  addMembers,
  removeMember,
  setRole,
  leave,
  listFor,
  one,
  messages,
  send,
  edit,
  remove,
  react,
  markRead,
  unread,
  search,
  memberNames,
  membership,
  ensureDm,
  isEmoji,
};
