// Live rooms: tables, codes and the rules for who may enter (routes/live.js,
// live/signal.js). Who is in a room right now is kept in memory (live/state.js).
const crypto = require("crypto");
const { all, get, run } = require("../db");

const VISIBILITY = new Set(["public", "link", "invite"]);
const MODES = new Set(["video", "voice"]);
const TITLE_MAX = 80;
const DEVICE_TTL_MS = 6 * 60 * 60 * 1000;
const CODE_RE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

let ready = null;
function ensureTables() {
  if (!ready) {
    ready = (async () => {
      await run(`CREATE TABLE IF NOT EXISTS live_rooms (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        host TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'video',
        visibility TEXT NOT NULL DEFAULT 'link',
        about_kind TEXT,
        about_target TEXT,
        about_title TEXT,
        locked INTEGER NOT NULL DEFAULT 0,
        is_call INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        ended_at INTEGER
      )`);
      await run("CREATE INDEX IF NOT EXISTS idx_live_rooms_host ON live_rooms(host, created_at)");
      await run(`CREATE TABLE IF NOT EXISTS live_invites (
        room_id TEXT NOT NULL,
        username TEXT NOT NULL,
        PRIMARY KEY (room_id, username)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS live_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        username TEXT NOT NULL,
        body TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'text',
        created_at INTEGER NOT NULL
      )`);
      await run("CREATE INDEX IF NOT EXISTS idx_live_messages_room ON live_messages(room_id, id)");
      await run(`CREATE TABLE IF NOT EXISTS live_attendance (
        room_id TEXT NOT NULL,
        username TEXT NOT NULL,
        first_at INTEGER NOT NULL,
        last_at INTEGER NOT NULL,
        PRIMARY KEY (room_id, username)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS live_devices (
        token TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** A code people can read out: "abc-defg-hij". */
function newCode() {
  const letters = "abcdefghijkmnopqrstuvwxyz";
  const pick = (n) => Array.from(crypto.randomBytes(n), (b) => letters[b % letters.length]).join("");
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

const roomByCode = (code) => (CODE_RE.test(code || "") ? get("SELECT * FROM live_rooms WHERE code=?", [code]) : Promise.resolve(null));

async function isInvited(roomId, username) {
  return !!(await get("SELECT 1 AS ok FROM live_invites WHERE room_id=? AND username=?", [roomId, username]));
}

/**
 * May `username` call `other`? Only people they already know: friends, or
 * someone they share a conversation with (direct or group), never across a block.
 */
async function mayCall(username, other) {
  if (!other || other === username) return false;
  const blocked = await get(
    "SELECT 1 AS b FROM social_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)",
    [username, other, other, username],
  ).catch(() => null);
  if (blocked) return false;
  const friend = await get(
    "SELECT 1 AS f FROM friendships WHERE status='accepted' AND ((from_user=? AND to_user=?) OR (from_user=? AND to_user=?))",
    [username, other, other, username],
  ).catch(() => null);
  if (friend) return true;
  const shared = await get(
    `SELECT 1 AS d FROM chat_members a JOIN chat_members b ON a.conversation_id=b.conversation_id
     JOIN chat_conversations c ON c.id=a.conversation_id
     WHERE a.username=? AND b.username=?`,
    [username, other],
  ).catch(() => null);
  return !!shared;
}

/** The public shape of a room. */
function roomView(r, extra = {}) {
  return {
    code: r.code,
    title: r.title,
    host: r.host,
    mode: r.mode,
    visibility: r.visibility,
    locked: !!r.locked,
    isCall: !!r.is_call,
    about: r.about_kind ? { kind: r.about_kind, target: r.about_target, title: r.about_title } : null,
    createdAt: r.created_at,
    endedAt: r.ended_at || null,
    ...extra,
  };
}

async function people(usernames) {
  const list = [...new Set(usernames)].slice(0, 300);
  if (!list.length) return new Map();
  const rows = await all(
    `SELECT username, display_name, avatar, avatar_url FROM users WHERE username IN (${list.map(() => "?").join(",")})`,
    list,
  );
  return new Map(rows.map((u) => [u.username, { username: u.username, name: u.display_name || u.username, avatar: u.avatar || null, avatarUrl: u.avatar_url || null }]));
}

module.exports = {
  VISIBILITY,
  MODES,
  TITLE_MAX,
  DEVICE_TTL_MS,
  CODE_RE,
  TOKEN_RE,
  ensureTables,
  newCode,
  roomByCode,
  isInvited,
  mayCall,
  roomView,
  people,
};
