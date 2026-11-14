// Automation that keeps Hive working around the clock:
//  • Schedules — run a prompt or a pipeline hourly, daily or weekly.
//  • Auto-resume — agents and pipelines cut off by a restart or deploy pick
//    up where they left off.
//  • CI fixer — when checks fail on a pull request Hive opened, an agent reads
//    the failure, fixes it and pushes to the same branch, then CI runs again.
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");
const gh = require("./github");
const vault = require("./vault");

const EVERY = new Set(["hourly", "daily", "weekly", "weekdays"]);

/* ── schedules ────────────────────────────────────────────────────────── */
/** Next run time (UTC) after `from` for a schedule. */
function nextRun({ every, hour = 2, weekday = 1 }, from = Date.now()) {
  const d = new Date(from);
  if (every === "hourly") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() + 1, 0, 0);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, 0, 0);
  if (t <= from) t += 86400e3;
  if (every === "weekly") while (new Date(t).getUTCDay() !== weekday % 7) t += 86400e3;
  if (every === "weekdays") while ([0, 6].includes(new Date(t).getUTCDay())) t += 86400e3;
  return t;
}

const publicSchedule = (r) => ({ id: r.id, projectId: r.project_id, title: r.title, prompt: r.prompt, every: r.every, hour: r.hour, weekday: r.weekday, agents: json(r.agents_json, []), mode: r.mode, enabled: !!r.enabled, template: r.template, pipelineId: r.pipeline_id || null, lastRun: r.last_run, lastTask: r.last_task, nextRun: r.next_run, createdBy: r.created_by, createdAt: r.created_at });

async function listSchedules(projectId = null) {
  const rows = projectId ? await all("SELECT * FROM hive_schedules WHERE project_id=? ORDER BY created_at", [projectId]) : await all("SELECT * FROM hive_schedules ORDER BY created_at");
  return rows.map(publicSchedule);
}

async function saveSchedule(input, by) {
  const every = EVERY.has(input.every) ? input.every : "daily";
  const hour = Math.max(0, Math.min(23, Math.round(Number(input.hour ?? 2))));
  const weekday = Math.max(0, Math.min(6, Math.round(Number(input.weekday ?? 1))));
  const title = String(input.title || "Scheduled job").slice(0, 120);
  const prompt = String(input.prompt || "").slice(0, 20000);
  if (!prompt.trim() && !input.pipelineId) throw Object.assign(new Error("Describe what should happen each time"), { status: 400 });
  const agents = (Array.isArray(input.agents) && input.agents.length ? input.agents : [{ provider: "auto", keyId: "auto" }]).slice(0, 4);
  const next = nextRun({ every, hour, weekday });
  const enabled = input.enabled === false ? 0 : 1;
  if (input.id) {
    await run("UPDATE hive_schedules SET title=?, prompt=?, every=?, hour=?, weekday=?, agents_json=?, mode=?, enabled=?, next_run=?, pipeline_id=? WHERE id=?", [title, prompt, every, hour, weekday, JSON.stringify(agents), input.mode || "solo", enabled, next, input.pipelineId || null, input.id]);
    return publicSchedule(await get("SELECT * FROM hive_schedules WHERE id=?", [input.id]));
  }
  const id = newId("sch");
  await run(
    "INSERT INTO hive_schedules(id, project_id, title, prompt, every, hour, weekday, agents_json, mode, enabled, template, next_run, created_by, created_at, pipeline_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [id, String(input.projectId), title, prompt, every, hour, weekday, JSON.stringify(agents), input.mode || "solo", enabled, input.template || null, next, by, now(), input.pipelineId || null],
  );
  return publicSchedule(await get("SELECT * FROM hive_schedules WHERE id=?", [id]));
}

async function removeSchedule(id) {
  await run("DELETE FROM hive_schedules WHERE id=?", [id]);
}

// Ready-made jobs for the Automations page.
const SCHEDULE_TEMPLATES = [
  { id: "nightly-tests", title: "Nightly: keep the build green", every: "daily", hour: 1, prompt: "Run the test suite, linter and build. Fix anything failing with minimal, safe changes. If everything passes, make no changes and say so.", agents: [{ provider: "auto", freeOnly: true }] },
  { id: "deps", title: "Weekly: safe dependency updates", every: "weekly", weekday: 1, hour: 2, prompt: "Update patch and minor versions of dependencies that the tests still pass with. Don't do major upgrades. List each update.", agents: [{ provider: "auto", freeOnly: true }] },
  { id: "security", title: "Weekly: security review", every: "weekly", weekday: 3, hour: 3, mode: "review", prompt: "Review the codebase for security issues: injection, XSS, auth and access-control mistakes, secrets in code, unsafe deserialisation, SSRF. Report findings with file:line and severity. Don't change files.", agents: [{ provider: "auto" }] },
  { id: "todos", title: "Nightly: clear one TODO", every: "daily", hour: 3, prompt: "Find one small, well-defined TODO/FIXME in the codebase that can be resolved safely, resolve it completely with a test if relevant, and explain the change.", agents: [{ provider: "auto", freeOnly: true }] },
  { id: "docs", title: "Weekly: refresh the docs", every: "weekly", weekday: 5, hour: 2, prompt: "Compare README and docs with the current code. Fix anything outdated or missing. Keep the voice and structure.", agents: [{ provider: "auto", freeOnly: true }] },
];

/**
 * deps: { createTask(project, {title, prompt}) → task (not started),
 *         startTask(task, {mode, specs, username}) }
 */
async function tickSchedules(deps) {
  const due = await all("SELECT * FROM hive_schedules WHERE enabled=1 AND next_run IS NOT NULL AND next_run<=?", [Date.now()]);
  for (const s of due) {
    // Claim it first so two ticks never run it twice.
    await run("UPDATE hive_schedules SET last_run=?, next_run=? WHERE id=?", [now(), nextRun({ every: s.every, hour: s.hour, weekday: s.weekday }, Date.now() + 60_000), s.id]);
    try {
      const project = await get("SELECT * FROM hive_projects WHERE id=?", [s.project_id]);
      if (!project) continue;
      let taskId = null;
      if (s.pipeline_id) {
        const pipelines = require("./pipelines");
        const pl = await get("SELECT * FROM hive_pipelines WHERE id=?", [s.pipeline_id]);
        if (!pl) throw new Error("Its pipeline was deleted");
        const r = await pipelines.start({ pipeline: pl, project, request: s.prompt || s.title, username: s.created_by, createTask: deps.createTask });
        taskId = r.taskId;
      } else {
        const task = await deps.createTask(project, { title: `⏱ ${s.title}`, prompt: s.prompt });
        await run("UPDATE hive_tasks SET schedule_id=? WHERE id=?", [s.id, task.id]);
        const specs = json(s.agents_json, []).map((a) => ({ provider: a.provider || "auto", keyId: a.keyId || "auto", model: a.model || undefined, freeOnly: !!a.freeOnly }));
        await deps.startTask(task, { mode: s.mode || "solo", specs: specs.length ? specs : [{ provider: "auto", keyId: "auto" }], username: s.created_by });
        taskId = task.id;
      }
      await run("UPDATE hive_schedules SET last_task=? WHERE id=?", [taskId, s.id]);
      hub.emit("schedules", { id: s.id });
    } catch (e) {
      await require("./caps").alert({ kind: "schedule", level: "error", title: `Scheduled job failed to start: ${s.title}`, body: e.message, ref: `sch:${s.id}:${s.last_run || 0}` }).catch(() => {});
    }
  }
}

/* ── auto-resume after a restart ──────────────────────────────────────── */
async function resumeInterrupted() {
  const { resolvePlugins } = require("./plugins");
  if (!(await resolvePlugins(null)).builtins.auto_resume?.enabled) return 0;
  const runner = require("./runner");
  const since = Date.now() - 24 * 3600e3;
  const rows = await all(
    `SELECT a.* FROM hive_agents a JOIN hive_tasks t ON t.id = a.task_id
     WHERE a.status='interrupted' AND a.parent_id IS NULL AND a.error='The server restarted while this agent was running'
       AND COALESCE(a.finished_at, a.created_at) >= ? AND t.archived=0 AND t.pipeline_run IS NULL`,
    [since],
  );
  let n = 0;
  for (const a of rows) {
    await run("UPDATE hive_agents SET error='Resumed automatically after a restart' WHERE id=?", [a.id]);
    try {
      await runner.addAgent(a.task_id, {
        spec: { provider: a.provider, keyId: a.key_id || "auto", model: a.model },
        prompt: `The server restarted while ${a.name} was working on this. Continue from where it stopped: check the current changes (view_changes / git status) first, then complete the original request.\n\nIts instructions were:\n${String(a.instructions).slice(0, 6000)}`,
        username: a.started_by,
        readOnly: a.role === "reviewer",
        variant: a.variant, // a compare attempt resumes on its own copy
        title: `Resumed ${a.name}`,
      });
      n++;
    } catch (e) {
      await runner.event(a.task_id, null, "system", { message: `Couldn't resume ${a.name} automatically: ${e.message}` }).catch(() => {});
    }
  }
  return n;
}

/* ── CI fixer ─────────────────────────────────────────────────────────── */
const attempted = new Set(); // `${taskId}:${sha}`
const fixing = new Set();

async function ciFixTick() {
  const { resolvePlugins } = require("./plugins");
  const tasks = await all("SELECT * FROM hive_tasks WHERE status='pr_open' AND archived=0 AND pr_number IS NOT NULL AND head_sha IS NOT NULL AND updated_at>=?", [Date.now() - 7 * 86400e3]);
  for (const t of tasks) {
    if (fixing.has(t.id)) continue;
    const plugin = (await resolvePlugins(t.project_id)).builtins.ci_fixer;
    if (!plugin?.enabled) continue;
    const k = `${t.id}:${t.head_sha}`;
    if (attempted.has(k)) continue;
    const runner = require("./runner");
    let ctx;
    try {
      ctx = await runner.taskContext(t.id);
    } catch {
      continue;
    }
    if (!ctx.token) continue;
    const { repo_owner: o, repo_name: r } = ctx.project;
    let runs;
    try {
      runs = (await gh.checkRuns(ctx.token, o, r, t.head_sha)).check_runs || [];
    } catch {
      continue;
    }
    if (!runs.length || runs.some((c) => c.status !== "completed")) continue;
    const failed = runs.filter((c) => ["failure", "timed_out", "action_required"].includes(c.conclusion));
    attempted.add(k);
    if (!failed.length) continue;
    const rounds = Number((await get("SELECT COUNT(*) AS n FROM hive_events WHERE task_id=? AND kind='ci_fix'", [t.id]))?.n || 0);
    if (rounds >= Number(plugin.config?.maxRounds || 3)) continue;
    fixing.add(t.id);
    (async () => {
      try {
        const details = failed
          .slice(0, 6)
          .map((c) => `### ${c.name} — ${c.conclusion}\n${[c.output?.title, c.output?.summary, c.output?.text].filter(Boolean).join("\n").slice(0, 6000) || "(no output — check the workflow logs)"}`)
          .join("\n\n");
        await runner.event(t.id, null, "ci_fix", { sha: t.head_sha, failed: failed.map((c) => c.name) });
        await runner.event(t.id, null, "system", { message: `CI failed on the PR (${failed.map((c) => c.name).join(", ")}) — the CI fixer is on it` });
        const a = await runner.spawnAndWait(t.id, {
          spec: { provider: "auto", kind: "coding" },
          prompt: `CI failed on this task's pull request. Fix the cause with minimal, correct changes — never skip, delete or weaken tests to make them pass.\n\nFailing checks:\n${details}`,
          username: "ci-fixer",
          title: "CI fixer",
          kind: "coding",
        });
        if (a.status !== "done") throw new Error(a.error || "the fixer didn't finish");
        const { commitTask, commitOnMachine } = require("./commit");
        const fresh = await runner.taskContext(t.id);
        const message = `Fix CI: ${failed.map((c) => c.name).join(", ")}`.slice(0, 120);
        const res = fresh.machine
          ? await commitOnMachine({ ...fresh, message, branch: t.branch, openPr: false, author: "ci-fixer" })
          : await commitTask({ ...fresh, variant: "main", message, branch: t.branch, openPr: false, author: "ci-fixer" });
        await runner.setTask(t.id, { head_sha: res.sha, status: "pr_open" });
        await runner.event(t.id, null, "commit", { username: "ci-fixer", ...res, message });
      } catch (e) {
        await runner.event(t.id, null, "system", { message: `The CI fixer couldn't fix it: ${e.message}` }).catch(() => {});
        await require("./caps").alert({ kind: "ci", level: "warn", title: `CI still failing: ${t.title}`, body: e.message, ref: `ci:${t.id}:${t.head_sha}` }).catch(() => {});
      } finally {
        fixing.delete(t.id);
      }
    })();
  }
}

/** Start the background loops (not in tests). */
function startLoops(deps) {
  const safe = (fn) => () => fn().catch((e) => console.error("[hive automation]", e.message));
  setTimeout(safe(async () => {
    await require("./machines").closeStaleApprovals();
    await resumeInterrupted();
    await require("./pipelines").resumeAll();
    await require("./dispatcher").resumeAll();
  }), 20_000).unref?.();
  setInterval(safe(() => tickSchedules(deps)), 60_000).unref?.();
  setInterval(safe(ciFixTick), 5 * 60_000).unref?.();
  // Free models only, a few per day: objective coding scores for the router.
  setInterval(safe(() => require("./bench").benchFreeTick({ limit: 3 })), 24 * 3600_000).unref?.();
  // Agent health: probe free and subscription models a few times a day (a tiny "reply OK" call).
  setTimeout(safe(() => require("./health").probeAll()), 3 * 60_000).unref?.();
  setInterval(safe(() => require("./health").probeAll()), 4 * 60 * 60_000).unref?.();
  // Claude plans: 5-hour and weekly usage for every connected account, every 10 minutes.
  setTimeout(safe(() => require("./keys").refreshAllPlanUsage()), 60_000).unref?.();
  setInterval(safe(() => require("./keys").refreshAllPlanUsage()), 10 * 60_000).unref?.();
  // Every free key's whole model list is re-tested daily (new models appear, old ones retire).
  // Keys never tested (paid ones too) are tested a minute after a restart.
  setTimeout(safe(() => require("./health").verifyAll({ olderThanMs: 20 * 60 * 60_000 })), 60_000).unref?.();
  setInterval(safe(() => require("./health").verifyAll({ olderThanMs: 20 * 60 * 60_000 })), 60 * 60_000).unref?.();
}

module.exports = { nextRun, listSchedules, saveSchedule, removeSchedule, tickSchedules, SCHEDULE_TEMPLATES, resumeInterrupted, ciFixTick, startLoops, publicSchedule };
