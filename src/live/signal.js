// Live rooms over socket.io, namespace "/live" (client: client/src/live).
//
// Carries everything except the media itself: who is in the room, the chat,
// raised hands, reactions, the host's controls, the waiting room, and (for
// small rooms without a LiveKit server) the WebRTC offers and answers that let
// browsers connect directly. A signed-in person connects with their session;
// a tablet added by QR connects with its one-time device token instead.
const crypto = require("crypto");
const { get, run } = require("../db");
const store = require("./store");
const media = require("./media");
const { rooms, roomState, peerView, dropIfEmpty } = require("./state");
const config = require("./config");

const CHAT_MAX = 2000;
const HISTORY = 150;
const REACTIONS = new Set(["👍", "👏", "😂", "🎉", "🤔", "❤️", "✅", "❓"]);
const newId = () => crypto.randomBytes(9).toString("base64url");

/** A small per-socket budget for each kind of event. */
function budget() {
  const hits = new Map();
  return (kind, max, windowMs) => {
    const now = Date.now();
    let h = hits.get(kind);
    if (!h || now - h.start > windowMs) h = { start: now, n: 0 };
    h.n++;
    hits.set(kind, h);
    return h.n <= max;
  };
}

function createLiveSignal({ io, getSessionUser, socketAccess, realtime }) {
  const nsp = io.of("/live");

  nsp.use(async (socket, next) => {
    try {
      await store.ensureTables();
      const device = socket.handshake.auth?.device;
      if (typeof device === "string" && store.TOKEN_RE.test(device)) {
        const row = await get("SELECT * FROM live_devices WHERE token=?", [device]);
        if (!row || row.expires_at < Date.now()) return next(new Error("This link has expired. Make a new code in the room."));
        const verdict = await socketAccess(row.username).catch(() => ({ ok: false }));
        if (!verdict.ok) return next(new Error("This link no longer works."));
        socket.data.username = row.username;
        socket.data.device = "tablet";
        socket.data.deviceRoom = row.room_id;
        return next();
      }
      const user = getSessionUser(socket.request);
      if (!user?.username) return next(new Error("Sign in to join"));
      const verdict = await socketAccess(user.username);
      if (!verdict.ok) return next(new Error(verdict.reason || "Not allowed"));
      socket.data.username = user.username;
      socket.data.device = "main";
      next();
    } catch (e) {
      next(new Error("Could not connect"));
    }
  });

  const to = (code) => nsp.to(`live:${code}`);
  const isHost = (s, room, p) => p && p.device === "main" && (p.username === room.host || s.cohosts.has(p.username));

  async function roomFor(code) {
    const room = await store.roomByCode(code);
    return room && !room.ended_at ? room : null;
  }

  /** Puts a socket into the room and returns what its page needs. */
  async function enter(socket, room, s) {
    const me = socket.data.username;
    const who = (await store.people([me])).get(me) || { name: me, avatar: null, avatarUrl: null };
    const peer = {
      peerId: newId(),
      socketId: socket.id,
      username: me,
      name: socket.data.device === "tablet" ? `${who.name} · Tablet` : who.name,
      avatar: who.avatar,
      avatarUrl: who.avatarUrl,
      device: socket.data.device,
      role: me === room.host ? "host" : s.cohosts.has(me) ? "cohost" : "member",
      mic: false,
      cam: false,
      screens: [],
      hand: false,
      recording: false,
      joinedAt: Date.now(),
    };
    s.peers.set(peer.peerId, peer);
    socket.data.code = room.code;
    socket.data.peerId = peer.peerId;
    socket.join(`live:${room.code}`);
    socket.to(`live:${room.code}`).emit("peer-joined", peerView(peer));
    const now = Date.now();
    run(
      `INSERT INTO live_attendance(room_id, username, first_at, last_at) VALUES(?,?,?,?)
       ON CONFLICT(room_id, username) DO UPDATE SET last_at=excluded.last_at`,
      [room.id, me, now, now],
    ).catch(() => {});

    let transport;
    const lk = media.livekitConfig();
    if (s.transport === "cf" && config.cloudflare()) {
      transport = { kind: "cf", iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }] };
    } else if (s.transport === "sfu" && lk) {
      transport = {
        kind: "sfu",
        url: lk.url,
        token: media.livekitToken(lk, { room: room.id, identity: peer.peerId, name: peer.name, metadata: JSON.stringify({ username: me, device: peer.device }) }),
      };
    } else {
      transport = { kind: "mesh", iceServers: await media.iceServers(peer.peerId) };
    }
    const history = await require("../db")
      .all(
        `SELECT m.id, m.username, m.body, m.kind, m.created_at, u.display_name FROM live_messages m
         LEFT JOIN users u ON u.username=m.username WHERE m.room_id=? ORDER BY m.id DESC LIMIT ?`,
        [room.id, HISTORY],
      )
      .catch(() => []);
    return {
      ok: true,
      room: store.roomView(room, { spotlight: s.spotlight, cohosts: [...s.cohosts] }),
      self: peerView(peer),
      peers: [...s.peers.values()].filter((p) => p.peerId !== peer.peerId).map(peerView),
      transport,
      messages: history.reverse().map((m) => ({ id: m.id, username: m.username, name: m.display_name || m.username, body: m.body, kind: m.kind, at: m.created_at })),
      waiting: isHost(s, room, peer) ? [...s.waiting.values()].map(({ socketId, ...w }) => w) : [],
    };
  }

  function leave(socket, reason) {
    const code = socket.data.code;
    const peerId = socket.data.peerId;
    if (!code) return;
    socket.data.code = null;
    socket.data.peerId = null;
    socket.leave(`live:${code}`);
    const s = rooms.get(code);
    if (!s) return;
    const p = s.peers.get(peerId);
    s.peers.delete(peerId);
    if (p) {
      to(code).emit("peer-left", { peerId, reason });
      run("UPDATE live_attendance SET last_at=? WHERE room_id=? AND username=?", [Date.now(), s.id, p.username]).catch(() => {});
      if (s.spotlight === peerId) {
        s.spotlight = null;
        to(code).emit("room", { spotlight: null });
      }
    }
    // A tablet goes with its owner's last main device.
    if (p && p.device === "main" && ![...s.peers.values()].some((x) => x.username === p.username && x.device === "main")) {
      for (const x of s.peers.values()) {
        if (x.username === p.username && x.device === "tablet") nsp.sockets.get(x.socketId)?.emit("removed", { reason: "Your main device left the room." });
      }
    }
    dropIfEmpty(code);
  }

  nsp.on("connection", (socket) => {
    const me = socket.data.username;
    const allow = budget();
    const ctx = () => {
      const s = rooms.get(socket.data.code);
      const p = s?.peers.get(socket.data.peerId);
      return s && p ? { s, p } : null;
    };
    const reply = (ack, body) => typeof ack === "function" && ack(body);

    socket.on("join", async (payload, ack) => {
      try {
        if (!allow("join", 10, 60_000)) return reply(ack, { ok: false, error: "Too many tries. Wait a moment." });
        if (socket.data.code) leave(socket, "rejoin");
        const room = await roomFor(String(payload?.code || ""));
        if (!room) return reply(ack, { ok: false, error: "This room has ended or does not exist." });
        if (socket.data.device === "tablet" && socket.data.deviceRoom !== room.id) return reply(ack, { ok: false, error: "This link is for another room." });
        // How media travels is fixed when a room opens (Admin → Live chooses).
        const s = rooms.get(room.code) || roomState(room.code, room.id, (await config.chooseTransport()).kind);
        if (socket.data.device === "tablet" && !config.peekConfig().tablets) return reply(ack, { ok: false, error: "Tablets are switched off for Live right now." });
        const cap = media.capOf(s.transport);
        if (s.peers.size >= cap) {
          return reply(ack, {
            ok: false,
            error: s.transport !== "mesh" ? `This room is full (${cap} devices).` : `This room is full. Without the video server, a room holds ${cap} devices.`,
          });
        }
        const host = me === room.host || s.cohosts.has(me);
        const ownerInside = [...s.peers.values()].some((p) => p.username === me && p.device === "main");
        let free = host || socket.data.device === "tablet" || ownerInside || s.admitted.has(me);
        if (!free && !room.locked) free = room.visibility !== "invite" || (await store.isInvited(room.id, me));
        if (!free) {
          // The waiting room: hosts see who knocks and let them in.
          const who = (await store.people([me])).get(me) || { name: me };
          const wait = { id: newId(), username: me, name: who.name, avatar: who.avatar || null, avatarUrl: who.avatarUrl || null, at: Date.now(), socketId: socket.id };
          s.waiting.set(wait.id, wait);
          socket.data.waitId = wait.id;
          socket.data.waitCode = room.code;
          for (const p of s.peers.values()) if (isHost(s, room, p)) nsp.sockets.get(p.socketId)?.emit("knock", { id: wait.id, username: me, name: wait.name, avatar: wait.avatar, avatarUrl: wait.avatarUrl, at: wait.at });
          return reply(ack, { ok: false, waiting: true, room: store.roomView(room) });
        }
        reply(ack, await enter(socket, room, s));
      } catch (e) {
        console.error(`[live] join: ${e.message}`);
        reply(ack, { ok: false, error: "Could not join. Try again." });
      }
    });

    socket.on("leave", () => leave(socket, "left"));
    socket.on("disconnect", () => {
      if (socket.data.waitId) {
        const s = rooms.get(socket.data.waitCode);
        if (s?.waiting.delete(socket.data.waitId)) to(socket.data.waitCode).emit("knock-gone", { id: socket.data.waitId });
        if (s) dropIfEmpty(s.code);
      }
      leave(socket, "disconnected");
    });

    socket.on("state", (payload) => {
      const c = ctx();
      if (!c || !allow("state", 60, 10_000)) return;
      const { p } = c;
      if (typeof payload?.mic === "boolean") p.mic = payload.mic;
      if (typeof payload?.cam === "boolean") p.cam = payload.cam;
      // Cloudflare: which publications this device sends (others pull them by name).
      if (Array.isArray(payload?.pubs)) p.pubs = payload.pubs.filter((x) => typeof x === "string" && /^[a-z]+(-[A-Za-z0-9]{1,16})?$/.test(x)).slice(0, 8);
      if (Array.isArray(payload?.screens)) {
        p.screens = payload.screens
          .slice(0, 3)
          .filter((x) => x && typeof x.id === "string" && x.id.length <= 64)
          .map((x) => ({ id: x.id, label: String(x.label || "Screen").slice(0, 60), kind: x.kind === "board" || x.kind === "camera" ? x.kind : "screen" }));
      }
      to(socket.data.code).emit("peer-state", { peerId: p.peerId, mic: p.mic, cam: p.cam, screens: p.screens, pubs: p.pubs || [], cf: p.cf || null });
    });

    // Direct (mesh) connections: offers, answers and candidates between two peers of one room.
    socket.on("signal", (payload) => {
      const c = ctx();
      if (!c || !allow("signal", 400, 10_000)) return;
      const target = c.s.peers.get(String(payload?.to || ""));
      if (!target) return;
      const data = payload.data;
      if (!data || typeof data !== "object" || JSON.stringify(data).length > 100_000) return;
      nsp.sockets.get(target.socketId)?.emit("signal", { from: c.p.peerId, data });
    });

    socket.on("chat", async (payload, ack) => {
      const c = ctx();
      if (!c) return reply(ack, { ok: false });
      if (!allow("chat", 8, 5_000)) return reply(ack, { ok: false, error: "Slow down a little." });
      const body = String(payload?.body || "").trim().slice(0, CHAT_MAX);
      if (!body) return reply(ack, { ok: false });
      const kind = payload?.kind === "code" ? "code" : "text";
      const at = Date.now();
      try {
        const r = await run("INSERT INTO live_messages(room_id, username, body, kind, created_at) VALUES(?,?,?,?,?)", [c.s.id, me, body, kind, at]);
        const msg = { id: Number(r.lastID ?? r.lastInsertRowid ?? at), username: me, name: c.p.name, body, kind, at, peerId: c.p.peerId };
        to(socket.data.code).emit("chat", msg);
        reply(ack, { ok: true, id: msg.id });
      } catch {
        reply(ack, { ok: false, error: "Not sent. Try again." });
      }
    });

    socket.on("hand", (payload) => {
      const c = ctx();
      if (!c || !allow("hand", 20, 10_000)) return;
      c.p.hand = !!payload?.up;
      to(socket.data.code).emit("hand", { peerId: c.p.peerId, up: c.p.hand, at: Date.now() });
    });

    // Everyone is told when someone records the room.
    socket.on("recording", (payload) => {
      const c = ctx();
      if (!c || !allow("recording", 10, 10_000)) return;
      if (payload?.on && !config.peekConfig().recording) return socket.emit("room", { recordingOff: true });
      c.p.recording = !!payload?.on;
      to(socket.data.code).emit("recording", { peerId: c.p.peerId, on: c.p.recording, name: c.p.name });
    });

    socket.on("react", (payload) => {
      const c = ctx();
      if (!c || !allow("react", 12, 5_000)) return;
      const emoji = String(payload?.emoji || "");
      if (!REACTIONS.has(emoji)) return;
      to(socket.data.code).emit("react", { peerId: c.p.peerId, emoji, at: Date.now() });
    });

    /* ── Cloudflare Realtime: the browser's offers and answers, sent on with
       the app secret. Each device works only on its own session, and pulls
       only from sessions of devices in the same room. ── */
    const cfOp = (name, fn) =>
      socket.on(name, async (payload, ack) => {
        const c = ctx();
        const cf = config.cloudflare();
        if (!c || c.s.transport !== "cf" || !cf) return reply(ack, { errorCode: "not-cf" });
        if (!allow("cf", 240, 10_000)) return reply(ack, { errorCode: "slow-down" });
        try {
          reply(ack, await fn(c, cf, payload || {}));
        } catch (e) {
          reply(ack, { errorCode: "failed", errorDescription: e.message });
        }
      });
    const sdp = (x) => typeof x === "string" && x.length < 200_000 && x.startsWith("v=0");
    cfOp("cf:session", async (c, cf) => {
      if (c.p.cf) return { sessionId: c.p.cf };
      const j = await config.cfCall(cf, "/sessions/new", "POST");
      if (j.sessionId) {
        c.p.cf = j.sessionId;
        to(socket.data.code).emit("peer-state", { peerId: c.p.peerId, mic: c.p.mic, cam: c.p.cam, screens: c.p.screens, pubs: c.p.pubs || [], cf: c.p.cf });
      }
      return { sessionId: j.sessionId, errorCode: j.errorCode, errorDescription: j.errorDescription };
    });
    cfOp("cf:push", async (c, cf, b) => {
      if (!c.p.cf || !sdp(b.sdp) || !Array.isArray(b.tracks)) return { errorCode: "bad" };
      const tracks = b.tracks.slice(0, 8).map((t) => ({ location: "local", mid: String(t.mid), trackName: String(t.trackName).slice(0, 40) }));
      return config.cfCall(cf, `/sessions/${c.p.cf}/tracks/new`, "POST", { sessionDescription: { type: "offer", sdp: b.sdp }, tracks });
    });
    cfOp("cf:pull", async (c, cf, b) => {
      if (!c.p.cf || !Array.isArray(b.tracks)) return { errorCode: "bad" };
      const sessions = new Set([...c.s.peers.values()].filter((x) => x.peerId !== c.p.peerId && x.cf).map((x) => x.cf));
      const tracks = b.tracks
        .slice(0, 16)
        .filter((t) => sessions.has(t.sessionId))
        .map((t) => ({ location: "remote", sessionId: t.sessionId, trackName: String(t.trackName).slice(0, 40), ...(t.rid ? { simulcast: { preferredRid: String(t.rid).slice(0, 4) } } : {}) }));
      if (!tracks.length) return { errorCode: "no-tracks" };
      return config.cfCall(cf, `/sessions/${c.p.cf}/tracks/new`, "POST", { tracks });
    });
    cfOp("cf:answer", async (c, cf, b) => {
      if (!c.p.cf || !sdp(b.sdp)) return { errorCode: "bad" };
      return config.cfCall(cf, `/sessions/${c.p.cf}/renegotiate`, "PUT", { sessionDescription: { type: "answer", sdp: b.sdp } });
    });
    cfOp("cf:close", async (c, cf, b) => {
      if (!c.p.cf || !sdp(b.sdp) || !Array.isArray(b.mids)) return { errorCode: "bad" };
      return config.cfCall(cf, `/sessions/${c.p.cf}/tracks/close`, "PUT", { tracks: b.mids.slice(0, 16).map((mid) => ({ mid: String(mid) })), sessionDescription: { type: "offer", sdp: b.sdp }, force: false });
    });
    cfOp("cf:quality", async (c, cf, b) => {
      if (!c.p.cf || !b.mid || !b.sessionId) return { errorCode: "bad" };
      return config.cfCall(cf, `/sessions/${c.p.cf}/tracks/update`, "PUT", {
        tracks: [{ location: "remote", sessionId: String(b.sessionId), trackName: String(b.trackName).slice(0, 40), mid: String(b.mid), simulcast: { preferredRid: String(b.rid).slice(0, 4) } }],
      });
    });
    // Bytes this device received through the video server since its last report
    // (an estimate for Admin → Live; at most ~40 Mbit/s is believed).
    socket.on("usage", (payload) => {
      const c = ctx();
      if (!c || c.s.transport !== "cf" || !allow("usage", 6, 60_000)) return;
      const ms = Math.max(1000, Math.min(120_000, Number(payload?.ms) || 0));
      const bytes = Math.max(0, Math.min(Number(payload?.bytes) || 0, (ms / 1000) * 5_000_000));
      config.addUsage(bytes);
    });

    /* ── Host controls ── */
    async function hostCtx() {
      const c = ctx();
      if (!c) return null;
      const room = await roomFor(socket.data.code);
      return room && isHost(c.s, room, c.p) ? { ...c, room } : null;
    }

    socket.on("admit", async (payload) => {
      const h = await hostCtx();
      if (!h) return;
      const ids = payload?.id === "*" ? [...h.s.waiting.keys()] : [String(payload?.id || "")];
      for (const id of ids) {
        const w = h.s.waiting.get(id);
        if (!w) continue;
        h.s.waiting.delete(id);
        to(h.room.code).emit("knock-gone", { id });
        const ws = nsp.sockets.get(w.socketId);
        if (!ws) continue;
        ws.data.waitId = null;
        if (!payload?.allow) {
          ws.emit("denied", { reason: "The host did not let you in." });
          continue;
        }
        const cap = media.capOf(h.s.transport);
        if (h.s.peers.size >= cap) {
          ws.emit("denied", { reason: "The room is full." });
          continue;
        }
        h.s.admitted.add(w.username);
        ws.emit("admitted", await enter(ws, h.room, h.s));
      }
    });

    socket.on("mute", async (payload) => {
      const h = await hostCtx();
      if (!h) return;
      for (const p of h.s.peers.values()) {
        if (p.peerId === h.p.peerId) continue;
        if (payload?.peerId === "*" || p.peerId === payload?.peerId) nsp.sockets.get(p.socketId)?.emit("muted-by-host", { by: h.p.name, what: payload?.what === "cam" ? "cam" : "mic" });
      }
    });

    socket.on("remove", async (payload) => {
      const h = await hostCtx();
      if (!h) return;
      const target = h.s.peers.get(String(payload?.peerId || ""));
      if (!target || target.username === h.room.host) return;
      const ts = nsp.sockets.get(target.socketId);
      ts?.emit("removed", { reason: `${h.p.name} removed you from the room.` });
      if (ts) leave(ts, "removed");
      if (h.s.transport === "sfu") media.livekitAdmin(media.livekitConfig(), "RemoveParticipant", { room: h.room.id, identity: target.peerId });
    });

    socket.on("lock", async (payload) => {
      const h = await hostCtx();
      if (!h) return;
      const locked = payload?.locked ? 1 : 0;
      await run("UPDATE live_rooms SET locked=? WHERE id=?", [locked, h.room.id]).catch(() => {});
      to(h.room.code).emit("room", { locked: !!locked });
    });

    socket.on("spotlight", async (payload) => {
      const h = await hostCtx();
      if (!h) return;
      const id = payload?.peerId && h.s.peers.has(payload.peerId) ? payload.peerId : null;
      h.s.spotlight = id;
      to(h.room.code).emit("room", { spotlight: id });
    });

    socket.on("lower-hands", async () => {
      const h = await hostCtx();
      if (!h) return;
      for (const p of h.s.peers.values()) {
        if (!p.hand) continue;
        p.hand = false;
        to(h.room.code).emit("hand", { peerId: p.peerId, up: false, at: Date.now() });
      }
    });

    socket.on("cohost", async (payload) => {
      const h = await hostCtx();
      if (!h || me !== h.room.host) return; // only the host shares hosting
      const username = String(payload?.username || "");
      if (!username || username === h.room.host) return;
      if (payload?.on) h.s.cohosts.add(username);
      else h.s.cohosts.delete(username);
      for (const p of h.s.peers.values()) {
        if (p.username !== username || p.device !== "main") continue;
        p.role = payload?.on ? "cohost" : "member";
        to(h.room.code).emit("peer-role", { peerId: p.peerId, role: p.role });
        if (payload?.on) nsp.sockets.get(p.socketId)?.emit("waiting-list", [...h.s.waiting.values()].map(({ socketId, ...w }) => w));
      }
      to(h.room.code).emit("room", { cohosts: [...h.s.cohosts] });
    });

    socket.on("end", async () => {
      const h = await hostCtx();
      if (!h || me !== h.room.host) return;
      await endRoom(h.room, `${h.p.name} ended the room.`);
    });
  });

  async function endRoom(room, reason) {
    await run("UPDATE live_rooms SET ended_at=? WHERE id=? AND ended_at IS NULL", [Date.now(), room.id]).catch(() => {});
    const s = rooms.get(room.code);
    nsp.to(`live:${room.code}`).emit("ended", { reason });
    if (s) {
      for (const w of s.waiting.values()) nsp.sockets.get(w.socketId)?.emit("denied", { reason });
      for (const p of s.peers.values()) {
        const ps = nsp.sockets.get(p.socketId);
        if (ps) {
          ps.leave(`live:${room.code}`);
          ps.data.code = null;
          ps.data.peerId = null;
        }
      }
      rooms.delete(room.code);
    }
    if (s?.transport === "sfu") media.livekitAdmin(media.livekitConfig(), "DeleteRoom", { room: room.id });
    run("DELETE FROM live_devices WHERE room_id=?", [room.id]).catch(() => {});
  }

  return { nsp, endRoom, realtime };
}

module.exports = { createLiveSignal };
