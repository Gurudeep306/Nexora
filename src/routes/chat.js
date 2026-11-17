// Messages over HTTP (src/chat.js holds the rules). Every route needs a
// session; writes must come from the site itself (CSRF). Live updates go to
// each member's sockets: chat:message, chat:update, chat:reaction, chat:read,
// chat:conversation (members or name changed), chat:typing (src/server.js).
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const rateLimit = require("express-rate-limit");
const chat = require("../chat");
const { getSessionUser } = require("../middleware/auth");
const { persistUpload } = require("../upload-store");

const FILE_MAX = 5 * 1024 * 1024;
const TEXT_EXT = /\.(txt|md|c|h|cc|cpp|hpp|py|java|js|ts|go|rs|kt|cs|rb|php|swift|json|csv|sql|sh|log|in|out)$/i;

/** What a stored file is, by its own bytes; text and code are kept as .txt. */
function kindOf(buf, name) {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", type: "image/png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (buf.subarray(0, 4).toString("latin1") === "GIF8") return { ext: "gif", type: "image/gif" };
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return { ext: "webp", type: "image/webp" };
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { ext: "pdf", type: "application/pdf" };
  // Voice notes: WebM/Matroska (Chrome, Firefox), Ogg, MP4 audio (Safari), MP3.
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: "webm", type: "audio/webm" };
  if (buf.subarray(0, 4).toString("latin1") === "OggS") return { ext: "ogg", type: "audio/ogg" };
  if (buf.subarray(4, 8).toString("latin1") === "ftyp" && /^(M4A |mp42|isom|iso\d|dash)/.test(buf.subarray(8, 12).toString("latin1"))) return { ext: "m4a", type: "audio/mp4" };
  if (buf.subarray(0, 3).toString("latin1") === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { ext: "mp3", type: "audio/mpeg" };
  if (TEXT_EXT.test(name) && !buf.includes(0)) {
    const text = buf.toString("utf8");
    if (!text.includes("�")) return { ext: "txt", type: "text/plain" };
  }
  return null;
}

function createChatRouter({ realtime, isTrustedOrigin, catalog, gate }) {
  const router = express.Router();
  const me = (req) => getSessionUser(req)?.username || null;
  // A shared solution's code is a spoiler, so anything carrying messages is
  // shaped for each person who gets it (chat.viewMany hides code they haven't earned).
  const personal = async (viewer, payload) => {
    if (payload?.message) return { ...payload, message: await chat.viewFor(viewer, payload.message) };
    if (Array.isArray(payload?.messages)) return { ...payload, messages: await chat.viewMany(viewer, payload.messages) };
    return payload;
  };
  const emit = (names, event, payload) => {
    if (!payload?.message && !payload?.messages) {
      for (const n of names) realtime?.emitToUser?.(n, event, payload);
      return Promise.resolve();
    }
    return Promise.all(names.map(async (n) => realtime?.emitToUser?.(n, event, await personal(n, payload)))).catch((e) => console.error("[chat] emit", e.message));
  };
  const toMembers = async (convId, event, payload) => emit(await chat.memberNames(convId), event, payload);
  const h = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof chat.ChatError) return res.status(e.status).json({ ok: false, error: e.message });
      console.error("[chat]", req.method, req.path, e.message);
      res.status(500).json({ ok: false, error: "Something went wrong" });
    }
  };

  router.use("/api/chat", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!me(req)) return res.status(401).json({ ok: false, error: "Please sign in first" });
    if (req.method !== "GET" && isTrustedOrigin && !isTrustedOrigin(req)) return res.status(403).json({ ok: false, error: "Untrusted origin" });
    try {
      await chat.init();
    } catch (e) {
      console.error("[chat] init", e.message);
      return res.status(503).json({ ok: false, error: "Messages are starting up. Try again in a moment." });
    }
    next();
  });
  const limiter = (name, limit, windowSec, msg) =>
    rateLimit({
      windowMs: windowSec * 1000,
      limit: Number(process.env[`CHAT_${name.toUpperCase()}_LIMIT`]) || limit,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `chat-${name}:${me(req)}`,
      validate: { keyGeneratorIpFallback: false },
      skipFailedRequests: true,
      message: { ok: false, error: msg, code: "rate_limited" },
    });
  const sendLimiter = limiter("send", 40, 60, "You're sending a lot of messages. Wait a moment and try again.");
  const uploadLimiter = limiter("upload", 20, 600, "Too many files. Try again in a few minutes.");
  const groupLimiter = limiter("group", 10, 3600, "Too many new groups. Try again later.");
  const inviteLimiter = limiter("invite", 15, 600, "That's a lot of invites. Try again in a few minutes.");

  /* ── share cards, built from the server's own data ── */

  async function buildShare(user, s) {
    const type = String(s?.type || "");
    const { get } = require("../db");
    if (type === "problem") {
      const p = await get("SELECT id, title, platform, rating, category FROM problems WHERE id=?", [Number(s.id) || 0]);
      if (!p || p.category === "__hidden") throw new chat.ChatError(404, "That problem isn't available");
      return { type, id: p.id, title: p.title, platform: p.platform, rating: p.rating || null, link: `/solve/${p.id}` };
    }
    if (type === "submission") {
      const r = await get(
        `SELECT s.id, s.language, s.verdict, s.exec_time_ms, s.memory_kb, s.code, s.submitted_at, p.id AS pid, p.title, p.platform FROM submissions s
         JOIN problems p ON p.id = s.problem_rowid WHERE s.id=? AND s.username=?`,
        [Number(s.id) || 0, user],
      );
      if (!r) throw new chat.ChatError(404, "You can only share your own solutions");
      return {
        type,
        id: r.id,
        by: user,
        problemId: r.pid,
        title: r.title,
        platform: r.platform,
        language: r.language,
        verdict: r.verdict,
        timeMs: r.exec_time_ms || 0,
        memoryKb: r.memory_kb || 0,
        code: String(r.code || "").slice(0, 6000),
        at: r.submitted_at,
        link: `/solve/${r.pid}`,
      };
    }
    if (type === "contest") {
      const c = await get("SELECT id, title, type, start_time, duration_mins, problems, contest_code FROM custom_contests WHERE id=?", [Number(s.id) || 0]);
      if (!c) throw new chat.ChatError(404, "That contest isn't available");
      let n = 0;
      try {
        n = JSON.parse(c.problems || "[]").length;
      } catch {}
      return { type, id: c.id, title: c.title, start: c.start_time, durationMins: c.duration_mins, problems: n, code: c.contest_code, link: "/contests" };
    }
    if (type === "gate") {
      const q = gate.findGateQuestion(String(s.id || "").slice(0, 80));
      if (!q) throw new chat.ChatError(404, "That question isn't available");
      const text = String(q.text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      // Never the answer: the card is an invitation to try it.
      return { type, id: q.id, title: text.length > 160 ? `${text.slice(0, 157)}…` : text, exam: q.exam, year: q.year, marks: q.marks, subject: q.subject, questionType: q.type, link: `/gate/practice?ids=${encodeURIComponent(q.id)}` };
    }
    if (type === "room") {
      const r = await get(
        "SELECT r.id, r.name, r.status, p.id AS pid, p.title AS ptitle FROM solve_rooms r LEFT JOIN problems p ON p.id = r.problem_id WHERE r.id=?",
        [String(s.id || "").slice(0, 12)],
      );
      if (!r || r.status !== "open") throw new chat.ChatError(404, "That room is closed");
      return { type, id: r.id, title: r.name, problem: r.ptitle || null, problemId: r.pid || null, link: `/social?tab=rooms&room=${encodeURIComponent(r.id)}` };
    }
    // "invite" cards are made only by /api/chat/invite-solve.
    throw new chat.ChatError(400, "Unknown share card");
  }

  /** Things to share, for the picker. */
  router.get("/api/chat/shareables", h(async (req, res) => {
    const u = me(req);
    const kind = String(req.query.kind || "problem");
    const q = String(req.query.q || "").trim().slice(0, 80);
    const { all } = require("../db");
    if (kind === "problem") {
      if (q.length >= 2) {
        const c = await catalog.getOpenCatalog();
        const idx = catalog.filterIndices(c, { search: q }).slice(0, 12);
        return res.json({ ok: true, items: idx.map((i) => c.rows[i]).map((p) => ({ id: p.id, title: p.title, platform: p.platform, rating: p.rating })) });
      }
      const recent = await all(
        `SELECT pb.id, pb.title, pb.platform, pb.rating FROM progress pr JOIN problems pb ON pb.id = pr.problem_rowid
         WHERE pr.username=? AND COALESCE(pb.category,'') <> '__hidden' ORDER BY COALESCE(pr.solved_at, '') DESC LIMIT 12`,
        [u],
      );
      return res.json({ ok: true, items: recent });
    }
    if (kind === "submission") {
      const rows = await all(
        `SELECT s.id, s.language, s.verdict, s.submitted_at, p.title FROM submissions s JOIN problems p ON p.id = s.problem_rowid
         WHERE s.username=? ${q ? "AND p.title LIKE ?" : ""} ORDER BY s.submitted_at DESC LIMIT 12`,
        q ? [u, `%${q}%`] : [u],
      );
      return res.json({ ok: true, items: rows });
    }
    if (kind === "contest") {
      const rows = await all(
        `SELECT DISTINCT c.id, c.title, c.start_time, c.duration_mins FROM custom_contests c LEFT JOIN contest_participants cp ON cp.contest_id = c.id
         WHERE (c.creator=? OR cp.username=?) ${q ? "AND c.title LIKE ?" : ""} ORDER BY c.start_time DESC LIMIT 12`,
        q ? [u, u, `%${q}%`] : [u, u],
      );
      return res.json({ ok: true, items: rows });
    }
    if (kind === "gate") {
      if (q.length < 2) return res.json({ ok: true, items: [] });
      const items = gate.searchGateQuestions({ q, limit: 12 }).map((x) => ({ id: x.id, title: String(x.text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140), year: x.year, exam: x.exam, marks: x.marks }));
      return res.json({ ok: true, items });
    }
    res.status(400).json({ ok: false, error: "Unknown kind" });
  }));

  /* ── conversations ── */

  router.get("/api/chat/conversations", h(async (req, res) => res.json({ ok: true, ...(await chat.listFor(me(req))) })));
  router.get("/api/chat/unread", h(async (req, res) => res.json({ ok: true, ...(await chat.unread(me(req))) })));
  router.get("/api/chat/search", h(async (req, res) => res.json({ ok: true, ...(await chat.search(me(req), req.query.q)) })));

  router.post("/api/chat/dm", h(async (req, res) => {
    const id = await chat.openDm(me(req), String(req.body?.username || ""));
    res.json({ ok: true, id });
  }));

  router.post("/api/chat/groups", groupLimiter, h(async (req, res) => {
    const id = await chat.createGroup(me(req), { title: req.body?.title, members: req.body?.members });
    await toMembers(id, "chat:conversation", { conversationId: id });
    res.json({ ok: true, id });
  }));

  router.get("/api/chat/conversations/:id", h(async (req, res) => res.json({ ok: true, ...(await chat.one(me(req), req.params.id)) })));

  router.get("/api/chat/conversations/:id/messages", h(async (req, res) => {
    const { before, after, around, limit } = req.query;
    const page = await chat.messages(me(req), req.params.id, { before, after, around, limit });
    res.json({ ok: true, ...(await personal(me(req), page)), saved: await chat.savedIds(me(req), page.messages.map((m) => m.id)) });
  }));

  router.post("/api/chat/conversations/:id/messages", sendLimiter, h(async (req, res) => {
    const { body, attachment, share, replyTo } = req.body || {};
    const message = await chat.send(me(req), req.params.id, { body, attachment, share, replyTo }, buildShare);
    const members = await chat.memberNames(message.conversationId);
    emit(members, "chat:message", { message });
    // @mentions reach people even in a muted conversation.
    emit(message.mentions.filter((n) => n !== message.username && members.includes(n)), "chat:mention", { conversationId: message.conversationId, messageId: message.id, from: message.username });
    res.json({ ok: true, ...(await personal(me(req), { message })) });
  }));

  router.put("/api/chat/conversations/:id/read", h(async (req, res) => {
    const u = me(req);
    const { lastReadId, visible } = await chat.markRead(u, req.params.id, req.body?.upTo);
    const conversationId = Number(req.params.id);
    // A request read before it's accepted stays unseen by the sender.
    if (visible) await toMembers(conversationId, "chat:read", { conversationId, username: u, lastReadId });
    else realtime?.emitToUser?.(u, "chat:read", { conversationId, username: u, lastReadId });
    res.json({ ok: true, lastReadId });
  }));

  // Group settings: one route per change, each said in the conversation.
  const groupChange = (fn) => h(async (req, res) => {
    const id = Number(req.params.id);
    const before = await chat.memberNames(id).catch(() => []);
    const out = await fn(req);
    const after = await chat.memberNames(id);
    // Everyone who was or is in it hears (the removed see it disappear).
    emit([...new Set([...before, ...after])], "chat:conversation", { conversationId: id });
    res.json({ ok: true, ...(out && typeof out === "object" && !Array.isArray(out) ? out : {}) });
  });
  router.patch("/api/chat/conversations/:id", groupChange((req) => chat.rename(me(req), req.params.id, req.body?.title, req.body?.description)));
  router.post("/api/chat/conversations/:id/accept", groupChange((req) => chat.accept(me(req), req.params.id)));
  router.post("/api/chat/conversations/:id/decline", h(async (req, res) => {
    await chat.decline(me(req), req.params.id);
    res.json({ ok: true });
  }));
  router.put("/api/chat/conversations/:id/mute", h(async (req, res) => res.json({ ok: true, muted: await chat.mute(me(req), req.params.id, !!req.body?.muted) })));
  router.put("/api/chat/conversations/:id/invite", h(async (req, res) => res.json({ ok: true, inviteToken: await chat.setInvite(me(req), req.params.id, !!req.body?.on) })));
  router.get("/api/chat/conversations/:id/pins", h(async (req, res) => res.json({ ok: true, ...(await personal(me(req), { messages: await chat.pins(me(req), req.params.id) })) })));
  router.post("/api/chat/conversations/:id/polls", sendLimiter, h(async (req, res) => {
    const message = await chat.createPoll(me(req), req.params.id, req.body || {});
    await toMembers(message.conversationId, "chat:message", { message });
    res.json({ ok: true, ...(await personal(me(req), { message })) });
  }));

  // Invite links: see a group before joining, then join.
  router.get("/api/chat/invite/:token", h(async (req, res) => res.json({ ok: true, group: await chat.invitePreview(req.params.token) })));
  router.post("/api/chat/invite/:token", h(async (req, res) => {
    const id = await chat.joinByInvite(me(req), req.params.token);
    await toMembers(id, "chat:conversation", { conversationId: id });
    res.json({ ok: true, id });
  }));

  // Who may message me, and my saved messages.
  router.get("/api/chat/settings", h(async (req, res) => res.json({ ok: true, settings: await chat.settingsFor(me(req)) })));
  router.put("/api/chat/settings", h(async (req, res) => res.json({ ok: true, settings: await chat.setSettings(me(req), { who: String(req.body?.who || "") }) })));
  router.get("/api/chat/saved", h(async (req, res) => res.json({ ok: true, ...(await personal(me(req), { messages: await chat.saved(me(req)) })) })));
  router.post("/api/chat/conversations/:id/members", groupChange(async (req) => ({ added: await chat.addMembers(me(req), req.params.id, req.body?.usernames) })));
  router.delete("/api/chat/conversations/:id/members/:username", groupChange((req) => chat.removeMember(me(req), req.params.id, req.params.username)));
  router.put("/api/chat/conversations/:id/members/:username", groupChange((req) => chat.setRole(me(req), req.params.id, req.params.username, String(req.body?.role || ""))));
  router.post("/api/chat/conversations/:id/leave", groupChange((req) => chat.leave(me(req), req.params.id)));

  /* ── one message ── */

  router.patch("/api/chat/messages/:id", h(async (req, res) => {
    const message = await chat.edit(me(req), req.params.id, req.body?.body);
    await toMembers(message.conversationId, "chat:update", { message });
    res.json({ ok: true, ...(await personal(me(req), { message })) });
  }));
  router.delete("/api/chat/messages/:id", h(async (req, res) => {
    const message = await chat.remove(me(req), req.params.id);
    await toMembers(message.conversationId, "chat:update", { message });
    res.json({ ok: true, ...(await personal(me(req), { message })) });
  }));
  const update = (fn) => h(async (req, res) => {
    const message = await fn(req);
    await toMembers(message.conversationId, "chat:update", { message });
    res.json({ ok: true, ...(await personal(me(req), { message })) });
  });
  router.post("/api/chat/messages/:id/pin", update((req) => chat.pin(me(req), req.params.id)));
  router.post("/api/chat/messages/:id/vote", update((req) => chat.vote(me(req), req.params.id, req.body?.options)));
  router.post("/api/chat/messages/:id/close", update((req) => chat.closePoll(me(req), req.params.id)));
  router.post("/api/chat/messages/:id/save", h(async (req, res) => res.json({ ok: true, saved: await chat.toggleSave(me(req), req.params.id) })));
  router.post("/api/chat/messages/:id/forward", sendLimiter, h(async (req, res) => {
    const sent = await chat.forward(me(req), req.params.id, req.body?.conversationIds);
    for (const message of sent) await toMembers(message.conversationId, "chat:message", { message });
    res.json({ ok: true, count: sent.length });
  }));
  // "Reveal": show a hidden solution to a member who chose to see it.
  router.post("/api/chat/messages/:id/reveal", h(async (req, res) => res.json({ ok: true, ...(await chat.revealCode(me(req), req.params.id)) })));

  /* ── invite to solve ── */

  // Ask friends (each in your direct chat) and groups to solve a problem.
  // Each gets a card with the problem, a Solve button and who has solved it.
  router.post("/api/chat/invite-solve", inviteLimiter, h(async (req, res) => {
    const u = me(req);
    const { get } = require("../db");
    const invites = require("../solve-invites");
    const b = req.body || {};
    const p = await get("SELECT id, title, platform, rating, category FROM problems WHERE id=?", [Number(b.problemId) || 0]);
    if (!p || p.category === "__hidden") throw new chat.ChatError(404, "That problem isn't available");
    const usernames = [...new Set((Array.isArray(b.usernames) ? b.usernames : []).map((x) => String(x || "").slice(0, 40)).filter((x) => x && x !== u))].slice(0, 20);
    const groupIds = [...new Set((Array.isArray(b.conversationIds) ? b.conversationIds : []).map(Number).filter(Boolean))].slice(0, 5);
    if (!usernames.length && !groupIds.length) throw new chat.ChatError(400, "Choose someone to invite");

    // Where the cards go: each friend's direct chat (blocks and "who can message
    // me" apply as for any message), and groups you're in.
    const targets = [];
    const skipped = [];
    for (const name of usernames) {
      try {
        targets.push({ id: await chat.openDm(u, name), people: [name] });
      } catch (e) {
        if (!(e instanceof chat.ChatError)) throw e;
        skipped.push({ username: name, reason: e.message });
      }
    }
    for (const id of groupIds) {
      const m = await chat.membership(id, u);
      if (m.kind !== "group") throw new chat.ChatError(400, "Pick a group, or choose people");
      targets.push({ id, people: (await chat.memberNames(id)).filter((n) => n !== u) });
    }
    if (!targets.length) throw new chat.ChatError(403, skipped[0]?.reason || "No one could be invited");

    const people = [...new Set(targets.flatMap((t) => t.people))].slice(0, invites.MAX_PEOPLE);
    const inviteId = await invites.create(u, p.id, people, { race: !!b.race });
    const card = { type: "invite", inviteId, problemId: p.id, title: p.title, platform: p.platform, rating: p.rating || null, link: `/solve/${p.id}` };
    const note = String(b.note || "").trim().slice(0, 200);
    const sent = [];
    for (const t of targets) {
      // The card is built here, never taken from the request (see chat.send).
      const message = await chat.send(u, t.id, { body: note, forwardedShare: card }, buildShare);
      await invites.linkMessage(inviteId, message.id);
      await toMembers(message.conversationId, "chat:message", { message });
      sent.push(message);
    }
    const linkFor = new Map(targets.flatMap((t) => t.people.map((n) => [n, `/social?tab=messages&c=${t.id}`])));
    for (const n of people) await invites.notify(realtime, n, u, "invite_solve", { link: linkFor.get(n), title: p.title });
    res.json({ ok: true, inviteId, sent: sent.length, conversationIds: targets.map((t) => t.id), skipped });
  }));

  router.post("/api/chat/messages/:id/report", h(async (req, res) => res.json({ ok: true, ...(await chat.report(me(req), req.params.id, req.body || {})) })));
  router.post("/api/chat/messages/:id/react", h(async (req, res) => {
    const out = await chat.react(me(req), req.params.id, req.body?.emoji);
    await toMembers(out.conversationId, "chat:reaction", out);
    res.json({ ok: true, ...out });
  }));

  /* ── attachments: pictures, PDFs, and text or code files ── */

  const multer = require("multer");
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: FILE_MAX, files: 1 } });
  router.post("/api/chat/upload", uploadLimiter, (req, res) => {
    upload.single("file")(req, res, async (err) => {
      try {
        if (err) return res.status(400).json({ ok: false, error: err.code === "LIMIT_FILE_SIZE" ? "Files can be up to 5 MB" : "Could not read the file" });
        const buf = req.file?.buffer;
        const name = String(req.file?.originalname || "file").slice(0, 120);
        const kind = buf && buf.length ? kindOf(buf, name) : null;
        if (!kind) return res.status(400).json({ ok: false, error: "Send a picture (PNG, JPEG, GIF, WebP), a PDF, a voice note, or a text or code file" });
        const file = `${crypto.randomBytes(12).toString("hex")}.${kind.ext}`;
        const dir = path.join(__dirname, "..", "..", "public", "uploads", "chat");
        fs.mkdirSync(dir, { recursive: true });
        const abs = path.join(dir, file);
        fs.writeFileSync(abs, buf);
        const url = `/uploads/chat/${file}`;
        await persistUpload(url, abs);
        const k = ["png", "jpg", "gif", "webp"].includes(kind.ext) ? "image" : ["webm", "ogg", "m4a", "mp3"].includes(kind.ext) ? "audio" : "file";
        res.json({ ok: true, attachment: { url, name, size: buf.length, type: kind.type, kind: k } });
      } catch (e) {
        console.error("[chat] upload", e.message);
        res.status(500).json({ ok: false, error: "Could not store the file" });
      }
    });
  });

  return router;
}

module.exports = { createChatRouter, kindOf };
