// Subscription agents: Claude Code, Codex and Mistral Vibe running on a
// connected machine (the Hive bridge) under the owner's own Claude / ChatGPT /
// Le Chat plan.
//
// Hive never sees the model API here. It starts the CLI through the bridge in
// headless JSON mode, reads its JSON-lines output, and translates every line
// into Hive's own events (text, thinking, tool calls with diffs and command
// output, usage), so these agents look and behave like any other agent in a
// session: they can be steered, stopped, handed off and reviewed.
const { ProviderError } = require("./common");

const machines = () => require("../machines");

// Hive tool names the Session UI knows how to draw.
const CLAUDE_TOOL = { Bash: "run_command", Read: "read_file", Edit: "edit_file", MultiEdit: "edit_file", Write: "write_file", NotebookEdit: "edit_file", Grep: "search", Glob: "list_files", LS: "list_files", WebFetch: "read_url", WebSearch: "web_search", TodoWrite: "plan", Task: "delegate", Agent: "delegate" };
const WRITES = new Set(["edit_file", "write_file", "delete_file"]);

/** Normalise a Claude tool input to the field names Hive's UI expects. */
function claudeInput(name, input = {}) {
  const out = { ...input };
  if (input.file_path) out.path = input.file_path;
  if (name === "Grep" || name === "Glob") out.query = input.pattern;
  if (name === "Edit") Object.assign(out, { old_string: input.old_string, new_string: input.new_string });
  return out;
}

const LIMIT_RE = /usage limit|limit reached|rate.?limit|hit your limit|5-hour limit|weekly limit|out of (extra )?usage|quota|resets at|try again (later|at)|subscription.*(limit|exhausted)/i;

/**
 * Turn one Claude Code stream-json line into Hive events.
 * state: { tools: Map(id -> name) } (kept across lines).
 */
function parseClaude(line, state) {
  let j;
  try {
    j = JSON.parse(line);
  } catch {
    return [];
  }
  const out = [];
  switch (j.type) {
    case "system":
      if (j.subtype === "init") out.push({ kind: "session", id: j.session_id, model: j.model || null, permissionMode: j.permissionMode || null });
      break;
    case "stream_event": {
      const ev = j.event || {};
      if (ev.type === "content_block_delta") {
        if (ev.delta?.type === "text_delta" && ev.delta.text) out.push({ kind: "delta", text: ev.delta.text });
        else if (ev.delta?.type === "thinking_delta" && ev.delta.thinking) out.push({ kind: "thinking", text: ev.delta.thinking });
      }
      break;
    }
    case "assistant": {
      if (j.parent_tool_use_id) break; // inside a sub-agent: its result arrives as one tool_result
      for (const b of j.message?.content || []) {
        if (b.type === "text" && b.text) out.push({ kind: "text", text: b.text });
        else if (b.type === "tool_use") {
          const name = CLAUDE_TOOL[b.name] || b.name;
          state.tools.set(b.id, { name, raw: b.name, input: b.input || {} });
          out.push({ kind: "tool_call", id: b.id, name, raw: b.name, input: claudeInput(b.name, b.input) });
        }
      }
      if (j.message?.usage) out.push({ kind: "turn_usage", usage: j.message.usage });
      break;
    }
    case "user": {
      if (j.parent_tool_use_id) break;
      const content = j.message?.content;
      if (!Array.isArray(content)) break;
      for (const b of content) {
        if (b.type !== "tool_result") continue;
        const t = state.tools.get(b.tool_use_id) || { name: "tool" };
        const text = Array.isArray(b.content) ? b.content.map((x) => (x.type === "text" ? x.text : `[${x.type}]`)).join("\n") : String(b.content ?? "");
        out.push({ kind: "tool_result", id: b.tool_use_id, name: t.name, isError: !!b.is_error, content: text, path: t.input?.file_path || t.input?.path || null, write: WRITES.has(t.name) && !b.is_error });
      }
      break;
    }
    case "rate_limit_event": {
      const info = j.rate_limit_info || {};
      out.push({ kind: "plan_usage", info });
      if (info.status && info.status !== "allowed" && info.status !== "allowed_warning") out.push({ kind: "limit", message: `Claude plan limit (${info.rateLimitType || "usage"}) reached${info.resetsAt ? ` — resets ${new Date(info.resetsAt * 1000).toISOString()}` : ""}`, resetsAt: info.resetsAt || null });
      break;
    }
    case "result": {
      const u = j.usage || {};
      const usage = {
        input: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
        output: u.output_tokens || 0,
        cacheRead: u.cache_read_input_tokens || 0,
      };
      const text = typeof j.result === "string" ? j.result : "";
      const failed = !!j.is_error || (j.subtype && j.subtype !== "success");
      out.push({ kind: "result", ok: !failed, text, usage, costUsd: Number(j.total_cost_usd || 0), session: j.session_id || null, turns: j.num_turns || null, limit: failed && LIMIT_RE.test(text + " " + (j.subtype || "")) });
      break;
    }
    default:
      break;
  }
  return out;
}

/** Turn one `codex exec --json` line into Hive events. */
function parseCodex(line, state) {
  let j;
  try {
    j = JSON.parse(line);
  } catch {
    return [];
  }
  const out = [];
  const t = j.type || j.msg?.type;
  const limits = j.rate_limits || j.msg?.rate_limits || j.info?.rate_limits || j.msg?.info?.rate_limits;
  if (limits && typeof limits === "object") out.push({ kind: "plan_usage", info: { codex: limits } });
  if (t === "thread.started") out.push({ kind: "session", id: j.thread_id || j.session_id || null });
  else if (t === "turn.completed") {
    const u = j.usage || {};
    out.push({ kind: "turn_done", usage: { input: u.input_tokens || 0, output: u.output_tokens || 0, cacheRead: u.cached_input_tokens || 0 } });
  } else if (t === "turn.failed" || t === "error") {
    const message = j.error?.message || j.message || "Codex failed";
    out.push({ kind: "fail", message, limit: LIMIT_RE.test(message) });
  } else if (t && t.startsWith("item.")) {
    const it = j.item || {};
    const id = it.id || `codex_${state.n++}`;
    const done = t === "item.completed";
    switch (it.type) {
      case "agent_message":
      case "assistant_message":
        if (done && (it.text || it.message)) out.push({ kind: "text", text: it.text || it.message });
        break;
      case "reasoning":
        if (done && it.text) out.push({ kind: "thinking", text: it.text });
        break;
      case "command_execution":
        if (!state.tools.has(id)) {
          state.tools.set(id, { name: "run_command" });
          out.push({ kind: "tool_call", id, name: "run_command", input: { command: it.command } });
        }
        if (done) out.push({ kind: "tool_result", id, name: "run_command", isError: it.exit_code != null && it.exit_code !== 0, content: `exit ${it.exit_code ?? "?"}\n${it.aggregated_output || ""}`, exit: it.exit_code });
        break;
      case "file_change":
        if (done) {
          const paths = (it.changes || []).map((c) => c.path);
          for (const [i, c] of (it.changes || []).entries()) {
            const cid = `${id}_${i}`;
            const name = c.kind === "delete" ? "delete_file" : c.kind === "add" ? "write_file" : "edit_file";
            out.push({ kind: "tool_call", id: cid, name, input: { path: c.path } });
            out.push({ kind: "tool_result", id: cid, name, isError: it.status === "failed", content: `${c.kind || "update"} ${c.path}`, path: c.path, write: it.status !== "failed" });
          }
          if (!paths.length) out.push({ kind: "system", message: "Codex changed files" });
        }
        break;
      case "web_search":
        if (done) {
          out.push({ kind: "tool_call", id, name: "web_search", input: { query: it.query } });
          out.push({ kind: "tool_result", id, name: "web_search", content: `Searched: ${it.query || ""}` });
        }
        break;
      case "mcp_tool_call":
        if (done) {
          const name = `${it.server || "mcp"}.${it.tool || "tool"}`;
          out.push({ kind: "tool_call", id, name, input: it.arguments || {} });
          out.push({ kind: "tool_result", id, name, isError: it.status === "failed", content: JSON.stringify(it.result || it.error || "").slice(0, 4000) });
        }
        break;
      case "todo_list":
        if (it.items?.length) out.push({ kind: "plan", items: it.items.map((x) => ({ text: x.text, done: !!x.completed })) });
        break;
      case "error":
        if (done) out.push({ kind: "system", message: it.message || "Codex reported an error" });
        break;
      default:
        break;
    }
  }
  return out;
}

// Vibe's built-in tools → Hive tool names the Session UI knows how to draw.
const VIBE_TOOL = { bash: "run_command", git_bash: "run_command", windows_shell: "run_command", read_file: "read_file", write_file: "write_file", edit: "edit_file", search_replace: "edit_file", grep: "search", web_fetch: "read_url", web_search: "web_search", todo: "plan", task: "delegate", ask_user_question: "ask" };

/**
 * Turn one `vibe -p … --output streaming` line (one session message as JSON)
 * into Hive events. Assistant messages carry text, reasoning and tool calls;
 * "tool" messages carry each call's result.
 */
function parseVibe(line, state) {
  let j;
  try {
    j = JSON.parse(line);
  } catch {
    return [];
  }
  if (!j || typeof j !== "object") return [];
  // Some versions wrap each message: {"type":"message","message":{…}} / {"entry":{…}}.
  if (!j.role && j.message && typeof j.message === "object" && j.message.role) j = j.message;
  else if (!j.role && j.entry && typeof j.entry === "object" && j.entry.role) j = j.entry;
  const out = [];
  if (!state.announced && (j.session_id || j.sessionId)) {
    state.announced = true;
    out.push({ kind: "session", id: j.session_id || j.sessionId });
  }
  if (j.role === "assistant") {
    // Content can be plain text or a list of typed parts (text / thinking): never stringify an object.
    const body = splitContent(j.content);
    const think = [splitContent(j.reasoning_content).text, body.think].filter(Boolean).join("");
    if (think) out.push({ kind: "thinking", text: think });
    if (body.text.trim()) out.push({ kind: "text", text: body.text });
    for (const [i, c] of (j.tool_calls || []).entries()) {
      const raw = c.function?.name || "tool";
      const id = c.id || `vibe_${state.n++}_${i}`;
      let input = {};
      try {
        input = typeof c.function?.arguments === "string" ? JSON.parse(c.function.arguments || "{}") : c.function?.arguments || {};
      } catch {
        input = { arguments: String(c.function?.arguments || "").slice(0, 2000) };
      }
      const name = VIBE_TOOL[raw] || raw;
      state.tools.set(id, { name, raw, input });
      if (name === "plan" && Array.isArray(input.todos)) {
        out.push({ kind: "plan", items: input.todos.map((t) => ({ text: t.content || "", done: t.status === "completed" || t.status === "done" })) });
        continue;
      }
      out.push({ kind: "tool_call", id, name, raw, input: { ...input, path: input.file_path || input.path, query: input.query || input.pattern } });
    }
    const u = j.usage || j.token_usage;
    if (u && typeof u === "object") out.push({ kind: "turn_done", usage: { input: u.prompt_tokens || u.input_tokens || 0, output: u.completion_tokens || u.output_tokens || 0, cacheRead: 0 } });
  } else if (j.role === "tool") {
    const id = j.tool_call_id || `vibe_${state.n++}`;
    const t = state.tools.get(id) || { name: VIBE_TOOL[j.name] || j.name || "tool", input: {} };
    if (t.name === "plan") return out;
    const o = j.tool_result?.output || {};
    const content = (typeof j.content === "string" ? j.content : splitContent(j.content).text || JSON.stringify(j.content ?? o)).slice(0, 8000);
    const isError = !!(j.tool_result?.cancelled || o.error || o.is_error || /^(error|<tool_error>)/i.test(content.trim()));
    const exit = typeof o.returncode === "number" ? o.returncode : typeof o.exit_code === "number" ? o.exit_code : undefined;
    out.push({ kind: "tool_result", id, name: t.name, isError: isError || (exit != null && exit !== 0), content, exit, path: t.input?.file_path || t.input?.path || o.file_path || o.file || null, write: WRITES.has(t.name) && !isError });
  }
  return out;
}

const { splitContent } = require("./openai");

const PARSERS = { claude: parseClaude, codex: parseCodex, vibe: parseVibe };
const CLI_LABEL = { claude: "Claude Code", codex: "Codex", vibe: "Mistral Vibe" };
const CLI_OF_VENDOR = { claude_code: "claude", codex: "codex", vibe: "vibe" };

const POLICY = {
  // Claude Code permission mode, Codex sandbox flags, and whether Hive approves commands.
  // Vibe in headless mode can't ask anyone: "ask" auto-runs the safe calls and refuses risky ones.
  ask: { claude: ["--permission-mode", "acceptEdits"], codex: ["--sandbox", "workspace-write"], vibe: ["--agent", "smart-approve"], hook: true },
  auto: { claude: ["--permission-mode", "bypassPermissions"], codex: ["--dangerously-bypass-approvals-and-sandbox"], vibe: ["--auto-approve"], hook: false },
  read: { claude: ["--permission-mode", "plan"], codex: ["--sandbox", "read-only"], vibe: ["--enabled-tools", "read_file", "--enabled-tools", "grep"], hook: false },
};

/** argv for a run. resume: the CLI's session id to continue. */
function buildArgs({ cli, model, system, prompt, policy = "ask", resume = null, chat = false }) {
  const pol = POLICY[policy] || POLICY.ask;
  if (cli === "vibe") {
    // Headless run: one JSON message per line. The brief goes first in the
    // prompt (Vibe's --system-prompt-file would replace its own instructions).
    const flags = ["--output", "streaming", "--trust", ...(chat ? ["--enabled-tools", "read_file", "--max-turns", "2"] : pol.vibe)];
    if (model && model !== "default") flags.push("--model", model);
    if (resume) flags.push("--resume", resume);
    const text = resume || !system ? prompt : `${system}\n\n---\n\n${prompt}`;
    return { args: [...flags, "-p", text], input: null, hook: false };
  }
  if (cli === "codex") {
    const head = resume ? ["exec", "resume", resume] : ["exec"];
    const flags = ["--json", "--skip-git-repo-check", ...(chat ? ["--sandbox", "read-only"] : pol.codex)];
    if (model && model !== "default") flags.push("--model", model);
    // Codex has no system-prompt flag: the brief goes first in the prompt.
    const text = resume || !system ? prompt : `${system}\n\n---\n\n${prompt}`;
    return { args: [...head, ...flags, text], input: null, hook: false };
  }
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
  if (chat) args.push("--tools", "", "--no-session-persistence");
  else args.push(...pol.claude);
  if (model && model !== "default") args.push("--model", model);
  if (resume) args.push("--resume", resume);
  if (system) args.push(chat ? "--system-prompt" : "--append-system-prompt", system);
  return { args, input: prompt, hook: !chat && pol.hook };
}

let runSeq = 0;
const newRunId = () => `run_${Date.now().toString(36)}_${(runSeq++).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Live runs: run id -> { approve(info) } so the bridge's approval hook reaches
// the agent that asked.
const live = new Map();

/**
 * Start a run and stream its parsed events to onEvent until it ends.
 * Resolves with { exit, stderr, session }. `signal` stops it.
 */
async function stream({ machineId, folder, cli, args, input, env, hook, signal, onEvent, approve }) {
  const id = newRunId();
  const m = machines();
  if (approve) live.set(id, { approve });
  const state = { tools: new Map(), n: 0 };
  const parse = PARSERS[cli] || parseClaude;
  try {
    await m.call(machineId, "run_start", { folder, cli, args, input, env, id, hook });
    let from = 0;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      m.call(machineId, "run_stop", { id }).catch(() => {});
    };
    signal?.addEventListener("abort", stop, { once: true });
    for (;;) {
      const r = await m.call(machineId, "run_read", { id, from }, { timeoutMs: 30_000 });
      for (const line of r.lines || []) for (const ev of parse(line, state)) await onEvent(ev);
      from = r.next ?? from;
      if (r.done || r.gone) return { exit: r.exit, stderr: r.stderr || "", stopped };
    }
  } finally {
    live.delete(id);
  }
}

/** The bridge hook asks: may this agent run this command? */
async function answerHook(runId, info) {
  const r = live.get(runId);
  if (!r) return { approved: false, reason: "This run is no longer active in Hive" };
  return r.approve(info);
}

/** Bridges older than 1.2.0 don't know Mistral Vibe (they would probe Claude instead). */
async function bridgeKnows(cli, machineId) {
  if (cli !== "vibe") return true;
  const row = await require("../db").get("SELECT info_json FROM hive_machines WHERE id=?", [machineId]);
  let v = "0";
  try {
    v = JSON.parse(row?.info_json || "{}").version || "0";
  } catch {}
  const [a, b] = String(v).split(".").map(Number);
  return a > 1 || (a === 1 && b >= 2);
}
const OLD_BRIDGE = "The Hive bridge on that machine is too old for Mistral Vibe — re-run the setup line from Hive → Machines to update it";

/** Probe a machine: is the CLI there and signed in? Returns its model list. */
async function listModels({ cli, machineId, vendor, secret }) {
  if (!machineId) throw new ProviderError("Pick the machine this runs on", { kind: "auth" });
  if (!(await bridgeKnows(cli, machineId))) throw new ProviderError(OLD_BRIDGE, { kind: "auth" });
  const label = CLI_LABEL[cli] || "Claude Code";
  let d;
  try {
    d = await machines().call(machineId, "cli_detect", { cli }, { timeoutMs: 40_000 });
  } catch (e) {
    throw new ProviderError(e.message, { kind: "network" });
  }
  if (!d.installed) {
    const how = cli === "codex" ? "npm install -g @openai/codex" : cli === "vibe" ? "uv tool install mistral-vibe (or: pipx install mistral-vibe)" : "npm install -g @anthropic-ai/claude-code";
    throw new ProviderError(`${label} isn't installed on that machine — run: ${how}`, { kind: "auth" });
  }
  // A Claude token pasted in Hive (from `claude setup-token`) signs it in per run.
  if (!d.loggedIn && !((vendor === "claude_code" || vendor === "vibe") && secret)) {
    const how = cli === "codex" ? "codex login --device-auth" : cli === "vibe" ? "vibe --setup (sign in with your Le Chat account), or paste your Vibe API key in Hive" : "claude setup-token (then paste the token in Hive), or claude auth login";
    throw new ProviderError(`${label} is installed (${d.version}) but not signed in — on the machine run: ${how}`, { kind: "auth" });
  }
  // Vibe ships one model (Mistral Medium 3.5, "mistral-vibe-cli-latest"); others are added in ~/.vibe/config.toml.
  if (cli === "vibe") return ["default", "mistral-medium-3.5"];
  return cli === "codex" ? ["default", "gpt-5-codex", "gpt-5"] : ["default", "opus", "sonnet", "haiku", "claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
}

const envFor = (vendor, secret) => (!secret ? {} : vendor === "claude_code" ? { CLAUDE_CODE_OAUTH_TOKEN: secret } : vendor === "vibe" ? { MISTRAL_API_KEY: secret } : {});

/**
 * Chat turn (no tools): the conversation goes in as one prompt, the reply
 * streams back. Runs in a scratch folder on the machine.
 */
async function turn({ vendor, secret, model, system, messages, signal, onText, onThinking, keyRow }) {
  const cli = CLI_OF_VENDOR[vendor] || "claude";
  const machineId = keyRow?.machine_id;
  if (!machineId) throw new ProviderError("This subscription connection has no machine", { kind: "auth" });
  const transcript = messages
    .map((m) => {
      if (m.role === "user") {
        const files = (m.attachments || []).filter((a) => a.text != null).map((a) => `\n[File: ${a.name}]\n${a.text.slice(0, 60000)}`).join("");
        return `User: ${m.text}${files}`;
      }
      if (m.role === "assistant") return `Assistant: ${m.text}`;
      return "";
    })
    .filter(Boolean);
  const last = transcript.pop() || "";
  const prompt = transcript.length ? `Conversation so far:\n\n${transcript.join("\n\n")}\n\n---\n\n${last.replace(/^User: /, "")}` : last.replace(/^User: /, "");
  const { args, input } = buildArgs({ cli, model, system, prompt, chat: true });
  let text = "";
  let usage = { input: 0, output: 0, cacheRead: 0 };
  let failure = null;
  let served = model;
  const r = await stream({
    machineId,
    folder: null,
    cli,
    args,
    input,
    env: envFor(vendor, secret),
    hook: false,
    signal,
    onEvent: (ev) => {
      if (ev.kind === "delta") {
        text += ev.text;
        onText?.(ev.text);
      } else if (ev.kind === "thinking") onThinking?.(ev.text);
      else if (ev.kind === "text" && cli !== "claude") {
        text += (text ? "\n\n" : "") + ev.text;
        onText?.(ev.text);
      } else if (ev.kind === "session" && ev.model) served = ev.model;
      else if (ev.kind === "plan_usage" && keyRow?.id) require("../keys").setPlanUsage(keyRow.id, ev.info).catch(() => {});
      else if (ev.kind === "result") {
        usage = ev.usage;
        if (!ev.ok) failure = ev;
        if (!text && ev.text) text = ev.text;
      } else if (ev.kind === "turn_done") usage = { input: usage.input + ev.usage.input, output: usage.output + ev.usage.output, cacheRead: usage.cacheRead + ev.usage.cacheRead };
      else if (ev.kind === "fail") failure = ev;
      else if (ev.kind === "limit") failure = { text: ev.message, limit: true };
    },
  });
  if (signal?.aborted || r.stopped) throw new ProviderError("Stopped", { kind: "aborted" });
  if (failure) throw new ProviderError(failure.text || failure.message || "The CLI failed", { kind: failure.limit ? "quota" : "server" });
  if (r.exit && r.exit !== 0 && !text) throw new ProviderError(`${CLI_LABEL[cli]} exited with ${r.exit}: ${String(r.stderr).trim().slice(-400)}`, { kind: LIMIT_RE.test(r.stderr) ? "quota" : /auth|login|logged in|credential|api key/i.test(r.stderr) ? "auth" : "server" });
  return { text, toolCalls: [], raw: { provider: "cli" }, usage, costMicros: 0, stop: "end", servedModel: served || model || "default", rateLimit: null };
}

module.exports = { bridgeKnows, OLD_BRIDGE, id: "cli", parseClaude, parseCodex, parseVibe, buildArgs, stream, answerHook, listModels, turn, envFor, LIMIT_RE, POLICY };
