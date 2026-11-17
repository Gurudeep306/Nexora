// Hosted contests (src/contests.js): build, share, join, sit, mark and analyse.
// Anyone signed in can host. The host (or staff with contests.manage) edits
// and sees every answer; people taking part see what the rules allow.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const C = require("../contests");
const { run, get, all } = require("../db");
const { me } = require("../context");
const { can } = require("../authz/permissions");

function createHostedContestsRouter({ gate, hashPassword, verifyPassword }) {
  const router = express.Router();
  const gateBank = () => gate.loadGateBank();
  const h = (fn) => async (req, res) => {
    try {
      await C.init();
      if (!me()) return res.status(401).json({ ok: false, error: "Please sign in first" });
      await fn(req, res);
    } catch (e) {
      res.status(e.status || 500).json({ ok: false, error: e.status ? e.message : "Something went wrong" });
      if (!e.status) console.error("[contests]", e);
    }
  };
  const writeLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => me() || req.ip });
  const isStaff = (req) => can(req, "contests.manage");
  const isHost = (req, c) => c.creator === me() || isStaff(req);

  async function mustLoad(id) {
    const x = await C.load(id);
    if (!x) throw C.fail(404, "Contest not found");
    await C.migrateLegacyItems(x.contest);
    return x;
  }
  async function mustHost(req, id) {
    const x = await mustLoad(id);
    if (!isHost(req, x.contest)) throw C.fail(403, "Only the host can change this contest");
    return x;
  }
  /** Questions are fixed once anyone has started (fair to everyone). */
  async function locked(c) {
    if (c.status === "draft") return false;
    const started = await get("SELECT 1 AS x FROM contest_participants WHERE contest_id=? AND started_at IS NOT NULL LIMIT 1", [c.id]);
    return !!started || (c.settings.mode === "fixed" && C.phase(c) !== "upcoming");
  }
  async function mustBeOpen(c) {
    if (await locked(c)) throw C.fail(409, "The questions are fixed now that the contest has started");
  }

  /* ── what each item is ── */

  // One plain line: display maths becomes "…", inline maths keeps its symbols ($n = 6$ → n = 6).
  const stripMd = (s) =>
    String(s || "")
      .replace(/\$\$[\s\S]*?\$\$/g, "…")
      .replace(/\$([^$\n]*)\$/g, (_m, x) => x.replace(/\\[a-z]+/gi, "").replace(/[{}^_]/g, ""))
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/[#*_`>[\]()!]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  async function describe(items, questions, { forHost }) {
    const probIds = items.filter((i) => i.kind === "problem").map((i) => Number(i.ref));
    const wsIds = items.filter((i) => i.kind === "workshop").map((i) => Number(i.ref));
    const probs = probIds.length ? await all(`SELECT id, platform, problem_id, title, rating FROM problems WHERE id IN (${probIds.map(() => "?").join(",")})`, probIds) : [];
    const ws = wsIds.length ? await all(`SELECT id, title, difficulty, contest_only, creator FROM custom_problems WHERE id IN (${wsIds.map(() => "?").join(",")})`, wsIds) : [];
    const P = new Map(probs.map((p) => [String(p.id), p]));
    const W = new Map(ws.map((p) => [String(p.id), p]));
    const bank = gateBank();
    return items.map((it) => {
      const base = { idx: it.idx, kind: it.kind, ref: it.ref, marks: it.marks };
      if (it.kind === "problem") {
        const p = P.get(it.ref);
        return { ...base, title: p?.title || "A problem that was removed", source: p ? `${p.platform} ${p.problem_id}` : "", rating: p?.rating || null, link: p ? `/solve/${p.id}` : null, missing: !p };
      }
      if (it.kind === "workshop") {
        const p = W.get(it.ref);
        return { ...base, title: p?.title || "A problem that was removed", source: p?.contest_only ? "Written for this contest" : "Workshop", rating: p?.difficulty || null, link: p ? `/solve/custom/${p.id}` : null, missing: !p, ...(forHost && p ? { editable: p.creator === me() } : {}) };
      }
      if (it.kind === "gate") {
        const q = bank.byId.get(it.ref);
        return { ...base, title: q ? stripMd(q.text).slice(0, 120) : "A question that was removed", source: q ? `GATE ${q.exam} ${q.year}${q.set ? ` set ${q.set}` : ""} · Q${q.number}` : "", type: q?.type || null, missing: !q };
      }
      const q = questions.get(it.ref);
      return {
        ...base,
        title: q ? stripMd(q.text).slice(0, 120) || "Untitled question" : "A question that was removed",
        source: "",
        type: q?.type || null,
        missing: !q,
        ...(forHost && q ? { question: q, problems: C.questionProblems(q) } : {}),
      };
    });
  }

  async function names(usernames) {
    if (!usernames.length) return {};
    const rows = await all(`SELECT username, display_name FROM users WHERE username IN (${usernames.map(() => "?").join(",")})`, usernames);
    return Object.fromEntries(rows.map((r) => [r.username, r.display_name || ""]));
  }

  async function data(c) {
    const items = await C.itemsOf(c.id);
    const [entries, runs, responses] = await Promise.all([
      all("SELECT * FROM contest_participants WHERE contest_id=?", [c.id]),
      all("SELECT username, item_idx, verdict, at FROM contest_runs WHERE contest_id=? ORDER BY at", [c.id]),
      all("SELECT * FROM contest_responses WHERE contest_id=?", [c.id]),
    ]);
    return { items, entries, runs: runs.map((r) => ({ ...r, item_idx: Number(r.item_idx), at: Number(r.at) })), responses: responses.map((r) => ({ ...r, item_idx: Number(r.item_idx) })) };
  }

  function summary(c, extra = {}) {
    return {
      id: c.id,
      title: c.title,
      code: c.contest_code,
      creator: c.creator,
      status: c.status,
      phase: C.phase(c),
      startTime: c.start_time,
      durationMins: Number(c.duration_mins),
      closesAt: new Date(C.closesAt(c)).toISOString(),
      settings: { ...c.settings },
      ...extra,
    };
  }

  /* ── lists ── */

  router.get("/api/hosted/mine", h(async (req, res) => {
    const u = me();
    const hosting = await all(
      `SELECT c.*, (SELECT COUNT(*) FROM contest_participants p WHERE p.contest_id=c.id) AS people,
              (SELECT COUNT(*) FROM contest_items i WHERE i.contest_id=c.id) AS item_count
       FROM custom_contests c WHERE c.creator=? ORDER BY c.id DESC LIMIT 200`,
      [u],
    );
    const joined = await all(
      `SELECT c.*, p.started_at, p.finished_at, p.ends_at FROM contest_participants p JOIN custom_contests c ON c.id=p.contest_id
       WHERE p.username=? AND c.creator<>? ORDER BY c.id DESC LIMIT 200`,
      [u, u],
    );
    res.json({
      ok: true,
      hosting: hosting.map((r) => summary(C.shape(r), { people: Number(r.people), items: Number(r.item_count) })),
      joined: joined.map((r) => {
        const c = C.shape(r);
        return summary(c, { mine: C.personWindow(c, r).state });
      }),
    });
  }));

  /* ── build ── */

  router.post("/api/hosted", writeLimiter, h(async (req, res) => {
    const u = me();
    const drafts = await get("SELECT COUNT(*) AS n FROM custom_contests WHERE creator=? AND status='draft'", [u]);
    if (Number(drafts?.n) >= C.MAX_DRAFTS) throw C.fail(400, `You can keep up to ${C.MAX_DRAFTS} drafts. Publish or delete one first.`);
    const title = String(req.body?.title || "").trim().slice(0, 120) || "Untitled contest";
    // The next whole hour, at least 30 minutes away.
    const start = new Date(Math.ceil((Date.now() + 30 * 60000) / 3600000) * 3600000).toISOString();
    let code = C.genCode();
    for (let i = 0; i < 10 && (await get("SELECT 1 AS x FROM custom_contests WHERE contest_code=?", [code])); i++) code = C.genCode();
    const r = await run(
      `INSERT INTO custom_contests(creator, title, description, type, contest_code, password_hash, org_tag, start_time, duration_mins, problems, max_participants, status, settings, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [u, title, "", "speed", code, "", "", start, 120, "[]", 500, "draft", JSON.stringify(C.SETTINGS_DEFAULT), new Date().toISOString()],
    );
    const id = r.lastID;
    if (req.body?.item) await addItem({ id, creator: u, status: "draft", settings: C.SETTINGS_DEFAULT }, req.body.item);
    res.json({ ok: true, id, code });
  }));

  router.get("/api/hosted/:id(\\d+)", h(async (req, res) => {
    const { contest: c } = await mustLoad(req.params.id);
    const host = isHost(req, c);
    const mine = await C.entry(c.id, me());
    if (!host && !mine) throw C.fail(403, "Join the contest first");
    const items = await C.itemsOf(c.id);
    const questions = await C.questionsOf(c.id);
    const w = C.personWindow(c, mine);
    const showItems = host || w.state === "running" || w.state === "finished" || C.phase(c) === "ended";
    res.json({
      ok: true,
      contest: summary(c, { description: c.description, hasPassword: c.hasPassword, maxParticipants: Number(c.max_participants) }),
      host,
      locked: host ? await locked(c) : undefined,
      me: mine ? { ...w, paperDone: !!mine.paper_at } : null,
      totalMarks: C.round2(items.reduce((a, it) => a + it.marks, 0)),
      itemCount: items.length,
      items: showItems ? await describe(items, questions, { forHost: host }) : [],
    });
  }));

  router.put("/api/hosted/:id(\\d+)", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    const b = req.body || {};
    const sets = [];
    const args = [];
    const set = (col, v) => {
      sets.push(`${col}=?`);
      args.push(v);
    };
    const started = await locked(c);
    if ("title" in b) set("title", String(b.title || "").trim().slice(0, 120) || "Untitled contest");
    if ("description" in b) set("description", String(b.description || "").slice(0, 10000));
    if ("maxParticipants" in b) set("max_participants", Math.max(2, Math.min(5000, Math.round(Number(b.maxParticipants) || 500))));
    if ("startTime" in b) {
      if (started) throw C.fail(409, "The start time is fixed once the contest has started");
      if (Number.isNaN(Date.parse(b.startTime))) throw C.fail(400, "Choose a start time");
      set("start_time", new Date(b.startTime).toISOString());
    }
    if ("durationMins" in b) {
      const d = Math.round(Number(b.durationMins));
      if (!(d >= 5 && d <= C.MAX_DURATION)) throw C.fail(400, "The duration must be between 5 minutes and 7 days");
      set("duration_mins", d);
    }
    if ("settings" in b) set("settings", JSON.stringify(C.normalizeSettings(b.settings, c.settings)));
    if ("password" in b && b.password != null) {
      const p = String(b.password);
      if (p && p.length < 4) throw C.fail(400, "The password needs at least 4 characters");
      set("password_hash", p ? await hashPassword(p) : "");
    }
    if (sets.length) {
      set("updated_at", new Date().toISOString());
      await run(`UPDATE custom_contests SET ${sets.join(", ")} WHERE id=?`, [...args, c.id]);
    }
    res.json({ ok: true });
  }));

  async function validItem(c, it) {
    const kind = String(it?.kind || "");
    const ref = String(it?.ref ?? "").slice(0, 80);
    if (!C.KINDS.includes(kind)) throw C.fail(400, "Unknown kind of question");
    let marks = Number(it?.marks);
    if (kind === "problem") {
      const p = await get("SELECT id, category FROM problems WHERE id=?", [Number(ref) || 0]);
      if (!p || p.category === "__hidden") throw C.fail(400, "That problem is not in the catalog");
      marks = Number.isFinite(marks) ? marks : 100;
    } else if (kind === "workshop") {
      const p = await get("SELECT id, creator, contest_only FROM custom_problems WHERE id=?", [Number(ref) || 0]);
      if (!p) throw C.fail(400, "That Workshop problem does not exist");
      if (Number(p.contest_only) && p.creator !== c.creator) throw C.fail(403, "That problem was written for someone else's contest");
      marks = Number.isFinite(marks) ? marks : 100;
    } else if (kind === "gate") {
      const q = gateBank().byId.get(ref);
      if (!q) throw C.fail(400, "That GATE question does not exist");
      if (!["MCQ", "MSQ", "NAT"].includes(q.type) || q.answer == null || q.answer === "") throw C.fail(400, "Only GATE questions with a checked answer (MCQ, MSQ or NAT) can be marked");
      marks = Number.isFinite(marks) ? marks : q.marks || 1;
    } else {
      const q = await get("SELECT data FROM contest_questions WHERE id=? AND contest_id=?", [Number(ref) || 0, c.id]);
      if (!q) throw C.fail(400, "That question is not part of this contest");
      marks = C.cleanQuestion(C.parse(q.data, {})).marks;
    }
    return { kind, ref: String(kind === "gate" ? ref : Number(ref)), marks: C.round2(Math.max(0.25, Math.min(1000, marks))) };
  }

  async function writeItems(contestId, list) {
    await run("DELETE FROM contest_items WHERE contest_id=?", [contestId]);
    for (const [i, it] of list.entries()) {
      await run("INSERT INTO contest_items(contest_id, idx, kind, ref, marks) VALUES(?,?,?,?,?)", [contestId, i, it.kind, it.ref, it.marks]);
    }
    await run("UPDATE custom_contests SET updated_at=? WHERE id=?", [new Date().toISOString(), contestId]);
  }

  async function addItem(c, raw) {
    const it = await validItem(c, raw);
    const items = await C.itemsOf(c.id);
    if (items.some((x) => x.kind === it.kind && x.ref === it.ref)) return { added: false, reason: "It is already in this contest" };
    if (items.length >= C.MAX_ITEMS) throw C.fail(400, `A contest can have up to ${C.MAX_ITEMS} questions`);
    await run("INSERT INTO contest_items(contest_id, idx, kind, ref, marks) VALUES(?,?,?,?,?)", [c.id, items.length, it.kind, it.ref, it.marks]);
    return { added: true };
  }

  router.put("/api/hosted/:id(\\d+)/items", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    await mustBeOpen(c);
    const list = Array.isArray(req.body?.items) ? req.body.items : [];
    if (list.length > C.MAX_ITEMS) throw C.fail(400, `A contest can have up to ${C.MAX_ITEMS} questions`);
    const out = [];
    const seen = new Set();
    for (const raw of list) {
      const it = await validItem(c, raw);
      const k = `${it.kind}:${it.ref}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(it);
      }
    }
    await writeItems(c.id, out);
    res.json({ ok: true });
  }));

  router.post("/api/hosted/:id(\\d+)/items", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    await mustBeOpen(c);
    res.json({ ok: true, ...(await addItem(c, req.body || {})) });
  }));

  /* Questions written for this contest. */
  router.post("/api/hosted/:id(\\d+)/questions", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    await mustBeOpen(c);
    const n = await get("SELECT COUNT(*) AS n FROM contest_questions WHERE contest_id=?", [c.id]);
    if (Number(n?.n) >= C.MAX_QUESTIONS) throw C.fail(400, `A contest can have up to ${C.MAX_QUESTIONS} questions of its own`);
    const q = C.cleanQuestion(req.body?.data || { type: req.body?.type || "MCQ", options: ["", "", "", ""] });
    const now = Date.now();
    const r = await run("INSERT INTO contest_questions(contest_id, data, created_at, updated_at) VALUES(?,?,?,?)", [c.id, JSON.stringify(q), now, now]);
    await addItem(c, { kind: "question", ref: r.lastID });
    res.json({ ok: true, id: r.lastID, question: q, problems: C.questionProblems(q) });
  }));

  router.put("/api/hosted/:id(\\d+)/questions/:qid(\\d+)", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    await mustBeOpen(c);
    const row = await get("SELECT id FROM contest_questions WHERE id=? AND contest_id=?", [req.params.qid, c.id]);
    if (!row) throw C.fail(404, "Question not found");
    const q = C.cleanQuestion(req.body?.data || {});
    await run("UPDATE contest_questions SET data=?, updated_at=? WHERE id=?", [JSON.stringify(q), Date.now(), row.id]);
    await run("UPDATE contest_items SET marks=? WHERE contest_id=? AND kind='question' AND ref=?", [q.marks, c.id, String(row.id)]);
    res.json({ ok: true, question: q, problems: C.questionProblems(q) });
  }));

  router.delete("/api/hosted/:id(\\d+)/questions/:qid(\\d+)", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    await mustBeOpen(c);
    await run("DELETE FROM contest_questions WHERE id=? AND contest_id=?", [req.params.qid, c.id]);
    const rest = (await C.itemsOf(c.id)).filter((it) => !(it.kind === "question" && it.ref === String(Number(req.params.qid))));
    await writeItems(c.id, rest);
    res.json({ ok: true });
  }));

  /* A figure for a question: PNG, JPEG, GIF or WebP up to 2 MB, checked by its bytes. */
  const multer = require("multer");
  const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
  router.post("/api/hosted/:id(\\d+)/image", writeLimiter, (req, res, next) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ ok: false, error: err.code === "LIMIT_FILE_SIZE" ? "Pictures can be up to 2 MB" : "Could not read the file" });
      next();
    });
  }, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    const buf = req.file?.buffer;
    const ext = require("../image-kind").imageKind(buf);
    if (!ext) throw C.fail(400, "Use a PNG, JPEG, GIF or WebP picture");
    const { UPLOADS_DIR, persistUpload } = require("../upload-store");
    const dir = path.join(UPLOADS_DIR, "contests");
    fs.mkdirSync(dir, { recursive: true });
    const name = `${c.id}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(dir, name), buf);
    const url = `/uploads/contests/${name}`;
    await persistUpload(url, path.join(dir, name));
    res.json({ ok: true, url });
  }));

  /* A coding problem written only for this host's contests (Workshop editor, hidden elsewhere). */
  router.post("/api/hosted/:id(\\d+)/coding-problem", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    await mustBeOpen(c);
    const r = await run(
      `INSERT INTO custom_problems(creator, title, statement, input_spec, output_spec, difficulty, tags, samples, testcases, time_limit, memory_limit, created_at, contest_only, editorial)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,'')`,
      [me(), "Untitled problem", "", "", "", 1200, "[]", "[]", "[]", "2 seconds", "256 MB", new Date().toISOString()],
    );
    await addItem(c, { kind: "workshop", ref: r.lastID });
    res.json({ ok: true, id: r.lastID });
  }));

  /* ── publish ── */

  async function publishProblems(c) {
    const items = await C.itemsOf(c.id);
    const questions = await C.questionsOf(c.id);
    const out = [];
    if (!c.title.trim()) out.push("a title");
    if (!items.length) out.push("at least one question");
    const desc = await describe(items, questions, { forHost: true });
    const gone = desc.filter((d) => d.missing).length;
    if (gone) out.push(`${gone} removed question${gone > 1 ? "s" : ""} taken out`);
    const unfinished = desc.filter((d) => d.problems?.length).length;
    if (unfinished) out.push(`${unfinished} unfinished question${unfinished > 1 ? "s" : ""} completed`);
    const ws = items.filter((i) => i.kind === "workshop").map((i) => Number(i.ref));
    if (ws.length) {
      const rows = await all(`SELECT id, title, samples, testcases FROM custom_problems WHERE id IN (${ws.map(() => "?").join(",")})`, ws);
      const empty = rows.filter((p) => !C.parse(p.samples, []).length && !C.parse(p.testcases, []).length);
      if (empty.length) out.push(`tests for “${empty[0].title}”`);
    }
    if (c.settings.mode === "window") {
      if (!c.settings.endTime) out.push("the time the window closes");
      else if (Date.parse(c.settings.endTime) <= Date.parse(c.start_time)) out.push("a window that closes after it opens");
    }
    if (c.settings.access === "password" && !c.hasPassword) out.push("a password");
    return out;
  }

  router.get("/api/hosted/:id(\\d+)/check", h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    res.json({ ok: true, missing: await publishProblems(c) });
  }));

  router.post("/api/hosted/:id(\\d+)/publish", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    const missing = await publishProblems(c);
    if (missing.length) throw C.fail(400, `Still needed: ${missing.join(", ")}`);
    if (C.closesAt(c) <= Date.now()) throw C.fail(400, "That time has already passed: choose a later start");
    await run("UPDATE custom_contests SET status='published', updated_at=? WHERE id=?", [new Date().toISOString(), c.id]);
    res.json({ ok: true });
  }));

  router.post("/api/hosted/:id(\\d+)/unpublish", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    const n = await get("SELECT COUNT(*) AS n FROM contest_participants WHERE contest_id=?", [c.id]);
    if (Number(n?.n)) throw C.fail(409, "People have joined: it can't go back to a draft");
    await run("UPDATE custom_contests SET status='draft', updated_at=? WHERE id=?", [new Date().toISOString(), c.id]);
    res.json({ ok: true });
  }));

  router.delete("/api/hosted/:id(\\d+)", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustHost(req, req.params.id);
    for (const t of ["contest_items", "contest_questions", "contest_responses", "contest_runs", "contest_participants"]) await run(`DELETE FROM ${t} WHERE contest_id=?`, [c.id]);
    await run("DELETE FROM custom_contests WHERE id=?", [c.id]);
    res.json({ ok: true });
  }));

  /* ── take part ── */

  router.get("/api/hosted/code/:code", h(async (req, res) => {
    const x = await C.byCode(req.params.code);
    if (!x || (x.contest.status === "draft" && !isHost(req, x.contest))) throw C.fail(404, "No contest has that code");
    const c = x.contest;
    const items = await C.itemsOf(c.id);
    const mine = await C.entry(c.id, me());
    const n = await get("SELECT COUNT(*) AS n FROM contest_participants WHERE contest_id=?", [c.id]);
    const hostName = (await names([c.creator]))[c.creator] || "";
    res.json({
      ok: true,
      contest: summary(c, { description: c.description, hostName, people: Number(n?.n), maxParticipants: Number(c.max_participants) }),
      host: isHost(req, c),
      joined: !!mine,
      needsPassword: c.settings.access === "password" || (!!x.passwordHash && c.settings.access !== "link"),
      itemCount: items.length,
      totalMarks: C.round2(items.reduce((a, it) => a + it.marks, 0)),
      kinds: { coding: items.filter((i) => C.CODING.has(i.kind)).length, paper: items.filter((i) => C.PAPER.has(i.kind)).length },
    });
  }));

  const joinLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => me() || req.ip });
  router.post("/api/hosted/code/:code/join", joinLimiter, h(async (req, res) => {
    const x = await C.byCode(req.params.code);
    if (!x || x.contest.status === "draft") throw C.fail(404, "No contest has that code");
    const c = x.contest;
    if (await C.entry(c.id, me())) return res.json({ ok: true, id: c.id });
    if (C.phase(c) === "ended") throw C.fail(409, "This contest has ended");
    const needs = c.settings.access === "password" || (!!x.passwordHash && c.settings.access !== "link");
    if (needs) {
      const pass = String(req.body?.password || "");
      const okPass = x.passwordHash.includes(":") ? await verifyPassword(pass, x.passwordHash).catch(() => false) : false;
      if (!okPass) throw C.fail(401, "That password is not right");
    }
    const n = await get("SELECT COUNT(*) AS n FROM contest_participants WHERE contest_id=?", [c.id]);
    if (Number(n?.n) >= Number(c.max_participants)) throw C.fail(409, "This contest is full");
    await run("INSERT OR IGNORE INTO contest_participants(contest_id, username) VALUES(?,?)", [c.id, me()]);
    res.json({ ok: true, id: c.id });
  }));

  router.post("/api/hosted/:id(\\d+)/start", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustLoad(req.params.id);
    const e = await C.entry(c.id, me());
    if (!e) throw C.fail(403, "Join the contest first");
    if (C.phase(c) !== "live") throw C.fail(409, C.phase(c) === "ended" ? "This contest has ended" : "The contest has not started yet");
    if (!e.started_at) {
      const now = Date.now();
      const from = c.settings.mode === "window" ? now : Date.parse(c.start_time);
      const ends = Math.min(c.settings.mode === "window" ? now + Number(c.duration_mins) * 60000 : C.closesAt(c), C.closesAt(c));
      await run("UPDATE contest_participants SET started_at=?, ends_at=? WHERE contest_id=? AND username=? AND started_at IS NULL", [from, ends, c.id, me()]);
    }
    res.json({ ok: true, me: C.personWindow(c, await C.entry(c.id, me())) });
  }));

  router.post("/api/hosted/:id(\\d+)/finish", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustLoad(req.params.id);
    const e = await C.entry(c.id, me());
    if (!e) throw C.fail(403, "Join the contest first");
    if (C.personWindow(c, e).state === "running") await run("UPDATE contest_participants SET finished_at=? WHERE contest_id=? AND username=?", [Date.now(), c.id, me()]);
    res.json({ ok: true });
  }));

  /** The paper items (GATE + own questions) in the exam console's shape. */
  async function paperFor(c, { withAnswers }) {
    const items = (await C.itemsOf(c.id)).filter((i) => C.PAPER.has(i.kind));
    const questions = await C.questionsOf(c.id);
    const bank = gateBank();
    const out = [];
    for (const it of items) {
      const id = `i${it.idx}`;
      if (it.kind === "gate") {
        const q = bank.byId.get(it.ref);
        if (!q) continue;
        const s = withAnswers ? gate.strip(q) : gate.stripForExam(q);
        out.push({ ...s, id, bankId: q.id, marks: it.marks, negative: q.type === "MCQ" && c.settings.negativeMarking ? C.round2(it.marks / 3) : 0 });
      } else {
        const q = questions.get(it.ref);
        if (q) out.push({ ...C.asGateQuestion(id, q, { withAnswer: withAnswers }), ...(withAnswers && q.solution ? { solutionText: q.solution } : {}) });
      }
    }
    return { items, questions: out };
  }

  router.get("/api/hosted/:id(\\d+)/paper", h(async (req, res) => {
    const { contest: c } = await mustLoad(req.params.id);
    const host = isHost(req, c);
    const e = await C.entry(c.id, me());
    if (!host && !e) throw C.fail(403, "Join the contest first");
    const w = C.personWindow(c, e);
    if (!host && w.state !== "running" && w.state !== "finished" && C.phase(c) !== "ended") throw C.fail(409, "Start the contest first");
    const review = host || C.canReview(c, e);
    const { questions } = await paperFor(c, { withAnswers: review });
    let mine = null;
    if (e?.paper_at) {
      const rows = await all("SELECT item_idx, response, attempted, correct, marks, time_ms FROM contest_responses WHERE contest_id=? AND username=?", [c.id, me()]);
      mine = Object.fromEntries(rows.map((r) => [`i${r.item_idx}`, { response: C.parse(r.response, null), ...(review ? { correct: !!r.correct, marks: Number(r.marks) } : {}), attempted: !!r.attempted, timeMs: Number(r.time_ms) }]));
    }
    res.json({ ok: true, questions, review, submitted: !!e?.paper_at, mine, endsAt: w.to, negativeMarking: c.settings.negativeMarking });
  }));

  const validResponse = (r) =>
    r == null || (typeof r === "number" && Number.isFinite(r)) || (typeof r === "string" && r.length <= 500) || (Array.isArray(r) && r.length <= 10 && r.every((x) => typeof x === "string" && x.length <= 20));

  router.post("/api/hosted/:id(\\d+)/paper", writeLimiter, h(async (req, res) => {
    const { contest: c } = await mustLoad(req.params.id);
    const e = await C.entry(c.id, me());
    if (!e) throw C.fail(403, "Join the contest first");
    if (e.paper_at) throw C.fail(409, "Your answers were already handed in");
    const w = C.personWindow(c, e);
    // A little grace for the network after the clock reaches zero.
    if (!w.from || Date.now() > w.to + 60_000) throw C.fail(409, "Your time is over");
    const responses = req.body?.responses && typeof req.body.responses === "object" ? req.body.responses : {};
    const timeMs = req.body?.timeMs && typeof req.body.timeMs === "object" ? req.body.timeMs : {};
    const { items } = await paperFor(c, { withAnswers: true });
    const questions = await C.questionsOf(c.id);
    const bank = gateBank();
    const now = Date.now();
    const claim = await run("UPDATE contest_participants SET paper_at=? WHERE contest_id=? AND username=? AND paper_at IS NULL", [now, c.id, me()]);
    if (!claim.changes) throw C.fail(409, "Your answers were already handed in");
    let marks = 0;
    for (const it of items) {
      const key = `i${it.idx}`;
      const resp = Object.prototype.hasOwnProperty.call(responses, key) ? responses[key] : null;
      if (!validResponse(resp)) continue;
      const t = Math.max(0, Math.min(Math.round(Number(timeMs[key]) || 0), 7 * 24 * 3600 * 1000));
      let g;
      if (it.kind === "gate") {
        const q = bank.byId.get(it.ref);
        if (!q) continue;
        g = C.gradeBank(q, resp, it.marks, c.settings.negativeMarking);
      } else {
        const q = questions.get(it.ref);
        if (!q) continue;
        g = C.gradeOwn(q, resp);
      }
      marks += g.marks;
      await run(
        `INSERT OR REPLACE INTO contest_responses(contest_id, username, item_idx, response, attempted, correct, marks, time_ms) VALUES(?,?,?,?,?,?,?,?)`,
        [c.id, me(), it.idx, JSON.stringify(resp), g.attempted ? 1 : 0, g.correct ? 1 : 0, C.round2(g.marks), t],
      );
    }
    // A contest with no coding questions is over for this person once the paper is in.
    const coding = (await C.itemsOf(c.id)).some((i) => C.CODING.has(i.kind));
    if (!coding) await run("UPDATE contest_participants SET finished_at=? WHERE contest_id=? AND username=? AND finished_at IS NULL", [now, c.id, me()]);
    const review = C.canReview(c, await C.entry(c.id, me()));
    res.json({ ok: true, ...(review ? { marks: C.round2(marks) } : {}), review });
  }));

  /* ── standings, analysis, export ── */

  router.get("/api/hosted/:id(\\d+)/standings", h(async (req, res) => {
    const { contest: c } = await mustLoad(req.params.id);
    const host = isHost(req, c);
    const e = await C.entry(c.id, me());
    if (!host && !e) throw C.fail(403, "Join the contest first");
    const d = await data(c);
    const rows = C.standings(c, d.items, d.entries, d.runs, d.responses);
    const visible = host || c.settings.standings === "live" || (c.settings.standings === "after" && C.phase(c) === "ended");
    const review = host || C.canReview(c, e);
    // Paper marks are hidden until people may review answers (they would give the key away).
    const strip = (r) => (review || r.username === me() ? r : { ...r, marks: r.marks - r.cells.filter((x) => !C.CODING.has(x.kind)).reduce((a, x) => a + x.marks, 0), cells: r.cells.map((x) => (C.CODING.has(x.kind) ? x : { idx: x.idx, kind: x.kind, attempted: x.attempted })) });
    const nm = await names(rows.map((r) => r.username));
    const out = (visible ? rows : rows.filter((r) => r.username === me())).map((r) => ({ ...strip(r), name: nm[r.username] || "" }));
    res.json({ ok: true, visible, rows: out, items: d.items.map((i) => ({ idx: i.idx, kind: i.kind, marks: i.marks })), paperMarksHidden: !review });
  }));

  async function hostData(req) {
    const { contest: c } = await mustHost(req, req.params.id);
    const d = await data(c);
    const rows = C.standings(c, d.items, d.entries, d.runs, d.responses);
    const desc = await describe(d.items, await C.questionsOf(c.id), { forHost: true });
    return { c, d, rows, desc };
  }

  router.get("/api/hosted/:id(\\d+)/analysis", h(async (req, res) => {
    const { c, d, rows, desc } = await hostData(req);
    const nm = await names(rows.map((r) => r.username));
    res.json({
      ok: true,
      contest: summary(c),
      items: desc.map((x) => ({ idx: x.idx, kind: x.kind, title: x.title, source: x.source, type: x.type || null, marks: x.marks, ...(x.question ? { answer: x.question.answer } : {}) })),
      rows: rows.map((r) => ({ ...r, name: nm[r.username] || "" })),
      totalMarks: C.round2(d.items.reduce((a, it) => a + it.marks, 0)),
      ...C.analysis(c, d.items, rows, d.responses, d.runs),
    });
  }));

  router.get("/api/hosted/:id(\\d+)/analysis/:username", h(async (req, res) => {
    const { contest: c } = await mustLoad(req.params.id);
    const who = String(req.params.username);
    const host = isHost(req, c);
    if (!host && who !== me()) throw C.fail(403, "You can only see your own answers");
    const e = await C.entry(c.id, who);
    if (!e) throw C.fail(404, "That person did not take part");
    const review = host || C.canReview(c, e);
    const items = await C.itemsOf(c.id);
    const desc = await describe(items, await C.questionsOf(c.id), { forHost: host });
    const resp = await all("SELECT * FROM contest_responses WHERE contest_id=? AND username=?", [c.id, who]);
    const runs = await all("SELECT item_idx, verdict, passed, total, language, at FROM contest_runs WHERE contest_id=? AND username=? ORDER BY at", [c.id, who]);
    const R = new Map(resp.map((r) => [Number(r.item_idx), r]));
    const w = C.personWindow(c, e);
    res.json({
      ok: true,
      username: who,
      name: (await names([who]))[who] || "",
      window: w,
      review,
      items: desc.map((x) => {
        const r = R.get(x.idx);
        const myRuns = runs.filter((u) => Number(u.item_idx) === x.idx).map((u) => ({ ...u, at: Number(u.at) }));
        return {
          idx: x.idx,
          kind: x.kind,
          title: x.title,
          type: x.type || null,
          maxMarks: x.marks,
          ...(C.CODING.has(x.kind)
            ? { runs: myRuns, result: C.codingResult(myRuns, w.from ?? Date.parse(c.start_time)) }
            : { response: r ? C.parse(r.response, null) : null, attempted: !!r?.attempted, timeMs: r ? Number(r.time_ms) : 0, ...(review ? { correct: !!r?.correct, marks: r ? Number(r.marks) : 0 } : {}) }),
        };
      }),
    });
  }));

  router.get("/api/hosted/:id(\\d+)/export.csv", h(async (req, res) => {
    const { c, d, rows, desc } = await hostData(req);
    const nm = await names(rows.map((r) => r.username));
    const csv = C.toCsv(d.items, rows, nm, desc.map((x) => x.title.slice(0, 40)));
    const file = `${c.title.replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "contest"}-marks.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
    res.send(csv);
  }));

  return router;
}

/**
 * Called by /api/judge after a submission: counts it for a contest when the
 * problem is one of its questions and the person's time is running.
 */
async function recordContestRun({ contestId, username, problemRowid, workshopId, verdict, passed, total, language }) {
  await C.init();
  const x = await C.load(contestId);
  if (!x || x.contest.status === "draft" || !username) return { counted: false, reason: "No such contest" };
  const c = x.contest;
  const e = await C.entry(c.id, username);
  if (!e) return { counted: false, reason: "You have not joined this contest" };
  const w = C.personWindow(c, e);
  if (w.state !== "running") return { counted: false, reason: w.state === "finished" ? "Your contest time is over: this run was not counted" : "Start the contest first" };
  const items = await C.itemsOf(c.id);
  const it = items.find((i) => (problemRowid ? i.kind === "problem" && i.ref === String(problemRowid) : i.kind === "workshop" && i.ref === String(workshopId)));
  if (!it) return { counted: false, reason: "This problem is not part of the contest" };
  await run("INSERT INTO contest_runs(contest_id, username, item_idx, verdict, passed, total, language, at) VALUES(?,?,?,?,?,?,?,?)", [c.id, username, it.idx, String(verdict), passed | 0, total | 0, language || null, Date.now()]);
  return { counted: true, contestId: c.id, item: it.idx };
}

/**
 * May this person read a Workshop problem written only for contests? Its
 * author and staff always; people in one of its contests once their time has
 * started (or the contest has ended).
 */
async function canSeeContestProblem(problem, username, staff) {
  if (!Number(problem.contest_only)) return true;
  if (!username) return false;
  if (staff || problem.creator === username) return true;
  await C.init();
  const rows = await all(
    `SELECT c.* , p.started_at, p.ends_at, p.finished_at FROM contest_items i JOIN custom_contests c ON c.id=i.contest_id
     JOIN contest_participants p ON p.contest_id=c.id AND p.username=?
     WHERE i.kind='workshop' AND i.ref=?`,
    [username, String(problem.id)],
  );
  return rows.some((r) => {
    const c = C.shape(r);
    if (c.status === "draft") return false;
    const s = C.personWindow(c, r).state;
    return s === "running" || s === "finished" || C.phase(c) === "ended";
  });
}

module.exports = { createHostedContestsRouter, recordContestRun, canSeeContestProblem };
