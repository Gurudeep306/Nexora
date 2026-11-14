// Hive v4 routes: model intelligence and routing, subscription agents
// (Claude Code / Codex), budgets and alerts, Drive, the Judge, pipelines and
// the Architect, automations, guide mode and personal memory.
// Mounted inside createHiveRouter (staff-only), except /api/hive-bridge/*.
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { run, get, all, newId, now, json } = require("../hive/db");
const hub = require("../hive/hub");
const keys = require("../hive/keys");
const router_ = require("../hive/router");
const perf = require("../hive/perf");
const caps = require("../hive/caps");
const drive = require("../hive/drive");
const judge = require("../hive/judge");
const pipelines = require("../hive/pipelines");
const automation = require("../hive/automation");
const guide = require("../hive/guide");
const docs = require("../hive/docs");
const machines = require("../hive/machines");
const cliProvider = require("../hive/providers/cli");
const gh = require("../hive/github");
const catalog = require("../hive/catalog");
const toolbox = require("../hive/toolbox");
const steward = require("../hive/steward");
const health = require("../hive/health");
const dispatcher = require("../hive/dispatcher");
const copilot = require("../hive/copilot");
const { vendorOf, keyVendor } = require("../hive/providers");
const { isChatModel } = require("../hive/models");

const SETUP_FILE = path.join(__dirname, "..", "..", "bridge", "setup.sh");

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "task";

function mount(router, { h, str, audit, isAdmin, githubToken, projectRow, taskRow, BadInput, ready }) {
  const runner = require("../hive/runner");

  /* ── task rows for pipelines / schedules (agents started separately) ── */
  async function createTaskRow(p, { title, prompt, machineId = undefined, folder = undefined }) {
    const id = newId("tsk");
    const t = now();
    const mId = machineId === undefined ? p.machine_id || null : machineId;
    const dir = folder === undefined ? (mId ? p.folder : null) : folder;
    let baseSha = "local";
    if (!mId) {
      if (!p.github_id) throw new BadInput("This project has no repository — connect a machine folder");
      baseSha = (await gh.commit(await githubToken(p.github_id), p.repo_owner, p.repo_name, p.default_branch)).sha;
    } else if (!machines.isOnline(mId)) throw new BadInput("The project's machine is offline — start the Hive bridge on it", 409);
    await run(
      `INSERT INTO hive_tasks(id, project_id, title, prompt, mode, status, base_ref, base_sha, branch, created_by, created_at, updated_at, machine_id, folder, kind)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, p.id, String(title).slice(0, 120), prompt, "solo", "queued", p.default_branch || "main", baseSha, `hive/${slug(title)}-${id.slice(-4)}`, "hive", t, t, mId, dir, router_.classify(prompt).kind],
    );
    await isolate(id);
    const task = await get("SELECT * FROM hive_tasks WHERE id=?", [id]);
    hub.emit("task", task);
    return task;
  }

  /**
   * Sandbox per task: machine tasks get their own git worktree, so agents in
   * different sessions never edit the same files. Falls back to the shared
   * folder (with a note) when the folder isn't a git repository.
   */
  async function isolate(taskId) {
    const t = await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]);
    if (!t?.machine_id || !t.folder || t.worktree) return;
    const p = await get("SELECT isolate FROM hive_projects WHERE id=?", [t.project_id]);
    if (p && Number(p.isolate) === 0) return;
    try {
      const r = await machines.call(t.machine_id, "worktree_add", { folder: t.folder, name: taskId.slice(-10), branch: t.branch }, { timeoutMs: 120_000 });
      await run("UPDATE hive_tasks SET folder=?, worktree=? WHERE id=?", [r.path, r.path, taskId]);
      await runner.event(taskId, null, "system", { message: `Working in a private copy (git worktree) on branch ${t.branch}, so other sessions can't collide with this one` });
    } catch (e) {
      await runner.event(taskId, null, "system", { message: `Working directly in ${t.folder} (couldn't create a private copy: ${String(e.message).slice(0, 200)})` });
    }
  }
  router.hiveIsolate = isolate;

  /* ── background loops ─────────────────────────────────────────────── */
  if (process.env.NODE_ENV !== "test" && process.env.HIVE_NO_LOOPS !== "1") {
    ready.then(() =>
      automation.startLoops({
        createTask: (p, o) => createTaskRow(p, o),
        startTask: (task, o) => runner.startTask(task, o),
      }),
    );
  }

  /* ── bridge: Claude Code approval hook + setup script ─────────────── */
  const bridgeAuth = async (req, res, next) => {
    await ready;
    const token = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const m = await machines.byToken(token).catch(() => null);
    if (!m) return res.status(401).json({ ok: false, error: "Unknown machine token" });
    req.machine = m;
    next();
  };
  router.post("/api/hive-bridge/approve", bridgeAuth, async (req, res) => {
    req.setTimeout?.(17 * 60_000);
    const r = await cliProvider.answerHook(String(req.body?.run || ""), { command: String(req.body?.command || "").slice(0, 4000), tool: String(req.body?.tool || "Bash") }).catch((e) => ({ approved: false, reason: e.message }));
    res.json({ ok: true, approved: !!r.approved, by: r.by || null, reason: r.reason || null });
  });
  // One-line worker setup: installs Node, git, Claude Code, Codex and the
  // bridge as a service. Contains no secrets (the machine token is an argument).
  router.get("/api/hive-bridge/setup.sh", (_req, res) => {
    res.set({ "Content-Type": "text/x-shellscript; charset=utf-8", "Cache-Control": "no-store" });
    res.send(fs.readFileSync(SETUP_FILE));
  });

  /* ── catalogue, routing, measured performance ─────────────────────── */
  router.get(
    "/api/hive/catalog",
    h(async (_req, res) => {
      res.json({
        ok: true,
        kinds: catalog.KINDS,
        minQuality: catalog.MIN_QUALITY,
        costLabels: router_.COST_LABEL,
        cards: catalog.CARDS.map((c) => catalog.publicCard(c)),
        subscriptions: Object.entries(catalog.SUBSCRIPTION_CARDS).map(([vendor, c]) => catalog.publicCard(c, { vendor })),
        freeSources: catalog.FREE_SOURCES,
      });
    }),
  );

  // Every model you can use right now, with its card, cost class and record.
  router.get(
    "/api/hive/models/connected",
    h(async (_req, res) => {
      const rows = await all("SELECT * FROM hive_keys WHERE disabled=0");
      const stats = await perf.summary();
      const out = new Map();
      for (const r of rows) {
        let v;
        try {
          v = vendorOf(keyVendor(r));
        } catch {
          continue;
        }
        const list = v.subscription ? ["default"] : keys.workingModels(r).filter(isChatModel);
        for (const m of list.slice(0, 400)) {
          const card = catalog.cardFor(m, v.id);
          if (card.guessed && !v.subscription && list.length > 60 && m !== r.default_model) continue; // long lists: known models only
          const k = `${v.id}|${m}`;
          if (out.has(k)) continue;
          const cost = v.subscription ? "sub" : r.free_tier || /:free$/.test(m) ? "free" : card.tier || "mid";
          const mine = stats.filter((s) => s.vendor === v.id && s.model === m);
          out.set(k, {
            vendor: v.id,
            vendorLabel: v.label,
            keyId: r.id,
            keyLabel: r.label,
            model: m,
            isDefault: m === r.default_model,
            cost,
            online: v.subscription ? machines.isOnline(r.machine_id) : true,
            card: catalog.publicCard(card),
            measured: mine,
          });
        }
      }
      res.json({ ok: true, models: [...out.values()] });
    }),
  );

  router.get(
    "/api/hive/perf",
    h(async (_req, res) => res.json({ ok: true, stats: await perf.summary() })),
  );

  // Preview: who would do this, and why.
  router.post(
    "/api/hive/route",
    h(async (req, res) => {
      const b = req.body || {};
      const prompt = String(b.prompt || "").slice(0, 20000);
      const cls = router_.classify(prompt, { agent: !b.chat });
      try {
        const r = await router_.route({ prompt, kind: b.kind || null, chat: !!b.chat, needTools: !b.chat || b.tools !== false, machineId: b.machineId || null, freeOnly: !!b.freeOnly, preference: b.preference || null });
        res.json({ ok: true, classified: cls, ...r });
      } catch (e) {
        res.json({ ok: true, classified: cls, error: e.message });
      }
    }),
  );

  /* ── subscription agents (Claude Code / Codex) ────────────────────── */
  // Refresh a Claude plan's usage now (one account, or every account).
  router.post(
    "/api/hive/subscriptions/usage",
    h(async (req, res) => {
      const id = req.body?.keyId ? String(req.body.keyId) : null;
      const results = id ? [{ keyId: id, ...(await keys.refreshPlanUsage(id)) }] : await keys.refreshAllPlanUsage();
      hub.emit("keys", { by: req.hiveUser });
      res.json({ ok: true, results });
    }),
  );

  router.post(
    "/api/hive/subscriptions",
    h(async (req, res) => {
      const b = req.body || {};
      if (!["claude_code", "codex", "vibe"].includes(b.provider)) throw new BadInput("Pick Claude Code, Codex or Mistral Vibe");
      const m = await get("SELECT * FROM hive_machines WHERE id=?", [String(b.machineId || "")]);
      if (!m) throw new BadInput("Pick a connected machine");
      // Several accounts on one machine get numbered names unless the person names them.
      const same = await get("SELECT COUNT(*) AS n FROM hive_keys WHERE preset=? AND machine_id=?", [b.provider, m.id]);
      const n = Number(same?.n || 0);
      const label = str(b.label, "name", { max: 60, optional: true }) || `${{ codex: "Codex", vibe: "Mistral Vibe" }[b.provider] || "Claude Code"}${n ? ` ${n + 1}` : ""} on ${m.name}`;
      // A pasted secret that can't be right (often a browser autofilling a saved
      // password into the field) is refused here, instead of failing later.
      if (b.token != null) b.token = String(b.token).trim();
      if (b.token) {
        if (b.provider === "vibe" && !/^[A-Za-z0-9]{24,}$/.test(b.token)) throw new BadInput("That doesn't look like a Mistral API key (they are about 32 letters and numbers). If your browser filled in a saved password, clear the box — or leave it empty if `vibe --setup` was run on the machine.");
        if (b.provider === "claude_code" && !b.token.startsWith("sk-ant-")) throw new BadInput("That doesn't look like a Claude setup token (it starts with sk-ant-). Run `claude setup-token` on the machine and paste what it prints — or leave the box empty if you logged in there.");
      }
      // The same setup token twice is the same Claude account — say so instead of adding a duplicate.
      if (b.token) {
        const last4 = String(b.token).trim().slice(-4);
        const dup = await all("SELECT id, label, secret_enc FROM hive_keys WHERE preset=? AND last4=?", [b.provider, last4]);
        const vault = require("../hive/vault");
        for (const d of dup) {
          let same = false;
          try {
            same = vault.open(d.secret_enc) === String(b.token).trim();
          } catch {
            /* unreadable */
          }
          if (same) throw new BadInput(b.provider === "claude_code" ? `That token is already connected as “${d.label}”. Log in to claude.ai with the other account (a private window helps), run \`claude setup-token\` again and paste the new token.` : `That key is already connected as “${d.label}”.`, 409);
        }
      }
      let id;
      try {
        id = await keys.createKey({ provider: b.provider, label, apiKey: b.token || undefined, machineId: m.id, tokenLimit: b.tokenLimit, limitPeriod: b.limitPeriod || "day", maxConcurrency: b.maxConcurrency || 2 }, req.hiveUser);
      } catch (e) {
        throw new BadInput(e.message);
      }
      await audit(req, "hive.subscription.create", id, { provider: b.provider, machine: m.name });
      const check = await keys.checkKey(id);
      if (b.provider === "claude_code") await keys.refreshPlanUsage(id).catch(() => null);
      hub.emit("keys", { by: req.hiveUser });
      res.json({ ok: true, id, check });
    }),
  );

  router.get(
    "/api/hive/machines/:id/agents",
    h(async (req, res) => {
      const m = await get("SELECT * FROM hive_machines WHERE id=?", [req.params.id]);
      if (!m) throw new BadInput("Machine not found", 404);
      if (!machines.isOnline(m.id)) return res.json({ ok: true, online: false, agents: {} });
      const cliMod = require("../hive/providers/cli");
      const probe = async (cli) => ((await cliMod.bridgeKnows(cli, m.id)) ? machines.call(m.id, "cli_detect", { cli }, { timeoutMs: 40_000 }).catch((e) => ({ error: e.message })) : { error: cliMod.OLD_BRIDGE });
      const [claude, codex, vibe] = await Promise.all([probe("claude"), probe("codex"), probe("vibe")]);
      res.json({ ok: true, online: true, agents: { claude_code: claude, codex, vibe } });
    }),
  );

  /* ── guide: improve prompts, lifecycle ────────────────────────────── */
  router.post(
    "/api/hive/improve",
    h(async (req, res) => {
      const b = req.body || {};
      const r = await guide.improve({ prompt: b.prompt, mode: ["task", "chat", "idea"].includes(b.mode) ? b.mode : "task", projectId: b.projectId || null, username: req.hiveUser });
      res.json({ ok: true, ...r });
    }),
  );
  router.get(
    "/api/hive/projects/:id/lifecycle",
    h(async (req, res) => res.json({ ok: true, ...(await guide.lifecycle(req.params.id)) })),
  );
  router.patch(
    "/api/hive/projects/:id/isolation",
    h(async (req, res) => {
      await projectRow(req.params.id);
      await run("UPDATE hive_projects SET isolate=? WHERE id=?", [req.body?.isolate ? 1 : 0, req.params.id]);
      res.json({ ok: true });
    }),
  );

  /* ── budgets & alerts ─────────────────────────────────────────────── */
  router.get(
    "/api/hive/caps",
    h(async (_req, res) => res.json({ ok: true, caps: await caps.list() })),
  );
  router.post(
    "/api/hive/caps",
    h(async (req, res) => {
      if (!isAdmin(req)) throw new BadInput("Only admins can set budgets", 403);
      const id = await caps.create(req.body || {}, req.hiveUser).catch((e) => {
        throw new BadInput(e.message, e.status || 400);
      });
      await audit(req, "hive.cap.create", id, req.body || {});
      hub.emit("caps", {});
      res.json({ ok: true, id });
    }),
  );
  router.delete(
    "/api/hive/caps/:id",
    h(async (req, res) => {
      if (!isAdmin(req)) throw new BadInput("Only admins can change budgets", 403);
      await caps.remove(req.params.id);
      await audit(req, "hive.cap.delete", req.params.id, null);
      hub.emit("caps", {});
      res.json({ ok: true });
    }),
  );
  router.get(
    "/api/hive/spend",
    h(async (req, res) => res.json({ ok: true, ...(await caps.spend(Math.max(1, Math.min(90, Number(req.query.days) || 30)))) })),
  );
  router.get(
    "/api/hive/alerts",
    h(async (_req, res) => {
      const list = await caps.alerts(60);
      res.json({ ok: true, alerts: list, unread: list.filter((a) => !a.read).length });
    }),
  );
  router.post(
    "/api/hive/alerts/read",
    h(async (_req, res) => {
      await caps.readAlerts();
      res.json({ ok: true });
    }),
  );

  /* ── personal memory (what chats know about you) ──────────────────── */
  router.get(
    "/api/hive/me/memory",
    h(async (req, res) => res.json({ ok: true, facts: await all("SELECT id, fact, source, created_at FROM hive_user_memory WHERE username=? ORDER BY created_at DESC", [req.hiveUser]) })),
  );
  router.post(
    "/api/hive/me/memory",
    h(async (req, res) => {
      const fact = str(req.body?.fact, "fact", { max: 400 });
      const id = newId("um");
      await run("INSERT INTO hive_user_memory(id, username, fact, source, created_at) VALUES(?,?,?,?,?)", [id, req.hiveUser, fact, "user", now()]);
      res.json({ ok: true, id });
    }),
  );
  router.delete(
    "/api/hive/me/memory/:id",
    h(async (req, res) => {
      await run("DELETE FROM hive_user_memory WHERE id=? AND username=?", [req.params.id, req.hiveUser]);
      res.json({ ok: true });
    }),
  );

  /* ── chat extras: judge, rate, export ─────────────────────────────── */
  const convoOf = async (req) => {
    const c = await get("SELECT * FROM hive_convos WHERE id=?", [req.params.id]);
    if (!c) throw new BadInput("Chat not found", 404);
    return c;
  };
  router.post(
    "/api/hive/convos/:id/judge",
    h(async (req, res) => {
      await convoOf(req);
      const v = await judge.judgeAnswers(req.params.id, str(req.body?.groupId, "answer group", { max: 64 }), req.hiveUser);
      res.json({ ok: true, verdict: v });
    }),
  );
  router.post(
    "/api/hive/convos/:id/rate",
    h(async (req, res) => {
      await convoOf(req);
      const m = await get("SELECT * FROM hive_convo_msgs WHERE id=? AND convo_id=? AND role='assistant'", [String(req.body?.messageId || ""), req.params.id]);
      if (!m) throw new BadInput("Message not found", 404);
      const good = !!req.body?.good;
      if (m.rating == null && m.provider && m.model) await perf.rateChat({ vendor: m.provider, model: m.model, good });
      await run("UPDATE hive_convo_msgs SET rating=? WHERE id=?", [good ? 1 : -1, m.id]);
      res.json({ ok: true });
    }),
  );
  router.patch(
    "/api/hive/convos/:id/tools",
    h(async (req, res) => {
      const c = await convoOf(req);
      await run("UPDATE hive_convos SET tools=? WHERE id=?", [req.body?.tools ? 1 : 0, c.id]);
      res.json({ ok: true });
    }),
  );
  // A message or the whole conversation as a PDF / Word / HTML / Markdown file (saved to Drive too).
  router.post(
    "/api/hive/convos/:id/export",
    h(async (req, res) => {
      const c = await convoOf(req);
      const format = ["pdf", "docx", "html", "md", "slides"].includes(req.body?.format) ? req.body.format : "pdf";
      const msgs = await all("SELECT * FROM hive_convo_msgs WHERE convo_id=? ORDER BY created_at", [c.id]);
      let md;
      let title = c.title || "Chat";
      if (req.body?.messageId) {
        const m = msgs.find((x) => x.id === req.body.messageId);
        if (!m) throw new BadInput("Message not found", 404);
        md = m.content;
        const firstHeading = String(md).match(/^#\s+(.+)$/m);
        if (firstHeading) title = firstHeading[1].slice(0, 80);
      } else {
        md = msgs
          .filter((m) => m.content && (m.role === "user" || !m.group_id || m.preferred))
          .map((m) => (m.role === "user" ? `### @${m.author || "you"}\n\n${m.content}` : `### ${m.model || "Assistant"}\n\n${m.content}`))
          .join("\n\n---\n\n");
      }
      const r = await docs.render(md, { format, title, subtitle: `Exported from Nexora Hive · ${new Date().toISOString().slice(0, 10)}` });
      const chat = require("../hive/chat");
      const f = await chat.saveFile({ name: r.name, mime: r.mime, buffer: r.buffer, origin: "generated", username: req.hiveUser });
      const dp = await drive.freePath({ path: `/documents/${r.name}`, projectId: c.project_id || null });
      const d = await drive.put({ path: dp, projectId: c.project_id || null, mime: r.mime, buffer: r.buffer, by: req.hiveUser }).catch(() => null);
      res.json({ ok: true, file: f, drive: d, note: r.note || null });
    }),
  );

  /* ── team chat: #general + one channel per project ─────────────────── */
  const channelOf = (v) => {
    const c = String(v || "general");
    return c === "general" ? "" : c.slice(0, 64);
  };
  router.get(
    "/api/hive/team/chat",
    h(async (req, res) => {
      const ch = channelOf(req.query.channel);
      const before = Number(req.query.before) || Date.now() + 1;
      const rows = await all("SELECT * FROM hive_chat WHERE project_id=? AND created_at<? ORDER BY created_at DESC LIMIT 120", [ch, before]);
      res.json({ ok: true, messages: rows.reverse() });
    }),
  );
  router.get(
    "/api/hive/team/channels",
    h(async (_req, res) => {
      const last = await all("SELECT project_id, MAX(created_at) AS at, COUNT(*) AS n FROM hive_chat GROUP BY project_id");
      res.json({ ok: true, channels: last.map((r) => ({ id: r.project_id || "general", lastAt: Number(r.at), count: Number(r.n) })) });
    }),
  );
  router.post(
    "/api/hive/team/chat",
    h(async (req, res) => {
      const ch = channelOf(req.body?.channel);
      if (ch) await projectRow(ch);
      let body = str(req.body?.body, "message", { max: 4000 });
      // Shared links to a session, chat, file or pipeline travel with the message.
      const a = req.body?.attach;
      if (a && typeof a === "object" && /^(task|convo|drive|pipeline|project)$/.test(String(a.type))) {
        body += `\n[[${String(a.type)}:${String(a.id || "").slice(0, 400)}|${String(a.title || "").replace(/[|\]\n]/g, " ").slice(0, 140)}]]`;
      }
      const msg = { id: newId("msg"), project_id: ch, task_id: typeof req.body?.taskId === "string" ? req.body.taskId.slice(0, 64) : null, username: req.hiveUser, body, created_at: now() };
      await run("INSERT INTO hive_chat(id, project_id, task_id, username, body, created_at) VALUES(?,?,?,?,?,?)", [msg.id, msg.project_id, msg.task_id, msg.username, msg.body, msg.created_at]);
      hub.emit("chat", msg);
      res.json({ ok: true, message: msg });
    }),
  );

  /* ── the Judge (sessions) ─────────────────────────────────────────── */
  router.post(
    "/api/hive/tasks/:id/judge",
    h(async (req, res) => {
      await taskRow(req.params.id);
      const v = await judge.judgeTask(req.params.id, { by: req.hiveUser, adopt: req.body?.adopt !== false });
      if (!v) throw new BadInput("No finished attempts to compare yet");
      res.json({ ok: true, verdict: v });
    }),
  );

  /* ── Drive ────────────────────────────────────────────────────────── */
  const pidOf = (req) => {
    const p = req.query.project ?? req.body?.project ?? req.body?.projectId;
    return p && p !== "shared" ? String(p) : null;
  };
  router.get(
    "/api/hive/drive",
    h(async (req, res) => {
      const projectId = pidOf(req);
      res.json({ ok: true, items: await drive.list({ folder: req.query.folder || "/", projectId }), usage: await drive.usage() });
    }),
  );
  router.get(
    "/api/hive/drive/tree",
    h(async (req, res) => res.json({ ok: true, items: await drive.tree({ projectId: pidOf(req) }) })),
  );
  router.get(
    "/api/hive/drive/search",
    h(async (req, res) => res.json({ ok: true, items: await drive.search({ query: req.query.q, projectId: pidOf(req) }) })),
  );
  const driveUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: drive.MAX_FILE, files: 20 } });
  router.post(
    "/api/hive/drive/upload",
    (req, res, next) =>
      driveUpload.array("files", 20)(req, res, (err) => {
        if (err) return res.status(400).json({ ok: false, error: err.code === "LIMIT_FILE_SIZE" ? "A file is too large (20 MB max)" : err.message });
        next();
      }),
    h(async (req, res) => {
      if (!req.files?.length) throw new BadInput("No files");
      const projectId = pidOf(req);
      const folder = drive.clean(req.body?.folder || "/");
      const saved = [];
      for (const f of req.files) {
        // Folder uploads send relative paths in the file name.
        const rel = String(f.originalname || "file").replace(/^\/+/, "");
        const p = await drive.freePath({ path: `${folder === "/" ? "" : folder}/${rel}`, projectId });
        saved.push(await drive.put({ path: p, projectId, mime: f.mimetype, buffer: f.buffer, by: req.hiveUser }).catch((e) => ({ error: e.message, name: rel })));
      }
      hub.emit("drive", { projectId, by: req.hiveUser });
      res.json({ ok: true, files: saved });
    }),
  );
  router.post(
    "/api/hive/drive/folder",
    h(async (req, res) => {
      const projectId = pidOf(req);
      const f = await drive.mkdir({ path: str(req.body?.path, "folder", { max: 400 }), projectId, by: req.hiveUser }).catch((e) => {
        throw new BadInput(e.message, e.status || 400);
      });
      hub.emit("drive", { projectId, by: req.hiveUser });
      res.json({ ok: true, folder: f });
    }),
  );
  router.put(
    "/api/hive/drive/file",
    h(async (req, res) => {
      const projectId = pidOf(req);
      if (typeof req.body?.content !== "string") throw new BadInput("content is required");
      const p = drive.clean(str(req.body?.path, "path", { max: 400 }));
      const mime = req.body?.mime || (/\.md$/i.test(p) ? "text/markdown" : /\.json$/i.test(p) ? "application/json" : /\.html?$/i.test(p) ? "text/html" : /\.csv$/i.test(p) ? "text/csv" : "text/plain");
      const f = await drive.put({ path: p, projectId, mime, buffer: Buffer.from(req.body.content, "utf8"), by: req.hiveUser }).catch((e) => {
        throw new BadInput(e.message, e.status || 400);
      });
      hub.emit("drive", { projectId, by: req.hiveUser, path: p });
      res.json({ ok: true, file: f });
    }),
  );
  router.get(
    "/api/hive/drive/file",
    h(async (req, res) => {
      const { row, buffer } = await drive.read({ path: String(req.query.path || ""), projectId: pidOf(req) }).catch((e) => {
        throw new BadInput(e.message, e.status || 404);
      });
      if (req.query.as === "text") {
        if (!row.text) throw new BadInput("Not a text file");
        return res.json({ ok: true, file: row, content: buffer.toString("utf8") });
      }
      // Raster images and PDFs preview inline; everything else downloads.
      const inline = req.query.download !== "1" && /^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(row.mime);
      res.set({
        "Content-Type": inline ? row.mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${String(row.name).replace(/["\r\n\\]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": row.mime === "application/pdf" ? "default-src 'none'; frame-ancestors 'self'" : "default-src 'none'; sandbox",
        "Cache-Control": "private, no-cache",
      });
      res.send(buffer);
    }),
  );
  router.post(
    "/api/hive/drive/move",
    h(async (req, res) => {
      const projectId = pidOf(req);
      const r = await drive.move({ from: str(req.body?.from, "from", { max: 400 }), to: str(req.body?.to, "to", { max: 400 }), projectId, by: req.hiveUser }).catch((e) => {
        throw new BadInput(e.message, e.status || 400);
      });
      hub.emit("drive", { projectId, by: req.hiveUser });
      res.json({ ok: true, item: r });
    }),
  );
  router.delete(
    "/api/hive/drive",
    h(async (req, res) => {
      const projectId = pidOf(req);
      const n = await drive.remove({ path: String(req.query.path || ""), projectId }).catch((e) => {
        throw new BadInput(e.message, e.status || 400);
      });
      await audit(req, "hive.drive.delete", String(req.query.path || ""), { projectId, items: n });
      hub.emit("drive", { projectId, by: req.hiveUser });
      res.json({ ok: true, removed: n });
    }),
  );
  // Save a chat attachment / generated file into Drive.
  router.post(
    "/api/hive/drive/from-file",
    h(async (req, res) => {
      const projectId = pidOf(req);
      const f = await drive.addStored({ fileId: str(req.body?.fileId, "file", { max: 64 }), path: req.body?.path, projectId, by: req.hiveUser }).catch((e) => {
        throw new BadInput(e.message, e.status || 400);
      });
      hub.emit("drive", { projectId, by: req.hiveUser });
      res.json({ ok: true, file: f });
    }),
  );
  router.post(
    "/api/hive/drive/github",
    h(async (req, res) => {
      const p = await projectRow(str(req.body?.projectId, "project", { max: 64 }));
      const paths = (Array.isArray(req.body?.paths) ? req.body.paths : []).map(String);
      const r = await drive
        .toGithub({ project: p, paths, targetDir: String(req.body?.targetDir || ""), branch: str(req.body?.branch, "branch", { max: 120 }), message: str(req.body?.message, "message", { max: 300, optional: true }), openPr: req.body?.openPr !== false, by: req.hiveUser })
        .catch((e) => {
          throw new BadInput(e.message, e.status && e.status < 500 ? e.status : 400);
        });
      await audit(req, "hive.drive.github", p.id, { files: r.files.length, branch: r.branch, pr: r.pr?.url });
      res.json({ ok: true, ...r });
    }),
  );
  router.post(
    "/api/hive/drive/import",
    h(async (req, res) => {
      const p = await projectRow(str(req.body?.projectId, "project", { max: 64 }));
      const files = await drive.fromGithub({ project: p, repoPaths: (req.body?.paths || []).map(String), folder: req.body?.folder || "/repo", by: req.hiveUser }).catch((e) => {
        throw new BadInput(e.message, e.status || 400);
      });
      hub.emit("drive", { projectId: p.id, by: req.hiveUser });
      res.json({ ok: true, files });
    }),
  );

  /* ── pipelines + the Architect ────────────────────────────────────── */
  router.get(
    "/api/hive/pipelines",
    h(async (req, res) => {
      const projectId = String(req.query.project || "");
      res.json({ ok: true, templates: pipelines.TEMPLATES, pipelines: projectId ? await pipelines.list(projectId) : [], runs: projectId ? await pipelines.runs(projectId) : [] });
    }),
  );
  router.post(
    "/api/hive/pipelines",
    h(async (req, res) => {
      const b = req.body || {};
      await projectRow(str(b.projectId, "project", { max: 64 }));
      const p = await pipelines.save({ projectId: b.projectId, name: b.name, description: b.description, stages: b.stages }, req.hiveUser).catch((e) => {
        throw new BadInput(e.message);
      });
      hub.emit("pipelines", { projectId: b.projectId });
      res.json({ ok: true, pipeline: p });
    }),
  );
  router.patch(
    "/api/hive/pipelines/:id",
    h(async (req, res) => {
      const cur = await get("SELECT * FROM hive_pipelines WHERE id=?", [req.params.id]);
      if (!cur) throw new BadInput("Pipeline not found", 404);
      const b = req.body || {};
      const p = await pipelines.save({ id: cur.id, projectId: cur.project_id, name: b.name ?? cur.name, description: b.description ?? cur.description, stages: b.stages ?? json(cur.stages_json, []) }, req.hiveUser).catch((e) => {
        throw new BadInput(e.message);
      });
      hub.emit("pipelines", { projectId: cur.project_id });
      res.json({ ok: true, pipeline: p });
    }),
  );
  router.delete(
    "/api/hive/pipelines/:id",
    h(async (req, res) => {
      const cur = await get("SELECT * FROM hive_pipelines WHERE id=?", [req.params.id]);
      if (!cur) throw new BadInput("Pipeline not found", 404);
      await pipelines.remove(cur.id);
      hub.emit("pipelines", { projectId: cur.project_id });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/pipelines/:id/run",
    h(async (req, res) => {
      const pl = await get("SELECT * FROM hive_pipelines WHERE id=?", [req.params.id]);
      if (!pl) throw new BadInput("Pipeline not found", 404);
      const project = await projectRow(pl.project_id);
      const request = str(req.body?.request, "request", { max: 20000 });
      const where = req.body?.machineId !== undefined ? { machineId: req.body.machineId || null, folder: req.body.machineId ? req.body.folder || project.folder : null } : {};
      const r = await pipelines.start({ pipeline: pl, project, request, username: req.hiveUser, createTask: (p, o) => createTaskRow(p, { ...o, ...where }) });
      await audit(req, "hive.pipeline.run", pl.id, { run: r.id });
      res.json({ ok: true, run: r });
    }),
  );
  router.post(
    "/api/hive/pipeline-runs/:id/stop",
    h(async (req, res) => {
      const r = await get("SELECT * FROM hive_pipeline_runs WHERE id=?", [req.params.id]);
      if (!r) throw new BadInput("Run not found", 404);
      pipelines.stop(r.id);
      if (r.task_id) await runner.stopTask(r.task_id);
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/architect",
    h(async (req, res) => {
      const b = req.body || {};
      const history = (Array.isArray(b.history) ? b.history : []).slice(-16).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: String(m.text || "").slice(0, 6000) }));
      if (!history.length) throw new BadInput("Tell the Architect what you want to automate");
      const r = await pipelines.architect({ history, draft: b.draft || null, projectId: b.projectId || null, username: req.hiveUser });
      res.json({ ok: true, ...r });
    }),
  );

  /* ── automations (schedules) ──────────────────────────────────────── */
  router.get(
    "/api/hive/schedules",
    h(async (req, res) => res.json({ ok: true, schedules: await automation.listSchedules(req.query.project ? String(req.query.project) : null), templates: automation.SCHEDULE_TEMPLATES })),
  );
  router.post(
    "/api/hive/schedules",
    h(async (req, res) => {
      const b = req.body || {};
      if (!b.id) await projectRow(str(b.projectId, "project", { max: 64 }));
      const s = await automation.saveSchedule(b, req.hiveUser).catch((e) => {
        throw new BadInput(e.message);
      });
      await audit(req, b.id ? "hive.schedule.update" : "hive.schedule.create", s.id, { title: s.title, every: s.every });
      hub.emit("schedules", { id: s.id });
      res.json({ ok: true, schedule: s });
    }),
  );
  router.delete(
    "/api/hive/schedules/:id",
    h(async (req, res) => {
      await automation.removeSchedule(req.params.id);
      hub.emit("schedules", { id: req.params.id });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/schedules/:id/run",
    h(async (req, res) => {
      const s = await get("SELECT * FROM hive_schedules WHERE id=?", [req.params.id]);
      if (!s) throw new BadInput("Not found", 404);
      await run("UPDATE hive_schedules SET next_run=? WHERE id=?", [Date.now() - 1, s.id]);
      await automation.tickSchedules({ createTask: (p, o) => createTaskRow(p, o), startTask: (task, o) => runner.startTask(task, o) });
      const after = await get("SELECT * FROM hive_schedules WHERE id=?", [s.id]);
      res.json({ ok: true, schedule: automation.publicSchedule(after) });
    }),
  );
  /* ── Toolbox: the open-source ecosystem, MCP servers, search engines, skills ── */
  router.get(
    "/api/hive/toolbox",
    h(async (_req, res) => res.json(await toolbox.catalogue())),
  );
  router.post(
    "/api/hive/toolbox/connect",
    h(async (req, res) => {
      const b = req.body || {};
      const kind = b.kind === "search" ? "search" : "mcp";
      const r = await toolbox.connect(
        {
          kind,
          name: b.name ? str(b.name, "name", { max: 40 }) : "",
          url: b.url ? str(b.url, "url", { max: 500 }) : "",
          token: b.token ? str(b.token, "token", { max: 4000 }) : "",
          engine: b.engine ? str(b.engine, "engine", { max: 20 }) : null,
          toolId: b.toolId ? str(b.toolId, "toolId", { max: 80 }) : null,
        },
        req.hiveUser,
      );
      await audit(req, "toolbox.connect", `${kind} ${b.name || b.engine || b.url}`);
      hub.emit("toolbox", { by: req.hiveUser });
      res.json({ ok: true, ...r });
    }),
  );
  router.patch(
    "/api/hive/toolbox/integrations/:id",
    h(async (req, res) => {
      const b = req.body || {};
      await toolbox.update(req.params.id, { enabled: b.enabled === undefined ? undefined : !!b.enabled, name: b.name ? str(b.name, "name", { max: 40 }) : undefined, token: b.token === undefined ? undefined : String(b.token || "") });
      hub.emit("toolbox", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/toolbox/integrations/:id/refresh",
    h(async (req, res) => {
      const tools = await toolbox.refreshTools(req.params.id).catch((e) => {
        throw new BadInput(e.message);
      });
      hub.emit("toolbox", { by: req.hiveUser });
      res.json({ ok: true, tools: tools.length });
    }),
  );
  router.post(
    "/api/hive/toolbox/integrations/:id/call",
    h(async (req, res) => {
      const b = req.body || {};
      const r = await toolbox.callServerTool(req.params.id, str(b.tool, "tool", { max: 120 }), b.input && typeof b.input === "object" ? b.input : {});
      res.json({ ...r, content: String(r.content).slice(0, 20000) });
    }),
  );
  router.delete(
    "/api/hive/toolbox/integrations/:id",
    h(async (req, res) => {
      const r = await get("SELECT created_by FROM hive_integrations WHERE id=?", [req.params.id]);
      if (!r) throw new BadInput("Not found", 404);
      if (r.created_by !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only the person who connected it or an admin can remove it", 403);
      await toolbox.remove(req.params.id);
      await audit(req, "toolbox.remove", req.params.id);
      hub.emit("toolbox", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/toolbox/skill",
    h(async (req, res) => {
      const b = req.body || {};
      const r = await toolbox.importSkill({ url: str(b.url, "url", { max: 500 }), scope: b.projectId ? String(b.projectId) : "*", appliesTo: ["all", "tasks", "chat"].includes(b.appliesTo) ? b.appliesTo : "all" }, req.hiveUser);
      await audit(req, "toolbox.skill", r.source);
      hub.emit("plugins", { by: req.hiveUser });
      res.json({ ok: true, ...r });
    }),
  );

  /* ── Token Steward ── */
  router.get(
    "/api/hive/steward",
    h(async (req, res) => res.json(await steward.report({ days: Math.min(90, Math.max(1, Number(req.query.days) || 30)) }))),
  );
  router.post(
    "/api/hive/steward/apply",
    h(async (req, res) => {
      const a = req.body?.action;
      if (a?.type === "cap" && !isAdmin(req)) throw new BadInput("Only admins can set budgets", 403);
      const r = await steward.apply(a, req.hiveUser);
      await audit(req, "steward.apply", JSON.stringify(a).slice(0, 200));
      hub.emit(a?.type === "cap" ? "caps" : "plugins", { by: req.hiveUser });
      res.json(r);
    }),
  );
  router.post(
    "/api/hive/steward/plan",
    h(async (req, res) => res.json(await steward.plan({ prompt: str(req.body?.prompt, "prompt", { max: 20000 }), chat: !!req.body?.chat }))),
  );
  router.post(
    "/api/hive/steward/ask",
    h(async (req, res) => res.json(await steward.ask({ question: str(req.body?.question, "question", { max: 4000 }), username: req.hiveUser }))),
  );
  /* ── Agent health ── */
  router.get(
    "/api/hive/health",
    h(async (_req, res) => res.json({ ok: true, keys: await health.board() })),
  );
  router.post(
    "/api/hive/health/probe",
    h(async (req, res) => {
      const b = req.body || {};
      const results = b.keyId ? [{ keyId: String(b.keyId), ...(await health.probe(String(b.keyId))) }] : await health.probeAll({ includePaid: !!b.includePaid });
      hub.emit("health", { by: req.hiveUser });
      res.json({ ok: true, results, keys: await health.board() });
    }),
  );

  /* ── Every GitHub repository, one click from being worked on ── */
  const repos = require("../hive/repos");
  router.get(
    "/api/hive/repos",
    h(async (req, res) => res.json({ ok: true, ...(await repos.allRepos({ force: req.query.refresh === "1" })) })),
  );
  router.post(
    "/api/hive/repos/open",
    h(async (req, res) => {
      const ref = str(req.body?.repo, "repository", { max: 200 });
      try {
        const r = await repos.openRepo(ref, { username: req.hiveUser });
        res.json({ ok: true, project: r.project, created: r.created });
      } catch (e) {
        throw e.status ? new BadInput(e.message, e.status) : e;
      }
    }),
  );
  /* ── Upload a folder → a private GitHub repo → a project agents work on ── */
  const folderImport = require("../hive/folder-import");
  const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: folderImport.MAX_FILE, files: 60, fieldSize: 1024 * 1024 } });
  router.post(
    "/api/hive/import/start",
    h(async (req, res) => {
      const b = req.body || {};
      try {
        res.json({ ok: true, ...(await folderImport.start({ name: str(b.name, "name", { max: 100 }), githubId: b.githubId || null, isPrivate: b.private !== false, description: b.description, username: req.hiveUser })) });
      } catch (e) {
        throw new BadInput(e.message, e.status || 400);
      }
    }),
  );
  router.post(
    "/api/hive/import/:id/files",
    (req, res, next) =>
      importUpload.array("files", 60)(req, res, (err) => {
        if (err) return res.status(400).json({ ok: false, error: err.code === "LIMIT_FILE_SIZE" ? "A file is over 95 MB — GitHub can't store it in a repository" : err.message });
        next();
      }),
    h(async (req, res) => {
      // Relative paths come in a parallel "paths" field (file names can't hold slashes everywhere).
      const paths = [].concat(req.body?.paths || []);
      const files = (req.files || []).map((f, i) => ({ path: paths[i] || f.originalname, buffer: f.buffer }));
      try {
        res.json({ ok: true, ...(await folderImport.addFiles(req.params.id, files)) });
      } catch (e) {
        throw new BadInput(e.message, e.status || 400);
      }
    }),
  );
  router.post(
    "/api/hive/import/:id/finish",
    h(async (req, res) => {
      try {
        const r = await folderImport.finish(req.params.id, { username: req.hiveUser });
        await audit(req, "hive.import.folder", r.project.id, { repo: r.repo, files: r.files });
        hub.emit("project", r.project);
        res.json({ ok: true, ...r });
      } catch (e) {
        throw new BadInput(e.message, e.status || 400);
      }
    }),
  );

  router.post(
    "/api/hive/projects/:id/brief",
    h(async (req, res) => {
      const text = await repos.writeBrief(req.params.id, { force: true });
      if (!text) throw new BadInput("Couldn't read that repository to write a brief");
      res.json({ ok: true, instructions: text });
    }),
  );

  // Test every model on a key (or on every free key) and keep only the ones that answer.
  router.post(
    "/api/hive/health/verify",
    h(async (req, res) => {
      const b = req.body || {};
      const job = b.keyId ? health.verifyKey(String(b.keyId), { retest: !!b.retest }) : health.verifyAll({ includePaid: !!b.includePaid });
      const done = job.then((r) => {
        hub.emit("health", { verified: true });
        hub.emit("keys", { verified: true });
        return r;
      });
      done.catch((e) => console.error("[hive verify]", e.message));
      if (b.wait) return res.json({ ok: true, result: await done, keys: await health.board() });
      // Testing many models takes a minute or two: answer now, progress arrives on the board.
      await new Promise((r) => setTimeout(r, 300));
      res.json({ ok: true, started: true, progress: health.verifyProgress(), keys: await health.board() });
    }),
  );

  /* ── The Dispatcher ── */
  router.get(
    "/api/hive/dispatches",
    h(async (req, res) => res.json({ ok: true, dispatches: await dispatcher.list(req.query.project ? String(req.query.project) : null) })),
  );
  router.post(
    "/api/hive/dispatches",
    h(async (req, res) => {
      const b = req.body || {};
      const project = await projectRow(str(b.projectId, "project", { max: 64 }));
      const d = await dispatcher.create({ project, request: str(b.request, "request", { max: 20000 }), username: req.hiveUser, preference: ["savings", "balanced", "quality", "fast"].includes(b.preference) ? b.preference : "savings", freeOnly: !!b.freeOnly });
      hub.emit("dispatch", d);
      res.json({ ok: true, dispatch: d });
    }),
  );
  router.patch(
    "/api/hive/dispatches/:id",
    h(async (req, res) => {
      const b = req.body || {};
      const d = await dispatcher.edit(req.params.id, { partId: String(b.partId || ""), spec: b.spec && typeof b.spec === "object" ? { provider: String(b.spec.provider || ""), keyId: b.spec.keyId ? String(b.spec.keyId) : "auto", model: b.spec.model ? String(b.spec.model) : "" } : null, prompt: typeof b.prompt === "string" ? b.prompt : undefined, remove: !!b.remove });
      res.json({ ok: true, dispatch: d });
    }),
  );
  router.post(
    "/api/hive/dispatches/:id/start",
    h(async (req, res) => {
      const row = await get("SELECT project_id FROM hive_dispatches WHERE id=?", [req.params.id]);
      if (!row) throw new BadInput("Not found", 404);
      const d = await dispatcher.start(req.params.id, { username: req.hiveUser, createTask: (p, o) => createTaskRow(p, o) });
      await audit(req, "dispatch.start", req.params.id);
      res.json({ ok: true, dispatch: d });
    }),
  );
  router.post(
    "/api/hive/dispatches/:id/stop",
    h(async (req, res) => res.json({ ok: true, stopped: dispatcher.stop(req.params.id) })),
  );
  /* ── Hive Copilot ── */
  const copilotDeps = (req) => ({ createTask: (p, o) => createTaskRow(p, o), origin: req ? req.headers.origin || `${req.protocol}://${req.get("host")}` : process.env.HIVE_PUBLIC_URL || null });
  // Sessions the Copilot started (or was asked to watch) are reviewed when they finish.
  if (!hub.bus.__copilot) {
    hub.bus.__copilot = true;
    hub.bus.on("task", (t) => copilot.onTask(t, copilotDeps(null)).catch((e) => console.error("[hive copilot]", e.message)));
    // Autopilot: safe command approvals in sessions the Copilot watches are answered for you.
    hub.bus.on("approval", (a) => copilot.onApproval(a).catch((e) => console.error("[hive copilot]", e.message)));
    // Queued merges go through once CI is green.
    setInterval(() => copilot.mergeTick().catch((e) => console.error("[hive copilot merge]", e.message)), 2 * 60_000).unref?.();
    // Work never stops: agents whose model goes down (or that hang) are handed to a healthy model.
    setInterval(() => copilot.rescueTick().catch((e) => console.error("[hive rescue]", e.message)), 2 * 60_000).unref?.();
  }
  router.post("/api/hive-mcp", (req, res) => {
    copilot.mcpHandle(req, res, copilotDeps(null)).catch((e) => res.status(500).json({ jsonrpc: "2.0", id: req.body?.id ?? null, error: { code: -32603, message: e.message } }));
  });
  router.get("/api/hive-mcp", (_req, res) => res.status(405).end());
  router.get(
    "/api/hive/copilot",
    h(async (req, res) => {
      await copilot.noteAdmin(req.hiveUser, isAdmin(req));
      res.json({ ok: true, messages: await copilot.messages(req.hiveUser), settings: await copilot.brainSettings(req.hiveUser), brain: await copilot.currentBrain(req.hiveUser), admin: isAdmin(req), active: await copilot.activeWork(req.hiveUser) });
    }),
  );
  router.post(
    "/api/hive/copilot",
    h(async (req, res) => {
      const text = str(req.body?.text, "message", { max: 20000 });
      await copilot.noteAdmin(req.hiveUser, isAdmin(req));
      res.status(200).set({ "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
      res.flushHeaders?.();
      let open = true;
      const ctl = new AbortController();
      res.on("close", () => {
        open = false;
      });
      const write = (type, data) => {
        if (!open) return;
        res.write(JSON.stringify({ type, data }) + "\n");
        res.flush?.();
      };
      const ping = setInterval(() => write("ping", {}), 15000);
      try {
        const projectId = typeof req.body?.projectId === "string" ? req.body.projectId.slice(0, 80) : null;
        await copilot.send({ username: req.hiveUser, text, sink: write, deps: copilotDeps(req), signal: ctl.signal, quick: !!req.body?.quick, projectId });
      } catch (e) {
        write("error", { error: e.message || "Something went wrong" });
      } finally {
        clearInterval(ping);
        if (open) res.end();
      }
    }),
  );
  router.get(
    "/api/hive/copilot/active",
    h(async (req, res) => res.json({ ok: true, active: await copilot.activeWork(req.hiveUser) })),
  );
  router.delete(
    "/api/hive/copilot",
    h(async (req, res) => {
      await copilot.clear(req.hiveUser);
      res.json({ ok: true });
    }),
  );
  router.put(
    "/api/hive/copilot/settings",
    h(async (req, res) => {
      const b = req.body || {};
      if (b.canMerge && !isAdmin(req)) throw new BadInput("Only admins can let the Copilot merge", 403);
      const s = await copilot.saveSettings(req.hiveUser, { brain: b.brain, model: b.model, autonomy: b.autonomy, canMerge: b.canMerge, admin: isAdmin(req), saveTokens: b.saveTokens, claudeOnly: b.claudeOnly, brainKey: b.brainKey });
      res.json({ ok: true, settings: s, brain: await copilot.currentBrain(req.hiveUser) });
    }),
  );
}

module.exports = { mount };
