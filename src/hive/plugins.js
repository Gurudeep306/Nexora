// Hive plugins: switchable behaviours that save tokens, keep work going and
// share context. Built-ins live here; staff can also write "instruction"
// plugins (prompt packs) as many as they like. Each plugin is configured
// globally ('*') and can be overridden per project.
const dns = require("dns").promises;
const net = require("net");
const { run, get, all, newId, now, json } = require("./db");

const BUILTINS = [
  {
    id: "never_stop",
    name: "Never stop",
    category: "Reliability",
    icon: "infinity",
    default: true,
    description: "When an agent's key or plan hits its limit, is rate-limited or rejected, the work moves to another key of the same model first, then to the best model for the same kind of work (free first) — with the full context — and keeps going.",
    config: { order: ["anthropic", "openai", "gemini", "deepseek", "xai", "openrouter"] },
    // The continuation is chosen by the router: the best model for the same kind of work, free first.
  },
  {
    id: "shared_memory",
    name: "Shared memory",
    category: "Context",
    icon: "brain",
    default: true,
    description: "A project memory every agent reads before it starts, and can add to with a remember tool. Staff can pin facts too.",
    config: { maxItems: 30 },
  },
  {
    id: "team_radar",
    name: "Team radar",
    category: "Context",
    icon: "radar",
    default: true,
    description: "Every agent knows what the others on the same repository are doing — across all tasks — and gets a short update between steps when that changes.",
    config: {},
  },
  {
    id: "repo_map",
    name: "Repo map",
    category: "Token saver",
    icon: "map",
    default: true,
    description: "Gives agents a compact map of the repository up front, so they spend fewer tokens exploring.",
    config: { maxEntries: 400 },
  },
  {
    id: "token_steward",
    name: "Token Steward",
    category: "Token saver",
    icon: "piggy-bank",
    default: true,
    description: "Long chats are folded into a running summary written by a free model (cached, so it's paid once), and long tool output — search results, web pages, MCP replies — is trimmed. The Steward also audits spend and suggests one-click savings.",
    config: { triggerTokens: 24000, keepTokens: 8000, maxToolChars: 12000 },
  },
  {
    id: "context_trim",
    name: "Context trimmer",
    category: "Token saver",
    icon: "scissors",
    default: true,
    description: "Clears old tool output from long runs (server-side context editing on Claude; trimmed history elsewhere), so later steps don't re-send it.",
    config: { triggerTokens: 120000 },
  },
  {
    id: "lean_reads",
    name: "Lean reads",
    category: "Token saver",
    icon: "file-minus",
    default: true,
    description: "Files are read in windows instead of whole, and agents are nudged to search before reading.",
    config: { maxLines: 400 },
  },
  {
    id: "prompt_cache",
    name: "Prompt caching",
    category: "Token saver",
    icon: "database",
    default: true,
    description: "Reuses the unchanged start of each request on providers that support it (Claude), cutting input cost on every step.",
    config: {},
  },
  {
    id: "terse",
    name: "Terse mode",
    category: "Token saver",
    icon: "minimize",
    default: false,
    description: "Agents narrate less and keep messages short. Fewer output tokens.",
    config: {},
  },
  {
    id: "smart_router",
    name: "Smart router",
    category: "Token saver",
    icon: "route",
    default: true,
    description: "Agents set to “Auto” get the best model for the kind of work — free and subscription models first, strong models only where they are needed. In teams, easy sub-tasks go to cheaper models. Preference: balanced, fast (quickest replies), savings or quality.",
    config: { preference: "balanced" },
  },
  {
    id: "escalation",
    name: "Escalation",
    category: "Reliability",
    icon: "trending-up",
    default: true,
    description: "If an agent fails, a stronger model takes over (up to twice) with the error and the partial work — so trying a cheap model first never costs the task.",
    config: {},
  },
  {
    id: "auto_resume",
    name: "Keep working overnight",
    category: "Reliability",
    icon: "moon",
    default: true,
    description: "Agents cut off by a server restart or deploy pick up where they left off automatically, so long jobs finish while you sleep.",
    config: {},
  },
  {
    id: "budget_guard",
    name: "Budget guard",
    category: "Control",
    icon: "shield",
    default: false,
    description: "Caps tokens per task. At 85% agents are told to wrap up; at 100% they stop.",
    config: { maxTokensPerTask: 2000000 },
  },
  {
    id: "auto_review",
    name: "Auto review",
    category: "Quality",
    icon: "scan",
    default: true,
    description: "When a task finishes, a read-only reviewer from a different lab than the authors checks the changes and reports issues before anyone commits.",
    config: { provider: "", model: "" },
  },
  {
    id: "ci_fixer",
    name: "CI fixer",
    category: "Automation",
    icon: "wrench",
    default: true,
    description: "When checks fail on a pull request Hive opened, an agent reads the failure, fixes the cause and pushes to the same branch — up to a few rounds — so PRs get to green on their own.",
    config: { maxRounds: 3 },
  },
  {
    id: "judge",
    name: "Judge",
    category: "Quality",
    icon: "gavel",
    default: true,
    description: "When several agents race on the same work (Compare), a strong model from a different lab ranks every attempt with reasons and adopts the best one automatically.",
    config: { autoAdopt: true },
  },
  {
    id: "web_reader",
    name: "Web reader",
    category: "Tools",
    icon: "globe",
    default: false,
    description: "Agents can read public documentation pages (read-only, public hosts only).",
    config: {},
  },
];
const BUILTIN = new Map(BUILTINS.map((b) => [b.id, b]));

/** All plugins with their effective state for a project. */
async function resolvePlugins(projectId) {
  const rows = await all("SELECT * FROM hive_plugins WHERE scope IN ('*', ?) ORDER BY created_at", [projectId || "*"]);
  const out = {};
  for (const b of BUILTINS) out[b.id] = { ...b, enabled: b.default, config: { ...b.config }, scope: "default" };
  const custom = [];
  // Global rows first, then project rows override them.
  for (const scope of ["*", projectId]) {
    for (const r of rows.filter((x) => x.scope === scope)) {
      if (r.kind === "builtin" && out[r.name]) {
        out[r.name] = { ...out[r.name], enabled: !!r.enabled, config: { ...out[r.name].config, ...json(r.config_json, {}) }, scope: r.scope, rowId: r.id };
      } else if (r.kind === "instructions") {
        custom.push({ id: r.id, kind: "instructions", name: r.name, description: r.description, enabled: !!r.enabled, config: json(r.config_json, {}), scope: r.scope, createdBy: r.created_by });
      }
    }
  }
  return { builtins: out, custom };
}

async function setBuiltin(scope, id, { enabled, config }, by) {
  if (!BUILTIN.has(id)) throw Object.assign(new Error("Unknown plugin"), { status: 404 });
  const row = await get("SELECT * FROM hive_plugins WHERE kind='builtin' AND name=? AND scope=?", [id, scope]);
  const cfg = { ...(row ? json(row.config_json, {}) : {}), ...(config && typeof config === "object" ? config : {}) };
  const t = now();
  if (row) {
    await run("UPDATE hive_plugins SET enabled=?, config_json=?, updated_at=? WHERE id=?", [enabled === undefined ? row.enabled : enabled ? 1 : 0, JSON.stringify(cfg), t, row.id]);
  } else {
    await run(
      "INSERT INTO hive_plugins(id, scope, kind, name, description, enabled, config_json, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
      [newId("plg"), scope, "builtin", id, "", enabled === undefined ? (BUILTIN.get(id).default ? 1 : 0) : enabled ? 1 : 0, JSON.stringify(cfg), by, t, t],
    );
  }
}

/**
 * Drop a scope's own setting for a built-in plugin, so it follows the level
 * above again (a project follows the workspace; the workspace follows the
 * built-in default). Returns whether there was anything to drop.
 */
async function resetBuiltin(scope, id) {
  if (!BUILTIN.has(id)) throw Object.assign(new Error("Unknown plugin"), { status: 404 });
  const row = await get("SELECT id FROM hive_plugins WHERE kind='builtin' AND name=? AND scope=?", [id, scope]);
  if (row) await run("DELETE FROM hive_plugins WHERE id=?", [row.id]);
  return !!row;
}

/* ── helpers used by the runner ─────────────────────────────────────── */

/** Compact repository map: directories with file counts, plus key files. */
function repoMap(paths, max = 400) {
  const dirs = new Map();
  for (const p of paths) {
    const i = p.lastIndexOf("/");
    const d = i < 0 ? "." : p.slice(0, i);
    dirs.set(d, (dirs.get(d) || 0) + 1);
  }
  const important = paths.filter((p) => /(^|\/)(package\.json|README\.md|tsconfig\.json|pyproject\.toml|go\.mod|Cargo\.toml|Dockerfile|\.env\.example|requirements\.txt)$/.test(p)).slice(0, 30);
  const lines = [];
  const sorted = [...dirs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [d, n] of sorted.slice(0, max)) lines.push(`${d}/ (${n})`);
  if (sorted.length > max) lines.push(`… ${sorted.length - max} more directories`);
  return `Repository map (${paths.length} files):\n${lines.join("\n")}${important.length ? `\nKey files: ${important.join(", ")}` : ""}`;
}

/** Is this IP address on a private, loopback or link-local network? */
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = ip.toLowerCase();
  return s === "::1" || s === "::" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80") || s.startsWith("::ffff:");
}

/** Fetch a public web page as text (web_reader plugin). SSRF-guarded. */
async function readWebPage(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Not a valid URL");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only http(s) URLs");
  if (u.username || u.password) throw new Error("URLs with credentials are not allowed");
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error("Only public hosts can be read");
  const res = await fetch(u, { redirect: "manual", headers: { "User-Agent": "NexoraHive/1.0 (docs reader)", Accept: "text/html,text/plain,application/json" }, signal: AbortSignal.timeout(15000) });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    return { redirect: loc ? new URL(loc, u).toString() : null, text: `Redirects to ${loc}` };
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  const raw = (await res.text()).slice(0, 2_000_000);
  if (!/html/.test(type)) return { text: raw.slice(0, 60000) };
  const cheerio = require("cheerio");
  const $ = cheerio.load(raw);
  $("script, style, noscript, svg, nav, footer, header, iframe").remove();
  const title = $("title").text().trim();
  const body = ($("main").text() || $("article").text() || $("body").text()).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  return { text: `${title ? `# ${title}\n\n` : ""}${body}`.slice(0, 60000) };
}

/** Rough cost tier of a model, for the smart router (0 cheap … 2 strong). */
function modelTier(model) {
  const m = String(model).toLowerCase();
  if (/(haiku|mini|nano|flash|lite|small|8b|7b|instant|schnell|3-mini)/.test(m)) return 0;
  if (/(opus|fable|mythos|gpt-5(?!-mini)|-pro|large|max|reasoner|grok-4|405b|480b)/.test(m)) return 2;
  return 1;
}

module.exports = { BUILTINS, BUILTIN, resolvePlugins, setBuiltin, resetBuiltin, repoMap, readWebPage, privateIp, modelTier };
