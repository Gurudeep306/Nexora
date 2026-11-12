// Hive runtime: runs agents (tool loops against any provider), orchestrates
// teams (a lead delegating parallel sub-tasks to workers), compare and review
// modes, steering, stop, key failover and live event streaming.
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");
const keys = require("./keys");
const { providerOf } = require("./providers");
const { workspace } = require("./workspace");
const { getSnapshot } = require("./snapshot");
const { toolsFor, execute } = require("./tools");
const { systemPrompt } = require("./prompts");
const vault = require("./vault");

const MAX_AGENTS = Number(process.env.HIVE_MAX_AGENTS || 16);
const MAX_STEPS = Number(process.env.HIVE_MAX_STEPS || 60);
const NAMES = ["Nova", "Atlas", "Orion", "Lyra", "Vega", "Sirius", "Juno", "Rigel", "Quill", "Echo", "Rune", "Kepler", "Ada", "Turing", "Hopper", "Lovelace", "Pixel", "Cosmo", "Iris", "Zephyr"];

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

/* ── shared team board ──────────────────────────────────────────────── */
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
  render(agent) {
    const lines = ["Team:"];
    for (const m of this.members.values()) lines.push(`- ${m.name}${m.name === agent.name ? " (you)" : ""} [${m.status}] ${m.model}${m.title ? ` — ${m.title}` : ""}`);
    lines.push("", "Files changed:");
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
async function taskContext(taskId) {
  const task = await get("SELECT * FROM hive_tasks WHERE id=?", [taskId]);
  if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
  const project = await get("SELECT * FROM hive_projects WHERE id=?", [task.project_id]);
  const cred = project && (await get("SELECT * FROM hive_github WHERE id=?", [project.github_id]));
  if (!cred) throw new Error("This project's GitHub connection was removed");
  const token = vault.open(cred.token_enc);
  const snap = await getSnapshot(token, project.repo_owner, project.repo_name, task.base_sha);
  return { task, project, token, snap };
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
  if (a) hub.emitTask(a.task_id, "agent", a), hub.emit("agent", { id: a.id, task_id: a.task_id, status: a.status, input_tokens: a.input_tokens, output_tokens: a.output_tokens });
  return a;
}

// Names reserved by agents being created right now (creation runs in
// parallel when a lead delegates, so the database alone can't prevent twins).
const reservedNames = new Map(); // taskId -> Set
async function pickName(taskId, wanted) {
  const used = new Set((await all("SELECT name FROM hive_agents WHERE task_id=?", [taskId])).map((r) => r.name));
  const held = reservedNames.get(taskId) || reservedNames.set(taskId, new Set()).get(taskId);
  for (const n of held) used.add(n);
  let name = null;
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

/** Resolve an agent spec { keyId|'auto', provider, model, effort } to a key row. */
async function resolveSpec(spec) {
  const provider = spec.provider;
  providerOf(provider);
  const key = await keys.pickKey(provider, { prefer: spec.keyId || "auto" });
  if (!key) throw new Error(`No ${providerOf(provider).label} key with budget left — add one in the key vault`);
  const model = spec.model || key.default_model || providerOf(provider).suggested[0];
  if (!model) throw new Error("Choose a model");
  return { key, model, provider, effort: spec.effort || null };
}

async function createAgent(task, { role, spec, instructions, variant = "main", parentId = null, startedBy, name, readOnly = false }) {
  const r = await resolveSpec(spec);
  const id = newId("ag");
  await run(
    `INSERT INTO hive_agents(id, task_id, parent_id, role, name, key_id, provider, model, effort, variant, instructions, status, started_by, created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, task.id, parentId, readOnly ? "reviewer" : role, await pickName(task.id, name || spec.name), r.key.id, r.provider, r.model, r.effort, variant === "self" ? id : variant, instructions, "queued", startedBy, now()],
  );
  const a = await get("SELECT * FROM hive_agents WHERE id=?", [id]);
  hub.emitTask(task.id, "agent", a);
  return a;
}

/* ── the agent loop ─────────────────────────────────────────────────── */
async function runAgent(agentId, { team = [], delegateFn = null, readOnly = false, title = "" } = {}) {
  let agent = await get("SELECT * FROM hive_agents WHERE id=?", [agentId]);
  const ctx = await taskContext(agent.task_id);
  const { task, project, snap } = ctx;
  const controller = new AbortController();
  const state = { controller, steer: [], taskId: task.id };
  running.set(agentId, state);
  const board = boardOf(task.id);
  board.join(agent, title);

  // Global concurrency cap.
  while (slots >= MAX_AGENTS) {
    if (controller.signal.aborted) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  slots++;
  agent = await setAgent(agentId, { status: "running", started_at: now() });
  await event(task.id, agentId, "status", { status: "running", model: agent.model, provider: agent.provider });

  const ws = workspace({ task, variant: agent.variant, snap });
  const tools = toolsFor(agent.role === "lead" ? "lead" : "solo", { readOnly });
  const system = systemPrompt({ project, task, agent, role: agent.role, readOnly, team });
  const messages = [{ role: "user", text: agent.instructions }];
  let finished = null;
  let lastText = "";
  let keyRow = await keys.keyRow(agent.key_id);
  const triedKeys = [];
  let step = 0;
  let status = "done";
  let error = null;

  // Batched token streaming to the browser.
  let buf = "";
  let thinkBuf = "";
  let flushTimer = null;
  const flush = () => {
    flushTimer = null;
    if (buf) hub.emitTask(task.id, "delta", { agentId, text: buf }), (buf = "");
    if (thinkBuf) hub.emitTask(task.id, "thinking", { agentId, text: thinkBuf }), (thinkBuf = "");
  };
  const schedule = () => (flushTimer ||= setTimeout(flush, 70));

  try {
    while (step < MAX_STEPS && !finished) {
      if (controller.signal.aborted) throw Object.assign(new Error("Stopped"), { kind: "aborted" });
      while (state.steer.length) {
        const s = state.steer.shift();
        messages.push({ role: "user", text: `Message from @${s.username} (a human on the team): ${s.message}` });
      }
      // Budget + key failover.
      if (!keyRow || !(await keys.hasBudget(keyRow))) {
        const next = await keys.pickKey(agent.provider, { exclude: [...triedKeys, keyRow?.id].filter(Boolean) });
        if (!next) throw new Error(`Token limit reached on ${keyRow?.label || "the key"} and no other ${providerOf(agent.provider).label} key has budget`);
        await event(task.id, agentId, "system", { message: `Switched to key “${next.label}” (budget)` });
        if (keyRow) triedKeys.push(keyRow.id);
        keyRow = next;
        agent = await setAgent(agentId, { key_id: next.id });
      }
      const release = await keys.acquire(keyRow, controller.signal);
      let res;
      try {
        hub.emitTask(task.id, "turn", { agentId, step: step + 1 });
        const p = providerOf(agent.provider);
        res = await p.impl.turn({
          secret: keys.secretOf(keyRow),
          baseUrl: keyRow.base_url,
          official: !!p.official,
          model: agent.model,
          effort: agent.effort,
          system,
          messages,
          tools,
          signal: controller.signal,
          onText: (d) => ((buf += d), schedule()),
          onThinking: (d) => ((thinkBuf += d), schedule()),
        });
      } catch (e) {
        release();
        flush();
        if (e.kind === "aborted" || controller.signal.aborted) throw Object.assign(new Error("Stopped"), { kind: "aborted" });
        // Failover on auth / quota / rate errors to another key of the provider.
        if (["auth", "quota", "rate"].includes(e.kind)) {
          triedKeys.push(keyRow.id);
          if (e.kind === "auth") await run("UPDATE hive_keys SET status='invalid', status_detail=? WHERE id=?", [String(e.message).slice(0, 300), keyRow.id]);
          const next = await keys.pickKey(agent.provider, { exclude: triedKeys });
          if (next) {
            await event(task.id, agentId, "system", { message: `${keyRow.label}: ${e.message}. Switched to “${next.label}”.` });
            keyRow = next;
            agent = await setAgent(agentId, { key_id: next.id });
            continue;
          }
          if (e.kind === "rate") {
            await event(task.id, agentId, "system", { message: `Rate limited (${e.message}); retrying in 20s` });
            await new Promise((r) => setTimeout(r, 20000));
            triedKeys.pop();
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
      await keys.recordUsage(keyRow.id, agent.started_by, { input: res.usage.input, output: res.usage.output, costMicros: res.costMicros || 0 }, res.rateLimit);
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
          await event(task.id, agentId, "tool_call", { id: call.id, name: call.name, input: summarizeInput(call.name, call.input) });
          const out = call.invalid
            ? { content: `Your arguments were not valid JSON: ${call.rawArgs}`, isError: true }
            : await execute(call.name, call.input, {
                ws,
                agent,
                board,
                delegateFn: agent.role === "lead" ? delegateFn : null,
                onFinish: (summary) => (finished = summary || lastText || "Done"),
              });
          await event(task.id, agentId, "tool_result", {
            id: call.id,
            name: call.name,
            isError: !!out.isError,
            preview: String(out.content).slice(0, 1500),
            meta: out.meta || null,
          });
          if (out.meta?.write) hub.emitTask(task.id, "changes", { variant: agent.variant });
          return { id: call.id, name: call.name, content: String(out.content), isError: !!out.isError };
        }),
      );
      messages.push({ role: "tool", results });
      // Long non-Claude runs: elide old tool output to stay within context.
      if (agent.provider !== "anthropic") elide(messages);
    }
    if (!finished && step >= MAX_STEPS) {
      status = "done";
      finished = `${lastText}\n\n(Stopped after ${MAX_STEPS} steps.)`.trim();
    }
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
  }
  const result = finished || lastText || null;
  board.status(agentId, status);
  agent = await setAgent(agentId, { status, result, error, finished_at: now() });
  await event(task.id, agentId, "status", { status, summary: result ? result.slice(0, 4000) : null, error });
  return agent;
}

function summarizeInput(name, input) {
  if (!input || typeof input !== "object") return input;
  const out = { ...input };
  if (typeof out.content === "string" && out.content.length > 400) out.content = `${out.content.slice(0, 400)}… (${out.content.length} chars)`;
  for (const k of ["old_string", "new_string"]) if (typeof out[k] === "string" && out[k].length > 600) out[k] = `${out[k].slice(0, 600)}…`;
  if (name === "delegate" && Array.isArray(out.tasks)) out.tasks = out.tasks.map((t) => ({ title: t.title, agent: t.agent, files: t.files, instructions: String(t.instructions || "").slice(0, 300) }));
  return out;
}

function elide(messages) {
  let size = 0;
  for (const m of messages) size += m.role === "tool" ? m.results.reduce((s, r) => s + r.content.length, 0) : (m.text || "").length;
  if (size < 400_000) return;
  for (const m of messages.slice(0, -6)) {
    if (m.role !== "tool") continue;
    for (const r of m.results) if (r.content.length > 600) r.content = `${r.content.slice(0, 300)}\n… [older output elided to save context]`;
  }
}

/* ── task orchestration ─────────────────────────────────────────────── */
async function finishTask(taskId) {
  const tops = await all("SELECT status, result FROM hive_agents WHERE task_id=? AND parent_id IS NULL", [taskId]);
  if (tops.some((a) => a.status === "running" || a.status === "queued")) return;
  const anyOk = tops.some((a) => a.status === "done");
  const summary = tops.map((a) => a.result).filter(Boolean).pop() || null;
  await setTask(taskId, { status: anyOk ? "review" : tops.every((a) => a.status === "stopped") ? "stopped" : "failed", summary });
}

/**
 * Start a task. specs: agent specs ({ provider, keyId, model, effort, name }).
 * mode: solo | team | compare | review. lead: spec for the team lead.
 */
async function startTask(task, { mode, specs, lead, username }) {
  await setTask(task.id, { status: "running" });
  await event(task.id, null, "system", { message: `@${username} started a ${mode} task`, mode });
  const launches = [];
  try {
    if (mode === "team") {
      const pool = specs.length ? specs : [lead];
      const leadAgent = await createAgent(task, { role: "lead", spec: lead || pool[0], instructions: task.prompt, startedBy: username });
      const team = [];
      const poolAgents = [];
      for (const s of pool) {
        const r = await resolveSpec(s).catch(() => null);
        if (r) poolAgents.push({ spec: s, model: r.model, key: r.key });
      }
      poolAgents.forEach((p, i) => team.push({ name: p.spec.name || `worker-${i + 1}`, model: p.model, note: `key ${p.key.label}` }));
      let delegations = 0;
      const delegateFn = async (subtasks) => {
        if (++delegations > 4) return "Delegation limit reached for this task — finish the remaining work yourself.";
        await event(task.id, leadAgent.id, "system", { message: `Delegating ${subtasks.length} sub-task${subtasks.length === 1 ? "" : "s"} in parallel` });
        const used = new Map();
        const workers = await Promise.all(
          subtasks.map(async (st, i) => {
            let p = st.agent && poolAgents.find((x) => (x.spec.name || "").toLowerCase() === String(st.agent).toLowerCase());
            if (!p) {
              // Least-used pool member first, so work spreads across keys.
              p = [...poolAgents].sort((a, b) => (used.get(a) || 0) - (used.get(b) || 0))[0] || { spec: lead || pool[0] };
            }
            used.set(p, (used.get(p) || 0) + 1);
            const instructions = [
              `Overall goal (from the lead): ${task.prompt}`,
              "",
              `Your sub-task: ${st.title}`,
              st.instructions,
              st.files?.length ? `\nYou own: ${st.files.join(", ")}` : "",
              `\nOther sub-tasks running in parallel: ${subtasks.filter((_, j) => j !== i).map((x) => x.title).join("; ") || "none"}.`,
            ].join("\n");
            const w = await createAgent(task, { role: "worker", spec: p.spec, instructions, parentId: leadAgent.id, startedBy: username });
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
        const a = await createAgent(task, { role: "solo", spec: s, instructions: task.prompt, variant: "self", startedBy: username });
        launches.push(runAgent(a.id, { title: "Compare" }));
      }
    } else if (mode === "review") {
      for (const s of specs) {
        const a = await createAgent(task, { role: "solo", spec: s, instructions: task.prompt, startedBy: username, readOnly: true });
        launches.push(runAgent(a.id, { readOnly: true, title: "Review" }));
      }
    } else {
      const a = await createAgent(task, { role: "solo", spec: specs[0], instructions: task.prompt, startedBy: username });
      launches.push(runAgent(a.id, { title: "Solo" }));
    }
  } catch (e) {
    await event(task.id, null, "error", { message: e.message });
    await setTask(task.id, { status: "failed" });
    throw e;
  }
  Promise.allSettled(launches).then(() => finishTask(task.id));
}

/** Add an agent to an existing task (follow-up, extra helper or reviewer). */
async function addAgent(taskId, { spec, prompt, username, readOnly = false, variant = "main" }) {
  const { task, snap } = await taskContext(taskId);
  const ws = workspace({ task, variant, snap });
  const changes = await ws.changes();
  const prior = task.summary ? `\n\nEarlier work on this task:\n${task.summary.slice(0, 3000)}` : "";
  const files = changes.length ? `\n\nFiles changed so far: ${changes.map((c) => `${c.path} (${c.status})`).join(", ")}` : "";
  const instructions = `Task: ${task.title}\nOriginal request: ${task.prompt}${prior}${files}\n\nNew request from @${username}:\n${prompt}`;
  const a = await createAgent(task, { role: "solo", spec, instructions, startedBy: username, readOnly, variant });
  await setTask(taskId, { status: "running" });
  await event(taskId, a.id, "system", { message: `@${username} added ${a.name}${readOnly ? " (review)" : ""}`, prompt: prompt.slice(0, 2000) });
  runAgent(a.id, { readOnly, title: readOnly ? "Review" : "Follow-up" }).then(() => finishTask(taskId));
  return a;
}

function stopAgent(agentId) {
  const s = running.get(agentId);
  if (!s) return false;
  s.controller.abort();
  return true;
}

async function stopTask(taskId) {
  let n = 0;
  for (const [id, s] of running) if (s.taskId === taskId) s.controller.abort(), n++;
  await run("UPDATE hive_agents SET status='stopped', finished_at=? WHERE task_id=? AND status='queued'", [now(), taskId]);
  return n;
}

async function steer(agentId, username, message) {
  const s = running.get(agentId);
  if (!s) return false;
  s.steer.push({ username, message: String(message).slice(0, 4000) });
  await event(s.taskId, agentId, "steer", { username, message: String(message).slice(0, 4000) });
  return true;
}

function runningCount() {
  return running.size;
}

module.exports = { startTask, addAgent, stopAgent, stopTask, steer, taskContext, setTask, event, runningCount, boardOf, resolveSpec };
