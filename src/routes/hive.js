// Nexora Hive — the staff-only multi-agent workspace (REST side).
//
// Only staff (anyone holding an admin-panel permission: owner, admins,
// moderators, granted staff) can reach any of this. Everyone else gets the
// same 404 as an unknown endpoint, so the feature isn't even discoverable.
// Realtime (presence, live agent streams) is the /hive socket namespace in
// src/hive/hub.js, gated the same way.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { getSessionUser } = require("../middleware/auth");
const { mayUseHive } = require("../authz/permissions");
const { initHiveDb, newId, now, json, run, get, all } = require("../hive/db");
const keys = require("../hive/keys");
const vault = require("../hive/vault");
const gh = require("../hive/github");
const hub = require("../hive/hub");
const runner = require("../hive/runner");
const { catalogue, providerOf } = require("../hive/providers");
const { workspace, dropOverlay, cleanPath } = require("../hive/workspace");
const { readBase } = require("../hive/snapshot");
const { commitTask, commitOnMachine } = require("../hive/commit");
const machines = require("../hive/machines");
const plugins = require("../hive/plugins");
const chat = require("../hive/chat");
const modelsLib = require("../hive/models");
const multer = require("multer");

const MODES = new Set(["solo", "team", "compare", "review"]);
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);
const COLORS = new Set(["violet", "blue", "cyan", "green", "amber", "rose", "slate"]);

class BadInput extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Hive is for admins and the owner only (moderators and other staff get 404). */
function isStaff(req) {
  const u = getSessionUser(req);
  return !!u?.username && mayUseHive(req);
}

/** Admins and the owner can manage anything; other staff manage what they added. */
const isAdmin = (req) => ["admin", "owner"].includes(req.access?.role);

function staffOnly(req, res, next) {
  if (!isStaff(req)) return res.status(404).json({ ok: false, error: "API endpoint not found" });
  req.hiveUser = getSessionUser(req).username;
  next();
}

const h = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    const status = e.status && e.status < 600 ? e.status : 500;
    if (status >= 500) console.error("[hive]", req.method, req.path, e.message);
    res.status(status).json({ ok: false, error: e.message || "Something went wrong" });
  }
};

async function audit(req, action, target, details) {
  await run(
    `INSERT INTO audit_log(actor, actor_role, action, target_type, target, before, after, ip, created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
    [req.hiveUser, req.access?.role || null, action, "hive", target, null, details ? JSON.stringify(details) : null, req.ip || null, Date.now()],
  ).catch(() => {});
}

function str(v, name, { max = 200, min = 1, optional = false } = {}) {
  if (v === undefined || v === null || v === "") {
    if (optional) return undefined;
    throw new BadInput(`${name} is required`);
  }
  if (typeof v !== "string") throw new BadInput(`${name} must be text`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw new BadInput(`${name} must be ${min}-${max} characters`);
  return s;
}

function cleanSpec(s) {
  if (!s || typeof s !== "object") throw new BadInput("Each agent needs a provider and model");
  // "auto": the smart router picks the best model for the kind of work.
  if (s.provider === "auto") {
    return {
      provider: "auto",
      keyId: "auto",
      kind: typeof s.kind === "string" ? s.kind.slice(0, 20) : undefined,
      freeOnly: !!s.freeOnly,
      preference: ["balanced", "quality", "savings", "fast"].includes(s.preference) ? s.preference : undefined,
      effort: EFFORTS.has(s.effort) ? s.effort : null,
      name: str(s.name, "agent name", { max: 40, optional: true }),
    };
  }
  providerOf(s.provider);
  return {
    provider: s.provider,
    keyId: typeof s.keyId === "string" && s.keyId ? s.keyId : "auto",
    model: str(s.model, "model", { max: 120, optional: true }),
    effort: EFFORTS.has(s.effort) ? s.effort : null,
    name: str(s.name, "agent name", { max: 40, optional: true }),
  };
}

async function githubToken(githubId) {
  const cred = await get("SELECT * FROM hive_github WHERE id=?", [githubId]);
  if (!cred) throw new BadInput("GitHub connection not found", 404);
  return vault.open(cred.token_enc);
}

async function projectRow(id) {
  const p = await get("SELECT * FROM hive_projects WHERE id=?", [id]);
  if (!p) throw new BadInput("Project not found", 404);
  return p;
}

async function taskRow(id) {
  const t = await get("SELECT * FROM hive_tasks WHERE id=?", [id]);
  if (!t) throw new BadInput("Task not found", 404);
  return t;
}

const publicGithub = (r) => ({ id: r.id, label: r.label, login: r.login, last4: r.last4, createdBy: r.created_by, createdAt: r.created_at });

async function members() {
  return all(
    `SELECT username, display_name, avatar, avatar_url, role FROM users
     WHERE role IN ('moderator','admin','owner')
        OR username IN (SELECT username FROM user_permissions WHERE granted=1 AND perm <> 'early_access')
     ORDER BY username LIMIT 200`,
  );
}

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "task";

function createHiveRouter() {
  const router = express.Router();
  const ready = initHiveDb().catch((e) => console.error("[hive] schema:", e.message));
  const writeLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: "Slow down a little" } });

  // Model radar: refresh every key's model list twice a day, so new releases
  // appear (and retired models stop being defaults) without anyone clicking.
  if (process.env.NODE_ENV !== "test") {
    const refresh = () => ready.then(() => keys.refreshAll()).then((fresh) => fresh.length && hub.emit("models", { fresh })).catch(() => {});
    setTimeout(refresh, 45_000).unref?.();
    setInterval(refresh, 12 * 3600e3).unref?.();
  }

  router.use("/api/hive", staffOnly, async (_req, _res, next) => {
    await ready;
    next();
  });
  router.use("/api/hive", (req, res, next) => (req.method === "GET" ? next() : writeLimiter(req, res, next)));

  /* ── bootstrap ───────────────────────────────────────────────────── */
  router.get(
    "/api/hive/bootstrap",
    h(async (req, res) => {
      const [k, gits, projects, team] = await Promise.all([
        keys.listKeys(),
        all("SELECT * FROM hive_github ORDER BY created_at"),
        all("SELECT * FROM hive_projects ORDER BY updated_at DESC"),
        members(),
      ]);
      const counts = await all(
        "SELECT project_id, COUNT(*) AS n, SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) AS running FROM hive_tasks WHERE archived=0 GROUP BY project_id",
      );
      const byProject = Object.fromEntries(counts.map((c) => [c.project_id, { tasks: Number(c.n), running: Number(c.running || 0) }]));
      res.json({
        ok: true,
        me: { username: req.hiveUser, role: req.access?.role || "member", admin: isAdmin(req) },
        catalogue: catalogue(),
        keys: k,
        github: gits.map(publicGithub),
        projects: projects.map((p) => ({ ...p, ...(byProject[p.id] || { tasks: 0, running: 0 }) })),
        members: team,
        online: hub.roster(),
        runningAgents: runner.runningCount(),
        live: runner.liveAgents(),
      });
    }),
  );

  router.get(
    "/api/hive/stats",
    h(async (_req, res) => {
      const today = new Date().toISOString().slice(0, 10);
      const since = new Date(Date.now() - 13 * 86400e3).toISOString().slice(0, 10);
      const byProvider = await all(
        `SELECT k.provider AS provider, u.day AS day, SUM(u.input_tokens) AS input, SUM(u.output_tokens) AS output, SUM(u.requests) AS requests, SUM(u.cost_micros) AS cost
         FROM hive_usage u JOIN hive_keys k ON k.id = u.key_id WHERE u.day >= ? GROUP BY k.provider, u.day ORDER BY u.day`,
        [since],
      );
      const byUser = await all(
        "SELECT username, SUM(input_tokens + output_tokens) AS tokens, SUM(requests) AS requests FROM hive_usage WHERE day = ? GROUP BY username ORDER BY tokens DESC",
        [today],
      );
      const tasks = await get(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) AS running, SUM(CASE WHEN pr_url IS NOT NULL THEN 1 ELSE 0 END) AS prs FROM hive_tasks",
      );
      res.json({ ok: true, byProvider, byUser, tasks, runningAgents: runner.runningCount() });
    }),
  );

  /* ── provider keys ───────────────────────────────────────────────── */
  // A new key's models are tested in the background, so only the ones that answer are offered.
  function autoVerify(id) {
    if (process.env.NODE_ENV === "test" && process.env.HIVE_TEST_VERIFY !== "1") return;
    require("../hive/health")
      .verifyKey(id)
      .then(() => hub.emit("keys", { verified: id }))
      .catch((e) => console.error("[hive verify]", e.message));
  }
  router.post(
    "/api/hive/keys",
    h(async (req, res) => {
      const b = req.body || {};
      try {
        const id = await keys.createKey({ ...b, label: b.label ?? "" }, req.hiveUser);
        await audit(req, "hive.key.create", id, { provider: b.provider, label: b.label });
        const check = await keys.checkKey(id);
        hub.emit("keys", { by: req.hiveUser });
        if (check.ok) autoVerify(id);
        res.json({ ok: true, id, check, verifying: check.ok });
      } catch (e) {
        throw e.status ? e : new BadInput(e.message);
      }
    }),
  );

  async function manageableKey(req) {
    const row = await keys.keyRow(req.params.id);
    if (!row) throw new BadInput("Key not found", 404);
    if (row.owner !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only the person who added this key, or an admin, can change it", 403);
    return row;
  }

  router.patch(
    "/api/hive/keys/:id",
    h(async (req, res) => {
      await manageableKey(req);
      try {
        await keys.updateKey(req.params.id, req.body || {});
      } catch (e) {
        throw e.status ? e : new BadInput(e.message);
      }
      await audit(req, "hive.key.update", req.params.id, { fields: Object.keys(req.body || {}).filter((k) => k !== "apiKey") });
      if (req.body?.apiKey && (await keys.checkKey(req.params.id)).ok) autoVerify(req.params.id);
      hub.emit("keys", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );

  router.delete(
    "/api/hive/keys/:id",
    h(async (req, res) => {
      const row = await manageableKey(req);
      await keys.deleteKey(row.id);
      await audit(req, "hive.key.delete", row.id, { label: row.label, provider: row.provider });
      hub.emit("keys", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );

  // "Never offer me this model again" — it stays off the key until someone re-tests it.
  router.post(
    "/api/hive/keys/:id/hide-model",
    h(async (req, res) => {
      const model = String(req.body?.model || "").slice(0, 300);
      if (!model) throw new BadInput("Which model?");
      const row = await keys.keyRow(req.params.id);
      if (!row) throw new BadInput("Key not found", 404);
      const next = await keys.blockModel(row.id, model);
      const v = JSON.parse(row.verified_json || "null");
      if (v?.ok?.includes(model)) {
        v.ok = v.ok.filter((m) => m !== model);
        v.failed = { ...(v.failed || {}), [model]: "Hidden by " + req.hiveUser };
        await keys.saveVerified(row.id, v);
      }
      await audit(req, "hive.key.hide_model", row.id, { model });
      hub.emit("keys", { by: req.hiveUser });
      res.json({ ok: true, defaultModel: next });
    }),
  );

  router.post(
    "/api/hive/keys/:id/check",
    h(async (req, res) => {
      const r = await keys.checkKey(req.params.id);
      hub.emit("keys", { by: req.hiveUser });
      res.json({ ok: true, ...r });
    }),
  );

  router.get(
    "/api/hive/keys/:id/usage",
    h(async (req, res) => {
      res.json({ ok: true, ...(await keys.usageSeries(req.params.id, 30)) });
    }),
  );

  /* ── model radar ─────────────────────────────────────────────────── */
  router.get(
    "/api/hive/models/radar",
    h(async (req, res) => {
      const [recent, market] = await Promise.all([modelsLib.recent(45), modelsLib.marketFeed({ force: req.query.refresh === "1" })]);
      res.json({ ok: true, recent, market: market.models, marketAt: market.at, marketError: market.error || null });
    }),
  );
  router.post(
    "/api/hive/models/refresh",
    h(async (_req, res) => {
      const fresh = await keys.refreshAll();
      hub.emit("keys", {});
      res.json({ ok: true, fresh });
    }),
  );

  /* ── GitHub connections ──────────────────────────────────────────── */
  router.post(
    "/api/hive/github",
    h(async (req, res) => {
      const token = str(req.body?.token, "token", { max: 400, min: 10 });
      const label = str(req.body?.label, "name", { max: 60, optional: true });
      let me;
      try {
        me = await gh.me(token);
      } catch (e) {
        throw new BadInput(`GitHub rejected that token: ${e.message}`);
      }
      const id = newId("gh");
      await run("INSERT INTO hive_github(id, label, login, token_enc, last4, created_by, created_at) VALUES(?,?,?,?,?,?,?)", [
        id,
        label || `@${me.login}`,
        me.login,
        vault.seal(token),
        vault.last4(token),
        req.hiveUser,
        now(),
      ]);
      await audit(req, "hive.github.create", id, { login: me.login });
      require("../hive/repos").clearCache();
      hub.emit("github", { by: req.hiveUser });
      res.json({ ok: true, id, login: me.login });
    }),
  );

  router.delete(
    "/api/hive/github/:id",
    h(async (req, res) => {
      const row = await get("SELECT * FROM hive_github WHERE id=?", [req.params.id]);
      if (!row) throw new BadInput("Not found", 404);
      if (row.created_by !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only the person who added it, or an admin, can remove it", 403);
      // Projects on this connection move to another connection that can reach their repo.
      const repos = require("../hive/repos");
      const { repos: list } = await repos.allRepos({ force: true });
      for (const p of await all("SELECT id, repo_owner, repo_name FROM hive_projects WHERE github_id=?", [row.id])) {
        const r = list.find((x) => x.fullName.toLowerCase() === `${p.repo_owner}/${p.repo_name}`.toLowerCase() && x.githubId !== row.id);
        if (r) await run("UPDATE hive_projects SET github_id=?, updated_at=? WHERE id=?", [r.githubId, now(), p.id]);
      }
      const used = await get("SELECT COUNT(*) AS n FROM hive_projects WHERE github_id=?", [row.id]);
      if (Number(used?.n) > 0) throw new BadInput("Some projects' repos can only be reached through this connection — connect another GitHub account that can see them first", 409);
      await run("DELETE FROM hive_github WHERE id=?", [row.id]);
      await audit(req, "hive.github.delete", row.id, { login: row.login });
      hub.emit("github", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );

  router.get(
    "/api/hive/github/:id/repos",
    h(async (req, res) => {
      const repos = await gh.listRepos(await githubToken(req.params.id));
      res.json({
        ok: true,
        repos: repos.map((r) => ({ owner: r.owner.login, name: r.name, fullName: r.full_name, private: r.private, defaultBranch: r.default_branch, description: r.description, pushedAt: r.pushed_at, permissions: r.permissions || null })),
      });
    }),
  );

  /* ── projects ────────────────────────────────────────────────────── */
  router.post(
    "/api/hive/projects",
    h(async (req, res) => {
      const b = req.body || {};
      // A project without GitHub: a folder on a connected machine.
      if (!b.githubId && b.machineId) {
        const m = await get("SELECT id FROM hive_machines WHERE id=?", [String(b.machineId)]);
        if (!m) throw new BadInput("Machine not found");
        const id = newId("prj");
        const t = now();
        await run(
          `INSERT INTO hive_projects(id, name, github_id, repo_owner, repo_name, default_branch, description, instructions, color, created_by, created_at, updated_at, machine_id, folder, idea_id)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, str(b.name, "name", { max: 60 }), "", "", "", "main", str(b.description, "description", { max: 300, optional: true }) || "", str(b.instructions, "instructions", { max: 8000, optional: true }) || "", COLORS.has(b.color) ? b.color : "violet", req.hiveUser, t, t, m.id, str(b.folder, "folder", { max: 500 }), b.ideaId || null],
        );
        const p = await projectRow(id);
        hub.emit("project", p);
        return res.json({ ok: true, project: p });
      }
      const githubId = str(b.githubId, "GitHub connection", { max: 64 });
      const owner = str(b.owner, "repository owner", { max: 100 });
      const repo = str(b.repo, "repository name", { max: 100 });
      const token = await githubToken(githubId);
      let info;
      try {
        info = await gh.repo(token, owner, repo);
      } catch (e) {
        throw new BadInput(`Can't open ${owner}/${repo} with that connection: ${e.message}`);
      }
      const id = newId("prj");
      const t = now();
      await run(
        `INSERT INTO hive_projects(id, name, github_id, repo_owner, repo_name, default_branch, description, instructions, color, created_by, created_at, updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          str(b.name, "name", { max: 60, optional: true }) || info.name,
          githubId,
          info.owner.login,
          info.name,
          str(b.branch, "branch", { max: 120, optional: true }) || info.default_branch,
          str(b.description, "description", { max: 300, optional: true }) || info.description || "",
          str(b.instructions, "instructions", { max: 8000, optional: true }) || "",
          COLORS.has(b.color) ? b.color : "violet",
          req.hiveUser,
          t,
          t,
        ],
      );
      if (b.machineId || b.ideaId) await run("UPDATE hive_projects SET machine_id=?, folder=?, idea_id=? WHERE id=?", [b.machineId || null, b.machineId ? String(b.folder || "").slice(0, 500) || null : null, b.ideaId || null, id]);
      await audit(req, "hive.project.create", id, { repo: `${info.owner.login}/${info.name}` });
      // No instructions given: Hive writes a project brief from the repo for every agent.
      if (!b.instructions && process.env.NODE_ENV !== "test") require("../hive/repos").writeBrief(id).catch(() => {});
      const p = await projectRow(id);
      hub.emit("project", p);
      res.json({ ok: true, project: p });
    }),
  );

  router.patch(
    "/api/hive/projects/:id",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      const b = req.body || {};
      const name = str(b.name, "name", { max: 60, optional: true });
      const description = b.description !== undefined ? String(b.description).slice(0, 300) : undefined;
      const instructions = b.instructions !== undefined ? String(b.instructions).slice(0, 8000) : undefined;
      const branch = str(b.branch, "branch", { max: 120, optional: true });
      if (b.machineId !== undefined) {
        await run("UPDATE hive_projects SET machine_id=?, folder=? WHERE id=?", [b.machineId || null, b.machineId ? String(b.folder || "").slice(0, 500) || null : null, p.id]);
      }
      await run("UPDATE hive_projects SET name=?, description=?, instructions=?, default_branch=?, color=?, updated_at=? WHERE id=?", [
        name ?? p.name,
        description ?? p.description,
        instructions ?? p.instructions,
        branch ?? p.default_branch,
        COLORS.has(b.color) ? b.color : p.color,
        now(),
        p.id,
      ]);
      const np = await projectRow(p.id);
      hub.emit("project", np);
      res.json({ ok: true, project: np });
    }),
  );

  router.delete(
    "/api/hive/projects/:id",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      if (p.created_by !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only the creator or an admin can delete a project", 403);
      const live = await get("SELECT COUNT(*) AS n FROM hive_tasks WHERE project_id=? AND status='running'", [p.id]);
      if (Number(live?.n)) throw new BadInput("Stop the running tasks first", 409);
      const tasks = await all("SELECT id FROM hive_tasks WHERE project_id=?", [p.id]);
      for (const t of tasks) {
        await run("DELETE FROM hive_events WHERE task_id=?", [t.id]);
        await run("DELETE FROM hive_changes WHERE task_id=?", [t.id]);
        await run("DELETE FROM hive_agents WHERE task_id=?", [t.id]);
        dropOverlay(t.id);
      }
      await run("DELETE FROM hive_tasks WHERE project_id=?", [p.id]);
      await run("DELETE FROM hive_chat WHERE project_id=?", [p.id]);
      await run("DELETE FROM hive_projects WHERE id=?", [p.id]);
      await audit(req, "hive.project.delete", p.id, { repo: `${p.repo_owner}/${p.repo_name}` });
      hub.emit("project_deleted", { id: p.id });
      res.json({ ok: true });
    }),
  );

  router.get(
    "/api/hive/projects/:id/branches",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      const list = await gh.branches(await githubToken(p.github_id), p.repo_owner, p.repo_name);
      res.json({ ok: true, branches: list.map((b) => ({ name: b.name, sha: b.commit.sha })) });
    }),
  );

  router.get(
    "/api/hive/projects/:id/tree",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      const token = await githubToken(p.github_id);
      const head = await gh.commit(token, p.repo_owner, p.repo_name, p.default_branch);
      const snap = await require("../hive/snapshot").getSnapshot(token, p.repo_owner, p.repo_name, head.sha);
      res.json({ ok: true, paths: [...snap.entries.keys()].sort().slice(0, 20000), sha: head.sha });
    }),
  );

  router.get(
    "/api/hive/projects/:id/tasks",
    h(async (req, res) => {
      await projectRow(req.params.id);
      const archived = req.query.archived === "1" ? 1 : 0;
      const tasks = await all("SELECT * FROM hive_tasks WHERE project_id=? AND archived=? ORDER BY updated_at DESC LIMIT 200", [req.params.id, archived]);
      const agents = tasks.length
        ? await all(
            `SELECT id, task_id, name, provider, model, status, role, input_tokens, output_tokens FROM hive_agents WHERE task_id IN (${tasks.map(() => "?").join(",")})`,
            tasks.map((t) => t.id),
          )
        : [];
      const byTask = {};
      for (const a of agents) (byTask[a.task_id] ||= []).push(a);
      res.json({ ok: true, tasks: tasks.map((t) => ({ ...t, agents: byTask[t.id] || [] })) });
    }),
  );

  /* ── tasks ───────────────────────────────────────────────────────── */
  router.post(
    "/api/hive/projects/:id/tasks",
    h(async (req, res) => {
      let p = await projectRow(req.params.id);
      const b = req.body || {};
      const prompt = str(b.prompt, "prompt", { max: 30000 });
      const mode = MODES.has(b.mode) ? b.mode : "solo";
      const specs = (Array.isArray(b.agents) ? b.agents : []).slice(0, 8).map(cleanSpec);
      const lead = b.lead ? cleanSpec(b.lead) : null;
      // Machine agents (Claude Code, Codex, Vibe) with no machine chosen: copy the repo onto their machine.
      if (!b.machineId && !b.repoId) {
        try {
          p = (await require("../hive/repos").ensureOnMachine(p.id, [...specs, ...(lead ? [lead] : [])].map((s) => s.provider))) || p;
        } catch (e) {
          throw new BadInput(e.message);
        }
      }
      if (!specs.length && !lead) throw new BadInput("Pick at least one agent");
      if ((mode === "compare" || mode === "review") && !specs.length) throw new BadInput("Pick the agents to run");
      // Where the work happens: a linked repo of the project, and optionally a
      // folder on a connected machine (real files + commands).
      const repoId = typeof b.repoId === "string" && b.repoId ? b.repoId : null;
      if (repoId && !(await get("SELECT id FROM hive_project_repos WHERE id=? AND project_id=?", [repoId, p.id]))) throw new BadInput("Unknown repository for this project");
      const target = await runner.effectiveProject(p, { repo_id: repoId });
      const machineId = typeof b.machineId === "string" && b.machineId ? b.machineId : repoId ? null : p.machine_id || null;
      const folder = machineId ? str(b.folder, "folder", { max: 500, optional: true }) || (machineId === p.machine_id ? p.folder : null) : null;
      if (machineId) {
        if (!(await get("SELECT id FROM hive_machines WHERE id=?", [machineId]))) throw new BadInput("Machine not found");
        if (!folder) throw new BadInput("Pick a folder on the machine");
        if (!machines.isOnline(machineId)) throw new BadInput("That machine is offline — start the Hive bridge on it", 409);
      } else if (!target.github_id) throw new BadInput("This project has no repository — pick a machine folder to work in");
      // Fail fast if a spec can't get a model (no key, no budget, wrong machine).
      for (const s of [...specs, ...(lead ? [lead] : [])]) await runner.resolveSpec(s, { prompt, machineId }).catch((e) => {
        throw new BadInput(e.message);
      });
      const baseRef = str(b.baseRef, "base branch", { max: 120, optional: true }) || target.default_branch || "main";
      let base = { sha: "local" };
      if (!machineId) {
        const token = await githubToken(target.github_id);
        try {
          base = await gh.commit(token, target.repo_owner, target.repo_name, baseRef);
        } catch (e) {
          throw new BadInput(`Can't read ${baseRef}: ${e.message}`);
        }
      }
      const id = newId("tsk");
      const title = str(b.title, "title", { max: 120, optional: true }) || prompt.split("\n")[0].slice(0, 90);
      const t = now();
      await run(
        `INSERT INTO hive_tasks(id, project_id, title, prompt, mode, status, base_ref, base_sha, branch, created_by, created_at, updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, p.id, title, prompt, mode, "queued", baseRef, base.sha, `hive/${slug(title)}-${id.slice(-4)}`, req.hiveUser, t, t],
      );
      if (repoId || machineId) await run("UPDATE hive_tasks SET repo_id=?, machine_id=?, folder=? WHERE id=?", [repoId, machineId, folder, id]);
      if (machineId && b.isolate !== false) await router.hiveIsolate?.(id);
      const fileIds = (Array.isArray(b.attachments) ? b.attachments : []).map(String).slice(0, 12);
      const budget = Number(b.budgetTokens) > 0 ? Math.round(Number(b.budgetTokens)) : null;
      if (fileIds.length || budget) await run("UPDATE hive_tasks SET attachments_json=?, budget_tokens=? WHERE id=?", [JSON.stringify(fileIds), budget, id]);
      await run("UPDATE hive_projects SET updated_at=? WHERE id=?", [t, p.id]);
      const task = await taskRow(id);
      hub.emit("task", task);
      await runner.startTask(task, { mode, specs, lead, username: req.hiveUser }).catch((e) => {
        throw new BadInput(e.message);
      });
      res.json({ ok: true, task: await taskRow(id) });
    }),
  );

  router.get(
    "/api/hive/tasks/:id",
    h(async (req, res) => {
      const task = await taskRow(req.params.id);
      const project = await projectRow(task.project_id);
      const agents = await all("SELECT * FROM hive_agents WHERE task_id=? ORDER BY created_at", [task.id]);
      const events = (await all("SELECT * FROM hive_events WHERE task_id=? ORDER BY seq DESC LIMIT 1500", [task.id])).reverse().map((e) => ({ ...e, data: json(e.data_json, {}), data_json: undefined }));
      const variants = (await all("SELECT DISTINCT variant FROM hive_changes WHERE task_id=?", [task.id])).map((r) => r.variant);
      res.json({ ok: true, task, project, agents, events, variants });
    }),
  );

  router.get(
    "/api/hive/tasks/:id/events",
    h(async (req, res) => {
      const after = Number(req.query.after || 0);
      const events = await all("SELECT * FROM hive_events WHERE task_id=? AND seq>? ORDER BY seq LIMIT 2000", [req.params.id, after]);
      res.json({ ok: true, events: events.map((e) => ({ ...e, data: json(e.data_json, {}), data_json: undefined })) });
    }),
  );

  router.patch(
    "/api/hive/tasks/:id",
    h(async (req, res) => {
      const task = await taskRow(req.params.id);
      const b = req.body || {};
      const fields = {};
      if (b.title !== undefined) fields.title = str(b.title, "title", { max: 120 });
      if (b.archived !== undefined) fields.archived = b.archived ? 1 : 0;
      if (b.branch !== undefined) fields.branch = str(b.branch, "branch", { max: 120 });
      if (!Object.keys(fields).length) return res.json({ ok: true, task });
      res.json({ ok: true, task: await runner.setTask(task.id, fields) });
    }),
  );

  async function wsFor(req) {
    const ctx = await runner.taskContext(req.params.id);
    const variant = typeof (req.query.variant || req.body?.variant) === "string" ? req.query.variant || req.body.variant : "main";
    return { ...ctx, variant, ws: runner.workspaceOf(ctx, variant) };
  }

  router.get(
    "/api/hive/tasks/:id/changes",
    h(async (req, res) => {
      const { ws, snap } = await wsFor(req);
      res.json({ ok: true, changes: await ws.changes(), index: snap ? snap.status : "ready" });
    }),
  );

  router.get(
    "/api/hive/tasks/:id/tree",
    h(async (req, res) => {
      const { ws, snap } = await wsFor(req);
      const paths = await ws.listPaths();
      res.json({ ok: true, paths: paths.slice(0, 20000), total: paths.length, truncated: snap ? snap.truncatedTree : false, index: snap ? snap.status : "ready" });
    }),
  );

  router.get(
    "/api/hive/tasks/:id/file",
    h(async (req, res) => {
      const { ws, snap } = await wsFor(req);
      const path = cleanPath(req.query.path);
      const base = ws.readBase ? await ws.readBase(path).catch(() => null) : snap.entries.has(path) ? await readBase(snap, path).catch((e) => ({ error: e.message })) : null;
      if (base && typeof base === "object") throw new BadInput(base.error);
      const current = await ws.read(path).catch(() => null);
      res.json({ ok: true, path, base, current, status: base === null ? (current === null ? "missing" : "added") : current === null ? "deleted" : base === current ? "unchanged" : "modified" });
    }),
  );

  router.put(
    "/api/hive/tasks/:id/file",
    h(async (req, res) => {
      const { ws, task, variant } = await wsFor(req);
      const path = cleanPath(req.body?.path);
      if (req.body?.delete) await ws.remove(path, `@${req.hiveUser}`);
      else {
        if (typeof req.body?.content !== "string") throw new BadInput("content is required");
        await ws.write(path, req.body.content, `@${req.hiveUser}`);
      }
      await runner.event(task.id, null, "human_edit", { username: req.hiveUser, path, variant, deleted: !!req.body?.delete });
      hub.emitTask(task.id, "changes", { variant });
      res.json({ ok: true });
    }),
  );

  router.delete(
    "/api/hive/tasks/:id/file",
    h(async (req, res) => {
      const { ws, task, variant } = await wsFor(req);
      const path = cleanPath(req.query.path);
      await ws.revert(path);
      await runner.event(task.id, null, "human_edit", { username: req.hiveUser, path, variant, reverted: true });
      hub.emitTask(task.id, "changes", { variant });
      res.json({ ok: true });
    }),
  );

  router.post(
    "/api/hive/tasks/:id/adopt",
    h(async (req, res) => {
      const task = await taskRow(req.params.id);
      const variant = str(req.body?.variant, "variant", { max: 64 });
      if (variant === "main") throw new BadInput("Pick a compare result to adopt");
      const agent = await get("SELECT name, model FROM hive_agents WHERE id=? AND task_id=?", [variant, task.id]);
      if (!agent) throw new BadInput("Unknown result", 404);
      await runner.adoptAttempt(task.id, variant);
      await runner.event(task.id, null, "system", { message: `@${req.hiveUser} adopted ${agent.name}'s result (${agent.model})` });
      hub.emitTask(task.id, "changes", { variant: "main" });
      res.json({ ok: true });
    }),
  );

  router.post(
    "/api/hive/tasks/:id/commit",
    h(async (req, res) => {
      const ctx = await runner.taskContext(req.params.id);
      const b = req.body || {};
      const message = str(b.message, "commit message", { max: 5000 });
      const branch = str(b.branch, "branch", { max: 120, optional: true }) || ctx.task.branch;
      let result;
      try {
        result = ctx.machine
          ? await commitOnMachine({ ...ctx, message, branch, openPr: !!b.openPr, prTitle: str(b.prTitle, "PR title", { max: 200, optional: true }), prBody: typeof b.prBody === "string" ? b.prBody.slice(0, 60000) : "", author: req.hiveUser })
          : await commitTask({
          ...ctx,
          variant: typeof b.variant === "string" ? b.variant : "main",
          message,
          branch,
          openPr: !!b.openPr,
          prTitle: str(b.prTitle, "PR title", { max: 200, optional: true }),
          prBody: typeof b.prBody === "string" ? b.prBody.slice(0, 60000) : "",
          author: req.hiveUser,
        });
      } catch (e) {
        throw e.status && e.status < 500 ? new BadInput(e.message, e.status === 404 ? 400 : e.status) : e;
      }
      const fields = { head_sha: result.sha, branch: result.branch };
      if (result.pr) Object.assign(fields, { pr_url: result.pr.url, pr_number: result.pr.number, status: "pr_open" });
      else fields.status = "committed";
      await runner.setTask(ctx.task.id, fields);
      await runner.event(ctx.task.id, null, "commit", { username: req.hiveUser, ...result, message });
      await audit(req, "hive.commit", ctx.task.id, { repo: `${ctx.project.repo_owner}/${ctx.project.repo_name}`, branch: result.branch, sha: result.sha, pr: result.pr?.url });
      res.json({ ok: true, ...result });
    }),
  );

  router.post(
    "/api/hive/tasks/:id/agents",
    h(async (req, res) => {
      const task = await taskRow(req.params.id);
      const prompt = str(req.body?.prompt, "message", { max: 20000 });
      const spec = cleanSpec(req.body?.agent);
      await runner.resolveSpec(spec, { prompt, machineId: task.machine_id || null }).catch((e) => {
        throw new BadInput(e.message);
      });
      const variant = typeof req.body?.variant === "string" && req.body.variant ? req.body.variant : "main";
      const agent = await runner.addAgent(task.id, { spec, prompt, username: req.hiveUser, readOnly: !!req.body?.readOnly, variant });
      res.json({ ok: true, agent });
    }),
  );

  router.post(
    "/api/hive/tasks/:id/stop",
    h(async (req, res) => {
      const task = await taskRow(req.params.id);
      const n = await runner.stopTask(task.id);
      await runner.event(task.id, null, "system", { message: `@${req.hiveUser} stopped the task` });
      res.json({ ok: true, stopped: n });
    }),
  );

  router.post(
    "/api/hive/agents/:id/stop",
    h(async (req, res) => {
      const a = await get("SELECT task_id FROM hive_agents WHERE id=?", [req.params.id]);
      if (!a) throw new BadInput("Agent not found", 404);
      const ok = runner.stopAgent(req.params.id);
      if (ok) await runner.event(a.task_id, req.params.id, "system", { message: `@${req.hiveUser} stopped this agent` });
      res.json({ ok: true, stopped: ok });
    }),
  );

  router.post(
    "/api/hive/agents/:id/steer",
    h(async (req, res) => {
      const message = str(req.body?.message, "message", { max: 4000 });
      const ok = await runner.steer(req.params.id, req.hiveUser, message);
      if (!ok) throw new BadInput("That agent is not running — send a follow-up instead", 409);
      res.json({ ok: true });
    }),
  );

  /* ── overview across projects ────────────────────────────────────── */
  router.get(
    "/api/hive/overview",
    h(async (_req, res) => {
      const tasks = await all(
        `SELECT t.*, p.name AS project_name, p.color AS project_color, p.repo_owner, p.repo_name FROM hive_tasks t JOIN hive_projects p ON p.id = t.project_id
         WHERE t.archived=0 ORDER BY CASE WHEN t.status IN ('running','queued') THEN 0 WHEN t.status='review' THEN 1 ELSE 2 END, t.updated_at DESC LIMIT 60`,
      );
      const agents = tasks.length
        ? await all(
            `SELECT id, task_id, name, provider, model, status, role, title, input_tokens, output_tokens FROM hive_agents WHERE task_id IN (${tasks.map(() => "?").join(",")})`,
            tasks.map((t) => t.id),
          )
        : [];
      const byTask = {};
      for (const a of agents) (byTask[a.task_id] ||= []).push(a);
      const today = new Date().toISOString().slice(0, 10);
      const usage = await get("SELECT COALESCE(SUM(input_tokens+output_tokens),0) AS tokens, COALESCE(SUM(requests),0) AS requests, COALESCE(SUM(cost_micros),0) AS cost FROM hive_usage WHERE day=?", [today]);
      res.json({ ok: true, tasks: tasks.map((t) => ({ ...t, agents: byTask[t.id] || [] })), live: runner.liveAgents(), today: usage });
    }),
  );

  /* ── assign / hand off ───────────────────────────────────────────── */
  router.post(
    "/api/hive/tasks/:id/assign",
    h(async (req, res) => {
      const task = await taskRow(req.params.id);
      const b = req.body || {};
      const instructions = str(b.instructions, "instructions", { max: 20000 });
      const specs = (Array.isArray(b.agents) ? b.agents : []).slice(0, 8).map(cleanSpec);
      if (!specs.length) throw new BadInput("Pick at least one agent");
      for (const sp of specs) await runner.resolveSpec(sp, { prompt: instructions, machineId: task.machine_id || null }).catch((e) => {
        throw new BadInput(e.message);
      });
      const agents = await runner.assign(task.id, { title: str(b.title, "title", { max: 120, optional: true }), instructions, specs, together: b.together !== false, username: req.hiveUser });
      res.json({ ok: true, agents });
    }),
  );

  router.post(
    "/api/hive/agents/:id/handoff",
    h(async (req, res) => {
      const spec = cleanSpec(req.body?.agent);
      const old = await get("SELECT a.instructions, t.machine_id FROM hive_agents a JOIN hive_tasks t ON t.id=a.task_id WHERE a.id=?", [req.params.id]);
      await runner.resolveSpec(spec, { prompt: old?.instructions || "", machineId: old?.machine_id || null }).catch((e) => {
        throw new BadInput(e.message);
      });
      const agent = await runner.handoffAgent(req.params.id, { spec, username: req.hiveUser });
      res.json({ ok: true, agent });
    }),
  );

  /* ── shared project memory ───────────────────────────────────────── */
  router.get(
    "/api/hive/projects/:id/memory",
    h(async (req, res) => {
      const p = (await plugins.resolvePlugins(req.params.id)).builtins.shared_memory;
      // What agents actually get: the first `limit` of this order, while sharing is on.
      res.json({ ok: true, memory: await all("SELECT * FROM hive_memory WHERE project_id=? ORDER BY pinned DESC, created_at DESC LIMIT 300", [req.params.id]), sharing: { enabled: !!p?.enabled, limit: Number(p?.config?.maxItems) || 30 } });
    }),
  );
  router.post(
    "/api/hive/projects/:id/memory",
    h(async (req, res) => {
      await projectRow(req.params.id);
      const r = await require("../hive/memory").rememberProject(req.params.id, str(req.body?.title, "title", { max: 120 }), str(req.body?.body, "note", { max: 1500 }), `@${req.hiveUser}`, { pinned: !!req.body?.pinned });
      hub.emit("memory", { projectId: req.params.id });
      res.json({ ok: true, id: r.id, updated: r.updated });
    }),
  );
  router.patch(
    "/api/hive/memory/:id",
    h(async (req, res) => {
      const m = await get("SELECT * FROM hive_memory WHERE id=?", [req.params.id]);
      if (!m) throw new BadInput("Not found", 404);
      await run("UPDATE hive_memory SET pinned=?, title=?, body=? WHERE id=?", [
        req.body?.pinned === undefined ? m.pinned : req.body.pinned ? 1 : 0,
        str(req.body?.title, "title", { max: 120, optional: true }) ?? m.title,
        str(req.body?.body, "note", { max: 1500, optional: true }) ?? m.body,
        m.id,
      ]);
      hub.emit("memory", { projectId: m.project_id });
      res.json({ ok: true });
    }),
  );
  router.delete(
    "/api/hive/memory/:id",
    h(async (req, res) => {
      const m = await get("SELECT project_id FROM hive_memory WHERE id=?", [req.params.id]);
      await run("DELETE FROM hive_memory WHERE id=?", [req.params.id]);
      if (m) hub.emit("memory", { projectId: m.project_id });
      res.json({ ok: true });
    }),
  );

  /* ── plugins ─────────────────────────────────────────────────────── */
  const scopeOf = (v) => (typeof v === "string" && v && v !== "*" ? v.slice(0, 64) : "*");
  router.get(
    "/api/hive/plugins",
    h(async (req, res) => {
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : null;
      const r = await plugins.resolvePlugins(projectId);
      res.json({ ok: true, builtins: Object.values(r.builtins), custom: r.custom });
    }),
  );
  router.put(
    "/api/hive/plugins/builtin/:id",
    h(async (req, res) => {
      if (req.body?.scope === "*" || !req.body?.scope) {
        if (!isAdmin(req)) throw new BadInput("Only admins can change workspace-wide defaults — set it for a project instead", 403);
      }
      await plugins.setBuiltin(scopeOf(req.body?.scope), req.params.id, { enabled: req.body?.enabled, config: req.body?.config }, req.hiveUser);
      await audit(req, "hive.plugin", req.params.id, { scope: scopeOf(req.body?.scope), enabled: req.body?.enabled });
      hub.emit("plugins", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/plugins/custom",
    h(async (req, res) => {
      const b = req.body || {};
      const id = newId("plg");
      const t = now();
      const appliesTo = ["all", "tasks", "chat"].includes(b.appliesTo) ? b.appliesTo : "all";
      await run(
        "INSERT INTO hive_plugins(id, scope, kind, name, description, enabled, config_json, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        [id, scopeOf(b.scope), "instructions", str(b.name, "name", { max: 60 }), str(b.description, "description", { max: 300, optional: true }) || "", 1, JSON.stringify({ instructions: str(b.instructions, "instructions", { max: 6000 }), appliesTo }), req.hiveUser, t, t],
      );
      hub.emit("plugins", { by: req.hiveUser });
      res.json({ ok: true, id });
    }),
  );
  router.patch(
    "/api/hive/plugins/custom/:id",
    h(async (req, res) => {
      const r = await get("SELECT * FROM hive_plugins WHERE id=? AND kind='instructions'", [req.params.id]);
      if (!r) throw new BadInput("Not found", 404);
      const b = req.body || {};
      const cfg = json(r.config_json, {});
      if (b.instructions !== undefined) cfg.instructions = str(b.instructions, "instructions", { max: 6000 });
      if (["all", "tasks", "chat"].includes(b.appliesTo)) cfg.appliesTo = b.appliesTo;
      await run("UPDATE hive_plugins SET name=?, description=?, enabled=?, config_json=?, updated_at=? WHERE id=?", [
        str(b.name, "name", { max: 60, optional: true }) ?? r.name,
        b.description !== undefined ? String(b.description).slice(0, 300) : r.description,
        b.enabled === undefined ? r.enabled : b.enabled ? 1 : 0,
        JSON.stringify(cfg),
        now(),
        r.id,
      ]);
      hub.emit("plugins", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );
  router.delete(
    "/api/hive/plugins/custom/:id",
    h(async (req, res) => {
      const r = await get("SELECT created_by FROM hive_plugins WHERE id=? AND kind='instructions'", [req.params.id]);
      if (!r) throw new BadInput("Not found", 404);
      if (r.created_by !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only its author or an admin can delete it", 403);
      await run("DELETE FROM hive_plugins WHERE id=?", [req.params.id]);
      hub.emit("plugins", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );

  /* ── files (uploads + generated images) ──────────────────────────── */
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: chat.MAX_FILE, files: 1 } });
  router.post("/api/hive/files", (req, res, next) =>
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ ok: false, error: err.code === "LIMIT_FILE_SIZE" ? "File too large (20 MB max)" : err.message });
      next();
    }),
    h(async (req, res) => {
      if (!req.file) throw new BadInput("No file");
      const f = await chat.saveFile({ name: req.file.originalname, mime: req.file.mimetype, buffer: req.file.buffer, username: req.hiveUser });
      res.json({ ok: true, file: f });
    }),
  );
  router.get(
    "/api/hive/files/:id",
    h(async (req, res) => {
      const f = await get("SELECT * FROM hive_files WHERE id=?", [req.params.id]);
      if (!f) throw new BadInput("Not found", 404);
      // Only raster images render inline; everything else downloads, so an
      // uploaded HTML/SVG file can never run script on this origin.
      const inline = /^image\/(png|jpeg|gif|webp)$/.test(f.mime);
      res.set({
        "Content-Type": inline ? f.mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${String(f.name).replace(/["\r\n\\]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, max-age=86400",
      });
      res.send(Buffer.from(f.data_b64, "base64"));
    }),
  );

  /* ── chats ───────────────────────────────────────────────────────── */
  router.get(
    "/api/hive/convos",
    h(async (req, res) => {
      res.json({ ok: true, convos: await chat.listConvos(req.hiveUser) });
    }),
  );
  router.post(
    "/api/hive/convos",
    h(async (req, res) => {
      const b = req.body || {};
      res.json({ ok: true, convo: await chat.createConvo(req.hiveUser, { title: str(b.title, "title", { max: 120, optional: true }), projectId: b.projectId, system: typeof b.system === "string" ? b.system.slice(0, 8000) : "" }) });
    }),
  );
  // A project's own chat: the latest one about it, or a new one (?new=1).
  router.post(
    "/api/hive/projects/:id/chat",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      res.json({ ok: true, convo: await chat.projectChat(req.hiveUser, p.id, { fresh: !!req.body?.fresh }) });
    }),
  );
  router.get(
    "/api/hive/convos/:id",
    h(async (req, res) => {
      const c = await chat.convoFor(req.params.id, req.hiveUser);
      res.json({ ok: true, convo: c, messages: await chat.messagesOf(c.id) });
    }),
  );
  router.patch(
    "/api/hive/convos/:id",
    h(async (req, res) => {
      const c = await chat.convoFor(req.params.id, req.hiveUser);
      if (c.owner !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only its owner or an admin can rename this chat", 403);
      const b = req.body || {};
      await run("UPDATE hive_convos SET title=?, shared=?, system=?, updated_at=? WHERE id=?", [
        str(b.title, "title", { max: 120, optional: true }) ?? c.title,
        b.shared === undefined ? c.shared : b.shared ? 1 : 0,
        typeof b.system === "string" ? b.system.slice(0, 8000) : c.system,
        now(),
        c.id,
      ]);
      hub.emit("convos", { by: req.hiveUser });
      res.json({ ok: true });
    }),
  );
  router.delete(
    "/api/hive/convos/:id",
    h(async (req, res) => {
      const c = await chat.convoFor(req.params.id, req.hiveUser);
      if (c.owner !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only its owner can delete this chat", 403);
      await run("DELETE FROM hive_convo_msgs WHERE convo_id=?", [c.id]);
      await run("DELETE FROM hive_convos WHERE id=?", [c.id]);
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/convos/:id/messages",
    h(async (req, res) => {
      const b = req.body || {};
      const spec = cleanSpec(b.agent);
      const specs = Array.isArray(b.agents) && b.agents.length ? b.agents.slice(0, 4).map(cleanSpec) : null;
      const text = typeof b.text === "string" ? b.text.slice(0, 100000) : "";
      if (!text.trim() && !(Array.isArray(b.refs) && b.refs.length)) throw new BadInput("Write a message or attach a file");
      const mode = b.mode === "image" ? "image" : "text";
      if (!b.stream) {
        const r = await chat.send(req.params.id, { text, refs: b.refs, spec, specs, mode, username: req.hiveUser, focusProjectId: typeof b.focusProjectId === "string" ? b.focusProjectId.slice(0, 80) : null });
        return res.json({ ok: true, user: r.user, replyId: r.replyId });
      }
      // Stream the reply on this response (NDJSON, one event per line). The
      // sender never depends on socket rooms; generation keeps going and is
      // saved even if the browser goes away mid-reply.
      await chat.convoFor(req.params.id, req.hiveUser);
      res.status(200).set({ "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
      res.flushHeaders?.();
      let open = true;
      res.on("close", () => (open = false));
      const write = (type, data) => {
        if (!open) return;
        res.write(JSON.stringify({ type, data }) + "\n");
        res.flush?.(); // compression() buffers otherwise
      };
      const ping = setInterval(() => write("ping", {}), 15000);
      try {
        const r = await chat.send(req.params.id, { text, refs: b.refs, spec, specs, mode, username: req.hiveUser, focusProjectId: typeof b.focusProjectId === "string" ? b.focusProjectId.slice(0, 80) : null, sink: write });
        await r.done;
      } catch (e) {
        write("error", { error: e.message || "Something went wrong" });
      } finally {
        clearInterval(ping);
        if (open) res.end();
      }
    }),
  );
  // Side-by-side answers: pick the one the conversation continues from.
  router.post(
    "/api/hive/convos/:id/prefer",
    h(async (req, res) => {
      const c = await chat.convoFor(req.params.id, req.hiveUser);
      const m = await get("SELECT * FROM hive_convo_msgs WHERE id=? AND convo_id=?", [String(req.body?.messageId || ""), c.id]);
      if (!m?.group_id) throw new BadInput("Not a side-by-side answer");
      await run("UPDATE hive_convo_msgs SET preferred=CASE WHEN id=? THEN 1 ELSE 0 END WHERE convo_id=? AND group_id=?", [m.id, c.id, m.group_id]);
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/convos/:id/stop",
    h(async (req, res) => {
      await chat.convoFor(req.params.id, req.hiveUser);
      res.json({ ok: true, stopped: chat.stop(req.params.id) });
    }),
  );

  /* ── team chat ───────────────────────────────────────────────────── */
  router.get(
    "/api/hive/projects/:id/chat",
    h(async (req, res) => {
      const rows = await all("SELECT * FROM hive_chat WHERE project_id=? ORDER BY created_at DESC LIMIT 200", [req.params.id]);
      res.json({ ok: true, messages: rows.reverse() });
    }),
  );

  router.post(
    "/api/hive/projects/:id/chat",
    h(async (req, res) => {
      await projectRow(req.params.id);
      const body = str(req.body?.body, "message", { max: 4000 });
      const taskId = typeof req.body?.taskId === "string" ? req.body.taskId.slice(0, 64) : null;
      const msg = { id: newId("msg"), project_id: req.params.id, task_id: taskId, username: req.hiveUser, body, created_at: now() };
      await run("INSERT INTO hive_chat(id, project_id, task_id, username, body, created_at) VALUES(?,?,?,?,?,?)", [msg.id, msg.project_id, msg.task_id, msg.username, msg.body, msg.created_at]);
      hub.emit("chat", msg);
      res.json({ ok: true, message: msg });
    }),
  );

  // Machines, approvals, ship pipeline, launchpad, linked repos, terminal.
  require("./hive-ops").mount(router, { h, str, audit, isAdmin, githubToken, projectRow, taskRow, BadInput, cleanSpec, COLORS, ready });
  // Routing, subscription agents, budgets, Drive, Judge, pipelines, automations, guide.
  require("./hive-v4").mount(router, { h, str, audit, isAdmin, githubToken, projectRow, taskRow, BadInput, ready });

  return router;
}

module.exports = { createHiveRouter, isStaff };
