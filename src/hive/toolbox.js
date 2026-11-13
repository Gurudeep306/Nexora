// Toolbox: the open-source AI tools ecosystem, wired into Hive.
//
//  • catalogue()  — ~300 open-source tools (gateways, MCP servers, coding
//    agents, search, documents, vector stores, frameworks, automation,
//    media, local runtimes, evals, infra) from the team's research, each
//    tagged with HOW Hive can use it:
//      provider     → an OpenAI-compatible endpoint: add it in Keys
//      search       → a web search / page reader engine for chat and agents
//      mcp          → any remote MCP server: its tools appear in chat & agents
//      skill        → a skill / rules pack imported as a Hive plugin
//      builtin      → Hive already does this (names the built-in)
//      machine      → a CLI that runs on a worker machine
//      subscription → a subscription CLI (Claude Code / Codex)
//      reference    → useful to know; open the project
//  • Integrations — connected MCP servers and search engines (secrets sealed
//    in the vault, shared by the whole staff workspace).
//  • A tiny MCP client (Streamable HTTP + SSE replies, JSON-RPC 2.0).
const dns = require("dns").promises;
const { run, all, get, newId, now, json } = require("./db");
const vault = require("./vault");
const { privateIp } = require("./plugins");

const DATA = require("./ecosystem.json");

const CATEGORIES = {
  gateways: { label: "Model gateways & routers", hint: "One endpoint for many models — add as a provider in Keys" },
  mcp: { label: "MCP: protocol & registries", hint: "Build, find and debug MCP servers" },
  integrations: { label: "MCP integrations", hint: "GitHub, Slack, Notion, Linear, Sentry, cloud… as tools for agents" },
  coding: { label: "Coding agents & skills", hint: "Terminal/IDE agents, skills and plugin packs" },
  web: { label: "Browser, search & crawling", hint: "Search the web, read pages, drive a browser" },
  docs: { label: "Files & documents", hint: "PDF, Office, OCR and knowledge tools" },
  data: { label: "Databases, RAG & code intel", hint: "Vector stores, retrieval and code context" },
  agents: { label: "Agent frameworks & memory", hint: "Orchestration, memory and structured output" },
  automation: { label: "Workflow automation", hint: "n8n-style automation, messaging and apps" },
  creative: { label: "Image, video & design", hint: "ComfyUI, diffusion and video toolchains" },
  audio: { label: "Speech & audio", hint: "Transcription, TTS, voice and media" },
  local: { label: "Local models & fine-tuning", hint: "Run open models on your own GPU" },
  observability: { label: "Evals, tracing & cost", hint: "Trace, evaluate and guard models" },
  infra: { label: "Sandboxes & infrastructure", hint: "Containers, secrets and security scanning" },
};

const SEARCH_ENGINES = {
  tavily: { label: "Tavily", needs: "key", docs: "https://app.tavily.com", does: ["search"] },
  exa: { label: "Exa", needs: "key", docs: "https://dashboard.exa.ai/api-keys", does: ["search"] },
  brave: { label: "Brave Search", needs: "key", docs: "https://api-dashboard.search.brave.com", does: ["search"] },
  searxng: { label: "SearXNG (self-hosted)", needs: "url", docs: "https://docs.searxng.org", does: ["search"] },
  jina: { label: "Jina Reader", needs: "key-optional", docs: "https://jina.ai/reader", does: ["read", "search"] },
  firecrawl: { label: "Firecrawl", needs: "key", docs: "https://www.firecrawl.dev/app/api-keys", does: ["read", "search"] },
};

/* ── integrations (connected MCP servers & search engines) ──────────── */
const pub = (r) => ({
  id: r.id,
  kind: r.kind,
  toolId: r.tool_id || null,
  name: r.name,
  url: r.url || "",
  engine: r.engine || null,
  hasSecret: !!r.secret_enc,
  enabled: !!r.enabled,
  tools: json(r.tools_json, []),
  status: r.status || "ok",
  error: r.error || null,
  createdBy: r.created_by,
  createdAt: r.created_at,
  checkedAt: r.checked_at || null,
});

async function integrations() {
  return (await all("SELECT * FROM hive_integrations ORDER BY created_at")).map(pub);
}

async function integrationRow(id) {
  const r = await get("SELECT * FROM hive_integrations WHERE id=?", [id]);
  if (!r) throw Object.assign(new Error("Integration not found"), { status: 404 });
  return r;
}

const secretOf = (r) => (r.secret_enc ? vault.open(r.secret_enc) : null);

/** Only public hosts (unless HIVE_ALLOW_PRIVATE_TOOLS=1 for self-hosted labs). */
async function guardUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || "").trim());
  } catch {
    throw Object.assign(new Error("Not a valid URL"), { status: 400 });
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw Object.assign(new Error("Use an http(s) URL"), { status: 400 });
  if (u.username || u.password) throw Object.assign(new Error("Put credentials in the token field, not the URL"), { status: 400 });
  if (process.env.HIVE_ALLOW_PRIVATE_TOOLS !== "1") {
    const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
    if (!addrs.length) throw Object.assign(new Error(`Can't resolve ${u.hostname}`), { status: 400 });
    if (addrs.some((a) => privateIp(a.address))) throw Object.assign(new Error("Only public hosts can be connected (set HIVE_ALLOW_PRIVATE_TOOLS=1 on the server to allow your own network)"), { status: 400 });
  }
  return u;
}

/* ── MCP client: Streamable HTTP (JSON or SSE replies) ──────────────── */
const PROTOCOL = "2025-06-18";
const sessions = new Map(); // integrationId → { sessionId, at }

async function rpc(url, token, sessionId, method, params, { id = Date.now(), notify = false, timeout = 30000 } = {}) {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": PROTOCOL, "User-Agent": "NexoraHive/1.0 (mcp)" };
  if (token) headers.Authorization = /^(bearer|basic|token) /i.test(token) ? token : `Bearer ${token}`;
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const body = notify ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), redirect: "error", signal: AbortSignal.timeout(timeout) });
  const sid = res.headers.get("mcp-session-id") || sessionId || null;
  if (notify) return { sessionId: sid };
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error(`The server refused the token (HTTP ${res.status})`), { kind: "auth" });
  if (res.status === 404 && sessionId) throw Object.assign(new Error("MCP session expired"), { kind: "session" });
  if (!res.ok) throw new Error(`MCP server answered HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  const text = (await res.text()).slice(0, 4_000_000);
  let msg = null;
  if (/event-stream/.test(type)) {
    for (const block of text.split(/\n\n/)) {
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n");
      if (!data) continue;
      try {
        const m = JSON.parse(data);
        if (m.id === id && (m.result !== undefined || m.error)) msg = m;
      } catch {
        /* keep reading */
      }
    }
  } else {
    try {
      msg = JSON.parse(text);
    } catch {
      throw new Error("The MCP server didn't return JSON");
    }
  }
  if (!msg) throw new Error("No reply from the MCP server");
  if (msg.error) throw new Error(`MCP error: ${msg.error.message || JSON.stringify(msg.error).slice(0, 200)}`);
  return { result: msg.result, sessionId: sid };
}

async function mcpSession(row, fresh = false) {
  const s = sessions.get(row.id);
  if (s && !fresh && Date.now() - s.at < 20 * 60_000) return s.sessionId;
  const url = (await guardUrl(row.url)).toString();
  const token = secretOf(row);
  const init = await rpc(url, token, null, "initialize", { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "nexora-hive", version: "1.0.0" } });
  await rpc(url, token, init.sessionId, "notifications/initialized", {}, { notify: true }).catch(() => {});
  sessions.set(row.id, { sessionId: init.sessionId, at: Date.now(), server: init.result?.serverInfo || null });
  return init.sessionId;
}

async function mcpCall(row, method, params) {
  const url = (await guardUrl(row.url)).toString();
  const token = secretOf(row);
  let sid = await mcpSession(row);
  try {
    return (await rpc(url, token, sid, method, params, { timeout: 90000 })).result;
  } catch (e) {
    if (e.kind !== "session") throw e;
    sid = await mcpSession(row, true);
    return (await rpc(url, token, sid, method, params, { timeout: 90000 })).result;
  }
}

/** Ask the server for its tools and store them. */
async function refreshTools(id) {
  const row = await integrationRow(id);
  try {
    const tools = [];
    let cursor;
    for (let page = 0; page < 10; page++) {
      const r = await mcpCall(row, "tools/list", cursor ? { cursor } : {});
      for (const t of r?.tools || []) tools.push({ name: String(t.name), description: String(t.description || "").slice(0, 1000), schema: t.inputSchema || { type: "object", properties: {} }, readOnly: !!t.annotations?.readOnlyHint });
      cursor = r?.nextCursor;
      if (!cursor) break;
    }
    await run("UPDATE hive_integrations SET tools_json=?, status='ok', error=NULL, checked_at=? WHERE id=?", [JSON.stringify(tools.slice(0, 120)), now(), id]);
    return tools;
  } catch (e) {
    await run("UPDATE hive_integrations SET status='error', error=?, checked_at=? WHERE id=?", [String(e.message).slice(0, 300), now(), id]);
    throw e;
  }
}

/* ── tool names exposed to models ───────────────────────────────────── */
const slug = (s, n) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, n) || "x";
const toolName = (row, t) => `mcp_${slug(row.name, 14)}_${slug(t.name, 40)}`.slice(0, 64);

function cleanSchema(s) {
  const out = s && typeof s === "object" && s.type === "object" ? { ...s } : { type: "object", properties: {} };
  delete out.$schema;
  if (!out.properties) out.properties = {};
  return out;
}

/** MCP tools from every enabled server, in the chat tools format. */
async function mcpTools({ limit = 60 } = {}) {
  const rows = await all("SELECT * FROM hive_integrations WHERE kind='mcp' AND enabled=1 ORDER BY created_at");
  const defs = [];
  for (const r of rows) {
    for (const t of json(r.tools_json, [])) {
      if (defs.length >= limit) break;
      defs.push({ name: toolName(r, t), description: `[${r.name}] ${t.description || t.name}`.slice(0, 1024), schema: cleanSchema(t.schema), _row: r.id, _tool: t.name, _ro: !!t.readOnly });
    }
  }
  return defs;
}

/** Run an mcp_* tool. Returns { content, isError, meta }. */
async function callMcpTool(name, input) {
  const defs = await mcpTools({ limit: 500 });
  const d = defs.find((x) => x.name === name);
  if (!d) return { content: `Unknown tool ${name}`, isError: true };
  return callServerTool(d._row, d._tool, input);
}

/** Run one tool on one connected server (also used by "Try it" in the UI). */
async function callServerTool(id, tool, input) {
  const row = await integrationRow(id);
  try {
    const r = await mcpCall(row, "tools/call", { name: String(tool), arguments: input || {} });
    const parts = [];
    for (const c of r?.content || []) {
      if (c.type === "text") parts.push(c.text);
      else if (c.type === "resource" && c.resource?.text) parts.push(c.resource.text);
      else if (c.type === "resource_link") parts.push(`${c.name || ""} ${c.uri || ""}`.trim());
      else if (c.type === "image") parts.push(`[image ${c.mimeType || ""}]`);
    }
    if (!parts.length && r?.structuredContent) parts.push(JSON.stringify(r.structuredContent, null, 1));
    return { content: parts.join("\n\n") || "(no output)", isError: !!r?.isError, meta: { server: row.name, tool: String(tool) } };
  } catch (e) {
    return { content: `${row.name}: ${e.message}`, isError: true };
  }
}

/* ── search engines ──────────────────────────────────────────────────── */
async function engines() {
  return all("SELECT * FROM hive_integrations WHERE kind='search' AND enabled=1 ORDER BY created_at");
}

const trimSnip = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 300);

async function searchWith(row, query) {
  const key = secretOf(row);
  const q = String(query).slice(0, 300);
  const opts = (h, body) => ({ method: body ? "POST" : "GET", headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...h }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  let res;
  switch (row.engine) {
    case "tavily":
      res = await fetch("https://api.tavily.com/search", opts({ Authorization: `Bearer ${key}` }, { query: q, max_results: 8 }));
      if (!res.ok) throw new Error(`Tavily ${res.status}`);
      return ((await res.json()).results || []).map((r) => ({ title: r.title, url: r.url, snippet: trimSnip(r.content) }));
    case "exa":
      res = await fetch("https://api.exa.ai/search", opts({ "x-api-key": key }, { query: q, numResults: 8, contents: { text: { maxCharacters: 400 } } }));
      if (!res.ok) throw new Error(`Exa ${res.status}`);
      return ((await res.json()).results || []).map((r) => ({ title: r.title || r.url, url: r.url, snippet: trimSnip(r.text) }));
    case "brave":
      res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`, opts({ "X-Subscription-Token": key }));
      if (!res.ok) throw new Error(`Brave ${res.status}`);
      return ((await res.json()).web?.results || []).map((r) => ({ title: r.title, url: r.url, snippet: trimSnip(String(r.description || "").replace(/<[^>]+>/g, "")) }));
    case "searxng": {
      const base = (await guardUrl(row.url)).toString().replace(/\/+$/, "");
      res = await fetch(`${base}/search?q=${encodeURIComponent(q)}&format=json`, opts(key ? { Authorization: `Bearer ${key}` } : {}));
      if (!res.ok) throw new Error(`SearXNG ${res.status} — enable the json format in settings.yml`);
      return ((await res.json()).results || []).slice(0, 8).map((r) => ({ title: r.title, url: r.url, snippet: trimSnip(r.content) }));
    }
    case "jina":
      res = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(q)}`, opts({ ...(key ? { Authorization: `Bearer ${key}` } : {}), "X-Respond-With": "no-content" }));
      if (!res.ok) throw new Error(`Jina ${res.status}`);
      return ((await res.json()).data || []).slice(0, 8).map((r) => ({ title: r.title, url: r.url, snippet: trimSnip(r.description || r.content) }));
    case "firecrawl":
      res = await fetch("https://api.firecrawl.dev/v2/search", opts({ Authorization: `Bearer ${key}` }, { query: q, limit: 8 }));
      if (!res.ok) throw new Error(`Firecrawl ${res.status}`);
      {
        const j = await res.json();
        const list = Array.isArray(j.data) ? j.data : j.data?.web || [];
        return list.map((r) => ({ title: r.title || r.url, url: r.url, snippet: trimSnip(r.description || r.markdown) }));
      }
    default:
      throw new Error(`Unknown engine ${row.engine}`);
  }
}

/** Search with the first connected engine that works; null when none is connected. */
async function search(query) {
  const rows = (await engines()).filter((r) => SEARCH_ENGINES[r.engine]?.does.includes("search"));
  let lastErr = null;
  for (const r of rows) {
    try {
      const out = await searchWith(r, query);
      return { results: out.filter((x) => x.url).slice(0, 8), engine: SEARCH_ENGINES[r.engine].label };
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr && !rows.length) throw lastErr;
  return null;
}

/** Read a page with Jina Reader / Firecrawl when connected (better on JS-heavy sites). Null when none. */
async function readPage(url) {
  await guardUrl(url);
  for (const r of (await engines()).filter((x) => SEARCH_ENGINES[x.engine]?.does.includes("read"))) {
    const key = secretOf(r);
    try {
      if (r.engine === "jina") {
        const res = await fetch(`https://r.jina.ai/${url}`, { headers: { Accept: "text/plain", ...(key ? { Authorization: `Bearer ${key}` } : {}) }, signal: AbortSignal.timeout(30000) });
        if (res.ok) return { text: (await res.text()).slice(0, 60000), via: "Jina Reader" };
      } else if (r.engine === "firecrawl") {
        const res = await fetch("https://api.firecrawl.dev/v2/scrape", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }), signal: AbortSignal.timeout(45000) });
        if (res.ok) {
          const j = await res.json();
          if (j.data?.markdown) return { text: j.data.markdown.slice(0, 60000), via: "Firecrawl" };
        }
      }
    } catch {
      /* next reader */
    }
  }
  return null;
}

/* ── connect / update / remove ───────────────────────────────────────── */
async function connect({ kind, name, url, token, engine, toolId }, by) {
  const t = now();
  const id = newId("int");
  if (kind === "mcp") {
    if (!url) throw Object.assign(new Error("Paste the MCP server's URL (Streamable HTTP endpoint, usually ending in /mcp)"), { status: 400 });
    const u = await guardUrl(url);
    await run(
      "INSERT INTO hive_integrations(id, kind, tool_id, name, url, engine, secret_enc, enabled, tools_json, status, created_by, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      [id, "mcp", toolId || null, String(name || u.hostname).slice(0, 40), u.toString(), null, token ? vault.seal(String(token).trim()) : null, 1, "[]", "new", by, t],
    );
    try {
      const tools = await refreshTools(id);
      return { id, tools: tools.length };
    } catch (e) {
      await run("DELETE FROM hive_integrations WHERE id=?", [id]);
      sessions.delete(id);
      throw Object.assign(new Error(`Couldn't connect: ${e.message}`), { status: 400 });
    }
  }
  if (kind === "search") {
    const meta = SEARCH_ENGINES[engine];
    if (!meta) throw Object.assign(new Error("Pick a search engine"), { status: 400 });
    if (meta.needs === "key" && !token) throw Object.assign(new Error(`${meta.label} needs an API key`), { status: 400 });
    let u = null;
    if (meta.needs === "url") u = (await guardUrl(url)).toString();
    await run(
      "INSERT INTO hive_integrations(id, kind, tool_id, name, url, engine, secret_enc, enabled, tools_json, status, created_by, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      [id, "search", toolId || null, meta.label, u, engine, token ? vault.seal(String(token).trim()) : null, 1, "[]", "ok", by, t],
    );
    if (meta.does.includes("search")) {
      try {
        await searchWith(await integrationRow(id), "open source ai tools");
      } catch (e) {
        await run("DELETE FROM hive_integrations WHERE id=?", [id]);
        throw Object.assign(new Error(`Test search failed: ${e.message}`), { status: 400 });
      }
    }
    return { id };
  }
  throw Object.assign(new Error("Unknown integration kind"), { status: 400 });
}

async function update(id, { enabled, name, token }) {
  const r = await integrationRow(id);
  await run("UPDATE hive_integrations SET enabled=?, name=?, secret_enc=? WHERE id=?", [
    enabled === undefined ? r.enabled : enabled ? 1 : 0,
    name ? String(name).slice(0, 40) : r.name,
    token === undefined ? r.secret_enc : token ? vault.seal(String(token).trim()) : null,
    id,
  ]);
  sessions.delete(id);
}

async function remove(id) {
  await integrationRow(id);
  await run("DELETE FROM hive_integrations WHERE id=?", [id]);
  sessions.delete(id);
}

/* ── skills: import a SKILL.md / rules pack from GitHub as a plugin ─── */
function rawUrls(input) {
  const s = String(input || "").trim();
  let m = s.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (m) return [`https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`];
  m = s.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+?)\/?$/);
  if (m) return ["SKILL.md", "README.md"].map((f) => `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}/${f}`);
  m = s.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?\/?$/);
  if (m) return ["main", "master"].flatMap((b) => ["SKILL.md", "README.md"].map((f) => `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${b}/${f}`));
  if (/^https:\/\/raw\.githubusercontent\.com\//.test(s)) return [s];
  throw Object.assign(new Error("Paste a GitHub link to a SKILL.md, a skill folder or a repository"), { status: 400 });
}

/** Fetch a skill and condense it into plugin instructions (a free model does the condensing). */
async function importSkill({ url, scope = "*", appliesTo = "all" }, by) {
  let text = null;
  let from = null;
  for (const u of rawUrls(url)) {
    const res = await fetch(u, { headers: { "User-Agent": "NexoraHive/1.0" }, signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (res?.ok) {
      text = (await res.text()).slice(0, 60000);
      from = u;
      break;
    }
  }
  if (!text) throw Object.assign(new Error("Couldn't find a SKILL.md or README at that link"), { status: 400 });
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (fm) for (const line of fm[1].split("\n")) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const body = fm ? text.slice(fm[0].length) : text;
  let name = meta.name || (body.match(/^#\s+(.+)$/m)?.[1] ?? "Imported skill");
  let description = meta.description || "";
  let instructions = body.trim();
  if (instructions.length > 6000) {
    const llm = require("./llm");
    const r = await llm
      .ask({
        kind: "writing",
        preference: "savings",
        freeOnly: true,
        json: true,
        system: "You condense agent skills into compact operating instructions. Keep every rule, step and constraint that changes behaviour; drop marketing, install steps and examples. Reply as JSON.",
        prompt: `Condense this skill into at most 5500 characters of imperative instructions for an AI agent.\nReply as {"name": "...", "description": "one line", "instructions": "..."}\n\n${instructions.slice(0, 40000)}`,
      })
      .catch(() => null);
    if (r?.data?.instructions) {
      instructions = String(r.data.instructions);
      name = meta.name || r.data.name || name;
      description = description || r.data.description || "";
    }
  }
  const id = newId("plg");
  const t = now();
  await run(
    "INSERT INTO hive_plugins(id, scope, kind, name, description, enabled, config_json, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    [id, scope, "instructions", String(name).slice(0, 60), String(description || `Imported from ${from}`).slice(0, 300), 1, JSON.stringify({ instructions: instructions.slice(0, 6000), appliesTo, source: from }), by, t, t],
  );
  return { id, name, description, source: from };
}

/* ── the catalogue, with what's connected ───────────────────────────── */
async function catalogue() {
  const ints = await integrations();
  const keyRows = await all("SELECT provider, base_url FROM hive_keys WHERE disabled=0").catch(() => []);
  const connectedVendors = new Set(keyRows.map((k) => k.provider));
  const byTool = new Map(ints.filter((i) => i.toolId).map((i) => [i.toolId, i]));
  const engineOn = new Set(ints.filter((i) => i.kind === "search" && i.enabled).map((i) => i.engine));
  const tools = DATA.tools.map((t) => {
    let connected = false;
    if (byTool.has(t.id)) connected = true;
    else if (t.use.how === "search") connected = engineOn.has(t.use.engine);
    else if (t.use.how === "provider" && t.use.vendor !== "custom") connected = connectedVendors.has(t.use.vendor);
    else if (t.use.how === "subscription") connected = connectedVendors.has(t.use.vendor);
    return { ...t, connected, integrationId: byTool.get(t.id)?.id || null };
  });
  return { snapshot: DATA.snapshot, categories: CATEGORIES, engines: SEARCH_ENGINES, directories: DATA.directories, tools, integrations: ints };
}

/** A compact index the Token Steward and chat can cite ("which tool for X?"). */
function compactIndex(cat) {
  return DATA.tools
    .filter((t) => !cat || t.cat === cat)
    .map((t) => `${t.name} [${t.cat}; ${t.use.how}] — ${t.what}`)
    .join("\n");
}

module.exports = { CATEGORIES, SEARCH_ENGINES, catalogue, integrations, connect, update, remove, refreshTools, mcpTools, callMcpTool, callServerTool, search, readPage, importSkill, compactIndex, guardUrl, rawUrls };
