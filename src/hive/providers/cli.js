// Subscription agents: Claude Code and Codex running on a connected machine
// (the Hive bridge) under the owner's own Claude / ChatGPT plan.
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

const POLICY = {
  // Claude Code permission mode, Codex sandbox flags, and whether Hive approves commands.
  ask: { claude: ["--permission-mode", "acceptEdits"], codex: ["--sandbox", "workspace-write"], hook: true },
  auto: { claude: ["--permission-mode", "bypassPermissions"], codex: ["--dangerously-bypass-approvals-and-sandbox"], hook: false },
  read: { claude: ["--permission-mode", "plan"], codex: ["--sandbox", "read-only"], hook: false },
};

/** argv for a run. resume: the CLI's session id to continue. */
function buildArgs({ cli, model, system, prompt, policy = "ask", resume = null, chat = false }) {
  const pol = POLICY[policy] || POLICY.ask;
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
  const parse = cli === "codex" ? parseCodex : parseClaude;
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

/** Probe a machine: is the CLI there and signed in? Returns its model list. */
async function listModels({ cli, machineId, vendor, secret }) {
  if (!machineId) throw new ProviderError("Pick the machine this runs on", { kind: "auth" });
  const label = cli === "codex" ? "Codex" : "Claude Code";
  let d;
  try {
    d = await machines().call(machineId, "cli_detect", { cli }, { timeoutMs: 40_000 });
  } catch (e) {
    throw new ProviderError(e.message, { kind: "network" });
  }
  if (!d.installed) {
    const how = cli === "codex" ? "npm install -g @openai/codex" : "npm install -g @anthropic-ai/claude-code";
    throw new ProviderError(`${label} isn't installed on that machine — run: ${how}`, { kind: "auth" });
  }
  // A Claude token pasted in Hive (from `claude setup-token`) signs it in per run.
  if (!d.loggedIn && !(vendor === "claude_code" && secret)) {
    const how = cli === "codex" ? "codex login --device-auth" : "claude setup-token (then paste the token in Hive), or claude auth login";
    throw new ProviderError(`${label} is installed (${d.version}) but not signed in — on the machine run: ${how}`, { kind: "auth" });
  }
  return cli === "codex" ? ["default", "gpt-5-codex", "gpt-5"] : ["default", "opus", "sonnet", "haiku", "claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
}

const envFor = (vendor, secret) => (vendor === "claude_code" && secret ? { CLAUDE_CODE_OAUTH_TOKEN: secret } : {});

/**
 * Chat turn (no tools): the conversation goes in as one prompt, the reply
 * streams back. Runs in a scratch folder on the machine.
 */
async function turn({ vendor, secret, model, system, messages, signal, onText, onThinking, keyRow }) {
  const cli = vendor === "codex" ? "codex" : "claude";
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
      else if (ev.kind === "text" && cli === "codex") {
        text += (text ? "\n\n" : "") + ev.text;
        onText?.(ev.text);
      } else if (ev.kind === "session" && ev.model) served = ev.model;
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
  if (r.exit && r.exit !== 0 && !text) throw new ProviderError(`${cli === "codex" ? "Codex" : "Claude Code"} exited with ${r.exit}: ${String(r.stderr).trim().slice(-400)}`, { kind: /auth|login|logged in|credential/i.test(r.stderr) ? "auth" : "server" });
  return { text, toolCalls: [], raw: { provider: "cli" }, usage, costMicros: 0, stop: "end", servedModel: served || model || "default", rateLimit: null };
}

module.exports = { id: "cli", parseClaude, parseCodex, buildArgs, stream, answerHook, listModels, turn, envFor, LIMIT_RE, POLICY };
