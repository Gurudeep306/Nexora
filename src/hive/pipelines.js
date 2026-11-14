// Pipelines: a reusable chain of stages that turns a request into shipped
// work without anyone babysitting it — e.g. Plan → Build → Test → Review
// (gate: loops back to Fix until it passes) → Docs → Ship.
//
// Each stage picks its agents: "auto" (the router chooses the best model for
// the stage's kind of work), "free" (free models only), or specific models.
// Several agents on one stage race on private copies and the Judge adopts the
// best. All stages share one working copy (a task), so every agent sees what
// the stages before it did. Runs survive restarts and continue overnight.
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");
const llm = require("./llm");
const { KINDS } = require("./catalog");

const STAGE_KINDS = new Set(Object.keys(KINDS));

/* ── templates ────────────────────────────────────────────────────────── */
const auto = (o = {}) => ({ mode: "auto", ...o });
const TEMPLATES = [
  {
    id: "feature-factory",
    name: "Feature factory",
    description: "Plan with a strong model, build with the best value coder, test, get a cross-lab review, fix until it passes, write docs, open a PR.",
    stages: [
      { name: "Plan", kind: "hard", readOnly: true, agents: [auto()], instructions: "Study the codebase and write a precise implementation plan for the request: files to change, interfaces, edge cases, tests to add. Don't edit files. End with the plan as a numbered list." },
      { name: "Build", kind: "coding", agents: [auto()], instructions: "Implement the plan from the Plan stage completely. Match the codebase's conventions. Add or update tests." },
      { name: "Test", kind: "coding", machineOnly: true, agents: [auto()], instructions: "Run the project's tests, linter and build. Fix anything that fails because of this change. Report the exact commands and results." },
      { name: "Review", kind: "review", readOnly: true, crossVendor: true, gate: { fixStage: "Fix", maxLoops: 2 }, agents: [auto()], instructions: "Review all changes in this task for bugs, security issues, missing edge cases and style problems, with file:line references." },
      { name: "Fix", kind: "coding", onlyOnGate: true, agents: [auto()], instructions: "Fix every issue the reviewer reported. Don't change unrelated code." },
      { name: "Docs", kind: "writing", optional: true, agents: [auto({ mode: "free" })], instructions: "Update README/docs and code comments for what changed. Keep it short and accurate." },
      { name: "Ship", kind: "mechanical", ship: true, agents: [], instructions: "Commit the work to a branch and open a pull request." },
    ],
  },
  {
    id: "best-of-three",
    name: "Best of three",
    description: "Three different models build the same thing on their own copies; the Judge picks the best; a reviewer from another lab checks it; then a PR.",
    stages: [
      { name: "Race", kind: "coding", race: true, agents: [auto(), auto({ mode: "free" }), auto({ preference: "quality" })], instructions: "Implement the request completely, with tests." },
      { name: "Review", kind: "review", readOnly: true, crossVendor: true, gate: { fixStage: "Fix", maxLoops: 1 }, agents: [auto()], instructions: "Review the adopted result for bugs and gaps, with file:line references." },
      { name: "Fix", kind: "coding", onlyOnGate: true, agents: [auto()], instructions: "Fix every issue the reviewer reported." },
      { name: "Ship", kind: "mechanical", ship: true, agents: [], instructions: "Open a pull request." },
    ],
  },
  {
    id: "free-night-shift",
    name: "Free night shift",
    description: "Runs entirely on free models: build, review by a second free model, fix, ship. Ideal for scheduled overnight jobs at zero cost.",
    stages: [
      { name: "Build", kind: "coding", agents: [auto({ mode: "free" })], instructions: "Implement the request completely." },
      { name: "Review", kind: "review", readOnly: true, crossVendor: true, gate: { fixStage: "Fix", maxLoops: 2 }, agents: [auto({ mode: "free" })], instructions: "Review the changes for bugs with file:line references." },
      { name: "Fix", kind: "coding", onlyOnGate: true, agents: [auto({ mode: "free" })], instructions: "Fix every reported issue." },
      { name: "Ship", kind: "mechanical", ship: true, agents: [], instructions: "Open a pull request." },
    ],
  },
  {
    id: "bug-hunter",
    name: "Bug hunter",
    description: "Reproduce, find the root cause, fix with a regression test, verify, review, ship.",
    stages: [
      { name: "Investigate", kind: "hard", readOnly: true, agents: [auto()], instructions: "Find the root cause of the reported bug. Explain it with file:line references and propose the minimal correct fix. Don't edit files." },
      { name: "Fix", kind: "coding", agents: [auto()], instructions: "Apply the fix from the investigation and add a regression test that fails without it." },
      { name: "Verify", kind: "coding", machineOnly: true, agents: [auto()], instructions: "Run the tests; confirm the regression test passes and nothing else broke." },
      { name: "Review", kind: "review", readOnly: true, crossVendor: true, gate: { fixStage: "Fix", maxLoops: 2 }, agents: [auto()], instructions: "Check the fix addresses the root cause, not a symptom." },
      { name: "Ship", kind: "mechanical", ship: true, agents: [], instructions: "Open a pull request." },
    ],
  },
  {
    id: "docs-writer",
    name: "Docs writer",
    description: "Read the code, write or refresh documentation, have it checked for accuracy, ship.",
    stages: [
      { name: "Map", kind: "search", readOnly: true, agents: [auto({ mode: "free" })], instructions: "Map the parts of the codebase relevant to the request and list what the docs must cover." },
      { name: "Write", kind: "writing", agents: [auto()], instructions: "Write the documentation the request asks for, accurate to the code." },
      { name: "Fact-check", kind: "review", readOnly: true, crossVendor: true, gate: { fixStage: "Write", maxLoops: 1 }, agents: [auto()], instructions: "Check every claim in the new docs against the code. List anything wrong." },
      { name: "Ship", kind: "mechanical", ship: true, agents: [], instructions: "Open a pull request." },
    ],
  },
  {
    id: "maintenance",
    name: "Maintenance sweep",
    description: "For schedules: update safe dependencies, fix failing tests and lint, tidy small issues, open one PR — on free models where possible.",
    stages: [
      { name: "Sweep", kind: "coding", machineOnly: true, agents: [auto({ mode: "free" })], instructions: "Run the tests and linter. Fix failures and warnings that are safe to fix. Apply patch/minor dependency updates that pass the tests. Keep changes small and explain each." },
      { name: "Review", kind: "review", readOnly: true, crossVendor: true, gate: { fixStage: "Sweep", maxLoops: 1 }, agents: [auto()], instructions: "Make sure every change is safe and justified." },
      { name: "Ship", kind: "mechanical", ship: true, agents: [], instructions: "Open a pull request." },
    ],
  },
];

/* ── validation ───────────────────────────────────────────────────────── */
function cleanStages(stages) {
  if (!Array.isArray(stages) || !stages.length) throw Object.assign(new Error("A pipeline needs at least one stage"), { status: 400 });
  return stages.slice(0, 12).map((s, i) => {
    const name = String(s?.name || `Stage ${i + 1}`).slice(0, 40);
    const kind = STAGE_KINDS.has(s?.kind) ? s.kind : "coding";
    const agents = (Array.isArray(s?.agents) ? s.agents : []).slice(0, 4).map((a) => {
      const mode = ["auto", "free", "specific"].includes(a?.mode) ? a.mode : "auto";
      const o = { mode };
      if (mode === "specific") Object.assign(o, { provider: String(a.provider || ""), model: a.model ? String(a.model).slice(0, 120) : undefined, keyId: a.keyId ? String(a.keyId) : "auto" });
      if (["balanced", "quality", "savings", "fast"].includes(a?.preference)) o.preference = a.preference;
      return o;
    });
    const gate = s?.gate && typeof s.gate === "object" ? { fixStage: String(s.gate.fixStage || "").slice(0, 40), maxLoops: Math.max(0, Math.min(5, Number(s.gate.maxLoops) || 1)) } : null;
    return {
      name,
      kind,
      instructions: String(s?.instructions || "").slice(0, 6000),
      agents: s?.ship ? [] : agents.length ? agents : [{ mode: "auto" }],
      readOnly: !!s?.readOnly || kind === "review",
      race: !!s?.race && agents.length > 1,
      crossVendor: !!s?.crossVendor,
      gate,
      onlyOnGate: !!s?.onlyOnGate,
      optional: !!s?.optional,
      machineOnly: !!s?.machineOnly,
      ship: !!s?.ship,
    };
  });
}

async function list(projectId) {
  const rows = await all("SELECT * FROM hive_pipelines WHERE project_id=? ORDER BY updated_at DESC", [projectId]);
  return rows.map(publicPipeline);
}
const publicPipeline = (r) => ({ id: r.id, projectId: r.project_id, name: r.name, description: r.description, stages: json(r.stages_json, []), createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at });

async function save({ id, projectId, name, description, stages }, by) {
  const st = cleanStages(stages);
  const t = now();
  if (id) {
    await run("UPDATE hive_pipelines SET name=?, description=?, stages_json=?, updated_at=? WHERE id=?", [String(name || "Pipeline").slice(0, 60), String(description || "").slice(0, 400), JSON.stringify(st), t, id]);
  } else {
    id = newId("pl");
    await run("INSERT INTO hive_pipelines(id, project_id, name, description, stages_json, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)", [id, projectId, String(name || "Pipeline").slice(0, 60), String(description || "").slice(0, 400), JSON.stringify(st), by, t, t]);
  }
  return publicPipeline(await get("SELECT * FROM hive_pipelines WHERE id=?", [id]));
}

async function remove(id) {
  await run("DELETE FROM hive_pipelines WHERE id=?", [id]);
}

/* ── runs ─────────────────────────────────────────────────────────────── */
const active = new Map(); // run id -> AbortController-ish { stop: bool }

async function setRun(id, fields) {
  const keys = Object.keys(fields);
  await run(`UPDATE hive_pipeline_runs SET ${keys.map((k) => `${k}=?`).join(", ")}, updated_at=? WHERE id=?`, [...keys.map((k) => fields[k]), now(), id]);
  const r = await get("SELECT * FROM hive_pipeline_runs WHERE id=?", [id]);
  hub.emit("pipeline_run", publicRun(r));
  return r;
}
const publicRun = (r) => r && { id: r.id, pipelineId: r.pipeline_id, projectId: r.project_id, taskId: r.task_id, request: r.request, status: r.status, stageIndex: r.stage_index, loops: r.loops, log: json(r.log_json, []), error: r.error, startedBy: r.started_by, createdAt: r.created_at, updatedAt: r.updated_at };

async function runs(projectId, limit = 30) {
  return (await all("SELECT * FROM hive_pipeline_runs WHERE project_id=? ORDER BY created_at DESC LIMIT ?", [projectId, limit])).map(publicRun);
}

/**
 * Start a pipeline on a request. createTask(project, {title, prompt}) must
 * create the task row WITHOUT starting agents (the pipeline drives them).
 */
async function start({ pipeline, project, request, username, createTask }) {
  const id = newId("plr");
  const t = now();
  await run("INSERT INTO hive_pipeline_runs(id, pipeline_id, project_id, request, status, started_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)", [id, pipeline.id, project.id, String(request).slice(0, 20000), "running", username, t, t]);
  const task = await createTask(project, { title: `${pipeline.name}: ${String(request).split("\n")[0]}`.slice(0, 120), prompt: request });
  await run("UPDATE hive_tasks SET pipeline_run=?, mode='pipeline', status='running' WHERE id=?", [id, task.id]);
  await setRun(id, { task_id: task.id });
  drive(id).catch((e) => console.error("[hive pipeline]", e.message));
  return publicRun(await get("SELECT * FROM hive_pipeline_runs WHERE id=?", [id]));
}

function stop(runId) {
  const a = active.get(runId);
  if (a) a.stop = true;
  return !!a;
}

const verdictOf = (text) => {
  const m = String(text || "").match(/VERDICT\s*:\s*(PASS|CHANGES NEEDED|FAIL)/i);
  if (m) return /PASS/i.test(m[1]) ? "pass" : "changes";
  // No explicit verdict: treat clear approval words as pass.
  return /\b(looks good|lgtm|ready to (commit|merge|ship)|no (issues|problems) found)\b/i.test(String(text || "")) ? "pass" : "changes";
};

function specFor(a, stage, exclude = []) {
  if (a.mode === "specific" && a.provider) return { provider: a.provider, keyId: a.keyId || "auto", model: a.model || undefined };
  return { provider: "auto", kind: stage.kind, freeOnly: a.mode === "free", preference: a.preference || (stage.kind === "hard" || stage.kind === "review" ? "quality" : null), excludeVendors: exclude };
}

/** The pipeline loop. Resumable: picks up at stage_index after a restart. */
async function drive(runId) {
  if (active.has(runId)) return;
  const ctl = { stop: false };
  active.set(runId, ctl);
  const runner = require("./runner");
  try {
    let r = await get("SELECT * FROM hive_pipeline_runs WHERE id=?", [runId]);
    const pipeline = await get("SELECT * FROM hive_pipelines WHERE id=?", [r.pipeline_id]);
    if (!pipeline) throw new Error("The pipeline was deleted");
    const stages = json(pipeline.stages_json, []);
    const log = json(r.log_json, []);
    const task = await get("SELECT * FROM hive_tasks WHERE id=?", [r.task_id]);
    const onMachine = !!task?.machine_id;
    let i = r.stage_index;
    let loops = r.loops;
    let gateFix = null; // set when a review gate sends us to a fix stage
    const note = async (entry) => {
      log.push({ ...entry, at: now() });
      r = await setRun(runId, { log_json: JSON.stringify(log.slice(-200)), stage_index: i, loops });
      await runner.event(task.id, null, "pipeline", { runId, ...entry, index: i, total: stages.length });
    };
    while (i < stages.length) {
      if (ctl.stop) throw Object.assign(new Error("Stopped"), { stopped: true });
      const st = stages[i];
      if (st.onlyOnGate && gateFix !== st.name) {
        i++;
        continue;
      }
      if (st.machineOnly && !onMachine) {
        await note({ stage: st.name, status: "skipped", message: "Needs a machine (commands); this run works on GitHub — CI on the PR checks it instead" });
        i++;
        continue;
      }
      await note({ stage: st.name, status: "running" });
      if (st.ship) {
        const res = await ship(task.id, pipeline, r, runner).catch((e) => ({ error: e.message }));
        await note({ stage: st.name, status: res.error ? "failed" : "done", message: res.error || (res.pr ? `PR #${res.pr.number}` : `Committed ${res.sha?.slice(0, 7)}`), pr: res.pr || null });
        if (res.error) throw new Error(`Ship failed: ${res.error}`);
        i++;
        continue;
      }
      const prompt = `Pipeline “${pipeline.name}” — stage ${i + 1} of ${stages.length}: ${st.name}.\n${st.instructions}${st.gate ? "\n\nEnd your report with exactly one line: VERDICT: PASS (ready to ship) or VERDICT: CHANGES NEEDED." : ""}`;
      const authors = st.crossVendor ? [...new Set((await all("SELECT provider FROM hive_agents WHERE task_id=? AND role <> 'reviewer'", [task.id])).map((x) => x.provider))] : [];
      let result;
      if (st.race && st.agents.length > 1) {
        const agents = await Promise.all(st.agents.map((a, k) => runner.spawnAndWait(task.id, { spec: specFor(a, st, authors), prompt, username: r.started_by, readOnly: st.readOnly, variant: "self", title: `${st.name} #${k + 1}`, kind: st.kind })));
        const ok = agents.filter((a) => a.status === "done");
        if (!ok.length) throw new Error(`Every agent in ${st.name} failed`);
        const v = await require("./judge").judgeTask(task.id, { adopt: true, agentIds: ok.map((a) => a.id), by: "pipeline" });
        result = { status: "done", text: (ok.find((a) => a.id === v?.winner) || ok[0]).result };
      } else {
        const a = st.agents[0] || { mode: "auto" };
        let spec = specFor(a, st, authors);
        if (st.crossVendor && spec.provider === "auto" && authors.length) {
          const rev = await require("./router").reviewer({ authors, machineId: task.machine_id || null }).catch(() => null);
          if (rev && (a.mode !== "free" || rev.cost === "free")) spec = { provider: rev.provider, keyId: rev.keyId, model: rev.model };
        }
        const done = await runner.spawnAndWait(task.id, { spec, prompt, username: r.started_by, readOnly: st.readOnly, title: st.name, kind: st.kind });
        result = { status: done.status, text: done.result || done.error || "" };
      }
      if (result.status !== "done") {
        if (st.optional) {
          await note({ stage: st.name, status: "skipped", message: "Optional stage failed — continuing" });
          i++;
          continue;
        }
        await note({ stage: st.name, status: "failed", message: String(result.text).slice(0, 400) });
        throw new Error(`${st.name} failed: ${String(result.text).slice(0, 300)}`);
      }
      if (st.gate) {
        const v = verdictOf(result.text);
        if (v === "changes" && loops < st.gate.maxLoops && st.gate.fixStage) {
          const target = stages.findIndex((x) => x.name === st.gate.fixStage);
          if (target >= 0) {
            loops++;
            gateFix = st.gate.fixStage;
            await note({ stage: st.name, status: "changes", message: `Changes needed — back to ${st.gate.fixStage} (round ${loops} of ${st.gate.maxLoops})` });
            i = target;
            continue;
          }
        }
        await note({ stage: st.name, status: v === "pass" ? "passed" : "done", message: v === "pass" ? "Review passed" : "Review still has notes (max rounds reached) — see the report" });
        gateFix = null;
        // After a fix loop, skip the fix stage and continue past the gate.
        const after = stages.findIndex((x, k) => k > i && !(x.onlyOnGate));
        i = after < 0 ? stages.length : after;
        continue;
      }
      await note({ stage: st.name, status: "done", message: String(result.text).split("\n")[0].slice(0, 200) });
      // A fix stage reached from a gate goes back to that gate.
      if (gateFix && st.name === gateFix) {
        const gateIdx = stages.findIndex((x) => x.gate?.fixStage === st.name);
        if (gateIdx >= 0) {
          i = gateIdx;
          continue;
        }
      }
      i++;
    }
    await setRun(runId, { status: "done", stage_index: stages.length });
    const t = await get("SELECT status FROM hive_tasks WHERE id=?", [task.id]);
    if (!["pr_open", "committed"].includes(t?.status)) await runner.setTask(task.id, { status: "review" });
    await require("./caps").alert({ kind: "pipeline", level: "info", title: `Pipeline finished: ${pipeline.name}`, body: String(r.request).split("\n")[0].slice(0, 200), ref: `plr:${runId}` }).catch(() => {});
  } catch (e) {
    const r = await get("SELECT * FROM hive_pipeline_runs WHERE id=?", [runId]);
    await setRun(runId, { status: e.stopped ? "stopped" : "failed", error: e.stopped ? null : String(e.message).slice(0, 1000) });
    if (r?.task_id) await runner.setTask(r.task_id, { status: e.stopped ? "stopped" : "failed" }).catch(() => {});
    if (!e.stopped) await require("./caps").alert({ kind: "pipeline", level: "error", title: "Pipeline failed", body: String(e.message).slice(0, 400), ref: `plr:${runId}:fail` }).catch(() => {});
  } finally {
    active.delete(runId);
  }
}

/** Commit the task's work and open a PR (GitHub or machine). */
async function ship(taskId, pipeline, r, runner) {
  const { commitTask, commitOnMachine } = require("./commit");
  const ctx = await runner.taskContext(taskId);
  const ws = runner.workspaceOf(ctx, "main");
  const changes = await ws.changes();
  if (!changes.length) throw new Error("Nothing changed — nothing to ship");
  const message = `${pipeline.name}: ${String(r.request).split("\n")[0].slice(0, 90)}`;
  const body = `Built by the **${pipeline.name}** pipeline in Nexora Hive.\n\n**Request**\n\n${String(r.request).slice(0, 3000)}\n\n${ctx.task.summary ? `**Summary**\n\n${String(ctx.task.summary).slice(0, 4000)}` : ""}`;
  const result = ctx.machine
    ? await commitOnMachine({ ...ctx, message, branch: ctx.task.branch, openPr: true, prTitle: message, prBody: body, author: r.started_by })
    : await commitTask({ ...ctx, variant: "main", message, branch: ctx.task.branch, openPr: true, prTitle: message, prBody: body, author: r.started_by });
  const fields = { head_sha: result.sha, branch: result.branch };
  if (result.pr) Object.assign(fields, { pr_url: result.pr.url, pr_number: result.pr.number, status: "pr_open" });
  else fields.status = "committed";
  await runner.setTask(taskId, fields);
  await runner.event(taskId, null, "commit", { username: r.started_by, ...result, message });
  await require("./perf").judgeTask(taskId, true).catch(() => {});
  return result;
}

/** Continue runs that were interrupted by a restart. */
async function resumeAll() {
  const rows = await all("SELECT id FROM hive_pipeline_runs WHERE status='running'");
  for (const r of rows) drive(r.id).catch(() => {});
  return rows.length;
}

/* ── the Architect ────────────────────────────────────────────────────── */
const ARCHITECT = `You are the Pipeline Architect in Nexora Hive — the most capable model on the team. You design automated pipelines of AI agents that turn a goal into shipped work with as little human effort and cost as possible.

A pipeline is a list of stages. Each stage:
{"name": "Build", "kind": one of ${[...STAGE_KINDS].join("|")}, "instructions": "what the agents do in this stage",
 "agents": [{"mode": "auto" | "free" | "specific", "provider"?: vendor id, "model"?: model id, "preference"?: "quality"|"balanced"|"savings"}],
 "readOnly"?: true for planning/review, "race"?: true to have several agents compete (the Judge adopts the best; needs 2-3 agents),
 "crossVendor"?: true for reviews (reviewer from a different lab), "gate"?: {"fixStage": "Fix", "maxLoops": 1-3} on review stages,
 "onlyOnGate"?: true for a fix stage that only runs when a gate sends work back, "optional"?: true, "machineOnly"?: true for stages that must run commands/tests,
 "ship"?: true for the final stage that commits and opens a pull request (agents: [])}

Principles: use free models ("free" mode) wherever quality allows (mechanical work, docs, first drafts, maps); use strong models for planning, hard engineering and reviews; always review with a different lab than the builders; keep pipelines short (3-7 stages); end with Ship unless the person says otherwise. Use the connected models listed below; never invent providers.

Reply with JSON only:
{"message": "short, friendly explanation of the design and any trade-offs (Markdown allowed)", "questions": ["up to 3 short questions if something important is unclear"], "pipeline": {"name": "...", "description": "one sentence", "stages": [ ... ]}}`;

/** Design or revise a pipeline through conversation with the strongest model. */
async function architect({ history = [], draft = null, projectId, username }) {
  const router = require("./router");
  const cands = await router.candidates({ kind: "coding", needTools: true, machineId: null }).catch(() => []);
  const subs = await all("SELECT preset, label FROM hive_keys WHERE disabled=0 AND preset IN ('claude_code','codex','vibe')");
  const seen = new Set();
  const models = [];
  for (const c of cands) {
    const k = `${c.vendor}|${c.card.name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    models.push(`- ${c.vendor} · ${c.model} (${c.card.name}) · ${c.cost} · good for: ${(c.card.bestFor || []).join(", ") || "light tasks"}`);
    if (models.length >= 40) break;
  }
  for (const s of subs) models.push(`- ${s.preset} · default (subscription agent on a machine, no per-token cost; only for machine sessions)`);
  const project = projectId ? await get("SELECT name, description, machine_id FROM hive_projects WHERE id=?", [projectId]) : null;
  const convo = history
    .slice(-12)
    .map((m) => `${m.role === "user" ? "Person" : "Architect"}: ${String(m.text || "").slice(0, 4000)}`)
    .join("\n\n");
  const prompt = `${project ? `Project: ${project.name}${project.description ? ` — ${project.description}` : ""}${project.machine_id ? " (has a connected machine: commands and tests can run)" : " (GitHub only: no commands; CI checks PRs)"}\n\n` : ""}Connected models:\n${models.join("\n") || "- (none yet — design with mode auto/free and say so)"}\n\n${draft ? `Current draft:\n${JSON.stringify(draft).slice(0, 8000)}\n\n` : ""}Conversation:\n${convo}`;
  const res = await llm.ask({ kind: "hard", prompt, system: ARCHITECT, json: true, preference: "quality", username, projectId: projectId || "" });
  const d = res.data || {};
  let pipeline = null;
  if (d.pipeline?.stages) {
    try {
      pipeline = { name: String(d.pipeline.name || "Pipeline").slice(0, 60), description: String(d.pipeline.description || "").slice(0, 400), stages: cleanStages(d.pipeline.stages) };
    } catch {}
  }
  return { message: String(d.message || res.text || "").slice(0, 6000), questions: (d.questions || []).slice(0, 3).map((q) => String(q).slice(0, 300)), pipeline, model: res.model };
}

module.exports = { TEMPLATES, cleanStages, list, save, remove, start, stop, runs, drive, resumeAll, architect, verdictOf, publicRun };
