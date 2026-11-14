// Hive Copilot — a personal assistant that runs the hive for you.
//
// It talks with you, and it can operate the whole workspace: see what's
// running, start sessions and teams (the Dispatcher), write and improve the
// prompts for that work, steer or stop agents, read the changes they made,
// judge the results, check agent health and spend, and research models on
// the web. It keeps its own token use low by delegating the heavy lifting
// to agents (free and cheap ones first) and only planning and judging itself.
//
// The brain:
//   1. Your Claude plan (Claude Code on a worker machine): Hive is exposed to
//      it as an MCP server, so Opus/Sonnet on your subscription drives Hive
//      with no API credits.
//   2. Otherwise the best healthy model with tool use, free first.
// Sessions the Copilot starts are watched: when they finish it reviews the
// work by itself and reports back in the thread.
const crypto = require("crypto");
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");

const MAX_STEPS = 14;
const tokens = new Map(); // MCP bearer token → { username, exp }

/* ── tools ──────────────────────────────────────────────────────────── */
const str = (description) => ({ type: "string", description });
const int = (description) => ({ type: "integer", description });
const bool = (description) => ({ type: "boolean", description });
const obj = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const AGENT_HINT =
  'Who does the work: "auto" (best model for the kind of work), "free" (best free model), "fast", "quality", or a specific model as "vendor/model" (e.g. "claude_code/default", "vibe/default", "gemini/gemini-3-pro-preview", "groq/openai/gpt-oss-120b").';

function specFrom(agent, kind = null) {
  const a = String(agent || "auto").trim();
  if (!a || a === "auto") return { provider: "auto", keyId: "auto", model: "", kind };
  if (a === "free") return { provider: "auto", keyId: "auto", model: "", freeOnly: true, kind };
  if (["fast", "quality", "savings", "balanced"].includes(a)) return { provider: "auto", keyId: "auto", model: "", preference: a, kind };
  const i = a.indexOf("/");
  return i < 0 ? { provider: a, keyId: "auto", model: "" } : { provider: a.slice(0, i), keyId: "auto", model: a.slice(i + 1) };
}

const clip = (s, n = 12000) => {
  const t = typeof s === "string" ? s : JSON.stringify(s, null, 1);
  return t.length > n ? `${t.slice(0, n)}\n… [${t.length - n} more characters]` : t;
};

// Any tool that takes a project also takes a GitHub repo: it is opened as a project on the fly.
const PROJECT = 'Project id or name — or any GitHub repository ("owner/name" or just "name"); a repo is opened as a project automatically';

async function projectOf(id, username = "copilot") {
  if (!id) throw new Error("Which project or repository? Call list_repos to see every repo.");
  const p = await get("SELECT * FROM hive_projects WHERE id=? OR lower(name)=lower(?) OR lower(repo_owner || '/' || repo_name)=lower(?)", [id, id, id]);
  if (p) return p;
  try {
    return (await require("./repos").openRepo(id, { username })).project;
  } catch (e) {
    throw new Error(`Unknown project or repository "${id}" (${e.message}). Call list_repos or hive_overview.`);
  }
}

/** Honest counts: every model the connected keys offer (after testing), not just the shortlist. */
async function modelTotals() {
  const keys = require("./keys");
  const { keyVendor, vendorOf } = require("./providers");
  const { isChatModel } = require("./models");
  const rows = await all("SELECT * FROM hive_keys WHERE disabled=0");
  const byProvider = {};
  const all_ = new Set();
  let tested = 0;
  for (const r of rows) {
    let v;
    try {
      v = vendorOf(keyVendor(r));
    } catch {
      continue;
    }
    const list = v.subscription ? [r.default_model || "default"] : keys.workingModels(r).filter(isChatModel);
    if (r.verified_json) tested++;
    byProvider[v.label] = (byProvider[v.label] || 0) + list.length;
    for (const m of list) all_.add(`${v.id}/${m}`);
  }
  return { totalModels: all_.size, keys: rows.length, keysTested: tested, byProvider };
}

async function overview() {
  const projects = await all("SELECT id, name, repo_owner, repo_name, machine_id, folder, description FROM hive_projects ORDER BY updated_at DESC LIMIT 30");
  const tasks = await all("SELECT id, project_id, title, status, mode, updated_at FROM hive_tasks WHERE archived=0 ORDER BY updated_at DESC LIMIT 15");
  const agents = tasks.length ? await all(`SELECT task_id, name, provider, model, status FROM hive_agents WHERE task_id IN (${tasks.map(() => "?").join(",")})`, tasks.map((t) => t.id)) : [];
  const health = await require("./health")
    .board()
    .catch(() => []);
  const dispatches = await all("SELECT id, project_id, status, plan_json, updated_at FROM hive_dispatches ORDER BY updated_at DESC LIMIT 5").catch(() => []);
  return {
    projects: projects.map((p) => ({ id: p.id, name: p.name, repo: p.repo_owner ? `${p.repo_owner}/${p.repo_name}` : null, onMachine: !!p.machine_id, description: p.description || undefined })),
    recentSessions: tasks.map((t) => ({
      id: t.id,
      project: projects.find((p) => p.id === t.project_id)?.name || t.project_id,
      title: t.title,
      status: t.status,
      mode: t.mode,
      updated: new Date(Number(t.updated_at)).toISOString(),
      agents: agents.filter((a) => a.task_id === t.id).map((a) => `${a.name} (${a.provider}/${a.model}) ${a.status}`),
    })),
    teams: dispatches.map((d) => ({ id: d.id, status: d.status, summary: json(d.plan_json, {}).summary })),
    models: await modelTotals().catch(() => null),
    githubRepos: await require("./repos")
      .allRepos()
      .then((r) => ({ count: r.repos.length, note: "list_repos shows them; any repo can be used wherever a project is asked for" }))
      .catch(() => null),
    agents: {
      connected: health.length,
      working: health.filter((k) => ["healthy", "flaky", "unknown"].includes(k.state)).map((k) => `${k.vendorLabel}${k.free ? " (free)" : k.subscription ? " (plan)" : ""}: ${k.defaultModel}`),
      problems: health.filter((k) => ["cooling", "down"].includes(k.state)).map((k) => `${k.label}: ${k.state}${k.detail ? ` — ${k.detail}` : ""}`),
    },
  };
}

async function modelsReport({ kind = null, freeOnly = false }) {
  const router = require("./router");
  const { KINDS, CARDS, publicCard } = require("./catalog");
  const kinds = kind && KINDS[kind] ? [kind] : Object.keys(KINDS);
  const best = {};
  for (const k of kinds) {
    const r = await router.route({ kind: k, needTools: k !== "chat", chat: k === "chat", freeOnly }).catch(() => null);
    best[k] = r ? { pick: `${r.pick.name} on ${r.pick.provider} (${r.pick.cost})`, why: r.note, alternatives: r.alternatives.map((a) => `${a.name} (${a.cost}, fit ${a.quality})`) } : "nothing connected can do this";
  }
  const list = await router.candidates({ kind: kind || "coding", needTools: false, chat: true }).catch(() => []);
  const connected = [...new Map(list.map((c) => [`${c.vendor}|${c.model}`, c])).values()]
    .sort((a, b) => b.quality - a.quality)
    .slice(0, 30)
    .map((c) => ({ model: `${c.vendor}/${c.model}`, name: c.card.name, lab: c.card.lab, cost: c.cost, fit: c.quality, scores: { intelligence: c.card.intelligence, coding: c.card.coding, reasoning: c.card.reasoning, writing: c.card.writing, speed: c.card.speed }, measured: c.measured?.runs ? `${c.measured.ok}/${c.measured.runs} runs ok` : undefined, latencyMs: c.latencyMs ?? undefined, coolingDown: !!c.cooling || undefined }));
  const catalogue = CARDS.slice(0, 80).map((c) => {
    const p = publicCard(c);
    return `${p.name} (${p.lab}): intel ${p.intelligence}, coding ${p.coding}, reasoning ${p.reasoning}, writing ${p.writing}, speed ${p.speed}/5, ${p.tier}${p.open ? ", open weights" : ""}${p.strengths?.length ? ` — good: ${p.strengths.slice(0, 2).join("; ")}` : ""}`;
  });
  return { totals: await modelTotals().catch(() => null), note: "totals counts every model the connected keys offer; 'connected' below is only the 30 best fits for this kind of work", bestPerKind: best, connected, fullCatalogue: kind ? undefined : catalogue };
}

async function sessionDetail(taskId) {
  const task = await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]);
  if (!task) throw new Error("Session not found");
  const agents = await all("SELECT id, name, provider, model, status, role, title, result, error, input_tokens, output_tokens FROM hive_agents WHERE task_id=? ORDER BY created_at", [taskId]);
  const events = await all("SELECT kind, agent_id, data_json, created_at FROM hive_events WHERE task_id=? AND kind IN ('status','note','error','verdict','pipeline','review','handoff','approval') ORDER BY seq DESC LIMIT 30", [taskId]);
  let changes = [];
  try {
    const runner = require("./runner");
    const ctx = await runner.taskContext(taskId);
    changes = await runner.workspaceOf(ctx, "main").changes();
  } catch {
    /* not available */
  }
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    mode: task.mode,
    request: clip(task.prompt, 2000),
    summary: task.summary ? clip(task.summary, 2000) : undefined,
    prUrl: task.pr_url || undefined,
    agents: agents.map((a) => ({ id: a.id, name: a.name, model: `${a.provider}/${a.model}`, role: a.title || a.role, status: a.status, result: a.result ? clip(a.result, 1500) : undefined, error: a.error || undefined, tokens: Number(a.input_tokens || 0) + Number(a.output_tokens || 0) })),
    changedFiles: changes.map((c) => `${c.status} ${c.path} (+${c.additions} -${c.deletions})`),
    recentEvents: events.reverse().map((e) => `${e.kind}: ${clip(json(e.data_json, {}), 300)}`),
  };
}

async function sessionDiff(taskId, path, { full = false, username = "hive" } = {}) {
  const runner = require("./runner");
  const tools = require("./tools");
  const ctx = await runner.taskContext(taskId);
  const ws = runner.workspaceOf(ctx, "main");
  const r = await tools.execute("view_changes", path ? { path } : {}, { ws, agent: { name: "copilot" }, maxLines: 2000 });
  const text = String(r.content || "");
  // Long diffs are read by a free model first, so the Copilot's own context stays small.
  if (full || path || text.length < 9000) return clip(text, 30000);
  const s = await cheap({ kind: "review", username, prompt: `Summarise this code change for a lead engineer who must judge it. Per file: what changed and why it matters. Then list anything that looks wrong, risky, missing (tests, error handling, edge cases) or unrelated to the request. Be specific (file:line).\n\n${text.slice(0, 150000)}` }).catch(() => null);
  return s ? `Summary by ${s.model} (call with full=true or a path for exact lines):\n${s.text}` : clip(text, 30000);
}

const TOOLS = {
  hive_overview: {
    description: "See the whole hive: projects (with ids), recent sessions and their agents, teams, which agents are working and which are failing. Call this first when you need ids or context.",
    schema: obj({}),
    run: () => overview(),
  },
  list_models: {
    description: "Every connected model with scores (intelligence, coding, reasoning, writing, speed), cost class (free/plan/$/$$/$$$), measured success and response time, the best pick per kind of work, and the full model catalogue. Use it to choose who should do what.",
    schema: obj({ kind: str("Optional kind of work: chat, mechanical, reading, search, writing, coding, review, hard"), freeOnly: bool("Only free and plan models") }),
    run: (i) => modelsReport({ kind: i.kind || null, freeOnly: !!i.freeOnly }),
  },
  list_repos: {
    description: "Every GitHub repository the connected GitHub account(s) can reach (not only Hive projects), newest activity first, with whether it is already a project. Any of them can be passed wherever a project is asked for.",
    schema: obj({ query: str("Optional filter, e.g. part of the name") }),
    run: async (i) => {
      const r = await require("./repos").allRepos();
      const q = String(i.query || "").toLowerCase();
      const list = r.repos.filter((x) => !q || `${x.fullName} ${x.description}`.toLowerCase().includes(q));
      return { total: r.repos.length, shown: Math.min(list.length, 60), repos: list.slice(0, 60).map((x) => `${x.fullName}${x.private ? " (private)" : ""}${x.language ? ` · ${x.language}` : ""}${x.projectId ? ` · project ${x.projectId}` : ""}${x.description ? ` — ${x.description.slice(0, 90)}` : ""}`), errors: r.errors.length ? r.errors : undefined };
    },
  },
  open_repo: {
    description: "Open a GitHub repository as a Hive project (or get the project it already is). Hive writes a project brief from the repo (stack, layout, how to run/test, conventions) for every agent.",
    schema: obj({ repo: str('"owner/name", "name" or a GitHub URL') }, ["repo"]),
    run: async (i, ctx) => {
      const r = await require("./repos").openRepo(i.repo, { username: ctx.username });
      return { projectId: r.project.id, name: r.project.name, created: r.created, link: `/hive/p/${r.project.id}` };
    },
  },
  session_detail: {
    description: "One session: the request, each agent's model, status and result, the files changed, and recent events.",
    schema: obj({ taskId: str("Session id") }, ["taskId"]),
    run: (i) => sessionDetail(i.taskId),
  },
  session_diff: {
    description: "The code changes a session made. Big diffs come back as a review summary written by a free model (saves tokens); pass a path or full=true for exact lines. Read this before judging work.",
    schema: obj({ taskId: str("Session id"), path: str("Optional file path"), full: bool("Exact diff instead of a summary") }, ["taskId"]),
    run: (i, ctx) => sessionDiff(i.taskId, i.path, { full: !!i.full, username: ctx.username }),
  },
  start_session: {
    description: `Start a session in a project with one agent (or several to compare). Write a precise, self-contained prompt with acceptance criteria. ${AGENT_HINT}`,
    schema: obj(
      {
        projectId: str(PROJECT),
        title: str("Short title"),
        prompt: str("Full instructions for the agent(s)"),
        agents: { type: "array", items: { type: "string" }, description: 'One or more agents, e.g. ["auto"] or ["free","claude_code/default"]' },
        mode: { type: "string", enum: ["solo", "compare", "team"], description: "solo: one agent; compare: each agent tries separately and the Judge picks the best; team: a lead splits the work among the agents" },
        watch: bool("Review the result automatically when it finishes (default true)"),
      },
      ["projectId", "prompt"],
    ),
    run: async (i, ctx) => {
      let p = await projectOf(i.projectId);
      const runner = require("./runner");
      const router = require("./router");
      const kind = router.classify(i.prompt).kind;
      const list = (Array.isArray(i.agents) && i.agents.length ? i.agents : ["auto"]).slice(0, 4).map((a) => specFrom(a, kind));
      // Claude Code / Codex / Vibe work in a folder on their machine: copy the repo there first if needed.
      p = (await require("./repos").ensureOnMachine(p.id, list.map((s) => s.provider))) || p;
      const mode = ["solo", "compare", "team"].includes(i.mode) ? i.mode : list.length > 1 ? "compare" : "solo";
      for (const s of list) await runner.resolveSpec(s, { prompt: i.prompt, machineId: p.machine_id || null });
      const task = await ctx.createTask(p, { title: i.title || String(i.prompt).split("\n")[0].slice(0, 90), prompt: i.prompt });
      if (mode === "team") await runner.startTask(task, { mode: "team", specs: list.slice(1).length ? list.slice(1) : list, lead: list[0], username: ctx.username });
      else await runner.startTask(task, { mode, specs: list, username: ctx.username });
      if (i.watch !== false) await watch(task.id, ctx.username);
      return { started: true, sessionId: task.id, project: p.name, mode, agents: list.map((s) => (s.provider === "auto" ? `auto${s.freeOnly ? " (free)" : s.preference ? ` (${s.preference})` : ""}` : `${s.provider}/${s.model || "default"}`)), link: `/hive/p/${p.id}/t/${task.id}` };
    },
  },
  plan_team: {
    description: "Plan a team with the Dispatcher: split a bigger request into parts by kind of work, each given the cheapest model that can really do it, with cost estimates. Returns the plan; call start_team to run it.",
    schema: obj({ projectId: str(PROJECT), request: str("What the team should build"), preference: { type: "string", enum: ["savings", "fast", "balanced", "quality"] }, freeOnly: bool("Free models only") }, ["projectId", "request"]),
    run: async (i, ctx) => {
      const d = await require("./dispatcher").create({ project: await projectOf(i.projectId), request: i.request, username: ctx.username, preference: i.preference || "savings", freeOnly: !!i.freeOnly });
      hub.emit("dispatch", d);
      return { dispatchId: d.id, summary: d.plan.summary, parts: d.plan.parts.map((p) => ({ id: p.id, title: p.title, kind: p.kind, dependsOn: p.dependsOn, model: p.pick ? `${p.pick.name} (${p.pick.cost})` : "auto", estimate: p.estimate.dollars })), reviewer: d.plan.review?.name, totalDollars: d.plan.totals.dollars, premiumBaselineDollars: d.plan.totals.baseline?.dollars ?? null, link: `/hive/dispatch?d=${d.id}` };
    },
  },
  start_team: {
    description: "Start a planned team (from plan_team). Optionally swap a part's model first with change_team_part.",
    schema: obj({ dispatchId: str("Dispatch id from plan_team"), watch: bool("Review automatically when done (default true)") }, ["dispatchId"]),
    run: async (i, ctx) => {
      const d = await require("./dispatcher").start(i.dispatchId, { username: ctx.username, createTask: ctx.createTask });
      if (i.watch !== false && d.taskId) await watch(d.taskId, ctx.username);
      return { started: true, sessionId: d.taskId, link: `/hive/p/${d.projectId}/t/${d.taskId}` };
    },
  },
  change_team_part: {
    description: `Before starting a team: give one part a different model, rewrite its prompt, or remove it. ${AGENT_HINT}`,
    schema: obj({ dispatchId: str("Dispatch id"), partId: str("Part id, e.g. p2"), agent: str("New model for this part"), prompt: str("New prompt"), remove: bool("Remove the part") }, ["dispatchId", "partId"]),
    run: async (i) => {
      const s = i.agent ? specFrom(i.agent) : null;
      const d = await require("./dispatcher").edit(i.dispatchId, { partId: i.partId, spec: s && s.provider !== "auto" ? s : null, prompt: i.prompt, remove: !!i.remove });
      return { ok: true, parts: d.plan.parts.map((p) => `${p.id} ${p.title} → ${p.pick?.name || "auto"}`) };
    },
  },
  add_agent: {
    description: `Bring another agent into an existing session with new instructions (e.g. to fix what a review found, or to write tests). ${AGENT_HINT}`,
    schema: obj({ taskId: str("Session id"), agent: str("Who"), instructions: str("What to do"), readOnly: bool("Only read and report (reviews)") }, ["taskId", "instructions"]),
    run: async (i, ctx) => {
      const runner = require("./runner");
      const a = await runner.addAgent(i.taskId, { spec: specFrom(i.agent || "auto"), prompt: i.instructions, username: ctx.username, readOnly: !!i.readOnly, title: i.readOnly ? "Review" : null });
      await watch(i.taskId, ctx.username);
      return { added: true, agentId: a?.id, name: a?.name, model: a ? `${a.provider}/${a.model}` : undefined };
    },
  },
  steer_agent: {
    description: "Send a running agent a correction or extra instruction.",
    schema: obj({ agentId: str("Agent id (from session_detail)"), message: str("What to tell it") }, ["agentId", "message"]),
    run: async (i, ctx) => ({ delivered: await require("./runner").steer(i.agentId, ctx.username, i.message) }),
  },
  stop_session: {
    description: "Stop every agent in a session.",
    schema: obj({ taskId: str("Session id") }, ["taskId"]),
    run: async (i) => ({ stopped: await require("./runner").stopTask(i.taskId) }),
  },
  stop_agent: {
    description: "Stop one agent (it is stuck, unavailable, or going the wrong way). Its edits stay in the working copy.",
    schema: obj({ agentId: str("Agent id (from session_detail)") }, ["agentId"]),
    run: async (i) => ({ stopped: require("./runner").stopAgent(i.agentId) }),
  },
  swap_agent: {
    description: `Replace an agent that is failing, stuck or too weak: it stops, and a new agent (the best healthy model for the same kind of work unless you name one) takes over its instructions and edits. ${AGENT_HINT}`,
    schema: obj({ agentId: str("Agent id (from session_detail)"), agent: str("Optional: who takes over") }, ["agentId"]),
    run: async (i, ctx) => {
      const a = await rescueAgent(i.agentId, { username: ctx.username, spec: i.agent ? specFrom(i.agent) : null, reason: "Copilot swapped it" });
      return a ? { swapped: true, newAgentId: a.id, name: a.name, model: `${a.provider}/${a.model}` } : { swapped: false, note: "No healthy model can take this work right now" };
    },
  },
  verify_models: {
    description: "Test every model on a key (or on every free key) with a tiny call. Models that don't answer are removed so nobody is offered them again; only working models stay. Runs in the background (a minute or two).",
    schema: obj({ keyId: str("Optional key id; empty = every free key"), retest: bool("Give previously removed models another chance") }),
    run: async (i) => {
      const health = require("./health");
      const job = i.keyId ? health.verifyKey(i.keyId, { retest: !!i.retest }) : health.verifyAll({});
      job.then(() => require("./hub").emit("health", { verified: true })).catch(() => {});
      return { started: true, note: "Results appear on /hive/health; ask agent_health later to see what works" };
    },
  },
  hide_model: {
    description: "Never offer or use a model again (on every key that has it) — for models that keep failing or give bad results.",
    schema: obj({ model: str("Model id, e.g. qwen/qwen3-coder"), vendor: str("Optional vendor id to limit it to") }, ["model"]),
    run: async (i) => {
      const keys = require("./keys");
      const rows = await all("SELECT * FROM hive_keys WHERE disabled=0");
      let n = 0;
      for (const r of rows) {
        if (i.vendor && keys.keyVendor(r) !== i.vendor) continue;
        if (!json(r.models_json, []).includes(i.model) && r.default_model !== i.model) continue;
        await keys.blockModel(r.id, i.model);
        n++;
      }
      return { hiddenOn: n };
    },
  },
  judge_session: {
    description: "Have the Judge (a model from a different lab) rank the finished attempts in a compare session and adopt the best one.",
    schema: obj({ taskId: str("Session id") }, ["taskId"]),
    run: async (i, ctx) => {
      const v = await require("./judge").judgeTask(i.taskId, { by: `copilot:${ctx.username}`, adopt: true });
      return v || { note: "No finished attempts to compare yet" };
    },
  },
  improve_prompt: {
    description: "Turn a rough request into a precise brief (goal, context, requirements, acceptance criteria) before giving it to agents.",
    schema: obj({ prompt: str("Rough request"), projectId: str("Optional project id for context") }, ["prompt"]),
    run: async (i, ctx) => {
      const r = await require("./guide").improve({ prompt: i.prompt, mode: "task", projectId: i.projectId || null, username: ctx.username });
      return { prompt: r.prompt, changes: r.changes, questions: r.questions };
    },
  },
  agent_health: {
    description: "Which agents are working, cooling down after errors, or down (with reasons). Optionally test them all now.",
    schema: obj({ testNow: bool("Probe free and plan agents now") }),
    run: async (i) => {
      const health = require("./health");
      if (i.testNow) await health.probeAll({});
      return (await health.board()).map((k) => ({ keyId: k.keyId, agent: k.label, vendor: k.vendorLabel, model: k.defaultModel, state: k.state, free: k.free, plan: k.subscription, detail: k.detail || undefined, workingModels: k.verified ? k.verified.ok.length : undefined, removedModels: k.verified ? k.verified.failed.length : undefined }));
    },
  },
  spend_report: {
    description: "Token spend over the last 30 days, by cost class and model, plus savings the Token Steward suggests.",
    schema: obj({}),
    run: async () => {
      const r = await require("./steward").report({ days: 30 });
      return { totals: r.totals, byTier: r.tiers, topModels: r.models.slice(0, 8).map((m) => `${m.name}: $${m.dollars.toFixed(2)}`), suggestions: r.tips.map((t) => t.title) };
    },
  },
  web_search: {
    description: "Search the web (model releases, benchmarks, docs, prices). Then read_url the best results.",
    schema: obj({ query: str("Search query") }, ["query"]),
    run: async (i, ctx) => (await require("./chattools").execute("web_search", i, ctx)).content,
  },
  read_url: {
    description: "Read a public web page as text.",
    schema: obj({ url: str("https URL") }, ["url"]),
    run: async (i, ctx) => (await require("./chattools").execute("read_url", i, ctx)).content,
  },
  remember: {
    description: "Save a lasting fact (the person's preferences, standing instructions, what you learned about models) so every future conversation knows it.",
    schema: obj({ fact: str("One short sentence") }, ["fact"]),
    run: async (i, ctx) => (await require("./chattools").execute("remember", i, ctx)).content,
  },
  watch_session: {
    description: "Review a session automatically when it finishes and report back here.",
    schema: obj({ taskId: str("Session id") }, ["taskId"]),
    run: async (i, ctx) => {
      await watch(i.taskId, ctx.username);
      return { watching: true };
    },
  },
};

/* ── autonomy: the Copilot acts for you ─────────────────────────────── */
const DANGEROUS = /\brm\s+-[a-z]*r[a-z]*f?\s+(\/|~|\$HOME|\*)(\s|$)|\bmkfs|\bdd\s+if=|:\(\)\s*\{|\bshutdown\b|\breboot\b|\bchmod\s+-R\s+777\s+\/|\bgit\s+push\s+.*--force|\bcurl\b[^|]*\|\s*(sudo\s+)?(ba)?sh|\bDROP\s+(TABLE|DATABASE)\b/i;

function needs(ctx, what) {
  if (what === "act" && ctx.autonomy === "assist") throw new Error("You're in Assist mode — ask the person to confirm this, or they can switch the Copilot to Autopilot.");
  if (what === "merge") {
    if (!ctx.admin) throw new Error("Only admins can merge (merging can deploy the live site).");
    if (!ctx.canMerge) throw new Error("Merging is switched off for the Copilot. The person can allow it in the Copilot's settings; until then, tell them the PR is ready to merge.");
  }
}

async function ghToken(project) {
  if (!project.github_id) return null;
  const cred = await get("SELECT * FROM hive_github WHERE id=?", [project.github_id]);
  return cred ? require("./vault").open(cred.token_enc) : null;
}

async function prChecks(taskId) {
  const gh = require("./github");
  const task = await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]);
  if (!task?.pr_number) throw new Error("This session has no pull request yet — ship it first");
  const project = await require("./runner").effectiveProject(await get("SELECT * FROM hive_projects WHERE id=?", [task.project_id]), task);
  const token = await ghToken(project);
  const pr = await gh.pull(token, project.repo_owner, project.repo_name, task.pr_number);
  const runs = await gh.checkRuns(token, project.repo_owner, project.repo_name, pr.head.sha).catch(() => null);
  const list = (runs?.check_runs || []).map((c) => ({ name: c.name, status: c.status, conclusion: c.conclusion }));
  const failed = list.some((c) => ["failure", "timed_out", "cancelled", "action_required"].includes(c.conclusion));
  const pending = list.some((c) => c.status !== "completed");
  return { task, project, token, pr, checks: list, state: !list.length ? "none" : failed ? "failure" : pending ? "pending" : "success" };
}

async function mergeNow(taskId, ctx) {
  const gh = require("./github");
  const runner = require("./runner");
  const c = await prChecks(taskId);
  if (c.pr.merged) return { merged: true, already: true, url: c.pr.html_url };
  if (c.state !== "success") return { merged: false, reason: `CI is ${c.state}`, checks: c.checks };
  const r = await gh.mergePull(c.token, c.project.repo_owner, c.project.repo_name, c.task.pr_number, { merge_method: "squash", commit_title: `${c.task.title} (#${c.task.pr_number})` });
  await runner.setTask(taskId, { status: "merged", head_sha: r.sha });
  await runner.event(taskId, null, "merge", { username: `copilot:${ctx.username}`, sha: r.sha, method: "squash", base: c.project.default_branch });
  return { merged: true, sha: r.sha, url: c.pr.html_url };
}

/** Ask the cheapest capable model (free first) — the Copilot's way to save its own tokens. */
async function cheap({ prompt, kind = "reading", system = "", username }) {
  const r = await require("./llm").ask({ kind, preference: "savings", freeOnly: true, prompt, system, username });
  return { text: r.text, model: r.model };
}

Object.assign(TOOLS, {
  ask_model: {
    description: "Delegate a side job to the cheapest model that can do it well (free first): summarise, draft, extract, translate, brainstorm, compare options. Use this instead of doing long reading or writing yourself — it saves tokens.",
    schema: obj({ prompt: str("The full job, with any text it needs"), kind: { type: "string", enum: ["chat", "mechanical", "reading", "writing", "coding", "review", "hard"], description: "Kind of work (decides how strong the model must be)" }, model: str('Optional: a specific specialist as "vendor/model", e.g. "farm/sarvam-translate" (translation), "farm/nemotron-cascade-2-30b" (maths), "farm/qwen3.8-27b" (UI/scene JSON) — see list_models') }, ["prompt"]),
    run: async (i, ctx) => {
      if (i.model && String(i.model).includes("/")) {
        const [provider, ...rest] = String(i.model).split("/");
        const r = await require("./llm").ask({ kind: i.kind || "reading", prompt: String(i.prompt).slice(0, 60000), spec: { provider, keyId: "auto", model: rest.join("/") }, username: ctx.username });
        return `(${r.model})\n${r.text}`;
      }
      const r = await cheap({ prompt: String(i.prompt).slice(0, 60000), kind: i.kind || "reading", username: ctx.username });
      return `(${r.model})\n${r.text}`;
    },
  },
  check_session: {
    description:
      "Cheap quality check of a finished session, so you don't spend tokens reading whole diffs: a reviewer from a different model family than the authors (your GPU farm or a free model, never your Claude plan) runs the project's tests/build, reads every change against the request and returns a short verdict (pass / fail / unsure, test result, issues with file:line). Use it first; read session_diff yourself only when it fails, is unsure, or the work is in a Claude-only area.",
    schema: obj({ taskId: str("Session id"), focus: str("Optional: what to check especially") }, ["taskId"]),
    run: async (i, ctx) => checkSession(i.taskId, { focus: i.focus, username: ctx.username }),
  },
  ship_session: {
    description: "Commit a finished session's changes to a branch and open a pull request (title and description written for reviewers). Do this only after you have reviewed the diff and it meets the request.",
    schema: obj({ taskId: str("Session id"), title: str("PR title"), description: str("PR description: what changed and how it was verified"), openPr: bool("Open a pull request (default true)") }, ["taskId", "title"]),
    run: async (i, ctx) => {
      needs(ctx, "act");
      const runner = require("./runner");
      const { commitTask, commitOnMachine } = require("./commit");
      const tctx = await runner.taskContext(i.taskId);
      const args = { message: i.title, branch: tctx.task.branch, openPr: i.openPr !== false, prTitle: i.title, prBody: `${i.description || ""}\n\n_Shipped by Hive Copilot for @${ctx.username}_`, author: `copilot:${ctx.username}` };
      const r = tctx.machine ? await commitOnMachine({ ...tctx, ...args }) : await commitTask({ ...tctx, variant: "main", ...args });
      const fields = { head_sha: r.sha, branch: r.branch, status: r.pr ? "pr_open" : "committed" };
      if (r.pr) Object.assign(fields, { pr_url: r.pr.url, pr_number: r.pr.number });
      await runner.setTask(i.taskId, fields);
      await runner.event(i.taskId, null, "commit", { username: `copilot:${ctx.username}`, ...r, message: i.title });
      return { shipped: true, branch: r.branch, sha: r.sha, pullRequest: r.pr?.url || null, link: `/hive/p/${tctx.task.project_id}/t/${i.taskId}` };
    },
  },
  pr_status: {
    description: "CI checks and mergeability of a session's pull request.",
    schema: obj({ taskId: str("Session id") }, ["taskId"]),
    run: async (i) => {
      const c = await prChecks(i.taskId);
      return { url: c.pr.html_url, merged: c.pr.merged, mergeable: c.pr.mergeable, ci: c.state, checks: c.checks };
    },
  },
  merge_when_green: {
    description: "Merge a session's pull request as soon as its CI passes (checked every 2 minutes). Merging can deploy the live site, so this only works when the person has allowed merging.",
    schema: obj({ taskId: str("Session id") }, ["taskId"]),
    run: async (i, ctx) => {
      needs(ctx, "merge");
      const r = await mergeNow(i.taskId, ctx).catch((e) => ({ merged: false, reason: e.message }));
      if (r.merged) return r;
      await run("INSERT INTO hive_copilot_merge(task_id, username, created_at) VALUES(?,?,?) ON CONFLICT(task_id) DO NOTHING", [i.taskId, ctx.username, now()]);
      return { queued: true, reason: r.reason, note: "I'll merge it when CI is green and tell you." };
    },
  },
  pending_approvals: {
    description: "Commands agents are waiting to run on machines (they need a yes or no).",
    schema: obj({}),
    run: async () => require("./machines").pendingApprovals().map((a) => ({ id: a.id, task: a.taskId, agent: a.agent, machine: a.machine, command: a.command })),
  },
  answer_approval: {
    description: "Approve or deny a command an agent wants to run on a machine. Never approve destructive commands (deleting outside the project, force-pushing, wiping disks, piping downloads into a shell).",
    schema: obj({ approvalId: str("Approval id"), approve: bool("true to run it"), note: str("Why (shown to the agent)") }, ["approvalId", "approve"]),
    run: async (i, ctx) => {
      needs(ctx, "act");
      const m = require("./machines");
      const a = m.pendingApprovals().find((x) => x.id === i.approvalId);
      if (!a) return { answered: false, note: "Not waiting any more" };
      if (i.approve && DANGEROUS.test(String(a.command || ""))) return { answered: false, note: "That command looks destructive — leaving it for a person to decide" };
      return { answered: m.answerApproval(i.approvalId, { approved: !!i.approve, by: `copilot:${ctx.username}`, note: i.note }) };
    },
  },
  list_pipelines: {
    description: "Saved pipelines (relay teams of agents) of a project.",
    schema: obj({ projectId: str(PROJECT) }, ["projectId"]),
    run: async (i) => (await require("./pipelines").list((await projectOf(i.projectId)).id)).map((p) => ({ id: p.id, name: p.name, description: p.description, stages: (p.stages || []).map((s) => s.name) })),
  },
  run_pipeline: {
    description: "Run a saved pipeline on a request.",
    schema: obj({ pipelineId: str("Pipeline id"), request: str("What to do") }, ["pipelineId", "request"]),
    run: async (i, ctx) => {
      needs(ctx, "act");
      const pl = await get("SELECT * FROM hive_pipelines WHERE id=?", [i.pipelineId]);
      if (!pl) throw new Error("Pipeline not found");
      const project = await projectOf(pl.project_id);
      const r = await require("./pipelines").start({ pipeline: pl, project, request: i.request, username: ctx.username, createTask: ctx.createTask });
      if (r.taskId) await watch(r.taskId, ctx.username);
      return { started: true, runId: r.id, sessionId: r.taskId, link: r.taskId ? `/hive/p/${project.id}/t/${r.taskId}` : "/hive/pipelines" };
    },
  },
  list_automations: {
    description: "Recurring jobs (nightly fixes, dependency updates, reviews…).",
    schema: obj({ projectId: str("Optional project id, name or GitHub repo") }),
    run: async (i) => (await require("./automation").listSchedules(i.projectId ? (await projectOf(i.projectId)).id : null)).map((x) => ({ id: x.id, project: x.projectId, title: x.title, every: x.every, hour: x.hour, enabled: x.enabled, nextRun: x.nextRun })),
  },
  create_automation: {
    description: "Schedule recurring work for a project (runs overnight too). Hours are UTC.",
    schema: obj({ projectId: str(PROJECT), title: str("Title"), prompt: str("What should happen each time"), every: { type: "string", enum: ["hourly", "daily", "weekly", "weekdays"] }, hour: int("Hour (UTC) for daily/weekly"), agent: str("Who does it (default free)") }, ["projectId", "title", "prompt"]),
    run: async (i, ctx) => {
      needs(ctx, "act");
      const p = await projectOf(i.projectId);
      const sch = await require("./automation").saveSchedule({ projectId: p.id, title: i.title, prompt: i.prompt, every: i.every || "daily", hour: i.hour ?? 2, agents: [specFrom(i.agent || "free")] }, `copilot:${ctx.username}`);
      hub.emit("schedules", { projectId: p.id });
      return { created: true, id: sch.id, nextRun: sch.nextRun, link: "/hive/automations" };
    },
  },
  drive_list: {
    description: "Files in Hive Drive (the team's file manager).",
    schema: obj({ folder: str("Folder, e.g. /docs"), projectId: str("Optional project id, name or GitHub repo") }),
    run: async (i) => (await require("./drive").list({ folder: i.folder || "/", projectId: i.projectId || null })).slice(0, 200).map((f) => `${f.kind === "folder" ? "📁" : "📄"} ${f.path}${f.size ? ` (${f.size} B)` : ""}`),
  },
  drive_read: {
    description: "Read a text file from Hive Drive (long files come back summarised unless full is true).",
    schema: obj({ path: str("Drive path"), projectId: str("Optional project id, name or GitHub repo"), full: bool("Return the whole text") }, ["path"]),
    run: async (i, ctx) => {
      const t = await require("./drive").readText({ path: i.path, projectId: i.projectId || null });
      const text = typeof t === "string" ? t : t?.text || t?.content || "";
      if (i.full || text.length < 8000) return clip(text, 40000);
      const r = await cheap({ prompt: `Summarise this file for an engineering lead. Keep every decision, number, requirement and open question.\n\n${text.slice(0, 120000)}`, username: ctx.username });
      return `Summary by ${r.model} (ask with full=true for the raw text):\n${r.text}`;
    },
  },
  drive_write: {
    description: "Save a text file (Markdown, notes, specs, briefs) to Hive Drive.",
    schema: obj({ path: str("Drive path, e.g. /docs/plan.md"), content: str("Text"), projectId: str("Optional project id, name or GitHub repo") }, ["path", "content"]),
    run: async (i, ctx) => {
      needs(ctx, "act");
      const d = require("./drive");
      const f = await d.put({ path: i.path, projectId: i.projectId || null, mime: /\.md$/i.test(i.path) ? "text/markdown" : "text/plain", buffer: Buffer.from(String(i.content), "utf8"), by: `copilot:${ctx.username}` });
      hub.emit("drive", { path: i.path });
      return { saved: true, path: f?.path || i.path };
    },
  },
  change_setting: {
    description: "Change how Hive works: the router's preference (savings | fast | balanced | quality), or switch a built-in plugin on/off (e.g. auto_review, token_steward, judge, escalation, never_stop).",
    schema: obj({ routerPreference: { type: "string", enum: ["savings", "fast", "balanced", "quality"] }, plugin: str("Built-in plugin id"), enabled: bool("On or off") }),
    run: async (i, ctx) => {
      needs(ctx, "act");
      const { setBuiltin } = require("./plugins");
      if (i.routerPreference) await setBuiltin("*", "smart_router", { config: { preference: i.routerPreference } }, `copilot:${ctx.username}`);
      if (i.plugin) await setBuiltin("*", String(i.plugin), { enabled: i.enabled !== false }, `copilot:${ctx.username}`);
      hub.emit("plugins", { by: ctx.username });
      return { changed: true };
    },
  },
});

/* Merge queued PRs once CI is green; auto-answer safe command approvals in watched sessions. */
/* ── cheap quality gate ─────────────────────────────────────────────── */
/** The best non-Claude reviewer from a different family than the authors that clears the review bar. */
async function cheapReviewer(taskId) {
  const router = require("./router");
  const { cardFor, MIN_QUALITY } = require("./catalog");
  const authors = await all("SELECT provider, model FROM hive_agents WHERE task_id=? AND role<>'reviewer'", [taskId]);
  const labs = new Set(authors.map((a) => cardFor(a.model, a.provider).lab));
  const task = await get("SELECT machine_id FROM hive_tasks WHERE id=?", [taskId]);
  const all_ = (await router.candidates({ kind: "review", needTools: true, machineId: task?.machine_id || null, noSubscription: true })).filter((c) => c.quality >= MIN_QUALITY.review && !c.cooling);
  const other = all_.filter((c) => !labs.has(c.card.lab));
  const pool = other.length ? other : all_;
  if (!pool.length) return null;
  const { ranked } = router.rank(pool, "review", "savings");
  const c = ranked[0];
  return { spec: { provider: c.vendor, keyId: c.key.id, model: c.model }, name: `${c.card.name} on ${c.vendorLabel}`, crossFamily: other.length > 0 };
}

async function checkSession(taskId, { focus = "", username = "copilot" } = {}) {
  const task = await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]);
  if (!task) throw new Error("Session not found");
  const rv = await cheapReviewer(taskId);
  if (!rv) return { verdict: "unsure", note: "No free or farm reviewer clears the quality bar right now — review the diff yourself (session_diff)." };
  const prompt = `You are the quality gate for this session. Do not change any file.
1. Run the project's checks that exist (tests, type-check, lint, build — whatever the repo uses; keep it fast).
2. Read every change (view_changes) against the original request${focus ? ` — focus especially on: ${focus}` : ""}. Look for: wrong behaviour, missing parts of the request, broken edge cases, security problems, things that would make CI fail, UI that breaks on phones or in dark mode.
3. Finish with ONLY this JSON in your final message:
{"verdict":"pass"|"fail"|"unsure","tests":"what you ran and the result","issues":[{"file":"path","line":0,"problem":"…","severity":"high"|"medium"|"low"}],"summary":"one sentence"}
"pass" only if the request is fully met and nothing high or medium is wrong.`;
  const a = await require("./runner").spawnAndWait(taskId, { spec: rv.spec, prompt, username: `copilot:${username}`, readOnly: true, title: "Quality check", kind: "review" });
  const text = String(a?.result || a?.error || "");
  let v = null;
  try {
    v = require("./llm").extractJson(text);
  } catch {
    v = null;
  }
  if (!v || !v.verdict) return { verdict: "unsure", reviewer: rv.name, note: "The reviewer did not return a clear verdict", excerpt: clip(text, 1200) };
  return { verdict: v.verdict, reviewer: rv.name, crossFamily: rv.crossFamily, tests: v.tests, issues: (v.issues || []).slice(0, 12), summary: v.summary, agentStatus: a?.status };
}

/* ── keep work moving: replace agents whose model is down or stuck ─────── */
const rescued = new Map(); // old agent id → when

async function rescueAgent(agentId, { username, spec = null, reason = "its model is unavailable" }) {
  const runner = require("./runner");
  const router = require("./router");
  const agent = await get("SELECT * FROM hive_agents WHERE id=?", [agentId]);
  if (!agent) throw new Error("Agent not found");
  let pick = spec;
  if (!pick) {
    const task = await get("SELECT * FROM hive_tasks WHERE id=?", [agent.task_id]);
    const r = await router
      .route({ kind: agent.routed_kind || task?.kind || "coding", needTools: true, machineId: task?.machine_id || null, preference: "quality", exclude: { keys: agent.key_id ? [agent.key_id] : [], vendorModels: [`${agent.provider}|${agent.model}`] } })
      .catch(() => null);
    if (!r) return null;
    pick = { provider: r.pick.provider, keyId: r.pick.keyId, model: r.pick.model };
  }
  rescued.set(agentId, Date.now());
  const a = await runner.handoffAgent(agentId, { spec: pick, username: username || agent.started_by || "copilot" });
  await runner.event(agent.task_id, a.id, "note", { text: `${agent.name} (${agent.model}) was replaced because ${reason}; ${a.name} (${a.model}) continues its work.` }).catch(() => {});
  return a;
}

/** Every couple of minutes: a running agent whose model is down/cooling, or that has gone silent, is handed to a healthy model. */
async function rescueTick({ silentMs = 15 * 60_000 } = {}) {
  const health = require("./health");
  const out = [];
  const t = Date.now();
  for (const [id, at] of rescued) if (t - at > 3600_000) rescued.delete(id);
  // Only agents really running in this process (not stale rows from before a restart).
  const here = new Set(require("./runner").liveAgents().map((x) => x.id));
  const live = (await all("SELECT * FROM hive_agents WHERE status='running'").catch(() => [])).filter((a) => here.has(a.id));
  for (const a of live) {
    if (rescued.has(a.id) || !a.key_id) continue;
    const v = (() => {
      try {
        return require("./providers").providerOf(a.provider);
      } catch {
        return null;
      }
    })();
    let why = null;
    const until = await health.cooling(a.key_id, a.model).catch(() => 0);
    if (until && until - t > 60_000) why = "its model is failing right now";
    // Silence: long builds and test runs are normal, so only a long silence counts (not for plan CLIs, which run their own loop).
    if (!why && !v?.subscription) {
      const last = await get("SELECT MAX(created_at) AS t FROM hive_events WHERE agent_id=?", [a.id]).catch(() => null);
      const since = Number(last?.t || a.started_at || t);
      if (t - since > silentMs) why = `it went silent for ${Math.round((t - since) / 60_000)} minutes`;
    }
    if (!why) continue;
    const n = await rescueAgent(a.id, { reason: why }).catch(() => null);
    if (n) out.push({ from: a.id, to: n.id, why });
  }
  return out;
}

async function mergeTick() {
  for (const m of await all("SELECT * FROM hive_copilot_merge").catch(() => [])) {
    const s = await brainSettings(m.username);
    const ctx = { username: m.username, ...s };
    try {
      needs(ctx, "merge");
      const r = await mergeNow(m.task_id, ctx);
      if (r.merged) {
        await run("DELETE FROM hive_copilot_merge WHERE task_id=?", [m.task_id]);
        await require("./caps").alert({ kind: "copilot", level: "info", title: "Copilot merged a pull request", body: r.url || m.task_id, ref: "/hive/copilot" }).catch(() => {});
      } else if (/failure/.test(r.reason || "")) {
        await run("DELETE FROM hive_copilot_merge WHERE task_id=?", [m.task_id]);
        await onCiFailed(m, r).catch(() => {});
      }
    } catch (e) {
      if (/switched off|Only admins/.test(e.message)) await run("DELETE FROM hive_copilot_merge WHERE task_id=?", [m.task_id]);
    }
  }
}

async function onCiFailed(m, r) {
  const task = await get("SELECT id, title FROM hive_tasks WHERE id=?", [m.task_id]);
  await send({ username: m.username, auto: true, text: `[automatic] CI failed on the pull request of “${task?.title}” (${m.task_id}): ${JSON.stringify(r.checks || []).slice(0, 1500)}. Find out why, bring in an agent to fix it on the same session, ship again and queue the merge again.` });
}

async function onApproval(info) {
  if (!info?.taskId) return;
  const w = await get("SELECT username FROM hive_copilot_watch WHERE task_id=?", [info.taskId]).catch(() => null);
  if (!w) return;
  const s = await brainSettings(w.username);
  if (s.autonomy !== "autopilot") return;
  const m = require("./machines");
  if (DANGEROUS.test(String(info.command || ""))) {
    await require("./caps").alert({ kind: "copilot", level: "warn", title: "A command needs you", body: `Copilot won't approve: ${String(info.command).slice(0, 160)}`, ref: "/hive/machines" }).catch(() => {});
    return;
  }
  m.answerApproval(info.id, { approved: true, by: `copilot:${w.username}`, note: "Approved by Copilot (autopilot)" });
  await require("./runner")
    .event(info.taskId, info.agentId || null, "note", { message: `Copilot approved: ${String(info.command).slice(0, 300)}` })
    .catch(() => {});
}

const toolDefs = () => Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, schema: t.schema }));

async function runTool(name, input, ctx) {
  const t = TOOLS[name];
  if (!t) return { content: `Unknown tool ${name}`, isError: true };
  try {
    const r = await t.run(input || {}, ctx);
    return { content: clip(r, 30000) };
  } catch (e) {
    return { content: `Error: ${e.message}`, isError: true };
  }
}

/* ── watching sessions ─────────────────────────────────────────────── */
async function watch(taskId, username) {
  await run("INSERT INTO hive_copilot_watch(task_id, username, created_at) VALUES(?,?,?) ON CONFLICT(task_id) DO UPDATE SET username=excluded.username, done=0", [taskId, username, now()]);
}

const FINISHED = new Set(["review", "failed", "stopped", "pr_open", "committed"]);
const reviewing = new Set();

/** Called on every task update: a watched session that finished gets a review turn. */
async function onTask(task, deps) {
  if (!task?.id || !FINISHED.has(task.status) || reviewing.has(task.id)) return;
  const w = await get("SELECT * FROM hive_copilot_watch WHERE task_id=? AND done=0", [task.id]).catch(() => null);
  if (!w) return;
  // Wait until no agent of the session is still working.
  const busy = await get("SELECT COUNT(*) AS n FROM hive_agents WHERE task_id=? AND status IN ('queued','running')", [task.id]);
  if (Number(busy?.n || 0) > 0) return;
  reviewing.add(task.id);
  try {
    await run("UPDATE hive_copilot_watch SET done=1 WHERE task_id=?", [task.id]);
    const s = await brainSettings(w.username);
    const next =
      s.autonomy === "autopilot"
        ? `If it is fully done, ship it with ship_session (clear title and description)${s.canMerge ? " and then merge_when_green" : ""}.`
        : "If it is fully done, tell me it is ready to ship.";
    const gate = s.saveTokens ? "First run check_session (cheap: a reviewer from another model family runs the tests and reads the changes). If it passes and the work is not in a Claude-only area, trust it and skip reading the diff. If it fails, add an agent to fix exactly the issues it lists, then check again; after a second failure hand it to claude_code/default. Only read session_diff yourself when the check is unsure or the work is in a Claude-only area. " : "";
    await send({
      username: w.username,
      text: `[automatic] Session “${task.title}” (${task.id}) just finished with status “${task.status}”. ${gate}Review it now: read session_detail${s.saveTokens ? "" : " and session_diff"}, judge whether it fully meets the request (correctness, completeness, quality, risks). If something is missing or wrong, fix it by adding an agent with precise instructions (cheapest capable model) and keep watching. ${next} Then give me a short verdict: ✅ done (and shipped?) / ⚠️ needs changes (what you did about it) / ❌ failed (why and what next).`,
      auto: true,
      deps,
    });
  } catch (e) {
    console.error("[hive copilot] review", e.message);
  } finally {
    reviewing.delete(task.id);
  }
}

/* ── the brain ─────────────────────────────────────────────────────── */
async function brainSettings(username) {
  const r = await get("SELECT * FROM hive_copilot_settings WHERE username=?", [username]).catch(() => null);
  return {
    brain: r?.brain || "auto",
    model: r?.model || "",
    autonomy: r?.autonomy === "assist" ? "assist" : "autopilot",
    canMerge: !!r?.can_merge,
    admin: !!r?.admin,
    // Claude leads and checks; your GPU farm and free models do the work (on by default).
    // The parent Claude account: the one that leads (plans and checks). Other Claude accounts are workers.
    brainKey: r?.brain_key || null,
    saveTokens: r?.save_tokens === undefined || r?.save_tokens === null ? true : !!r.save_tokens,
    // Work that always goes to Claude, so quality never drops where it matters most.
    claudeOnly: (() => {
      const v = json(r?.claude_only, null);
      return Array.isArray(v) ? v : DEFAULT_CLAUDE_ONLY;
    })(),
  };
}

const DEFAULT_CLAUDE_ONLY = ["Landing page, hero sections and signature UI", "Shaders and complex animation", "Architecture, security and data migrations", "Final review before shipping"];

/** Pick who thinks: your Claude plan first, then the best healthy model with tools (free first). */
async function pickBrain(username, exclude = [], { quick = false } = {}) {
  const keys = require("./keys");
  const machines = require("./machines");
  const router = require("./router");
  const { keyVendor } = require("./providers");
  const s = await brainSettings(username);
  // Quick: answer with a fast API model instead of starting Claude Code on the machine.
  if (s.brain !== "api" && !quick) {
    let subs = (await all("SELECT * FROM hive_keys WHERE disabled=0 ORDER BY created_at")).filter((k) => keyVendor(k) === "claude_code" && k.machine_id && machines.isOnline(k.machine_id) && !exclude.includes(k.id));
    // The parent account leads; if it's at its plan limit, the next Claude account takes over.
    const health = require("./health");
    const ready = [];
    for (const k of subs) if (!(await health.cooling(k.id, k.default_model || "default").catch(() => 0))) ready.push(k);
    if (ready.length) subs = ready;
    subs.sort((a, b) => (b.id === s.brainKey) - (a.id === s.brainKey));
    if (subs.length) return { kind: "cli", key: subs[0], vendor: "claude_code", parent: subs[0].id === s.brainKey, model: s.brain === "claude_code" && s.model ? s.model : subs[0].default_pinned ? subs[0].default_model : "default" };
    if (s.brain === "claude_code" && !exclude.length) throw new Error("Your Claude plan's machine is offline — start the bridge on it, or switch the Copilot's brain to Auto");
  }
  if (s.brain === "api" && s.model && s.model.includes("/") && !exclude.length) {
    const [vendor, ...rest] = s.model.split("/");
    const k = await keys.pickKey(vendor, { exclude });
    if (k) return { kind: "api", key: k, vendor, model: rest.join("/") || k.default_model };
  }
  for (const freeOnly of [true, false]) {
    const r = await router.route({ kind: quick ? "coding" : "hard", needTools: true, chat: true, preference: quick ? "fast" : "quality", freeOnly, noSubscription: true, exclude: { keys: exclude } }).catch(() => null);
    if (r) {
      const key = await keys.keyRow(r.pick.keyId);
      // Free first, but only if it's genuinely capable of orchestrating.
      if (key && (!freeOnly || r.pick.quality >= 70)) return { kind: "api", key, vendor: r.pick.provider, model: r.pick.model, name: r.pick.name };
    }
  }
  throw new Error("No model with tool use is connected — add a key (Keys) or connect your Claude plan");
}

// Claude leads and checks; the GPU farm and free models do the work — without lowering quality.
const TOKEN_RULES = (settings) => `
Token budget — you run on the person's Claude plan, which is limited. You lead and check; other models do the work:
- Do not write code, long text, scene JSON or translations yourself. Give the work to agents ("auto" picks the best non-Claude model that clears the quality bar). Your GPU farm's specialists, when connected: farm/qwen3.8-27b (UI, Nexora scene JSON, motion code, everyday coding), farm/uigen-x-32b (UI layouts), farm/qwen3-coder-next (backend, tests, refactors), farm/nemotron-cascade-2-30b (maths, GATE solutions), farm/devstral-small-2 (design or screenshot to code), farm/paddleocr-vl (reading scans), farm/sarvam-translate (Indian languages). list_models shows which are up.
- Mistral Vibe ("vibe/default", the person's Le Chat plan on their machine) is a full coding agent that costs no Claude tokens: give it everyday coding — tests, backend, fixes, refactors, scripts. Not signature UI or hard engineering. Its work passes check_session like any other model's.
- Keep your own reading small: check_session instead of reading whole diffs, session_diff summaries, ask_model for any summarising or extracting.
Quality floor — never lower quality to save tokens:
- These always go to Claude (agent "claude_code/default"), from writing to review: ${(settings.claudeOnly || []).map((x) => `"${x}"`).join(", ") || "(none)"}.
- Everything else: another model's work is accepted only when check_session passes (tests plus a reviewer from a different model family). If it fails, have a model fix exactly the issues it lists; if it fails again, hand the work to "claude_code/default".
- Hard engineering (architecture, unclear bugs, multi-file refactors) goes to the strongest model the router offers — usually your Claude plan. Never pick a model below the quality bar to save tokens.`;

const SYSTEM = (username, facts, snapshot, settings = {}) => `You are Hive Copilot, @${username}'s chief of staff for software work in Nexora Hive. You run the hive: you decide what needs doing, give work to the right agents, write their prompts, watch progress, judge results, and report back. You can do everything the person can do in Hive through your tools.

How you work:
- Delegate. You plan, write prompts, review and judge; agents do the coding. Keep your own messages short.
- Right model for each job, quality first: use list_models to see who is good at what. Cheap or free models for mechanical work, reading and docs; strong models for hard engineering and reviews. Never pick a model that is too weak for the job just because it is cheaper or faster.
- Projects: every GitHub repo the person connected is available (list_repos). When they name a repo or project, just use it — tools accept "owner/name" or a name and open the repo as a project automatically, with a brief written from the code.
- When asked how many models there are, use the totals from list_models / hive_overview (every model the connected keys offer), not the length of a shortlist.
- Small, clear tasks → start_session (one agent, or "compare" for important work so the Judge picks the best). Bigger work with several parts → plan_team, check the plan, then start_team.
- Every prompt you give an agent is precise and self-contained: goal, relevant files or areas, constraints, acceptance criteria, how to verify (tests/build).
- After work finishes, review it yourself with session_detail and session_diff before calling it done. If it is not right, add an agent to fix it with exact instructions.
- Autonomy: ${settings.autonomy === "assist" ? "ASSIST — propose actions that change things (starting work is fine) and let the person confirm shipping, approvals, automations and settings." : "AUTOPILOT — you act for the person: start work, approve safe agent commands, review, fix, and when the work is verified ship it (ship_session opens a pull request)."} ${settings.canMerge ? "You may merge with merge_when_green once a PR's CI is green." : "You may not merge: when a PR is ready, say so — the person merges (merging can deploy the live site)."}
- Spend as few tokens as possible yourself: hand reading, summarising and drafting to ask_model (cheapest capable model), read diffs and files as summaries unless you need the exact lines, and never repeat large content back.
- When unsure about the latest models or facts, research with web_search and read_url, and remember what matters.
- If an agent or model fails, is stuck or unavailable, replace it (swap_agent) with the best healthy model — work must not stop. Hive also does this on its own for running agents whose model goes down.
- Keep the model list clean: verify_models tests every model and removes those that don't answer; hide_model removes one that keeps failing or does poor work.
- Ask the person only when a decision is genuinely theirs. Otherwise act, then report what you did with links (paths like /hive/p/… are clickable).
- Answer in Markdown. Be concise and concrete.
${settings.saveTokens === false ? "" : TOKEN_RULES(settings)}

Today is ${new Date().toISOString().slice(0, 10)}.
${facts.length ? `\nWhat you know about @${username} (saved memory):\n${facts.map((f) => `- ${f}`).join("\n")}\n` : ""}
Current state of the hive:
${clip(snapshot, 6000)}`;

async function history(username, limit = 24) {
  const rows = (await all("SELECT * FROM hive_copilot_msgs WHERE username=? ORDER BY created_at DESC LIMIT ?", [username, limit])).reverse();
  return rows;
}

const pub = (r) => ({ id: r.id, role: r.role, content: r.content, tools: json(r.tools_json, []), provider: r.provider || null, model: r.model || null, auto: !!r.auto, error: r.error || null, createdAt: Number(r.created_at) });

async function messages(username, limit = 80) {
  return (await history(username, limit)).map(pub);
}

async function clear(username) {
  await run("DELETE FROM hive_copilot_msgs WHERE username=?", [username]);
}

/**
 * One exchange: store the person's message, think with the brain (using
 * tools), stream progress to `sink`, store the reply.
 * deps: { createTask(project, {title, prompt}), origin }
 */
async function send({ username, text, auto = false, sink = null, deps = {}, signal = null, quick = false, projectId = null }) {
  const t = now();
  const userMsg = { id: newId("cpm"), role: "user", content: String(text).slice(0, 20000), auto: auto ? 1 : 0 };
  await run("INSERT INTO hive_copilot_msgs(id, username, role, content, auto, created_at) VALUES(?,?,?,?,?,?)", [userMsg.id, username, "user", userMsg.content, userMsg.auto, t]);
  const reply = { id: newId("cpm"), role: "assistant", content: "", tools: [], provider: null, model: null, error: null };
  const out = (type, data) => {
    sink?.(type, data);
    hub.emit("copilot", { username, type, id: reply.id, ...data });
  };
  out("user", { message: pub({ ...userMsg, created_at: t, tools_json: "[]" }) });
  out("start", {});
  const settings = await brainSettings(username);
  const ctx = {
    username,
    autonomy: settings.autonomy,
    canMerge: settings.canMerge,
    admin: settings.admin,
    createTask: deps.createTask || (async () => {
      throw new Error("Starting sessions isn't available here");
    }),
  };
  const facts = await require("./chattools")
    .userMemory(username)
    .catch(() => []);
  const snapshot = await overview().catch(() => ({}));
  let system = SYSTEM(username, facts, snapshot, settings);
  // The project picked in the composer: what "this", "the repo" and "it" refer to.
  const focus = projectId ? await get("SELECT id, name, repo_owner, repo_name FROM hive_projects WHERE id=?", [projectId]).catch(() => null) : null;
  if (focus) system += `\n\nThe person is working on the project "${focus.name}" (id ${focus.id}${focus.repo_owner ? `, repo ${focus.repo_owner}/${focus.repo_name}` : ""}). Unless they say otherwise, "this", "the repo", "the project" and "it" mean this project — use its id with your tools without asking which project.`;
  if (focus) {
    const guide = await require("./chat")
      .guideOf(focus.id)
      .catch(() => "");
    if (guide) system += `\n\n${guide}`;
  }
  if (quick) system += "\n\nQuick mode: answer directly and briefly. Use tools only when the answer needs them.";
  const past = (await history(username, 24)).filter((m) => m.id !== userMsg.id && m.content);
  const tried = [];
  let lastErr = null;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      let brain;
      try {
        brain = await pickBrain(username, tried, { quick });
      } catch (e) {
        throw lastErr || e;
      }
      reply.provider = brain.vendor;
      reply.model = brain.model;
      out("brain", { provider: brain.vendor, model: brain.model, kind: brain.kind });
      try {
        if (brain.kind === "cli") await thinkWithPlan({ brain, system, past, text: userMsg.content, ctx, reply, out, deps, signal });
        else await thinkWithApi({ brain, system, past, text: userMsg.content, ctx, reply, out, signal });
        lastErr = null;
        break;
      } catch (e) {
        if (signal?.aborted) throw e;
        lastErr = e;
        tried.push(brain.key.id);
        out("note", { text: `${brain.vendor === "claude_code" ? "Your Claude plan" : brain.model} couldn't continue (${String(e.message).slice(0, 160)}) — switching brains` });
        if (reply.content) break; // keep what was said; don't repeat actions
      }
    }
    if (lastErr && !reply.content) throw lastErr;
  } catch (e) {
    reply.error = String(e.message || e).slice(0, 600);
  }
  await run("INSERT INTO hive_copilot_msgs(id, username, role, content, tools_json, provider, model, error, auto, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)", [reply.id, username, "assistant", reply.content, JSON.stringify(reply.tools.slice(-60)), reply.provider, reply.model, reply.error, auto ? 1 : 0, now()]);
  const done = pub({ ...reply, tools_json: JSON.stringify(reply.tools), created_at: now(), auto: auto ? 1 : 0 });
  out("done", { message: done });
  if (auto) await require("./caps").alert({ kind: "copilot", level: "info", title: "Copilot reviewed a session", body: reply.content.split("\n").find((l) => l.trim())?.slice(0, 200) || "Review ready", ref: "/hive/copilot" }).catch(() => {});
  return { user: userMsg, reply: done };
}

function toTranscript(past) {
  const msgs = [];
  for (const m of past) {
    const role = m.role === "user" ? "user" : "assistant";
    const textOf = m.role === "assistant" && json(m.tools_json, []).length ? `${m.content}\n\n(Actions taken: ${json(m.tools_json, []).map((x) => x.name).join(", ")})` : m.content;
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.text += `\n\n${textOf}`;
    else msgs.push({ role, text: textOf });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

async function thinkWithApi({ brain, system, past, text, ctx, reply, out, signal }) {
  const keys = require("./keys");
  const { providerOf } = require("./providers");
  const v = providerOf(brain.vendor);
  const convo = [...toTranscript(past), { role: "user", text }];
  if (convo.length > 1 && convo[convo.length - 2].role === "user") convo.splice(convo.length - 2, 1);
  const tools = toolDefs();
  for (let step = 0; step < MAX_STEPS; step++) {
    let buf = "";
    const res = await v.impl.turn({
      secret: keys.secretOf(brain.key),
      keyRow: brain.key,
      baseUrl: brain.key.base_url || v.baseUrl,
      official: !!v.official,
      vision: false,
      model: brain.model,
      effort: brain.vendor === "anthropic" ? "medium" : null,
      system,
      messages: convo,
      tools,
      signal,
      cache: true,
      onText: (d) => {
        buf += d;
        out("delta", { text: d });
      },
    });
    await keys.recordUsage(brain.key.id, ctx.username, { input: res.usage.input, output: res.usage.output, cacheRead: res.usage.cacheRead || 0, costMicros: res.costMicros || 0 }, res.rateLimit, { vendor: brain.vendor, model: res.servedModel || brain.model }).catch(() => {});
    reply.content += (reply.content && res.text ? "\n\n" : "") + (res.text || "");
    if (res.stop !== "tool" || !res.toolCalls?.length) return;
    convo.push({ role: "assistant", text: res.text, toolCalls: res.toolCalls, raw: res.raw });
    const results = [];
    for (const call of res.toolCalls) {
      const step = { id: call.id, name: call.name, input: call.input || {}, status: "running" };
      reply.tools.push(step);
      out("tool", { tool: step });
      const r = call.invalid ? { content: `Arguments were not valid JSON: ${call.rawArgs}`, isError: true } : await runTool(call.name, call.input || {}, ctx);
      Object.assign(step, { status: r.isError ? "error" : "done", preview: String(r.content).slice(0, 500) });
      out("tool_done", { tool: step });
      results.push({ id: call.id, name: call.name, content: String(r.content), isError: !!r.isError });
    }
    convo.push({ role: "tool", results });
    if (buf && !buf.endsWith("\n")) reply.content += "\n";
  }
}

/** Claude Code on your plan, driving Hive through its MCP endpoint. */
async function thinkWithPlan({ brain, system, past, text, ctx, reply, out, deps, signal }) {
  const cli = require("./providers/cli");
  const keys = require("./keys");
  const token = `hcp_${crypto.randomBytes(24).toString("base64url")}`;
  tokens.set(token, { ...ctx, exp: Date.now() + 30 * 60_000 });
  const origin = String(deps.origin || process.env.HIVE_PUBLIC_URL || "https://nexoraguru.in").replace(/\/+$/, "");
  const mcp = JSON.stringify({ mcpServers: { hive: { type: "http", url: `${origin}/api/hive-mcp`, headers: { Authorization: `Bearer ${token}` } } } });
  const transcript = toTranscript(past)
    .map((m) => `${m.role === "user" ? "Person" : "You"}: ${m.text}`)
    .join("\n\n")
    .slice(-30000);
  const prompt = transcript ? `Conversation so far:\n\n${transcript}\n\n---\n\n${text}` : text;
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--no-session-persistence", "--mcp-config", mcp, "--strict-mcp-config", "--allowedTools", "mcp__hive", "WebSearch", "WebFetch", "--disallowedTools", "Bash", "Edit", "Write", "MultiEdit", "NotebookEdit", "Task", "--system-prompt", `${system}\n\nYour Hive tools are the mcp__hive__* tools.`];
  if (brain.model && brain.model !== "default") args.push("--model", brain.model);
  let failure = null;
  const steps = new Map();
  try {
    const r = await cli.stream({
      machineId: brain.key.machine_id,
      folder: null,
      cli: "claude",
      args,
      input: prompt,
      env: cli.envFor("claude_code", keys.secretOf(brain.key)),
      hook: false,
      signal,
      onEvent: (ev) => {
        if (ev.kind === "delta") {
          reply.content += ev.text;
          out("delta", { text: ev.text });
        } else if (ev.kind === "tool_call") {
          const name = String(ev.raw || ev.name || "tool").replace(/^mcp__hive__/, "");
          const step = { id: ev.id, name, input: ev.input || {}, status: "running" };
          steps.set(ev.id, step);
          reply.tools.push(step);
          out("tool", { tool: step });
        } else if (ev.kind === "tool_result") {
          const step = steps.get(ev.id);
          if (step) {
            Object.assign(step, { status: ev.isError ? "error" : "done", preview: String(ev.content || "").slice(0, 500) });
            out("tool_done", { tool: step });
          }
        } else if (ev.kind === "session" && ev.model) reply.model = ev.model;
        else if (ev.kind === "plan_usage") Promise.resolve(keys.setPlanUsage(brain.key.id, ev.info)).catch(() => {});
        else if (ev.kind === "fail") failure = ev;
        else if (ev.kind === "limit") failure = { text: ev.message, limit: true };
        else if (ev.kind === "result" && !ev.ok) failure = ev;
      },
    });
    if (failure) throw Object.assign(new Error(failure.text || failure.message || "Claude Code failed"), { kind: failure.limit ? "quota" : "server" });
    if (r.exit && r.exit !== 0 && !reply.content) throw new Error(`Claude Code exited with ${r.exit}: ${String(r.stderr || "").trim().slice(-300)}`);
    await require("./health").record(brain.key.id, brain.model || "default", { ok: true }).catch(() => {});
  } catch (e) {
    await require("./health").record(brain.key.id, brain.model || "default", { ok: false, kind: e.kind || "server", error: e.message }).catch(() => {});
    throw e;
  } finally {
    tokens.delete(token);
  }
}

/* ── MCP endpoint (Streamable HTTP, JSON replies) ──────────────────── */
async function mcpHandle(req, res, deps) {
  const auth = String(req.headers.authorization || "");
  const tok = auth.replace(/^Bearer\s+/i, "");
  const t = tokens.get(tok);
  if (!t || t.exp < Date.now()) return res.status(401).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or expired token" } });
  if (req.method !== "POST") return res.status(405).end();
  const msg = req.body || {};
  const reply = (result) => res.json({ jsonrpc: "2.0", id: msg.id, result });
  if (!msg.id && msg.id !== 0) return res.status(202).end(); // notification
  switch (msg.method) {
    case "initialize":
      return reply({ protocolVersion: msg.params?.protocolVersion || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "nexora-hive", version: "1.0.0" } });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: toolDefs().map((d) => ({ name: d.name, description: d.description, inputSchema: d.schema })) });
    case "tools/call": {
      const r = await runTool(String(msg.params?.name || ""), msg.params?.arguments || {}, { ...t, createTask: t.createTask || deps.createTask });
      return reply({ content: [{ type: "text", text: String(r.content) }], isError: !!r.isError });
    }
    default:
      return res.json({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `Unknown method ${msg.method}` } });
  }
}

/** Sessions the Copilot is running or reviewing for this person (last 3 days). */
async function activeWork(username) {
  const rows = await all(
    "SELECT t.id, t.project_id, t.title, t.status, t.pr_url, t.updated_at, w.done FROM hive_copilot_watch w JOIN hive_tasks t ON t.id=w.task_id WHERE w.username=? AND (w.done=0 OR t.updated_at>?) ORDER BY t.updated_at DESC LIMIT 8",
    [username, Date.now() - 3 * 86400e3],
  ).catch(() => []);
  const ids = rows.map((r) => r.id);
  const agents = ids.length ? await all(`SELECT task_id, provider, model, status FROM hive_agents WHERE task_id IN (${ids.map(() => "?").join(",")})`, ids) : [];
  return rows.map((r) => ({ id: r.id, projectId: r.project_id, title: r.title, status: r.status, prUrl: r.pr_url || null, reviewed: !!r.done, updatedAt: Number(r.updated_at), agents: agents.filter((a) => a.task_id === r.id).map((a) => ({ provider: a.provider, model: a.model, status: a.status })) }));
}

async function saveSettings(username, { brain, model, autonomy, canMerge, admin, saveTokens, claudeOnly, brainKey }) {
  const cur = await brainSettings(username);
  const b = ["auto", "claude_code", "api"].includes(brain) ? brain : cur.brain;
  const m = model === undefined ? cur.model : String(model || "").slice(0, 200);
  const au = autonomy === "assist" || autonomy === "autopilot" ? autonomy : cur.autonomy;
  // Only admins can let the Copilot merge (merging can deploy the live site).
  const cm = canMerge === undefined ? cur.canMerge : !!canMerge && !!admin;
  const st = saveTokens === undefined ? cur.saveTokens : !!saveTokens;
  const bk = brainKey === undefined ? cur.brainKey : brainKey ? String(brainKey).slice(0, 64) : null;
  const co = Array.isArray(claudeOnly) ? claudeOnly.map((x) => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 12) : cur.claudeOnly;
  await run(
    "INSERT INTO hive_copilot_settings(username, brain, model, autonomy, can_merge, admin, save_tokens, claude_only, brain_key, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(username) DO UPDATE SET brain=excluded.brain, model=excluded.model, autonomy=excluded.autonomy, can_merge=excluded.can_merge, admin=excluded.admin, save_tokens=excluded.save_tokens, claude_only=excluded.claude_only, brain_key=excluded.brain_key, updated_at=excluded.updated_at",
    [username, b, m, au, cm ? 1 : 0, admin ? 1 : 0, st ? 1 : 0, JSON.stringify(co), bk, now()],
  );
  return brainSettings(username);
}

/** Remember whether this person is an admin (used by background reviews and merges). */
async function noteAdmin(username, admin) {
  await run("INSERT INTO hive_copilot_settings(username, brain, model, admin, updated_at) VALUES(?,?,?,?,?) ON CONFLICT(username) DO UPDATE SET admin=excluded.admin", [username, "auto", "", admin ? 1 : 0, now()]).catch(() => {});
}

/** Which brain would think right now (for the UI). */
async function currentBrain(username) {
  try {
    const b = await pickBrain(username);
    return { provider: b.vendor, model: b.model, kind: b.kind, name: b.name || null, keyId: b.key?.id || null, keyLabel: b.key?.label || null, parent: !!b.parent };
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { checkSession, cheapReviewer, DEFAULT_CLAUDE_ONLY, modelTotals, rescueAgent, rescueTick, activeWork, DANGEROUS, mergeTick, onApproval, noteAdmin, TOOLS, toolDefs, runTool, send, messages, clear, watch, onTask, mcpHandle, brainSettings, saveSettings, currentBrain, specFrom, overview, _tokens: tokens };
