// Hive runtime: runs agents (tool loops against any provider), orchestrates
// teams (a lead delegating parallel sub-tasks to workers), compare and review
// modes, manual assignment, steering, stop, handoffs between keys and
// providers, shared project context and live event + code streaming.
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");
const keys = require("./keys");
const { providerOf } = require("./providers");
const { workspace } = require("./workspace");
const { machineWorkspace } = require("./localws");
const machines = require("./machines");
const checkpoints = require("./checkpoints");
const { getSnapshot } = require("./snapshot");
const { toolsFor, execute } = require("./tools");
const { systemPrompt } = require("./prompts");
const { resolvePlugins, repoMap, modelTier } = require("./plugins");
const vault = require("./vault");
const { pickDefault } = require("./models");
const router = require("./router");
const perf = require("./perf");
const cliMod = require("./providers/cli");
const { cardFor, quality: qualityFor } = require("./catalog");
const caps = require("./caps");
const defaultModelOf = (key, vendor) => key.default_model || pickDefault(json(key.models_json, []), vendor.suggested);

const MAX_AGENTS = Number(process.env.HIVE_MAX_AGENTS || 16);
const MAX_STEPS = Number(process.env.HIVE_MAX_STEPS || 60);
const NAMES = ["Nova", "Atlas", "Orion", "Lyra", "Vega", "Sirius", "Juno", "Rigel", "Quill", "Echo", "Rune", "Kepler", "Ada", "Turing", "Hopper", "Lovelace", "Pixel", "Cosmo", "Iris", "Zephyr"];
const RETRY_DELAY = Number(process.env.HIVE_RETRY_DELAY_MS || 20000);

const running = new Map(); // agentId -> { controller, steer: [], taskId }
const boards = new Map(); // taskId -> Board
const seqs = new Map(); // taskId -> last seq
let slots = 0;

/* ── events ─────────────────────────────────────────────────────────── */
async function nextSeq(taskId) {
  if (!seqs.has(taskId)) {
    const r = await get("SELECT COALESCE(MAX(seq),0) AS s FROM hive_events WHERE task_id=?", [taskId]);
    if (!seqs.has(taskId)) seqs.set(taskId, Number(r?.s || 0));
  }
  const s = seqs.get(taskId) + 1;
  seqs.set(taskId, s);
  return s;
}

async function event(taskId, agentId, kind, data = {}) {
  const ev = { id: newId("ev"), seq: await nextSeq(taskId), task_id: taskId, agent_id: agentId || null, kind, data, created_at: now() };
  await run("INSERT INTO hive_events(id, seq, task_id, agent_id, kind, data_json, created_at) VALUES(?,?,?,?,?,?,?)", [
    ev.id,
    ev.seq,
    taskId,
    ev.agent_id,
    kind,
    JSON.stringify(data),
    ev.created_at,
  ]).catch((e) => console.warn("[hive] event", e.message));
  hub.emitTask(taskId, "event", ev);
  return ev;
}

/* ── project-wide awareness (Team radar) ────────────────────────────── */
// Every running agent on every task, so agents on the same repository know
// what the others are doing even when they work in different tasks.
const activity = new Map(); // agentId -> { projectId, taskId, taskTitle, name, model, provider, doing, files:Set, status }

function radarFor(agentId, projectId) {
  const lines = [];
  for (const [id, a] of activity) {
    if (id === agentId || a.projectId !== projectId || a.status !== "running") continue;
    const files = [...a.files].slice(-6);
    lines.push(`- ${a.name} (${a.model}) on “${a.taskTitle}”: ${a.doing || "starting"}${files.length ? ` · touched ${files.join(", ")}` : ""}`);
  }
  return lines;
}

/** Live view of the whole hive for the dashboard. */
function liveAgents() {
  return [...activity.entries()].map(([id, a]) => ({ id, projectId: a.projectId, taskId: a.taskId, taskTitle: a.taskTitle, name: a.name, model: a.model, provider: a.provider, doing: a.doing, status: a.status, files: [...a.files].slice(-8) }));
}

/* ── shared team board (per task) ───────────────────────────────────── */
class Board {
  constructor(taskId) {
    this.taskId = taskId;
    this.notes = [];
    this.touched = new Map(); // path -> Set(agent name)
    this.members = new Map(); // agent id -> { name, model, title, status }
  }
  join(agent, title) {
    this.members.set(agent.id, { name: agent.name, model: agent.model, title: title || "", status: "running" });
  }
  status(agentId, status) {
    const m = this.members.get(agentId);
    if (m) m.status = status;
  }
  touch(agent, path) {
    if (!this.touched.has(path)) this.touched.set(path, new Set());
    this.touched.get(path).add(agent.name);
    activity.get(agent.id)?.files.add(path);
  }
  conflictNote(agent, path) {
    const others = [...(this.touched.get(path) || [])].filter((n) => n !== agent.name);
    return others.length ? ` Note: ${others.join(", ")} also changed this file — check read_team_board and keep your edits compatible.` : "";
  }
  note(agent, message) {
    this.notes.push({ from: agent.name, message, at: now() });
    if (this.notes.length > 200) this.notes.shift();
    event(this.taskId, agent.id, "note", { message });
  }
  render(agent, projectId) {
    const lines = ["Team on this task:"];
    for (const m of this.members.values()) lines.push(`- ${m.name}${m.name === agent.name ? " (you)" : ""} [${m.status}] ${m.model}${m.title ? ` — ${m.title}` : ""}`);
    const radar = projectId ? radarFor(agent.id, projectId).filter((l) => !l.includes(`“${activity.get(agent.id)?.taskTitle}”`)) : [];
    if (radar.length) lines.push("", "Agents on other tasks in this repository:", ...radar);
    lines.push("", "Files changed on this task:");
    if (!this.touched.size) lines.push("(none yet)");
    for (const [p, who] of this.touched) lines.push(`- ${p}: ${[...who].join(", ")}`);
    lines.push("", "Notes:");
    if (!this.notes.length) lines.push("(none yet)");
    for (const n of this.notes.slice(-40)) lines.push(`- ${n.from}: ${n.message}`);
    return lines.join("\n");
  }
}
const boardOf = (taskId) => boards.get(taskId) || boards.set(taskId, new Board(taskId)).get(taskId);

/* ── helpers ────────────────────────────────────────────────────────── */
/** The repository a task works on: the project's primary one or a linked extra. */
async function effectiveProject(project, task) {
  if (!task?.repo_id || !project) return project;
  const r = await get("SELECT * FROM hive_project_repos WHERE id=? AND project_id=?", [task.repo_id, project.id]);
  return r ? { ...project, github_id: r.github_id, repo_owner: r.repo_owner, repo_name: r.repo_name, default_branch: r.default_branch } : project;
}

async function taskContext(taskId) {
  const task = await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]);
  if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
  const project = await effectiveProject(await get("SELECT * FROM hive_projects WHERE id=?", [task.project_id]), task);
  if (!project) throw new Error("This task's project was deleted");
  const cred = project.github_id ? await get("SELECT * FROM hive_github WHERE id=?", [project.github_id]) : null;
  const token = cred ? vault.open(cred.token_enc) : null;
  // Tasks on a machine work in a real folder (git gives base + changes).
  if (task.machine_id && task.folder) {
    const m = await get("SELECT * FROM hive_machines WHERE id=?", [task.machine_id]);
    if (!m) throw new Error("This task's machine was removed");
    return { task, project, token, snap: null, machine: { id: m.id, name: m.name, policy: m.policy, folder: task.folder } };
  }
  if (!cred) throw new Error("This project's GitHub connection was removed");
  const snap = await getSnapshot(token, project.repo_owner, project.repo_name, task.base_sha);
  return { task, project, token, snap };
}

/** The working copy for a task context (overlay on GitHub, or a machine folder). */
function workspaceOf(ctx, variant = "main") {
  return ctx.machine ? machineWorkspace({ machineId: ctx.machine.id, folder: ctx.machine.folder }) : workspace({ task: ctx.task, variant, snap: ctx.snap });
}

async function setTask(taskId, fields) {
  const cols = Object.keys(fields);
  await run(`UPDATE hive_tasks SET ${cols.map((c) => `${c}=?`).join(", ")}, updated_at=? WHERE id=?`, [...cols.map((c) => fields[c]), now(), taskId]);
  const t = await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]);
  hub.emit("task", t);
  return t;
}

async function setAgent(agentId, fields) {
  const cols = Object.keys(fields);
  await run(`UPDATE hive_agents SET ${cols.map((c) => `${c}=?`).join(", ")} WHERE id=?`, [...cols.map((c) => fields[c]), agentId]);
  const a = await get("SELECT * FROM hive_agents WHERE id=?", [agentId]);
  if (a) {
    hub.emitTask(a.task_id, "agent", a);
    hub.emit("agent", { id: a.id, task_id: a.task_id, name: a.name, provider: a.provider, model: a.model, role: a.role, status: a.status, input_tokens: a.input_tokens, output_tokens: a.output_tokens });
  }
  return a;
}

// Names reserved by agents being created right now (creation runs in
// parallel when a lead delegates, so the database alone can't prevent twins).
const reservedNames = new Map(); // taskId -> Set
async function pickName(taskId, wanted) {
  const used = new Set((await all("SELECT name FROM hive_agents WHERE task_id=?", [taskId])).map((r) => r.name));
  const held = reservedNames.get(taskId) || reservedNames.set(taskId, new Set()).get(taskId);
  for (const n of held) used.add(n);
  let name;
  if (wanted) {
    name = wanted;
    for (let i = 2; used.has(name); i++) name = `${wanted}-${i}`;
  } else {
    name = NAMES.find((n) => !used.has(n)) || `Agent ${used.size + 1}`;
  }
  held.add(name);
  setTimeout(() => held.delete(name), 60_000).unref?.();
  return name;
}

/**
 * Resolve an agent spec { provider (vendor) | 'auto', keyId|'auto', model,
 * effort } to a key row. 'auto' asks the router for the best model for this
 * kind of work; subscription agents (Claude Code, Codex) must be connected on
 * the machine the task runs on.
 */
async function resolveSpec(spec, { prompt = "", machineId = null, kind = null } = {}) {
  if (spec.provider === "auto") {
    let r;
    try {
      r = await router.route({ prompt, kind: spec.kind || kind, needTools: true, machineId, preference: spec.preference || null, freeOnly: !!spec.freeOnly, exclude: { vendors: spec.excludeVendors || [] } });
    } catch (e) {
      // Excluding labs (cross-vendor review) left nothing: allow any lab.
      if (!spec.excludeVendors?.length) throw e;
      r = await router.route({ prompt, kind: spec.kind || kind, needTools: true, machineId, preference: spec.preference || null, freeOnly: !!spec.freeOnly });
    }
    const key = await keys.keyRow(r.pick.keyId);
    return { key, model: r.pick.model, provider: r.pick.provider, effort: spec.effort || null, kind: r.kind, note: r.note, quality: r.pick.quality };
  }
  const vendor = providerOf(spec.provider);
  if (!vendor.caps.tools) throw new Error(`${vendor.label} models can't use tools, so they can only chat — pick another provider for agents`);
  let key;
  if (vendor.needsMachine) {
    const rows = (await all("SELECT * FROM hive_keys WHERE disabled=0")).filter((r) => keys.keyVendor(r) === spec.provider);
    if (!rows.length) throw new Error(`Connect ${vendor.label} first: Keys → Subscription agents`);
    if (!machineId) throw new Error(`${vendor.label} works in a folder on a connected machine — start this session on a machine`);
    key = (spec.keyId && spec.keyId !== "auto" ? rows.find((r) => r.id === spec.keyId) : null) || rows.find((r) => r.machine_id === machineId);
    if (!key || key.machine_id !== machineId) throw new Error(`${vendor.label} isn't connected on this session's machine — connect it there in Keys → Subscription agents`);
    if (!machines.isOnline(machineId)) throw new Error("That machine is offline — start the Hive bridge on it");
  } else {
    key = await keys.pickKey(spec.provider, { prefer: spec.keyId || "auto" });
    if (!key) throw new Error(await keys.explainNoKey(spec.provider));
  }
  const model = spec.model || defaultModelOf(key, vendor);
  if (!model) throw new Error("Choose a model");
  const k = kind || router.classify(prompt).kind;
  return { key, model, provider: spec.provider, effort: spec.effort || null, kind: k, note: null, quality: qualityFor(cardFor(model, spec.provider), k) };
}

async function createAgent(task, { role, spec, instructions, variant = "main", parentId = null, startedBy, name, readOnly = false, title = null, kind = null }) {
  const want = readOnly ? "review" : kind || (spec.provider === "auto" ? null : task.kind) || null;
  const r = await resolveSpec(spec, { prompt: instructions, machineId: task.machine_id || null, kind: want });
  const id = newId("ag");
  await run(
    `INSERT INTO hive_agents(id, task_id, parent_id, role, name, key_id, provider, model, effort, variant, instructions, status, started_by, created_at, title)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, task.id, parentId, readOnly ? "reviewer" : role, await pickName(task.id, name || spec.name), r.key.id, r.provider, r.model, r.effort, variant === "self" ? id : variant, instructions, "queued", startedBy, now(), title],
  );
  await run("UPDATE hive_agents SET routed_kind=?, route_note=? WHERE id=?", [r.kind || null, r.note || null, id]);
  if (r.note) await event(task.id, id, "route", { note: r.note, kind: r.kind, model: r.model, provider: r.provider });
  const a = await get("SELECT * FROM hive_agents WHERE id=?", [id]);
  hub.emitTask(task.id, "agent", a);
  return a;
}

async function attachmentsOf(task) {
  const ids = json(task.attachments_json, []);
  if (!ids.length) return [];
  const rows = await all(`SELECT id, name, mime, data_b64 FROM hive_files WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  return rows.map(fileToAttachment);
}

/** A stored file → a neutral attachment (text files decoded for any model). */
function fileToAttachment(r) {
  const textual = /^(text\/|application\/(json|xml|javascript|x-yaml|x-sh|sql))/.test(r.mime) || /\.(md|txt|js|ts|tsx|jsx|py|go|rs|java|rb|php|cs|c|h|cpp|json|ya?ml|toml|sql|sh|css|html|csv)$/i.test(r.name);
  return { name: r.name, mime: r.mime, data: r.data_b64, text: textual ? Buffer.from(r.data_b64, "base64").toString("utf8").slice(0, 400_000) : null };
}

/** Pull path / content out of a tool call's JSON while it is still streaming. */
function partialField(src, key) {
  const m = new RegExp(`"${key}"\\s*:\\s*"`).exec(src);
  if (!m) return null;
  let out = "";
  for (let i = m.index + m[0].length; i < src.length; i++) {
    const c = src[i];
    if (c === '"') return out;
    if (c === "\\") {
      const n = src[i + 1];
      if (n === undefined) break;
      if (n === "u") {
        const hex = src.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
      } else {
        out += { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" }[n] ?? n;
        i++;
      }
    } else out += c;
  }
  return out;
}

/* ── the agent loop ─────────────────────────────────────────────────── */
async function runAgent(agentId, { team = [], delegateFn = null, readOnly = false, title = "" } = {}) {
  let agent = await get("SELECT * FROM hive_agents WHERE id=?", [agentId]);
  const ctx = await taskContext(agent.task_id);
  const { task, project, snap } = ctx;
  const plugins = (await resolvePlugins(project.id)).builtins;
  const custom = (await resolvePlugins(project.id)).custom.filter((c) => c.enabled && (c.config.appliesTo || "all") !== "chat");
  const on = (id) => !!plugins[id]?.enabled;
  const controller = new AbortController();
  const state = { controller, steer: [], taskId: task.id };
  running.set(agentId, state);
  const board = boardOf(task.id);
  board.join(agent, title || agent.title);
  activity.set(agentId, { projectId: project.id, taskId: task.id, taskTitle: task.title, name: agent.name, model: agent.model, provider: agent.provider, doing: "", files: new Set(), status: "running" });
  hub.emit("radar", liveAgents());

  // Global concurrency cap.
  while (slots >= MAX_AGENTS) {
    if (controller.signal.aborted) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  slots++;
  agent = await setAgent(agentId, { status: "running", started_at: now() });
  await event(task.id, agentId, "status", { status: "running", model: agent.model, provider: agent.provider });

  const ws = workspaceOf(ctx, agent.variant);
  const tools = toolsFor(agent.role === "lead" ? "lead" : "solo", { readOnly, memory: on("shared_memory"), web: on("web_reader"), machine: !!ctx.machine, commands: ctx.machine?.policy !== "read" });
  // Commands on a machine: its policy decides whether a human approves each one.
  const approve = async ({ command, kind }) => {
    const m = await get("SELECT policy, name FROM hive_machines WHERE id=?", [ctx.machine.id]);
    if (!m || m.policy === "read") return { approved: false, reason: "This machine is read-only" };
    if (m.policy === "auto") return { approved: true };
    await event(task.id, agentId, "approval", { command, kind, machine: m.name });
    const r = await machines.requestApproval({ taskId: task.id, agentId, agent: agent.name, projectId: project.id, command, kind, machine: m.name, folder: ctx.machine.folder });
    await event(task.id, agentId, "approval_result", { command, approved: r.approved, by: r.by || null, reason: r.reason || null });
    return r;
  };

  // Shared context, in the stable system prompt (cache-friendly).
  const extras = [];
  if (on("shared_memory")) {
    const mem = await all("SELECT title, body, author FROM hive_memory WHERE project_id=? ORDER BY pinned DESC, created_at DESC LIMIT ?", [project.id, Number(plugins.shared_memory.config.maxItems) || 30]);
    if (mem.length) extras.push(`Project memory (shared by the whole team — trust it, add to it with remember):\n${mem.map((m) => `- ${m.title}: ${m.body}`).join("\n")}`);
  }
  if (on("repo_map")) {
    const paths = ctx.machine ? await ws.listPaths().catch(() => []) : (await snap.treeReady, [...snap.entries.keys()]);
    extras.push(repoMap(paths, Number(plugins.repo_map.config.maxEntries) || 400));
  }
  if (on("lean_reads")) extras.push("Token discipline: search before reading; read files in windows (offset/limit) rather than whole; don't re-read files you already have.");
  if (on("terse")) extras.push("Be terse: one short sentence before tool calls at most, no recaps. Your final summary may be a few bullet points.");
  for (const c of custom) if (c.config.instructions) extras.push(`${c.name}:\n${String(c.config.instructions).slice(0, 6000)}`);
  const system = systemPrompt({ project, task, agent, role: agent.role, readOnly, team, extras });

  const attachments = !agent.parent_id && agent.role !== "reviewer" ? await attachmentsOf(task) : [];
  const messages = [{ role: "user", text: agent.instructions, attachments }];
  let finished = null;
  let lastText = "";
  let keyRow = await keys.keyRow(agent.key_id);
  const triedKeys = [];
  let step = 0;
  let status = "done";
  let error = null;
  let lastRadar = "";
  let warnedBudget = false;

  // Batched token + live-code streaming to the browser.
  let buf = "";
  let thinkBuf = "";
  let code = null;
  let flushTimer = null;
  const flush = () => {
    flushTimer = null;
    if (buf) hub.emitTask(task.id, "delta", { agentId, text: buf }), (buf = "");
    if (thinkBuf) hub.emitTask(task.id, "thinking", { agentId, text: thinkBuf }), (thinkBuf = "");
    if (code) hub.emitTask(task.id, "code", { agentId, ...code }), (code = null);
  };
  const schedule = () => (flushTimer ||= setTimeout(flush, 80));

  /**
   * Hand the agent to another key: the same model on another key first, then
   * (Never stop) the best model for the SAME kind of work, free first.
   */
  const handoff = async (reason) => {
    if (keyRow) triedKeys.push(keyRow.id);
    const sameVendor = providerOf(agent.provider);
    let next = sameVendor.subscription ? null : await keys.pickKey(agent.provider, { exclude: triedKeys });
    let swap = null;
    if (!next && on("never_stop")) {
      const c = await router
        .continuation({ kind: agent.routed_kind || task.kind || "coding", from: { provider: agent.provider, model: agent.model }, machineId: ctx.machine?.id || null, excludeKeys: triedKeys })
        .catch(() => null);
      if (c) {
        next = await keys.keyRow(c.keyId);
        swap = c;
      }
    }
    if (!next) return false;
    const fields = { key_id: next.id, handoffs: (agent.handoffs || 0) + 1 };
    if (swap) Object.assign(fields, { provider: swap.provider, model: swap.model, effort: null, route_note: `Continued on ${swap.name} after a limit · ${swap.note}` });
    await event(task.id, agentId, "handoff", { reason, from: { key: keyRow?.label, provider: agent.provider, model: agent.model }, to: { key: next.label, provider: fields.provider || agent.provider, model: fields.model || agent.model }, note: swap?.note || null });
    keyRow = next;
    agent = await setAgent(agentId, fields);
    const a = activity.get(agentId);
    if (a) Object.assign(a, { model: agent.model, provider: agent.provider });
    return true;
  };

  /**
   * Claude Code / Codex: the CLI runs its own agent loop on the machine; we
   * stream its events into the session. Steering interrupts the run and
   * resumes the same CLI session with the message.
   */
  const runCliLoop = async () => {
    const v = providerOf(agent.provider);
    if (!ctx.machine) throw new Error(`${v.label} works in a folder on a connected machine — start this session on a machine`);
    if (keyRow.machine_id && keyRow.machine_id !== ctx.machine.id) throw new Error(`${v.label} is connected on another machine — start the session there`);
    const mrow = await get("SELECT policy FROM hive_machines WHERE id=?", [ctx.machine.id]);
    const policy = readOnly ? "read" : mrow?.policy || "ask";
    let session = agent.cli_session || null;
    let prompt = agent.instructions;
    let steps = 0;
    let text = "";
    for (let round = 0; round < 30; round++) {
      if (controller.signal.aborted) throw Object.assign(new Error("Stopped"), { kind: "aborted" });
      const capOk = await caps.check({ projectId: project.id, vendor: agent.provider, model: agent.model, username: agent.started_by });
      if (!capOk.ok) throw Object.assign(new Error(capOk.reason), { kind: "limit" });
      const roundCtl = new AbortController();
      const onAbort = () => roundCtl.abort();
      controller.signal.addEventListener("abort", onAbort, { once: true });
      state.interrupt = () => roundCtl.abort();
      const { args, input, hook } = cliMod.buildArgs({ cli: v.cli, model: agent.model, system, prompt, policy, resume: session });
      let result = null;
      let failure = null;
      let limit = null;
      const usage = { input: 0, output: 0, cacheRead: 0 };
      let announced = false;
      const r = await cliMod.stream({
        machineId: ctx.machine.id,
        folder: ctx.machine.folder,
        cli: v.cli,
        args,
        input,
        env: cliMod.envFor(agent.provider, keys.secretOf(keyRow)),
        hook,
        signal: roundCtl.signal,
        approve: ({ command }) => approve({ command, kind: "command" }),
        onEvent: async (ev) => {
          switch (ev.kind) {
            case "session":
              if (ev.id && ev.id !== session) {
                session = ev.id;
                await setAgent(agentId, { cli_session: session });
              }
              if (!announced && (ev.model || ev.permissionMode)) {
                announced = true;
                await event(task.id, agentId, "system", { message: `${v.label}${ev.model ? ` · ${ev.model}` : ""} · ${policy === "ask" ? "commands need approval" : policy === "auto" ? "autonomous" : "read-only"}` });
              }
              break;
            case "delta":
              buf += ev.text;
              schedule();
              break;
            case "thinking":
              thinkBuf += ev.text;
              schedule();
              break;
            case "text":
              flush();
              text = ev.text;
              lastText = ev.text;
              await event(task.id, agentId, "text", { text: ev.text, step: steps });
              break;
            case "tool_call": {
              flush();
              steps++;
              const a = activity.get(agentId);
              if (a) a.doing = describe(ev.name, ev.input);
              await event(task.id, agentId, "tool_call", { id: ev.id, name: ev.name, input: summarizeInput(ev.name, ev.input || {}) });
              hub.emit("radar", liveAgents());
              break;
            }
            case "tool_result":
              await event(task.id, agentId, "tool_result", {
                id: ev.id,
                name: ev.name,
                isError: !!ev.isError,
                preview: String(ev.content || "").slice(0, ev.name === "run_command" ? 8000 : 2500),
                meta: ev.write ? { path: ev.path, write: true } : ev.name === "run_command" ? { exit: ev.exit ?? null } : null,
              });
              if (ev.write) {
                if (ev.path) activity.get(agentId)?.files.add(ev.path);
                hub.emitTask(task.id, "changes", { variant: agent.variant });
                hub.emitTask(task.id, "code_done", { agentId, path: ev.path });
              }
              break;
            case "plan":
              await event(task.id, agentId, "system", { message: `Plan: ${ev.items.map((x) => `${x.done ? "✓" : "○"} ${x.text}`).join(" · ")}`.slice(0, 2000) });
              break;
            case "system":
              await event(task.id, agentId, "system", { message: ev.message });
              break;
            case "plan_usage":
              await keys.setPlanUsage(keyRow.id, ev.info).catch(() => {});
              break;
            case "limit":
              limit = ev;
              break;
            case "turn_done":
              usage.input += ev.usage.input;
              usage.output += ev.usage.output;
              usage.cacheRead += ev.usage.cacheRead;
              break;
            case "result":
              result = ev;
              if (ev.usage) Object.assign(usage, ev.usage);
              if (!ev.ok) failure = ev;
              break;
            case "fail":
              failure = ev;
              break;
            default:
              break;
          }
        },
      }).finally(() => {
        controller.signal.removeEventListener("abort", onAbort);
        state.interrupt = null;
      });
      flush();
      step = steps;
      if (usage.input || usage.output) {
        await keys.recordUsage(keyRow.id, agent.started_by, { ...usage, costMicros: 0 }, null, { projectId: project.id, vendor: agent.provider, model: agent.model });
        agent = await setAgent(agentId, { steps, input_tokens: agent.input_tokens + usage.input, output_tokens: agent.output_tokens + usage.output });
        hub.emit("usage", { keyId: keyRow.id });
      }
      if (controller.signal.aborted) throw Object.assign(new Error("Stopped"), { kind: "aborted" });
      // Interrupted to take a steering message: continue the same CLI session.
      if (r.stopped && state.steer.length) {
        const msgs = state.steer.splice(0).map((m) => `Message from @${m.username} (a human on the team): ${m.message}`);
        prompt = session ? msgs.join("\n\n") : `${agent.instructions}\n\n${msgs.join("\n\n")}`;
        await event(task.id, agentId, "system", { message: `${v.label} picked up the message and continues` });
        continue;
      }
      if (limit || failure?.limit) throw Object.assign(new Error(limit?.message || failure?.text || failure?.message || `${v.label} hit its plan limit`), { kind: "limit" });
      if (failure) throw new Error(`${v.label}: ${String(failure.text || failure.message || "failed").slice(0, 600)}`);
      if (!result && r.exit && r.exit !== 0) {
        const err = String(r.stderr || "").trim().slice(-600);
        throw Object.assign(new Error(`${v.label} exited (${r.exit})${err ? `: ${err}` : ""}`), { kind: /login|logged in|auth|credential|token/i.test(err) ? "auth" : "server" });
      }
      return result?.text || text || "Done";
    }
    return text || "Done";
  };

  try {
    let viaCli = providerOf(agent.provider).impl === "cli";
    if (viaCli) {
      try {
        finished = await runCliLoop();
      } catch (e) {
        // Plan limit reached (or the CLI broke): keep the work going on the
        // best API model for the same kind of job, in the same folder.
        if (e.kind === "aborted" || !on("never_stop") || !["limit", "auth", "server"].includes(e.kind)) throw e;
        const label = providerOf(agent.provider).label;
        if (!(await handoff(`${label}: ${e.message}`))) throw e;
        viaCli = false;
        messages.push({
          role: "user",
          text: `You are taking over from ${label}, which stopped (${e.message}). Its edits are already in the working folder — check view_changes (and run git status) before continuing.${lastText ? `\n\nIts last report:\n${String(lastText).slice(0, 4000)}` : ""}`,
        });
      }
    }
    while (!viaCli && step < MAX_STEPS && !finished) {
      if (controller.signal.aborted) throw Object.assign(new Error("Stopped"), { kind: "aborted" });
      while (state.steer.length) {
        const s = state.steer.shift();
        messages.push({ role: "user", text: `Message from @${s.username} (a human on the team): ${s.message}` });
      }
      // Team radar: tell the agent when the rest of the hive changed.
      if (on("team_radar") && step > 0) {
        const radar = radarFor(agentId, project.id);
        const digest = radar.join("\n");
        if (digest && digest !== lastRadar && step % 2 === 0) {
          messages.push({ role: "user", text: `[Team radar — other agents on this repository right now]\n${digest}\n(Avoid editing files they are working on; coordinate with team_note.)` });
          lastRadar = digest;
        }
      }
      // Budget guard.
      if (on("budget_guard")) {
        const cap = Number(task.budget_tokens || plugins.budget_guard.config.maxTokensPerTask) || 0;
        if (cap) {
          const used = Number((await get("SELECT COALESCE(SUM(input_tokens+output_tokens),0) AS t FROM hive_agents WHERE task_id=?", [task.id]))?.t || 0);
          if (used >= cap) throw new Error(`Task token budget reached (${used.toLocaleString()} of ${cap.toLocaleString()})`);
          if (!warnedBudget && used >= cap * 0.85) {
            warnedBudget = true;
            messages.push({ role: "user", text: "Budget notice: this task has used 85% of its token budget. Finish the most important remaining work now and call finish." });
          }
        }
      }
      // Key budget → handoff.
      if (!keyRow || !(await keys.hasBudget(keyRow))) {
        if (!(await handoff(`${keyRow?.label || "The key"} reached its token limit`))) {
          throw new Error(`Token limit reached on ${keyRow?.label || "the key"} and no other key has budget — add a key or raise a limit, then use “Continue with…”`);
        }
      }
      const capOk = await caps.check({ projectId: project.id, vendor: agent.provider, model: agent.model, username: agent.started_by });
      if (!capOk.ok) {
        // A capped model/provider: move the work elsewhere if allowed, else stop.
        if (!(await handoff(capOk.reason))) throw new Error(capOk.reason);
        continue;
      }
      const release = await keys.acquire(keyRow, controller.signal);
      let res;
      const p = providerOf(agent.provider);
      try {
        hub.emitTask(task.id, "turn", { agentId, step: step + 1 });
        res = await p.impl.turn({
          secret: keys.secretOf(keyRow),
          baseUrl: keyRow.base_url || p.baseUrl,
          official: !!p.official,
          vision: !!p.caps.vision,
          model: agent.model,
          effort: agent.effort,
          system,
          messages,
          tools,
          signal: controller.signal,
          cache: on("prompt_cache"),
          trimAt: on("context_trim") ? Number(plugins.context_trim.config.triggerTokens) || 120000 : null,
          onText: (d) => ((buf += d), schedule()),
          onThinking: (d) => ((thinkBuf += d), schedule()),
          onToolInput: (b) => {
            if (!["write_file", "edit_file"].includes(b.name)) return;
            const path = partialField(b.json, "path");
            const text = b.name === "write_file" ? partialField(b.json, "content") : partialField(b.json, "new_string");
            if (path && text != null) {
              code = { tool: b.name, path, text: text.slice(-60000), old: b.name === "edit_file" ? (partialField(b.json, "old_string") || "").slice(0, 4000) : null };
              schedule();
            }
          },
        });
      } catch (e) {
        release();
        flush();
        if (e.kind === "aborted" || controller.signal.aborted) throw Object.assign(new Error("Stopped"), { kind: "aborted" });
        if (["auth", "quota", "rate"].includes(e.kind)) {
          if (e.kind === "auth") await run("UPDATE hive_keys SET status='invalid', status_detail=? WHERE id=?", [String(e.message).slice(0, 300), keyRow.id]);
          if (await handoff(`${keyRow.label}: ${e.message}`)) continue;
          if (e.kind === "rate") {
            triedKeys.pop();
            await event(task.id, agentId, "system", { message: `Rate limited (${e.message}); retrying in ${Math.round(RETRY_DELAY / 1000)}s` });
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
            continue;
          }
        }
        if (e.retryable && !state.retried) {
          state.retried = true;
          await event(task.id, agentId, "system", { message: `${e.message} — retrying` });
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw e;
      }
      release();
      state.retried = false;
      flush();
      step++;
      await keys.recordUsage(keyRow.id, agent.started_by, { input: res.usage.input, output: res.usage.output, cacheRead: res.usage.cacheRead || 0, costMicros: res.costMicros || 0 }, res.rateLimit, { projectId: project.id, vendor: agent.provider, model: agent.model });
      agent = await setAgent(agentId, {
        steps: step,
        input_tokens: agent.input_tokens + res.usage.input,
        output_tokens: agent.output_tokens + res.usage.output,
        cost_micros: agent.cost_micros + (res.costMicros || 0),
      });
      hub.emit("usage", { keyId: keyRow.id });
      if (res.servedModel && res.servedModel !== agent.model) await event(task.id, agentId, "system", { message: `Served by ${res.servedModel} (fallback)` });
      if (res.text) {
        lastText = res.text;
        await event(task.id, agentId, "text", { text: res.text, step });
      }
      messages.push({ role: "assistant", text: res.text, toolCalls: res.toolCalls, raw: res.raw });

      if (res.stop === "refusal") throw new Error("The model declined this request");
      if (res.stop === "max_tokens") {
        messages.push({ role: "tool", results: res.toolCalls.map((c) => ({ id: c.id, name: c.name, content: "Your output was cut off (too long). Split large writes into several edit_file calls.", isError: true })) });
        continue;
      }
      if (res.stop !== "tool") break;

      // Run this turn's tool calls concurrently; return all results together.
      const results = await Promise.all(
        res.toolCalls.map(async (call) => {
          const a = activity.get(agentId);
          if (a) a.doing = describe(call.name, call.input);
          await event(task.id, agentId, "tool_call", { id: call.id, name: call.name, input: summarizeInput(call.name, call.input) });
          const out = call.invalid
            ? { content: `Your arguments were not valid JSON: ${call.rawArgs}`, isError: true }
            : await execute(call.name, call.input, {
                ws,
                agent,
                board: { ...boardProxy(board, project.id) },
                maxLines: on("lean_reads") ? Number(plugins.lean_reads.config.maxLines) || 400 : 2000,
                remember: on("shared_memory") ? (t, n) => remember(project.id, t, n, `agent:${agent.name}`) : null,
                delegateFn: agent.role === "lead" ? delegateFn : null,
                taskId: task.id,
                approve: ctx.machine ? approve : null,
                onFinish: (summary) => (finished = summary || lastText || "Done"),
              });
          await event(task.id, agentId, "tool_result", {
            id: call.id,
            name: call.name,
            isError: !!out.isError,
            preview: String(out.content).slice(0, ["run_command", "server_logs", "start_server", "fetch_local", "view_changes"].includes(call.name) ? 8000 : 2500),
            meta: out.meta || null,
          });
          if (out.meta?.write) {
            hub.emitTask(task.id, "changes", { variant: agent.variant });
            hub.emitTask(task.id, "code_done", { agentId, path: out.meta.path });
          }
          return { id: call.id, name: call.name, content: String(out.content), isError: !!out.isError };
        }),
      );
      messages.push({ role: "tool", results });
      hub.emit("radar", liveAgents());
      // Non-Claude providers: trim old tool output to stay within context.
      if (agent.provider !== "anthropic" && on("context_trim")) elide(messages);
    }
    if (!finished && step >= MAX_STEPS) finished = `${lastText}\n\n(Stopped after ${MAX_STEPS} steps.)`.trim();
  } catch (e) {
    flush();
    if (e.kind === "aborted") status = "stopped";
    else {
      status = "failed";
      error = e.message;
      await event(task.id, agentId, "error", { message: e.message });
    }
  } finally {
    clearTimeout(flushTimer);
    slots--;
    running.delete(agentId);
    activity.delete(agentId);
    hub.emit("radar", liveAgents());
  }
  const result = finished || lastText || null;
  board.status(agentId, status);
  agent = await setAgent(agentId, { status, result, error, finished_at: now() });
  await event(task.id, agentId, "status", { status, summary: result ? result.slice(0, 4000) : null, error });
  const kind = agent.role === "reviewer" ? "review" : agent.routed_kind || task.kind || "coding";
  if (status !== "stopped") {
    await perf
      .recordRun({ vendor: agent.provider, model: agent.model, kind, ok: status === "done", tokens: agent.input_tokens + agent.output_tokens, steps: agent.steps, ms: Date.now() - Number(agent.started_at || Date.now()) })
      .catch(() => {});
  }
  // A routed agent that failed is retried once or twice on a stronger model,
  // with what went wrong — so a cheap first attempt never costs the task.
  if (status === "failed" && !agent.parent_id && on("escalation") && Number(agent.escalations || 0) < 2 && !/budget|cap reached|Stopped/i.test(error || "")) {
    const from = { provider: agent.provider, model: agent.model, quality: qualityFor(cardFor(agent.model, agent.provider), kind) };
    const next = await router.escalate({ kind, from, machineId: ctx.machine?.id || null }).catch(() => null);
    if (next) {
      await event(task.id, agentId, "handoff", { reason: `${agent.name} couldn't finish — escalating to a stronger model`, from: { provider: agent.provider, model: agent.model }, to: { provider: next.provider, model: next.model }, note: `${next.name} · fit ${next.quality}/100` });
      const a = await addAgent(task.id, {
        spec: { provider: next.provider, keyId: next.keyId, model: next.model },
        prompt: `A previous attempt by ${agent.name} (${agent.model}) failed with: ${String(error || "unknown error").slice(0, 1500)}\n\nComplete the original request. Its partial edits (if any) are in the working copy — check view_changes first.`,
        username: agent.started_by,
        readOnly,
        variant: agent.variant,
        title: `Escalated from ${agent.name}`,
        kind,
      }).catch(() => null);
      if (a) await setAgent(a.id, { escalations: Number(agent.escalations || 0) + 1 });
    }
  }
  // Every agent's result is a restore point.
  if (!readOnly) {
    const head = String(result || error || status).split("\n")[0].slice(0, 120);
    await checkpoints.create(ctx, { variant: agent.variant, label: `${agent.name} · ${agent.model} — ${head}`, agentId, auto: true }).catch(() => null);
  }
  return agent;
}

const boardProxy = (board, projectId) => ({
  touch: (a, p) => board.touch(a, p),
  conflictNote: (a, p) => board.conflictNote(a, p),
  note: (a, m) => board.note(a, m),
  render: (a) => board.render(a, projectId),
});

function describe(name, input = {}) {
  const p = input.path ? ` ${input.path}` : "";
  switch (name) {
    case "write_file":
      return `writing${p}`;
    case "edit_file":
      return `editing${p}`;
    case "read_file":
      return `reading${p}`;
    case "search":
      return `searching “${String(input.query || "").slice(0, 40)}”`;
    case "delegate":
      return "delegating sub-tasks";
    case "finish":
      return "finishing";
    default:
      return name.replace(/_/g, " ");
  }
}

async function remember(projectId, title, body, author) {
  const id = newId("mem");
  await run("INSERT INTO hive_memory(id, project_id, title, body, author, created_at) VALUES(?,?,?,?,?,?)", [id, projectId, title, body, author, now()]);
  hub.emit("memory", { projectId });
}

function summarizeInput(name, input) {
  if (!input || typeof input !== "object") return input;
  const out = { ...input };
  // Kept generous so the transcript can show real diffs and file previews.
  if (typeof out.content === "string" && out.content.length > 6000) out.content = `${out.content.slice(0, 6000)}\n… (${out.content.length} chars)`;
  for (const k of ["old_string", "new_string"]) if (typeof out[k] === "string" && out[k].length > 4000) out[k] = `${out[k].slice(0, 4000)}…`;
  if (name === "delegate" && Array.isArray(out.tasks)) out.tasks = out.tasks.map((t) => ({ title: t.title, agent: t.agent, files: t.files, difficulty: t.difficulty, instructions: String(t.instructions || "").slice(0, 300) }));
  return out;
}

function elide(messages) {
  let size = 0;
  for (const m of messages) size += m.role === "tool" ? m.results.reduce((s, r) => s + r.content.length, 0) : (m.text || "").length;
  if (size < 400_000) return;
  for (const m of messages.slice(0, -6)) {
    if (m.role !== "tool") continue;
    for (const r of m.results) if (r.content.length > 600) r.content = `${r.content.slice(0, 300)}\n… [older output trimmed to save context]`;
  }
}

/* ── task orchestration ─────────────────────────────────────────────── */
const reviewed = new Set();
const judged = new Set();

async function finishTask(taskId) {
  const tops = await all("SELECT status, result FROM hive_agents WHERE task_id=? AND parent_id IS NULL", [taskId]);
  if (tops.some((a) => a.status === "running" || a.status === "queued")) return;
  const anyOk = tops.some((a) => a.status === "done");
  const summary = tops.map((a) => a.result).filter(Boolean).pop() || null;
  const task = await setTask(taskId, { status: anyOk ? "review" : tops.every((a) => a.status === "stopped") ? "stopped" : "failed", summary });
  // Compare mode: the Judge ranks the attempts and adopts the best one.
  if (anyOk && task.mode === "compare" && !judged.has(taskId)) {
    const plugins = (await resolvePlugins(task.project_id)).builtins;
    if (plugins.judge?.enabled) {
      judged.add(taskId);
      require("./judge")
        .judgeTask(taskId, { adopt: plugins.judge.config?.autoAdopt !== false })
        .catch((e) => event(taskId, null, "system", { message: `The Judge couldn't decide: ${e.message}` }));
    }
  }
  // Auto review plugin: one read-only reviewer per finished task.
  if (anyOk && !reviewed.has(taskId)) {
    const plugins = (await resolvePlugins(task.project_id)).builtins;
    const changes = await all("SELECT COUNT(*) AS n FROM hive_changes WHERE task_id=? AND variant='main'", [taskId]);
    if (plugins.auto_review?.enabled && Number(changes[0]?.n) > 0) {
      reviewed.add(taskId);
      const cfg = plugins.auto_review.config || {};
      let spec = cfg.provider ? { provider: cfg.provider, model: cfg.model || undefined, keyId: "auto", name: "reviewer" } : null;
      let note = "";
      if (!spec) {
        // Cross-vendor review: a different lab than the authors checks the work.
        const authors = [...new Set((await all("SELECT provider FROM hive_agents WHERE task_id=? AND role <> 'reviewer'", [taskId])).map((r) => r.provider))];
        const r = await router.reviewer({ authors, machineId: task.machine_id || null }).catch(() => null);
        if (r) {
          spec = { provider: r.provider, keyId: r.keyId, model: r.model };
          note = r.crossVendor ? ` (${r.name}, a different lab than the authors)` : ` (${r.name})`;
        } else spec = await cheapestSpec();
      }
      if (spec) await event(taskId, null, "system", { message: `Auto review starting${note}` });
      if (spec) {
        await addAgent(taskId, {
          spec: { ...spec, name: "reviewer" },
          prompt: "Review this task's changes (view_changes). Report bugs, risky edge cases, missing error handling and inconsistencies with the codebase, most important first, with file:line references. Say clearly if it looks ready to commit.",
          username: "auto-review",
          readOnly: true,
        }).catch((e) => event(taskId, null, "system", { message: `Auto review couldn't start: ${e.message}` }));
      }
    }
  }
}

/** The cheapest model among keys with budget (for reviewers / easy work). */
async function cheapestSpec() {
  const rows = await all("SELECT * FROM hive_keys WHERE disabled=0 AND status<>'invalid'");
  let best = null;
  for (const r of rows) {
    if (!(await keys.hasBudget(r))) continue;
    const vendor = keys.keyVendor(r);
    let v;
    try {
      v = providerOf(vendor);
    } catch {
      continue;
    }
    if (!v.caps.tools || v.subscription) continue;
    const models = json(r.models_json, []);
    const model = [...models].sort((a, b) => modelTier(a) - modelTier(b))[0] || r.default_model;
    if (!model) continue;
    const tier = modelTier(model);
    if (!best || tier < best.tier) best = { tier, spec: { provider: vendor, keyId: r.id, model } };
  }
  return best?.spec || null;
}

/**
 * Start a task. specs: agent specs. mode: solo | team | compare | review.
 * lead: spec for the team lead.
 */
async function startTask(task, { mode, specs, lead, username }) {
  if (!task.kind) task = await setTask(task.id, { kind: router.classify(task.prompt).kind });
  await setTask(task.id, { status: "running" });
  await event(task.id, null, "system", { message: `@${username} started a ${mode} task`, mode });
  const launches = [];
  try {
    if (mode === "team") {
      const pool = specs.length ? specs : [lead];
      const plugins = (await resolvePlugins(task.project_id)).builtins;
      const leadAgent = await createAgent(task, { role: "lead", spec: lead || pool[0], instructions: task.prompt, startedBy: username, title: "Lead" });
      const poolAgents = [];
      for (const s of pool) {
        const r = await resolveSpec(s).catch(() => null);
        if (r) poolAgents.push({ spec: s, model: r.model, key: r.key, tier: modelTier(r.model) });
      }
      const team = poolAgents.map((p, i) => ({ name: p.spec.name || `worker-${i + 1}`, model: p.model, note: `${providerOf(p.spec.provider).label}${plugins.smart_router?.enabled ? `, ${["cheap", "balanced", "strong"][p.tier]}` : ""}` }));
      let delegations = 0;
      const delegateFn = async (subtasks) => {
        if (++delegations > 4) return "Delegation limit reached for this task — finish the remaining work yourself.";
        await event(task.id, leadAgent.id, "system", { message: `Delegating ${subtasks.length} sub-task${subtasks.length === 1 ? "" : "s"} in parallel` });
        const used = new Map();
        const choose = (st) => {
          let p = st.agent && poolAgents.find((x) => (x.spec.name || "").toLowerCase() === String(st.agent).toLowerCase());
          if (!p && plugins.smart_router?.enabled && st.difficulty) {
            const want = { easy: 0, normal: 1, hard: 2 }[st.difficulty] ?? 1;
            p = [...poolAgents].sort((a, b) => Math.abs(a.tier - want) - Math.abs(b.tier - want) || (used.get(a) || 0) - (used.get(b) || 0))[0];
          }
          // Least-used pool member first, so work spreads across keys.
          if (!p) p = [...poolAgents].sort((a, b) => (used.get(a) || 0) - (used.get(b) || 0))[0] || { spec: lead || pool[0] };
          used.set(p, (used.get(p) || 0) + 1);
          return p;
        };
        const workers = await Promise.all(
          subtasks.map(async (st, i) => {
            const p = choose(st);
            const instructions = [
              `Overall goal (from the lead): ${task.prompt}`,
              "",
              `Your sub-task: ${st.title}`,
              st.instructions,
              st.files?.length ? `\nYou own: ${st.files.join(", ")}` : "",
              `\nOther sub-tasks running in parallel: ${subtasks.filter((_, j) => j !== i).map((x) => x.title).join("; ") || "none"}.`,
            ].join("\n");
            const w = await createAgent(task, { role: "worker", spec: p.spec, instructions, parentId: leadAgent.id, startedBy: username, title: st.title });
            return { st, w };
          }),
        );
        const done = await Promise.all(workers.map(({ st, w }) => runAgent(w.id, { team, title: st.title }).catch((e) => ({ ...w, status: "failed", error: e.message }))));
        const parts = [];
        for (let i = 0; i < done.length; i++) {
          const a = done[i];
          parts.push(`## ${workers[i].st.title} — ${a.name} (${a.model}) [${a.status}]\n${a.error ? `Error: ${a.error}\n` : ""}${a.result || "(no report)"}`);
        }
        parts.push("\nReview the combined result with view_changes before you finish.");
        return parts.join("\n\n");
      };
      launches.push(runAgent(leadAgent.id, { team, delegateFn, title: "Lead" }));
    } else if (mode === "compare") {
      for (const s of specs) {
        const a = await createAgent(task, { role: "solo", spec: s, instructions: task.prompt, variant: "self", startedBy: username, title: "Compare" });
        launches.push(runAgent(a.id, { title: "Compare" }));
      }
    } else if (mode === "review") {
      for (const s of specs) {
        const a = await createAgent(task, { role: "solo", spec: s, instructions: task.prompt, startedBy: username, readOnly: true, title: "Review" });
        launches.push(runAgent(a.id, { readOnly: true, title: "Review" }));
      }
    } else {
      // Solo, or several agents sharing the same instructions on one copy.
      for (const s of specs) {
        const a = await createAgent(task, { role: "solo", spec: s, instructions: task.prompt, startedBy: username });
        launches.push(runAgent(a.id, { title: specs.length > 1 ? "Together" : "Solo" }));
      }
    }
  } catch (e) {
    await event(task.id, null, "error", { message: e.message });
    await setTask(task.id, { status: "failed" });
    throw e;
  }
  Promise.allSettled(launches).then(() => finishTask(task.id));
}

/** Context for an agent joining an existing task. */
async function joinBrief(taskId, variant = "main") {
  const ctx = await taskContext(taskId);
  const { task } = ctx;
  const ws = workspaceOf(ctx, variant);
  const changes = await ws.changes();
  const prior = task.summary ? `\n\nEarlier work on this task:\n${task.summary.slice(0, 3000)}` : "";
  const files = changes.length ? `\n\nFiles changed so far: ${changes.map((c) => `${c.path} (${c.status}, +${c.additions} -${c.deletions})`).join(", ")}` : "";
  // Everyone who has worked on this task, what they were asked and what they reported.
  const team = await all("SELECT name, model, provider, status, title, result, error FROM hive_agents WHERE task_id=? ORDER BY created_at", [taskId]);
  const roster = team.length
    ? `\n\nAgents on this task so far (you can see their edits in view_changes and their notes with read_team_board):\n${team
        .map((a) => `- ${a.name} (${a.model}) [${a.status}]${a.title ? ` — ${a.title}` : ""}: ${String(a.result || a.error || "working…").replace(/\s+/g, " ").slice(0, 400)}`)
        .join("\n")}`
    : "";
  return { task, text: `Task: ${task.title}\nOriginal request: ${task.prompt}${prior}${roster}${files}` };
}

/** Add an agent to an existing task (follow-up, extra helper or reviewer). */
async function addAgent(taskId, { spec, prompt, username, readOnly = false, variant = "main", title = null, kind = null }) {
  const { task, text } = await joinBrief(taskId, variant);
  if (!readOnly) {
    const ctx = await taskContext(taskId).catch(() => null);
    if (ctx) await checkpoints.create(ctx, { variant, label: `Before ${title || "another agent"} joined`, by: username, auto: true }).catch(() => null);
  }
  const instructions = `${text}\n\nNew request from @${username}:\n${prompt}`;
  const a = await createAgent(task, { role: "solo", spec, instructions, startedBy: username, readOnly, variant, title: title || (readOnly ? "Review" : "Follow-up"), kind: kind || (spec.provider === "auto" ? router.classify(prompt).kind : null) });
  await setTask(taskId, { status: "running" });
  await event(taskId, a.id, "system", { message: `@${username} added ${a.name}${readOnly ? " (review)" : ""}`, prompt: prompt.slice(0, 2000) });
  runAgent(a.id, { readOnly, title: a.title }).then(() => finishTask(taskId));
  return a;
}

/**
 * Run one agent on a task and wait for it (and for any escalation it spawned).
 * Used by pipelines, which drive stages themselves (no auto review between
 * stages). Returns the agent row that settled last.
 */
async function spawnAndWait(taskId, { spec, prompt, username, readOnly = false, variant = "main", title = null, kind = null, withBrief = true }) {
  const { task, text } = withBrief ? await joinBrief(taskId, variant) : { task: await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]), text: "" };
  if (!readOnly && variant === "main") {
    const ctx = await taskContext(taskId).catch(() => null);
    if (ctx) await checkpoints.create(ctx, { variant, label: `Before ${title || "the next stage"}`, by: username, auto: true }).catch(() => null);
  }
  const instructions = withBrief ? `${text}\n\n${prompt}` : prompt;
  const a = await createAgent(task, { role: "solo", spec, instructions, startedBy: username, readOnly, variant, title, kind });
  let done = await runAgent(a.id, { readOnly, title: title || "" });
  // Follow escalations (a stronger model taking over after a failure).
  for (let hop = 0; hop < 3 && done.status === "failed"; hop++) {
    const next = await get("SELECT * FROM hive_agents WHERE task_id=? AND title=? AND created_at>=? ORDER BY created_at DESC LIMIT 1", [taskId, `Escalated from ${done.name}`, done.created_at]);
    if (!next) break;
    for (let i = 0; i < 7200; i++) {
      const row = await get("SELECT * FROM hive_agents WHERE id=?", [next.id]);
      if (!["queued", "running"].includes(row.status)) {
        done = row;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return done;
}

/**
 * Assign work to chosen agents. together=true: all share the task's working
 * copy (and see each other on the board); false: each gets its own copy to
 * compare.
 */
async function assign(taskId, { title, instructions, specs, together = true, username }) {
  const out = [];
  for (const spec of specs) {
    out.push(await addAgent(taskId, { spec, prompt: title ? `${title}\n\n${instructions}` : instructions, username, variant: together ? "main" : "self", title: title || "Assigned" }));
  }
  return out;
}

/** Continue an agent's work on another key / provider ("Continue with…"). */
async function handoffAgent(agentId, { spec, username }) {
  const old = await get("SELECT * FROM hive_agents WHERE id=?", [agentId]);
  if (!old) throw Object.assign(new Error("Agent not found"), { status: 404 });
  if (running.has(agentId)) {
    running.get(agentId).controller.abort();
    await new Promise((r) => setTimeout(r, 300));
  }
  const said = (await all("SELECT data_json FROM hive_events WHERE agent_id=? AND kind='text' ORDER BY seq DESC LIMIT 6", [agentId]))
    .map((r) => json(r.data_json, {}).text)
    .filter(Boolean)
    .reverse();
  const prompt = [
    `You are taking over from ${old.name} (${old.model}), who stopped${old.error ? `: ${old.error}` : ""}.`,
    "Their original instructions:",
    old.instructions,
    said.length ? `\nTheir latest notes:\n${said.join("\n---\n").slice(0, 6000)}` : "",
    "\nThe working copy already contains their edits (check view_changes). Continue from where they left off and finish the job.",
  ].join("\n");
  const variant = old.variant === old.id ? "main" : old.variant;
  const a = await addAgent(old.task_id, { spec, prompt, username, readOnly: old.role === "reviewer", variant, title: `Continues ${old.name}` });
  await event(old.task_id, a.id, "handoff", { reason: `@${username} handed ${old.name}'s work over`, from: { provider: old.provider, model: old.model }, to: { provider: a.provider, model: a.model } });
  return a;
}

function stopAgent(agentId) {
  const s = running.get(agentId);
  if (!s) return false;
  machines.dropApprovals({ agentId });
  s.controller.abort();
  return true;
}

async function stopTask(taskId) {
  let n = 0;
  machines.dropApprovals({ taskId });
  for (const [, s] of running) if (s.taskId === taskId) s.controller.abort(), n++;
  await run("UPDATE hive_agents SET status='stopped', finished_at=? WHERE task_id=? AND status='queued'", [now(), taskId]);
  return n;
}

async function steer(agentId, username, message) {
  const s = running.get(agentId);
  if (!s) return false;
  s.steer.push({ username, message: String(message).slice(0, 4000) });
  await event(s.taskId, agentId, "steer", { username, message: String(message).slice(0, 4000) });
  // Claude Code / Codex: interrupt the current run; it resumes with the message.
  s.interrupt?.();
  return true;
}

const runningCount = () => running.size;

module.exports = {
  startTask,
  addAgent,
  spawnAndWait,
  finishTask,
  assign,
  handoffAgent,
  stopAgent,
  stopTask,
  steer,
  taskContext,
  workspaceOf,
  effectiveProject,
  setTask,
  event,
  runningCount,
  boardOf,
  resolveSpec,
  liveAgents,
  remember,
  fileToAttachment,
  cheapestSpec,
  partialField,
};
