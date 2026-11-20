// Live rooms over HTTP: study rooms and calls (the room itself runs over socket.io,
// src/live/signal.js). Not the older LiveClass API (routes/live.js, /api/live/classes).
//
//   GET  /api/live/config                 how media travels here, and room size
//   GET  /api/live/rooms                  live now (public), mine, invited
//   POST /api/live/rooms                  open a room
//   GET  /api/live/rooms/:code            one room (before joining)
//   POST /api/live/rooms/:code/end        the host closes it for everyone
//   POST /api/live/rooms/:code/device     a one-time code for a tablet (QR)
//   GET  /api/live/device/:token          the tablet's page reads its room (no sign-in)
//   POST /api/live/call                   call friends: a private room that rings them
//   POST /api/live/rooms/:code/decline    say no to a call
//   POST /api/live/rooms/:code/cancel     the caller stops ringing
const express = require("express");
const crypto = require("crypto");
const { all, get, run, runBatch } = require("../db");
const { requireAuthenticatedUser } = require("../middleware/auth");
const store = require("../live/store");
const media = require("../live/media");
const { rooms, headcount, peerView } = require("../live/state");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (message, status = 400) => {
  throw new HttpError(status, message);
};
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    if (e instanceof HttpError) return res.status(e.status).json({ ok: false, error: e.message });
    console.error(`[live] ${req.method} ${req.path}: ${e.message}`);
    if (!res.headersSent) res.status(500).json({ ok: false, error: "Something went wrong" });
  });

function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.sessionUser?.username || req.ip;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      h = { start: now, n: 0 };
      hits.set(key, h);
      if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    }
    if (++h.n > max) return res.status(429).json({ ok: false, error: "Too many requests — please slow down." });
    next();
  };
}

/** What a room is about: a GATE question, so the room can show it. */
function aboutOf(about) {
  if (!about || typeof about !== "object") return null;
  if (about.kind === "gate" && typeof about.target === "string" && about.target.length <= 120) {
    const q = require("./gate").loadGateBank().byId.get(about.target);
    if (!q) bad("Unknown question", 404);
    const title = `GATE ${q.exam || "CSE"} ${q.year}${q.set ? ` Set ${q.set}` : ""} · ${q.section === "ga" ? "GA " : ""}Q${q.number ?? ""}`;
    return { kind: "gate", target: about.target, title };
  }
  return null;
}

function cleanTitle(t, fallback) {
  const s = String(t || "").replace(/\s+/g, " ").trim().slice(0, store.TITLE_MAX);
  return s || fallback;
}

function createLiveRoomsRouter({ realtime, live }) {
  const router = express.Router();
  const auth = requireAuthenticatedUser;
  const make = limiter(30, 60 * 60 * 1000);
  const light = limiter(120, 60 * 1000);
  // (/api/live/classes belongs to the older LiveClass API, routes/live.js.)
  router.use(["/api/live/config", "/api/live/rooms", "/api/live/device", "/api/live/call"], (req, res, next) => store.ensureTables().then(() => next(), next));

  async function createRoom({ host, title, mode, visibility, about, invite = [], isCall = false }) {
    let code = store.newCode();
    for (let i = 0; i < 5 && (await get("SELECT 1 AS x FROM live_rooms WHERE code=?", [code])); i++) code = store.newCode();
    const id = crypto.randomBytes(12).toString("base64url");
    const now = Date.now();
    const stmts = [
      [
        `INSERT INTO live_rooms(id, code, title, host, mode, visibility, about_kind, about_target, about_title, is_call, created_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        [id, code, title, host, mode, visibility, about?.kind || null, about?.target || null, about?.title || null, isCall ? 1 : 0, now],
      ],
      ...invite.map((u) => ["INSERT OR IGNORE INTO live_invites(room_id, username) VALUES(?,?)", [id, u]]),
    ];
    await (stmts.length > 1 ? runBatch(stmts) : run(stmts[0][0], stmts[0][1]));
    return get("SELECT * FROM live_rooms WHERE id=?", [id]);
  }

  router.get("/api/live/config", auth, wrap(async (req, res) => {
    const t = await require("../live/config").chooseTransport();
    const c = require("../live/config").peekConfig();
    res.json({ ok: true, transport: t.kind, maxDevices: media.capOf(t.kind), recording: c.recording, calls: c.calls, tablets: c.tablets });
  }));

  router.get("/api/live/rooms", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const liveCodes = [...rooms.keys()];
    const liveRows = liveCodes.length
      ? await all(`SELECT * FROM live_rooms WHERE ended_at IS NULL AND code IN (${liveCodes.map(() => "?").join(",")})`, liveCodes)
      : [];
    const invitedIds = new Set(
      liveRows.length
        ? (await all(`SELECT room_id FROM live_invites WHERE username=? AND room_id IN (${liveRows.map(() => "?").join(",")})`, [me, ...liveRows.map((r) => r.id)])).map((r) => r.room_id)
        : [],
    );
    const inRoom = (r) => [...(rooms.get(r.code)?.peers.values() || [])].filter((p) => p.device === "main");
    const facesOf = (r) => {
      const seen = new Set();
      return inRoom(r)
        .filter((p) => !seen.has(p.username) && seen.add(p.username))
        .slice(0, 5)
        .map((p) => ({ username: p.username, name: p.name, avatar: p.avatar, avatarUrl: p.avatarUrl }));
    };
    const live = liveRows
      .filter((r) => r.visibility === "public" && !r.is_call && headcount(r.code) > 0)
      .map((r) => store.roomView(r, { people: headcount(r.code), faces: facesOf(r) }))
      .sort((a, b) => b.people - a.people);
    const invited = liveRows
      .filter((r) => r.host !== me && invitedIds.has(r.id) && headcount(r.code) > 0)
      .map((r) => store.roomView(r, { people: headcount(r.code), faces: facesOf(r) }));
    const mineRows = await all(
      `SELECT r.* FROM live_rooms r LEFT JOIN live_attendance a ON a.room_id=r.id AND a.username=?
       WHERE r.host=? OR a.username IS NOT NULL ORDER BY COALESCE(a.last_at, r.created_at) DESC LIMIT 20`,
      [me, me],
    );
    const mine = mineRows.map((r) => store.roomView(r, { people: headcount(r.code), mineHost: r.host === me }));
    res.json({ ok: true, live, invited, mine });
  }));

  router.post("/api/live/rooms", auth, make, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const b = req.body || {};
    const mode = store.MODES.has(b.mode) ? b.mode : "video";
    const visibility = store.VISIBILITY.has(b.visibility) ? b.visibility : "link";
    const about = aboutOf(b.about);
    const title = cleanTitle(b.title, about ? `Solving ${about.title}` : mode === "voice" ? "Voice room" : "Study room");
    const room = await createRoom({ host: me, title, mode, visibility, about });
    res.json({ ok: true, room: store.roomView(room, { people: 0 }) });
  }));

  router.get("/api/live/rooms/:code", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const room = await store.roomByCode(req.params.code);
    if (!room) bad("This room does not exist.", 404);
    const host = (await store.people([room.host])).get(room.host) || { username: room.host, name: room.host };
    const invited = room.visibility === "invite" ? await store.isInvited(room.id, me) : true;
    const enter = room.host === me ? "free" : room.ended_at ? "ended" : room.locked || !invited ? "knock" : "free";
    const s = rooms.get(room.code);
    const faces = room.visibility === "invite" && !invited && room.host !== me ? [] : [...(s?.peers.values() || [])].filter((p) => p.device === "main").slice(0, 6).map(peerView).map(({ username, name, avatar, avatarUrl }) => ({ username, name, avatar, avatarUrl }));
    res.json({ ok: true, room: store.roomView(room, { people: headcount(room.code), faces, hostInfo: host, isHost: room.host === me, enter }) });
  }));

  router.post("/api/live/rooms/:code/end", auth, light, wrap(async (req, res) => {
    const room = await store.roomByCode(req.params.code);
    if (!room) bad("This room does not exist.", 404);
    if (room.host !== req.sessionUser.username) bad("Only the host can end the room.", 403);
    await live.signal.endRoom(room, "The host ended the room.");
    res.json({ ok: true });
  }));

  router.post("/api/live/rooms/:code/device", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const room = await store.roomByCode(req.params.code);
    if (!room || room.ended_at) bad("This room has ended.", 404);
    if (!(await require("../live/config").loadConfig()).tablets) bad("Tablets are switched off for Live right now.", 403);
    const s = rooms.get(room.code);
    if (![...(s?.peers.values() || [])].some((p) => p.username === me && p.device === "main")) bad("Join the room first.", 403);
    const token = crypto.randomBytes(16).toString("base64url");
    const now = Date.now();
    await run("INSERT INTO live_devices(token, room_id, username, created_at, expires_at) VALUES(?,?,?,?,?)", [token, room.id, me, now, now + store.DEVICE_TTL_MS]);
    run("DELETE FROM live_devices WHERE expires_at < ?", [now]).catch(() => {});
    res.json({ ok: true, token, path: `/live/d/${token}`, expiresAt: now + store.DEVICE_TTL_MS });
  }));

  // The tablet is not signed in: the token is the key (passes private mode).
  router.get("/api/live/device/:token", limiter(60, 60 * 1000), wrap(async (req, res) => {
    if (!store.TOKEN_RE.test(req.params.token)) bad("This link does not work.", 404);
    const row = await get("SELECT * FROM live_devices WHERE token=?", [req.params.token]);
    if (!row || row.expires_at < Date.now()) bad("This link has expired. Make a new code in the room.", 404);
    const room = await get("SELECT * FROM live_rooms WHERE id=?", [row.room_id]);
    if (!room || room.ended_at) bad("This room has ended.", 404);
    const who = (await store.people([row.username])).get(row.username) || { name: row.username };
    res.json({ ok: true, code: room.code, title: room.title, mode: room.mode, name: who.name, expiresAt: row.expires_at });
  }));

  router.post("/api/live/call", auth, make, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const b = req.body || {};
    if (!(await require("../live/config").loadConfig()).calls) bad("Calls are switched off right now.", 403);
    const list = Array.isArray(b.to) ? [...new Set(b.to.map(String))].filter((u) => u && u !== me) : [];
    if (!list.length || list.length > 8) bad("Choose 1 to 8 people to call.");
    for (const u of list) if (!(await store.mayCall(me, u))) bad(`You can call friends and people you message. ${u} is not one yet.`, 403);
    const mode = b.mode === "voice" ? "voice" : "video";
    const names = await store.people([me, ...list]);
    const title = cleanTitle(b.title, list.length === 1 ? `${names.get(me)?.name || me} and ${names.get(list[0])?.name || list[0]}` : `Call with ${list.length + 1} people`);
    const room = await createRoom({ host: me, title, mode, visibility: "invite", invite: list, isCall: true });
    const from = names.get(me) || { username: me, name: me };
    for (const u of list) realtime.emitToUser?.(u, "live:ring", { code: room.code, mode, title: room.title, from, at: Date.now() });
    res.json({ ok: true, room: store.roomView(room, { people: 0 }) });
  }));

  router.post("/api/live/rooms/:code/decline", auth, light, wrap(async (req, res) => {
    const me = req.sessionUser.username;
    const room = await store.roomByCode(req.params.code);
    if (!room || !(await store.isInvited(room.id, me))) bad("No such call.", 404);
    const who = (await store.people([me])).get(me) || { name: me };
    realtime.emitToUser?.(room.host, "live:declined", { code: room.code, username: me, name: who.name });
    res.json({ ok: true });
  }));

  router.post("/api/live/rooms/:code/cancel", auth, light, wrap(async (req, res) => {
    const room = await store.roomByCode(req.params.code);
    if (!room || room.host !== req.sessionUser.username) bad("No such call.", 404);
    const invited = await all("SELECT username FROM live_invites WHERE room_id=?", [room.id]);
    for (const r of invited) realtime.emitToUser?.(r.username, "live:ring-cancel", { code: room.code });
    if (room.is_call && headcount(room.code) <= 1) await live.signal.endRoom(room, "The call ended.");
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createLiveRoomsRouter };
