// Hive operations: machines (bridge), command approvals, a terminal, the ship
// pipeline (PR checks → merge → deploy), the idea launchpad and linked repos.
// Mounted inside createHiveRouter (staff-only), except /api/hive-bridge/*,
// which the bridge calls with its own machine token.
const fs = require("fs");
const path = require("path");
const { run, get, all, newId, now, json } = require("../hive/db");
const hub = require("../hive/hub");
const keys = require("../hive/keys");
const gh = require("../hive/github");
const runner = require("../hive/runner");
const machines = require("../hive/machines");
const { providerOf } = require("../hive/providers");
const { pickDefault } = require("../hive/models");

const BRIDGE_FILE = path.join(__dirname, "..", "..", "bridge", "hive-bridge.js");
const POLICIES = new Set(["ask", "safe", "auto", "read"]);

function mount(router, { h, str, audit, isAdmin, githubToken, projectRow, taskRow, BadInput, cleanSpec, COLORS, ready }) {
  /* ── bridge endpoints (machine token, not staff session) ───────────── */
  const bridgeAuth = async (req, res, next) => {
    await ready;
    const token = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const m = await machines.byToken(token).catch(() => null);
    if (!m) return res.status(401).json({ ok: false, error: "Unknown machine token" });
    req.machine = m;
    next();
  };
  router.post("/api/hive-bridge/hello", bridgeAuth, async (req, res) => {
    await machines.hello(req.machine, req.body?.info);
    res.json({ ok: true, name: req.machine.name, id: req.machine.id });
  });
  router.get("/api/hive-bridge/poll", bridgeAuth, (req, res) => machines.poll(req.machine, res));
  // The bridge script itself, fetched with the machine's token (one-line setup).
  router.get("/api/hive-bridge/script", bridgeAuth, (_req, res) => {
    res.set({ "Content-Type": "text/javascript; charset=utf-8", "Content-Disposition": 'attachment; filename="hive-bridge.js"', "Cache-Control": "no-store" });
    res.send(fs.readFileSync(BRIDGE_FILE));
  });
  router.post("/api/hive-bridge/result", bridgeAuth, (req, res) => {
    machines.result(req.machine, req.body || {});
    res.json({ ok: true });
  });

  /* ── machines (staff) ──────────────────────────────────────────────── */
  const machineRow = async (req, { manage = false } = {}) => {
    const m = await get("SELECT * FROM hive_machines WHERE id=?", [req.params.id]);
    if (!m) throw new BadInput("Machine not found", 404);
    if (manage && m.created_by !== req.hiveUser && !isAdmin(req)) throw new BadInput("Only the person who added this machine, or an admin, can do that", 403);
    return m;
  };

  router.get(
    "/api/hive/machines",
    h(async (_req, res) => {
      res.json({ ok: true, machines: await machines.listMachines(), approvals: machines.pendingApprovals() });
    }),
  );
  router.post(
    "/api/hive/machines",
    h(async (req, res) => {
      const name = str(req.body?.name, "name", { max: 60 });
      const r = await machines.createMachine(name, req.hiveUser);
      await audit(req, "hive.machine.create", r.id, { name });
      hub.emit("machines", { id: r.id });
      res.json({ ok: true, id: r.id, token: r.token });
    }),
  );
  router.patch(
    "/api/hive/machines/:id",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      const b = req.body || {};
      if (b.policy !== undefined && !POLICIES.has(b.policy)) throw new BadInput("Policy must be ask, safe, auto or read");
      await run("UPDATE hive_machines SET name=?, policy=? WHERE id=?", [str(b.name, "name", { max: 60, optional: true }) ?? m.name, b.policy ?? m.policy, m.id]);
      await audit(req, "hive.machine.update", m.id, { policy: b.policy });
      hub.emit("machines", { id: m.id });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/machines/:id/token",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      const token = await machines.rotateToken(m.id);
      await audit(req, "hive.machine.rotate", m.id, {});
      res.json({ ok: true, token });
    }),
  );
  router.delete(
    "/api/hive/machines/:id",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      await run("DELETE FROM hive_machines WHERE id=?", [m.id]);
      await audit(req, "hive.machine.delete", m.id, { name: m.name });
      hub.emit("machines", { id: m.id, deleted: true });
      res.json({ ok: true });
    }),
  );
  router.get(
    "/api/hive/machines/:id/folders",
    h(async (req, res) => {
      const m = await machineRow(req);
      res.json({ ok: true, ...(await machines.call(m.id, "folders", { path: typeof req.query.path === "string" ? req.query.path : undefined })) });
    }),
  );
  router.post(
    "/api/hive/machines/:id/clone",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      const b = req.body || {};
      const p = b.projectId ? await projectRow(String(b.projectId)) : null;
      if (!p?.repo_owner) throw new BadInput("Pick a GitHub project to clone");
      const token = await githubToken(p.github_id);
      const r = await machines.call(m.id, "clone", { parent: b.parent, name: str(b.name, "folder name", { max: 100, optional: true }) || p.repo_name, url: `https://github.com/${p.repo_owner}/${p.repo_name}.git`, token, branch: p.default_branch }, { timeoutMs: 600_000 });
      if (b.link !== false) {
        await run("UPDATE hive_projects SET machine_id=?, folder=?, updated_at=? WHERE id=?", [m.id, r.path, now(), p.id]);
        hub.emit("project", await projectRow(p.id));
      }
      res.json({ ok: true, ...r });
    }),
  );
  router.post(
    "/api/hive/machines/:id/mkdir",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      res.json({ ok: true, ...(await machines.call(m.id, "mkdir", { parent: req.body?.parent, name: str(req.body?.name, "folder name", { max: 100 }) })) });
    }),
  );
  // Terminal: a staff member runs a command themselves (no agent, no approval).
  router.post(
    "/api/hive/machines/:id/exec",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      if (m.policy === "read") throw new BadInput("This machine is read-only", 403);
      const command = str(req.body?.command, "command", { max: 4000 });
      const folder = str(req.body?.folder, "folder", { max: 500 });
      await audit(req, "hive.machine.exec", m.id, { command: command.slice(0, 300), folder });
      const r = await machines.call(m.id, "exec", { folder, command, timeoutMs: Math.min(Number(req.body?.timeoutMs) || 120000, 600000) }, { timeoutMs: 610000 });
      res.json({ ok: true, ...r });
    }),
  );
  /* ── live terminals: a real shell on the machine, typed into from the browser ── */
  const terminal = require("../hive/terminal");
  const termSize = (b) => ({ cols: Math.max(20, Math.min(500, Math.round(Number(b?.cols)) || 100)), rows: Math.max(5, Math.min(200, Math.round(Number(b?.rows)) || 30)) });
  router.get(
    "/api/hive/machines/:id/terms",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      res.json({ ok: true, terminals: terminal.mine(req.hiveUser).filter((t) => t.machineId === m.id) });
    }),
  );
  router.post(
    "/api/hive/machines/:id/terms",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      if (m.policy === "read") throw new BadInput("This machine is read-only, so it has no terminal", 403);
      const folder = req.body?.folder ? str(req.body.folder, "folder", { max: 500 }) : "";
      const t = await terminal.open({ machineId: m.id, username: req.hiveUser, folder, ...termSize(req.body) });
      await audit(req, "hive.machine.terminal", m.id, { folder: t.cwd || folder });
      res.json({ ok: true, terminal: t });
    }),
  );
  // Output, streamed as NDJSON. Reconnect with ?from=<next> to pick up exactly where it stopped.
  router.get(
    "/api/hive/machines/:id/terms/:tid/stream",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      terminal.own(req.params.tid, m.id, req.hiveUser);
      let from = Math.max(0, Math.floor(Number(req.query.from) || 0));
      res.status(200).set({ "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
      res.flushHeaders?.();
      let open = true;
      req.on("close", () => (open = false));
      res.on("close", () => (open = false));
      const send = (o) => {
        if (!open) return;
        res.write(JSON.stringify(o) + "\n");
        res.flush?.(); // compression() buffers otherwise
      };
      send({ type: "ready" });
      let fails = 0;
      while (open) {
        let r;
        try {
          r = await terminal.read(m.id, req.params.tid, from);
          fails = 0;
        } catch (e) {
          if (++fails >= 3) {
            send({ type: "error", error: e.message || "Lost the machine" });
            break;
          }
          send({ type: "reconnecting", error: e.message });
          await new Promise((ok) => setTimeout(ok, 1500));
          continue;
        }
        if (r.gone) {
          terminal.forget(req.params.tid);
          send({ type: "exit", code: null, gone: true });
          break;
        }
        if (r.data) send({ type: "data", data: r.data, next: r.next, skipped: !!r.skipped });
        else if (open) send({ type: "ping" });
        from = r.next;
        if (r.exit !== null && r.exit !== undefined && !r.data) {
          send({ type: "exit", code: r.exit });
          break;
        }
      }
      if (open) res.end();
    }),
  );
  router.post(
    "/api/hive/machines/:id/terms/:tid/input",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      terminal.own(req.params.tid, m.id, req.hiveUser);
      const data = typeof req.body?.data === "string" ? req.body.data : "";
      if (data.length > 64_000) throw new BadInput("That paste is too long for the terminal (64 KB at a time)", 413);
      if (data) await terminal.write(m.id, req.params.tid, data);
      res.json({ ok: true });
    }),
  );
  router.post(
    "/api/hive/machines/:id/terms/:tid/resize",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      terminal.own(req.params.tid, m.id, req.hiveUser);
      const { cols, rows } = termSize(req.body);
      res.json({ ok: true, ...(await terminal.resize(m.id, req.params.tid, cols, rows)) });
    }),
  );
  router.delete(
    "/api/hive/machines/:id/terms/:tid",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      terminal.own(req.params.tid, m.id, req.hiveUser);
      res.json({ ok: true, ...(await terminal.close(m.id, req.params.tid)) });
    }),
  );
  router.post(
    "/api/hive/machines/:id/procs",
    h(async (req, res) => {
      const m = await machineRow(req, { manage: true });
      const b = req.body || {};
      const op = ["proc_start", "proc_stop", "proc_logs", "procs"].includes(b.op) ? b.op : "procs";
      if (op === "proc_start" && m.policy === "read") throw new BadInput("This machine is read-only", 403);
      const args = op === "proc_start" ? { folder: str(b.folder, "folder", { max: 500 }), command: str(b.command, "command", { max: 2000 }), id: str(b.id, "id", { max: 60 }) } : { id: b.id };
      if (op === "proc_start") await audit(req, "hive.machine.proc", m.id, { command: args.command.slice(0, 300) });
      res.json({ ok: true, ...(await machines.call(m.id, op, args)) });
    }),
  );
  router.get(
    "/api/hive/bridge.js",
    h(async (_req, res) => {
      res.set({ "Content-Type": "application/octet-stream", "Content-Disposition": 'attachment; filename="hive-bridge.js"' });
      res.send(fs.readFileSync(BRIDGE_FILE));
    }),
  );

  /* ── checkpoints: restore any earlier result ───────────────────────── */
  const checkpoints = require("../hive/checkpoints");
  router.get(
    "/api/hive/tasks/:id/checkpoints",
    h(async (req, res) => {
      await taskRow(req.params.id);
      res.json({ ok: true, checkpoints: await checkpoints.list(req.params.id) });
    }),
  );
  router.post(
    "/api/hive/tasks/:id/checkpoints",
    h(async (req, res) => {
      const ctx = await runner.taskContext(req.params.id);
      const cp = await checkpoints.create(ctx, { variant: typeof req.body?.variant === "string" ? req.body.variant : "main", label: str(req.body?.label, "label", { max: 200, optional: true }) || `Saved by @${req.hiveUser}`, by: req.hiveUser });
      if (!cp) throw new BadInput("Nothing to save yet");
      res.json({ ok: true, checkpoint: cp });
    }),
  );
  router.post(
    "/api/hive/tasks/:id/checkpoints/:cp/restore",
    h(async (req, res) => {
      const ctx = await runner.taskContext(req.params.id);
      const busy = await get("SELECT COUNT(*) AS n FROM hive_agents WHERE task_id=? AND status IN ('running','queued')", [ctx.task.id]);
      if (Number(busy?.n) && !req.body?.force) throw new BadInput("Agents are still working on this task — stop them first (or restore anyway)", 409);
      const r = await checkpoints.restore(ctx, req.params.cp, { into: typeof req.body?.into === "string" ? req.body.into : undefined, by: req.hiveUser });
      await runner.event(ctx.task.id, null, "system", { message: `@${req.hiveUser} restored “${r.label}”` });
      res.json({ ok: true, ...r });
    }),
  );

  /* ── GitHub access doctor ──────────────────────────────────────────── */
  // Explains exactly why a repository is (not) reachable with a connection:
  // token type, scopes, repo visibility, and what is missing to fix it.
  router.post(
    "/api/hive/github/:id/test",
    h(async (req, res) => {
      const token = await githubToken(req.params.id);
      const owner = str(req.body?.owner, "owner", { max: 100 });
      const repo = str(req.body?.repo, "repo", { max: 100 });
      const kind = token.startsWith("github_pat_") ? "fine-grained" : token.startsWith("ghp_") ? "classic" : token.startsWith("gho_") || token.startsWith("ghu_") ? "app" : "unknown";
      const me = await gh.probe(token, "/user");
      const scopes = me.headers.get("x-oauth-scopes");
      const r = await gh.probe(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
      const steps = [];
      const out = { kind, login: me.body?.login || null, scopes: scopes ? scopes.split(/,\s*/).filter(Boolean) : null, status: r.status, ok: false, private: null, canPush: null, defaultBranch: null, contents: null, steps };
      if (me.status === 401) {
        steps.push("GitHub rejected the token itself — it expired or was revoked. Create a new one and reconnect.");
        return res.json({ ok: true, report: out });
      }
      if (r.status === 404 || r.status === 403) {
        if (kind === "fine-grained") {
          steps.push(`This fine-grained token can't see ${owner}/${repo}. Private repos are only visible if the token was given them explicitly.`);
          steps.push("Open github.com → Settings → Developer settings → Fine-grained tokens → this token → Edit.");
          steps.push(`Set “Resource owner” to ${owner}, then “Repository access” → “Only select repositories” (or “All repositories”) and add ${repo}.`);
          steps.push("Under “Repository permissions” set Contents: Read and write, Pull requests: Read and write (Metadata is automatic). Add Actions + Commit statuses: Read to see CI, and Administration: Read and write only if the launchpad should create repos.");
          steps.push("Save — the same token keeps working; click Test again.");
        } else if (kind === "classic") {
          steps.push(`This classic token can't see ${owner}/${repo}. Classic tokens need the “repo” scope for private repositories${scopes != null ? ` (it has: ${scopes || "no scopes"})` : ""}.`);
          steps.push("Edit the token on github.com → Settings → Developer settings → Tokens (classic) and tick “repo” (and “workflow” to edit GitHub Actions files).");
          steps.push(`If ${owner} is an organisation with SSO, click “Configure SSO” on the token and authorise ${owner}.`);
        } else steps.push(`GitHub says ${r.status} for ${owner}/${repo}: the repo name is wrong or this token has no access to it.`);
        return res.json({ ok: true, report: out });
      }
      if (r.status >= 400) {
        steps.push(`GitHub answered ${r.status}: ${r.body?.message || "unknown error"}`);
        return res.json({ ok: true, report: out });
      }
      Object.assign(out, { ok: true, private: !!r.body.private, canPush: r.body.permissions ? !!r.body.permissions.push : null, defaultBranch: r.body.default_branch, fullName: r.body.full_name });
      const c = await gh.probe(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(r.body.default_branch)}`);
      out.contents = c.status === 200;
      if (!out.contents) steps.push("The repo is visible but its contents aren't: give the token Contents: Read and write.");
      if (out.canPush === false) steps.push("Read-only access: Hive can read the code but can't push branches or open PRs. Give the token Contents + Pull requests: Read and write.");
      if (!steps.length) steps.push(`All good — Hive can read ${out.fullName}, push branches and open pull requests.`);
      res.json({ ok: true, report: out });
    }),
  );

  /* ── approvals ─────────────────────────────────────────────────────── */
  router.get(
    "/api/hive/approvals",
    h(async (req, res) => res.json({ ok: true, approvals: machines.pendingApprovals(), ...(req.query.history ? { history: await machines.approvalHistory(50) } : {}) })),
  );
  router.post(
    "/api/hive/approvals/:id",
    h(async (req, res) => {
      const ok = machines.answerApproval(req.params.id, { approved: !!req.body?.approved, by: req.hiveUser, note: typeof req.body?.note === "string" ? req.body.note.slice(0, 500) : null });
      if (!ok) throw new BadInput("That request was already answered", 409);
      await audit(req, "hive.approval", req.params.id, { approved: !!req.body?.approved });
      res.json({ ok: true });
    }),
  );

  /* ── linked repositories ───────────────────────────────────────────── */
  router.get(
    "/api/hive/projects/:id/repos",
    h(async (req, res) => {
      await projectRow(req.params.id);
      res.json({ ok: true, repos: await all("SELECT * FROM hive_project_repos WHERE project_id=? ORDER BY created_at", [req.params.id]) });
    }),
  );
  router.post(
    "/api/hive/projects/:id/repos",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      const b = req.body || {};
      const githubId = str(b.githubId, "GitHub connection", { max: 64 });
      const token = await githubToken(githubId);
      let info;
      try {
        info = await gh.repo(token, str(b.owner, "owner", { max: 100 }), str(b.repo, "repo", { max: 100 }));
      } catch (e) {
        throw new BadInput(`Can't open that repository: ${e.message}`);
      }
      const id = newId("rep");
      await run("INSERT INTO hive_project_repos(id, project_id, github_id, repo_owner, repo_name, default_branch, role, created_at) VALUES(?,?,?,?,?,?,?,?)", [
        id,
        p.id,
        githubId,
        info.owner.login,
        info.name,
        info.default_branch,
        str(b.role, "role", { max: 60, optional: true }) || "",
        now(),
      ]);
      hub.emit("project", await projectRow(p.id));
      res.json({ ok: true, id });
    }),
  );
  router.delete(
    "/api/hive/projects/:id/repos/:repoId",
    h(async (req, res) => {
      await run("DELETE FROM hive_project_repos WHERE id=? AND project_id=?", [req.params.repoId, req.params.id]);
      hub.emit("project", await projectRow(req.params.id));
      res.json({ ok: true });
    }),
  );

  /* ── ship pipeline: PR → checks → merge → deploy ───────────────────── */
  async function prContext(taskId) {
    const ctx = await runner.taskContext(taskId).catch(async () => {
      const task = await taskRow(taskId);
      const project = await runner.effectiveProject(await projectRow(task.project_id), task);
      return { task, project, token: project.github_id ? await githubToken(project.github_id) : null };
    });
    if (!ctx.task.pr_number || !ctx.token) throw new BadInput("This task has no pull request yet", 404);
    return ctx;
  }

  function summarizeChecks(runs, status) {
    const list = [
      ...(runs?.check_runs || []).map((c) => ({ name: c.name, status: c.status, conclusion: c.conclusion, url: c.html_url, startedAt: c.started_at, completedAt: c.completed_at })),
      ...(status?.statuses || []).map((s) => ({ name: s.context, status: s.state === "pending" ? "in_progress" : "completed", conclusion: s.state === "success" ? "success" : s.state === "pending" ? null : "failure", url: s.target_url, startedAt: s.created_at, completedAt: s.updated_at })),
    ];
    const pending = list.some((c) => c.status !== "completed");
    const failed = list.some((c) => ["failure", "timed_out", "cancelled", "action_required"].includes(c.conclusion));
    return { checks: list, state: !list.length ? "none" : failed ? "failure" : pending ? "pending" : "success" };
  }

  router.get(
    "/api/hive/tasks/:id/pr",
    h(async (req, res) => {
      const { task, project, token } = await prContext(req.params.id);
      const pr = await gh.pull(token, project.repo_owner, project.repo_name, task.pr_number);
      const [runs, status] = await Promise.all([
        gh.checkRuns(token, project.repo_owner, project.repo_name, pr.head.sha).catch(() => null),
        gh.combinedStatus(token, project.repo_owner, project.repo_name, pr.head.sha).catch(() => null),
      ]);
      if (pr.merged && task.status !== "merged") await runner.setTask(task.id, { status: "merged" });
      res.json({
        ok: true,
        pr: { number: pr.number, title: pr.title, state: pr.state, merged: pr.merged, mergeable: pr.mergeable, mergeableState: pr.mergeable_state, url: pr.html_url, head: pr.head.ref, base: pr.base.ref, sha: pr.head.sha, additions: pr.additions, deletions: pr.deletions, changedFiles: pr.changed_files, commits: pr.commits, draft: pr.draft },
        ...summarizeChecks(runs, status),
      });
    }),
  );
  router.post(
    "/api/hive/tasks/:id/merge",
    h(async (req, res) => {
      if (!isAdmin(req)) throw new BadInput("Only admins can merge — merging can deploy to the live site", 403);
      const { task, project, token } = await prContext(req.params.id);
      const method = ["squash", "merge", "rebase"].includes(req.body?.method) ? req.body.method : "squash";
      let r;
      try {
        r = await gh.mergePull(token, project.repo_owner, project.repo_name, task.pr_number, { merge_method: method, commit_title: `${task.title} (#${task.pr_number})` });
      } catch (e) {
        throw new BadInput(`GitHub refused the merge: ${e.message}`, e.status === 405 || e.status === 409 ? 409 : 400);
      }
      await runner.setTask(task.id, { status: "merged", head_sha: r.sha });
      await runner.event(task.id, null, "merge", { username: req.hiveUser, sha: r.sha, method, base: project.default_branch });
      await audit(req, "hive.merge", task.id, { repo: `${project.repo_owner}/${project.repo_name}`, pr: task.pr_number, sha: r.sha });
      res.json({ ok: true, sha: r.sha });
    }),
  );

  // Project pulse: recent commits on the default branch with their checks,
  // open PRs, GitHub deployments and the live site's health.
  router.get(
    "/api/hive/projects/:id/activity",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      if (!p.github_id) return res.json({ ok: true, commits: [], pulls: [], deployments: [], site: null });
      const token = await githubToken(p.github_id);
      const [commits, pulls, deps] = await Promise.all([
        gh.commits(token, p.repo_owner, p.repo_name, p.default_branch, 12).catch(() => []),
        gh.listPulls(token, p.repo_owner, p.repo_name).catch(() => []),
        gh.deployments(token, p.repo_owner, p.repo_name).catch(() => []),
      ]);
      const head = commits[0];
      const headChecks = head
        ? summarizeChecks(await gh.checkRuns(token, p.repo_owner, p.repo_name, head.sha).catch(() => null), await gh.combinedStatus(token, p.repo_owner, p.repo_name, head.sha).catch(() => null))
        : null;
      const deployments = [];
      for (const d of (deps || []).slice(0, 4)) {
        const st = await gh.deploymentStatuses(token, p.repo_owner, p.repo_name, d.id).catch(() => []);
        deployments.push({ id: d.id, environment: d.environment, sha: d.sha, ref: d.ref, createdAt: d.created_at, state: st[0]?.state || "pending", url: st[0]?.environment_url || st[0]?.target_url || null });
      }
      let site = null;
      if (p.site_url) {
        const t0 = Date.now();
        try {
          const r = await fetch(`${p.site_url.replace(/\/+$/, "")}/api/health`, { signal: AbortSignal.timeout(8000) });
          const j = await r.json().catch(() => ({}));
          site = { url: p.site_url, up: r.ok, status: r.status, ms: Date.now() - t0, version: j.version || j.commit || j.sha || null };
        } catch (e) {
          site = { url: p.site_url, up: false, error: e.message, ms: Date.now() - t0 };
        }
      }
      res.json({
        ok: true,
        commits: (commits || []).map((c) => ({ sha: c.sha, message: c.commit.message.split("\n")[0], author: c.author?.login || c.commit.author?.name, avatar: c.author?.avatar_url || null, at: c.commit.author?.date, url: c.html_url })),
        headChecks,
        pulls: (pulls || []).map((x) => ({ number: x.number, title: x.title, author: x.user?.login, url: x.html_url, head: x.head?.ref, draft: x.draft, updatedAt: x.updated_at })),
        deployments,
        site,
      });
    }),
  );
  router.patch(
    "/api/hive/projects/:id/site",
    h(async (req, res) => {
      const p = await projectRow(req.params.id);
      const url = typeof req.body?.siteUrl === "string" ? req.body.siteUrl.trim() : "";
      if (url && !/^https:\/\/[^\s/]+/.test(url)) throw new BadInput("Site URL must start with https://");
      await run("UPDATE hive_projects SET site_url=? WHERE id=?", [url || null, p.id]);
      hub.emit("project", await projectRow(p.id));
      res.json({ ok: true });
    }),
  );

  /* ── idea launchpad ────────────────────────────────────────────────── */
  const PLAN_SYSTEM = `You are a principal engineer and product lead turning a raw idea into a buildable plan.
Reply with ONE JSON object and nothing else (no Markdown fence), shaped exactly:
{"name": "short product name", "tagline": "one line", "summary": "2-4 sentences", "audience": "who it is for",
 "features": [{"title": "", "detail": "", "priority": "must|should|could"}],
 "stack": {"frontend": "", "backend": "", "database": "", "hosting": "", "other": ""},
 "architecture": "a short paragraph on the main parts and how they talk",
 "milestones": [{"title": "", "goal": "", "tasks": [{"title": "", "detail": "concrete, testable"}]}],
 "risks": ["…"], "repoName": "kebab-case-repo-name",
 "conventions": ["coding conventions agents should follow"],
 "firstTask": "precise instructions for an AI coding agent to scaffold milestone 1 in an empty repository: files, scripts, README, a first passing test"}
Prefer boring, well-supported technology that is cheap to host. 4-8 features, 3-5 milestones of 3-6 tasks each.`;

  function extractJson(text) {
    const s = String(text || "").replace(/^```(?:json)?\s*|\s*```$/g, "");
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("The model didn't return a plan");
    return JSON.parse(s.slice(start, end + 1));
  }

  async function planWith(spec, prompt) {
    const tried = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      let key = spec?.provider ? await keys.pickKey(spec.provider, { prefer: spec.keyId || "auto", exclude: tried }) : null;
      if (!key) key = await keys.pickHandoffKey({ exclude: tried, order: ["anthropic", "openai", "gemini", "deepseek", "openrouter", "groq"] });
      if (!key) throw new BadInput("Add an AI key first (Keys) — the launchpad needs a model to draft the plan");
      const vendor = keys.keyVendor(key);
      const v = providerOf(vendor);
      const model = spec?.provider === vendor && spec.model ? spec.model : key.default_model || pickDefault(json(key.models_json, []), v.suggested);
      try {
        const r = await v.impl.turn({ secret: keys.secretOf(key), baseUrl: key.base_url || v.baseUrl, official: !!v.official, vision: false, model, effort: "high", system: PLAN_SYSTEM, messages: [{ role: "user", text: prompt }], tools: [], cache: false });
        await keys.recordUsage(key.id, "launchpad", { input: r.usage.input, output: r.usage.output, cacheRead: r.usage.cacheRead || 0, costMicros: r.costMicros || 0 }, r.rateLimit);
        return { plan: extractJson(r.text), model: `${v.label} · ${model}` };
      } catch (e) {
        if (["auth", "quota", "rate", "model"].includes(e.kind)) {
          tried.push(key.id);
          continue;
        }
        throw new BadInput(`Couldn't draft the plan: ${e.message}`);
      }
    }
    throw new BadInput("Every key failed — check Keys");
  }

  const publicIdea = (r) => ({ ...r, plan: json(r.plan_json, null), plan_json: undefined });

  router.get(
    "/api/hive/ideas",
    h(async (_req, res) => {
      res.json({ ok: true, ideas: (await all("SELECT * FROM hive_ideas ORDER BY updated_at DESC LIMIT 100")).map(publicIdea) });
    }),
  );
  router.post(
    "/api/hive/ideas",
    h(async (req, res) => {
      const b = req.body || {};
      const pitch = str(b.pitch, "idea", { max: 12000, min: 10 });
      const spec = b.agent ? cleanSpec(b.agent) : null;
      const id = newId("idea");
      const t = now();
      await run("INSERT INTO hive_ideas(id, title, pitch, status, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?)", [id, pitch.split("\n")[0].slice(0, 90), pitch, "planning", req.hiveUser, t, t]);
      try {
        const { plan, model } = await planWith(spec, `My idea:\n${pitch}`);
        plan._model = model;
        await run("UPDATE hive_ideas SET title=?, plan_json=?, status='planned', updated_at=? WHERE id=?", [String(plan.name || pitch).slice(0, 90), JSON.stringify(plan), now(), id]);
      } catch (e) {
        await run("UPDATE hive_ideas SET status='failed', plan_json=?, updated_at=? WHERE id=?", [JSON.stringify({ error: e.message }), now(), id]);
        throw e;
      }
      hub.emit("ideas", { id });
      res.json({ ok: true, idea: publicIdea(await get("SELECT * FROM hive_ideas WHERE id=?", [id])) });
    }),
  );
  router.post(
    "/api/hive/ideas/:id/refine",
    h(async (req, res) => {
      const idea = await get("SELECT * FROM hive_ideas WHERE id=?", [req.params.id]);
      if (!idea) throw new BadInput("Idea not found", 404);
      const feedback = str(req.body?.feedback, "feedback", { max: 6000 });
      const { plan, model } = await planWith(req.body?.agent ? cleanSpec(req.body.agent) : null, `My idea:\n${idea.pitch}\n\nYour previous plan:\n${idea.plan_json}\n\nRevise it with this feedback:\n${feedback}`);
      plan._model = model;
      await run("UPDATE hive_ideas SET title=?, plan_json=?, status='planned', updated_at=? WHERE id=?", [String(plan.name || idea.title).slice(0, 90), JSON.stringify(plan), now(), idea.id]);
      hub.emit("ideas", { id: idea.id });
      res.json({ ok: true, idea: publicIdea(await get("SELECT * FROM hive_ideas WHERE id=?", [idea.id])) });
    }),
  );
  router.patch(
    "/api/hive/ideas/:id",
    h(async (req, res) => {
      const idea = await get("SELECT * FROM hive_ideas WHERE id=?", [req.params.id]);
      if (!idea) throw new BadInput("Idea not found", 404);
      if (req.body?.plan && typeof req.body.plan === "object") await run("UPDATE hive_ideas SET plan_json=?, title=?, updated_at=? WHERE id=?", [JSON.stringify(req.body.plan).slice(0, 200000), String(req.body.plan.name || idea.title).slice(0, 90), now(), idea.id]);
      res.json({ ok: true });
    }),
  );
  router.delete(
    "/api/hive/ideas/:id",
    h(async (req, res) => {
      await run("DELETE FROM hive_ideas WHERE id=?", [req.params.id]);
      hub.emit("ideas", { id: req.params.id });
      res.json({ ok: true });
    }),
  );

  /**
   * Launch: create the GitHub repo (or use a machine folder), the project, the
   * plan as PLAN.md + project memory, and start the scaffold task.
   */
  router.post(
    "/api/hive/ideas/:id/launch",
    h(async (req, res) => {
      const idea = await get("SELECT * FROM hive_ideas WHERE id=?", [req.params.id]);
      if (!idea) throw new BadInput("Idea not found", 404);
      const plan = json(idea.plan_json, null);
      if (!plan?.milestones) throw new BadInput("Draft a plan first");
      const b = req.body || {};
      const specs = (Array.isArray(b.agents) ? b.agents : []).slice(0, 6).map(cleanSpec);
      if (!specs.length) throw new BadInput("Pick the agents that should build it");
      for (const s of specs) await runner.resolveSpec(s, { prompt: idea.pitch, machineId: b.machineId || null }).catch((e) => {
        throw new BadInput(e.message);
      });
      const name = String(b.repoName || plan.repoName || plan.name || "new-project").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "new-project";
      let project;
      const t = now();
      const pid = newId("prj");
      const instructions = [`Product: ${plan.name} — ${plan.tagline || ""}`, plan.summary, plan.architecture && `Architecture: ${plan.architecture}`, plan.stack && `Stack: ${Object.entries(plan.stack).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("; ")}`, ...(plan.conventions || []).map((c) => `- ${c}`)].filter(Boolean).join("\n").slice(0, 8000);
      if (b.githubId) {
        const token = await githubToken(String(b.githubId));
        let repo;
        try {
          repo = await gh.createRepo(token, { org: b.org || null, name, description: String(plan.tagline || plan.summary || "").slice(0, 300), isPrivate: b.private !== false });
        } catch (e) {
          throw new BadInput(`GitHub couldn't create ${name}: ${e.message}`);
        }
        // auto_init needs a moment before the default branch exists.
        let head = null;
        for (let i = 0; i < 10 && !head; i++) {
          head = await gh.commit(token, repo.owner.login, repo.name, repo.default_branch || "main").catch(() => null);
          if (!head) await new Promise((r) => setTimeout(r, 800));
        }
        await gh.putFile(token, repo.owner.login, repo.name, "PLAN.md", { content: planMarkdown(plan, idea), message: "Add the project plan (Nexora Hive launchpad)", branch: repo.default_branch || "main" }).catch(() => {});
        await run(
          `INSERT INTO hive_projects(id, name, github_id, repo_owner, repo_name, default_branch, description, instructions, color, created_by, created_at, updated_at, idea_id)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [pid, String(plan.name || name).slice(0, 60), String(b.githubId), repo.owner.login, repo.name, repo.default_branch || "main", String(plan.tagline || "").slice(0, 300), instructions, COLORS.has(b.color) ? b.color : "violet", req.hiveUser, t, t, idea.id],
        );
      } else if (b.machineId) {
        const m = await get("SELECT * FROM hive_machines WHERE id=?", [String(b.machineId)]);
        if (!m) throw new BadInput("Machine not found");
        const dir = await machines.call(m.id, "mkdir", { parent: b.parent, name });
        await machines.call(m.id, "write", { folder: dir.path, path: "PLAN.md", content: planMarkdown(plan, idea) });
        await machines.call(m.id, "git", { folder: dir.path, args: ["init", "-b", "main"] }).catch(() => {});
        await run(
          `INSERT INTO hive_projects(id, name, github_id, repo_owner, repo_name, default_branch, description, instructions, color, created_by, created_at, updated_at, idea_id, machine_id, folder)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [pid, String(plan.name || name).slice(0, 60), "", "", "", "main", String(plan.tagline || "").slice(0, 300), instructions, COLORS.has(b.color) ? b.color : "violet", req.hiveUser, t, t, idea.id, m.id, dir.path],
        );
      } else throw new BadInput("Choose where it lives: a new GitHub repo or a machine folder");
      project = await projectRow(pid);
      // Durable shared memory every agent sees.
      const mem = [
        ["Product", `${plan.name}: ${plan.summary || plan.tagline || ""}`],
        plan.stack && ["Stack", Object.entries(plan.stack).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("; ")],
        plan.architecture && ["Architecture", plan.architecture],
        ...(plan.conventions || []).slice(0, 6).map((c, i) => [`Convention ${i + 1}`, c]),
      ].filter(Boolean);
      for (const [title, body] of mem) await run("INSERT INTO hive_memory(id, project_id, title, body, author, pinned, created_at) VALUES(?,?,?,?,?,?,?)", [newId("mem"), pid, String(title).slice(0, 120), String(body).slice(0, 1500), "launchpad", 1, now()]);
      await run("UPDATE hive_ideas SET status='launched', project_id=?, updated_at=? WHERE id=?", [pid, now(), idea.id]);
      hub.emit("project", project);
      hub.emit("ideas", { id: idea.id });

      // Kick off milestone 1.
      const m1 = plan.milestones[0];
      const prompt = `${plan.firstTask || `Scaffold the project for milestone 1: ${m1?.title}`}\n\nMilestone 1 — ${m1?.title}: ${m1?.goal || ""}\n${(m1?.tasks || []).map((x) => `- ${x.title}: ${x.detail || ""}`).join("\n")}\n\nThe full plan is in PLAN.md. Keep the README accurate.`;
      const task = await createTask(project, { title: `Milestone 1: ${m1?.title || "scaffold"}`.slice(0, 120), prompt, mode: specs.length > 1 ? "team" : "solo", specs, username: req.hiveUser });
      await audit(req, "hive.launch", pid, { idea: idea.id, repo: project.repo_owner ? `${project.repo_owner}/${project.repo_name}` : project.folder });
      res.json({ ok: true, project, task });
    }),
  );

  async function createTask(p, { title, prompt, mode, specs, username }) {
    const id = newId("tsk");
    const t = now();
    let baseSha = "local";
    if (!p.machine_id && p.github_id) baseSha = (await gh.commit(await githubToken(p.github_id), p.repo_owner, p.repo_name, p.default_branch)).sha;
    await run(
      `INSERT INTO hive_tasks(id, project_id, title, prompt, mode, status, base_ref, base_sha, branch, created_by, created_at, updated_at, machine_id, folder)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, p.id, title, prompt, mode, "queued", p.default_branch || "main", baseSha, `hive/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)}-${id.slice(-4)}`, username, t, t, p.machine_id || null, p.folder || null],
    );
    if (p.machine_id) await router.hiveIsolate?.(id);
    const task = await get("SELECT * FROM hive_tasks WHERE id=?", [id]);
    hub.emit("task", task);
    const lead = mode === "team" ? specs[0] : null;
    await runner.startTask(task, { mode, specs: lead ? specs.slice(1) : specs, lead, username });
    return get("SELECT * FROM hive_tasks WHERE id=?", [id]);
  }
}

function planMarkdown(plan, idea) {
  const lines = [`# ${plan.name}`, "", plan.tagline ? `_${plan.tagline}_` : "", "", plan.summary || "", ""];
  if (plan.audience) lines.push(`**For:** ${plan.audience}`, "");
  if (plan.features?.length) lines.push("## Features", "", ...plan.features.map((f) => `- **${f.title}** (${f.priority || "should"}) — ${f.detail || ""}`), "");
  if (plan.stack) lines.push("## Stack", "", ...Object.entries(plan.stack).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`), "");
  if (plan.architecture) lines.push("## Architecture", "", plan.architecture, "");
  if (plan.milestones?.length) {
    lines.push("## Milestones", "");
    plan.milestones.forEach((m, i) => lines.push(`### ${i + 1}. ${m.title}`, "", m.goal || "", "", ...(m.tasks || []).map((t) => `- [ ] **${t.title}** — ${t.detail || ""}`), ""));
  }
  if (plan.risks?.length) lines.push("## Risks", "", ...plan.risks.map((r) => `- ${r}`), "");
  if (plan.conventions?.length) lines.push("## Conventions", "", ...plan.conventions.map((r) => `- ${r}`), "");
  lines.push("---", `Planned in Nexora Hive from this idea:`, "", "> " + String(idea.pitch).replace(/\n/g, "\n> "), "");
  return lines.join("\n");
}

module.exports = { mount };
