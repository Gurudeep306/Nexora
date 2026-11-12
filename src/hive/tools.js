// Tools Hive agents can call. Agents never run commands or reach the network:
// they read the repository snapshot and write to the task's overlay, which a
// human reviews and commits.
const { ToolError } = require("./workspace");
const { unifiedDiff } = require("./diff");
const { readBase } = require("./snapshot");
const { readWebPage } = require("./plugins");

const str = (description) => ({ type: "string", description });
const obj = (properties, required) => ({ type: "object", properties, required, additionalProperties: false });

const DEFS = {
  list_files: {
    description: "List files in the repository (with this task's changes applied). Filter by directory and/or glob pattern like \"src/**/*.ts\".",
    schema: obj({ path: str("Directory to list, e.g. \"src/routes\". Omit for the whole repo."), pattern: str("Glob, e.g. \"**/*.test.js\"") }, []),
  },
  read_file: {
    description: "Read a text file. Returns numbered lines. Use offset/limit for long files.",
    schema: obj(
      { path: str("File path from the repo root"), offset: { type: "integer", description: "First line (1-based)" }, limit: { type: "integer", description: "Number of lines (max 2000)" } },
      ["path"],
    ),
  },
  search: {
    description: "Search file contents with a regular expression (case-insensitive by default). Returns matching lines with paths and line numbers.",
    schema: obj({ query: str("Regex or plain text"), glob: str("Restrict to files matching this glob"), case_sensitive: { type: "boolean" } }, ["query"]),
  },
  write_file: {
    description: "Create a file or replace its entire contents. Prefer edit_file for changes to existing files.",
    schema: obj({ path: str("File path"), content: str("The complete new file contents") }, ["path", "content"]),
  },
  edit_file: {
    description:
      "Replace an exact string in a file. old_string must match exactly once (include surrounding lines to make it unique) unless replace_all is true. Read the file first.",
    schema: obj(
      { path: str("File path"), old_string: str("Exact text to replace"), new_string: str("Replacement text"), replace_all: { type: "boolean" } },
      ["path", "old_string", "new_string"],
    ),
  },
  delete_file: { description: "Delete a file.", schema: obj({ path: str("File path") }, ["path"]) },
  view_changes: {
    description: "Show this task's changes so far as unified diffs (all files, or one path).",
    schema: obj({ path: str("Only this file") }, []),
  },
  team_note: {
    description: "Post a short note to the shared team board that every agent and human on this task can see (e.g. what you are changing, an interface you defined, a blocker).",
    schema: obj({ message: str("The note") }, ["message"]),
  },
  read_team_board: {
    description: "See teammates' notes, what each agent is working on and which files have been changed by whom. Check before editing shared files.",
    schema: obj({}, []),
  },
  delegate: {
    description:
      "Lead only. Split work into independent sub-tasks and run them IN PARALLEL on other agents. Blocks until they all finish and returns their reports. Give each sub-task complete, self-contained instructions and the files it owns so agents don't collide.",
    schema: obj(
      {
        tasks: {
          type: "array",
          description: "1-8 sub-tasks",
          items: obj(
            {
              title: str("Short title"),
              instructions: str("Complete instructions for the agent"),
              files: { type: "array", items: { type: "string" }, description: "Files/directories this sub-task owns" },
              agent: str("Optional: name of the pool agent to use"),
              difficulty: { type: "string", enum: ["easy", "normal", "hard"], description: "How hard the sub-task is (routes easy work to cheaper models)" },
            },
            ["title", "instructions"],
          ),
        },
      },
      ["tasks"],
    ),
  },
  remember: {
    description: "Save a durable fact to the project's shared memory (conventions, decisions, gotchas) so every current and future agent knows it. Keep it short and specific.",
    schema: obj({ title: str("Short title"), note: str("The fact, in one to three sentences") }, ["title", "note"]),
  },
  read_url: {
    description: "Read a public web page (documentation, API reference, changelog) as text.",
    schema: obj({ url: str("https URL") }, ["url"]),
  },
  finish: {
    description: "Call when your work is complete, with a concise summary of what you did (files changed, decisions, anything a reviewer should check).",
    schema: obj({ summary: str("Summary for the humans reviewing this task") }, ["summary"]),
  },
};

const READ_ONLY = ["list_files", "read_file", "search", "view_changes", "team_note", "read_team_board", "finish"];
const WRITE = ["write_file", "edit_file", "delete_file"];

function toolsFor(role, { readOnly = false, memory = false, web = false } = {}) {
  const names = [...READ_ONLY.slice(0, 3), ...(readOnly ? [] : WRITE), ...READ_ONLY.slice(3)];
  if (role === "lead") names.splice(names.indexOf("finish"), 0, "delegate");
  if (memory) names.splice(names.indexOf("finish"), 0, "remember");
  if (web) names.splice(names.indexOf("finish"), 0, "read_url");
  return names.map((name) => ({ name, description: DEFS[name].description, schema: DEFS[name].schema }));
}

/** Check a tool input against its schema (types + required). Returns an error string or null. */
function validate(name, input) {
  const def = DEFS[name];
  if (!def) return `Unknown tool: ${name}`;
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Tool input must be an object";
  const { properties, required = [] } = def.schema;
  for (const k of required) if (input[k] === undefined || input[k] === null) return `Missing required field "${k}"`;
  for (const [k, v] of Object.entries(input)) {
    const p = properties[k];
    if (!p) continue;
    const t = p.type;
    const ok =
      (t === "string" && typeof v === "string") ||
      (t === "integer" && Number.isInteger(v)) ||
      (t === "boolean" && typeof v === "boolean") ||
      (t === "array" && Array.isArray(v)) ||
      (t === "object" && v && typeof v === "object");
    if (!ok) return `Field "${k}" must be ${t}`;
  }
  return null;
}

const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}\n… [truncated ${s.length - n} chars]` : s);

/**
 * Execute one tool call. ctx: { ws, agent, board, delegateFn, onFinish }.
 * Returns { content, isError, meta } — content is what the model sees.
 */
async function execute(name, input, ctx) {
  const err = validate(name, input);
  if (err) return { content: `Invalid input: ${err}`, isError: true };
  const { ws, agent } = ctx;
  const author = `agent:${agent.name}`;
  try {
    switch (name) {
      case "list_files": {
        const { paths, total } = await ws.list({ path: input.path, pattern: input.pattern });
        const more = total > paths.length ? `\n… and ${total - paths.length} more (narrow with path/pattern)` : "";
        return { content: paths.length ? paths.join("\n") + more : "No files match.", meta: { count: total } };
      }
      case "read_file": {
        const text = await ws.read(input.path);
        if (text === null) return { content: `${input.path} does not exist.`, isError: true };
        const lines = text.split("\n");
        const offset = Math.max(1, input.offset || 1);
        const limit = Math.min(2000, Math.max(1, input.limit || ctx.maxLines || 2000));
        const slice = lines.slice(offset - 1, offset - 1 + limit);
        const width = String(offset + slice.length).length;
        let out = slice.map((l, i) => `${String(offset + i).padStart(width)}│${l.length > 2000 ? l.slice(0, 2000) + "…" : l}`).join("\n");
        if (offset - 1 + limit < lines.length) out += `\n… ${lines.length - (offset - 1 + limit)} more lines (use offset=${offset + limit})`;
        return { content: clip(out, 120_000), meta: { lines: lines.length } };
      }
      case "search": {
        const r = await ws.search(input.query, { glob: input.glob, caseSensitive: !!input.case_sensitive });
        if (!r.hits.length) return { content: `No matches.${r.note ? ` (${r.note})` : ""}`, meta: { count: 0 } };
        const body = r.hits.map((h) => `${h.path}:${h.line}: ${h.text}`).join("\n");
        return { content: body + (r.hits.length >= 80 ? "\n… more matches; refine the query or glob." : "") + (r.note ? `\n(${r.note})` : ""), meta: { count: r.hits.length } };
      }
      case "write_file": {
        const r = await ws.write(input.path, input.content, author);
        ctx.board?.touch(agent, r.path);
        return { content: `${r.created ? "Created" : "Wrote"} ${r.path} (${input.content.split("\n").length} lines).${ctx.board?.conflictNote(agent, r.path) || ""}`, meta: { path: r.path, write: true } };
      }
      case "edit_file": {
        const r = await ws.edit(input.path, input.old_string, input.new_string, { replaceAll: !!input.replace_all, author });
        ctx.board?.touch(agent, r.path);
        return { content: `Edited ${r.path} (${r.replacements} replacement${r.replacements === 1 ? "" : "s"}).${ctx.board?.conflictNote(agent, r.path) || ""}`, meta: { path: r.path, write: true } };
      }
      case "delete_file": {
        const r = await ws.remove(input.path, author);
        ctx.board?.touch(agent, r.path);
        return { content: `Deleted ${r.path}.`, meta: { path: r.path, write: true } };
      }
      case "view_changes": {
        const changes = await ws.changes();
        const pick = input.path ? changes.filter((c) => c.path === ws.cleanPath(input.path)) : changes;
        if (!pick.length) return { content: "No changes yet." };
        const parts = [];
        for (const c of pick.slice(0, 40)) {
          const base = c.status === "added" ? "" : (await readBase(ws.snap, c.path).catch(() => "")) || "";
          const cur = c.status === "deleted" ? "" : (await ws.read(c.path)) || "";
          parts.push(`# ${c.status.toUpperCase()} ${c.path} (+${c.additions} -${c.deletions}, by ${c.author})\n${clip(unifiedDiff(base, cur, c.path), 20_000)}`);
        }
        return { content: clip(parts.join("\n\n"), 150_000) };
      }
      case "team_note":
        ctx.board?.note(agent, String(input.message).slice(0, 2000));
        return { content: "Posted to the team board." };
      case "read_team_board":
        return { content: ctx.board ? ctx.board.render(agent) : "You are working alone." };
      case "delegate": {
        if (!ctx.delegateFn) return { content: "Only the lead agent can delegate.", isError: true };
        const tasks = input.tasks.slice(0, 8);
        if (!tasks.length) return { content: "Give at least one sub-task.", isError: true };
        const reports = await ctx.delegateFn(tasks);
        return { content: clip(reports, 60_000) };
      }
      case "remember":
        if (!ctx.remember) return { content: "Shared memory is off for this project.", isError: true };
        await ctx.remember(String(input.title).slice(0, 120), String(input.note).slice(0, 1500));
        return { content: "Saved to project memory. Every agent on this project will see it." };
      case "read_url": {
        const r = await readWebPage(input.url);
        return { content: clip(r.text, 60_000), meta: { url: input.url } };
      }
      case "finish":
        ctx.onFinish?.(String(input.summary || ""));
        return { content: "Done. Your summary was recorded." };
      default:
        return { content: `Unknown tool ${name}`, isError: true };
    }
  } catch (e) {
    if (e instanceof ToolError) return { content: e.message, isError: true };
    return { content: `Tool failed: ${e.message}`, isError: true };
  }
}

module.exports = { toolsFor, execute, validate, DEFS };
