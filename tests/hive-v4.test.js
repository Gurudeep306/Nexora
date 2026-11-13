// Hive v4 end to end, through the demo harness (scripts/hive-demo.js):
// the open-source toolbox catalogue, connecting a remote MCP server (a mock
// Streamable HTTP server here: JSON replies, SSE replies and a session id),
// trying its tools, the Token Steward's audit / one-click fixes / prompt plan,
// and the Steward's chat compaction.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PORT = 3800 + Math.floor(Math.random() * 400);
const base = `http://localhost:${PORT}`;
let demo;
let mcp;
let mcpUrl;
let cookie = "";
const seen = { sessions: new Set(), auth: new Set() };

async function call(method, url, body) {
  const r = await fetch(base + url, { method, headers: { "Content-Type": "application/json", Cookie: cookie, Origin: base }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}
const ok = async (method, url, body) => {
  const r = await call(method, url, body);
  assert.ok(r.status < 300, `${method} ${url} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A tiny MCP server: initialize → session id; tools/list as JSON; tools/call as SSE. */
function startMcp() {
  return new Promise((resolve) => {
    mcp = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (d) => (raw += d));
      req.on("end", () => {
        seen.auth.add(req.headers.authorization || "");
        const msg = JSON.parse(raw || "{}");
        if (!msg.id) return res.writeHead(202).end();
        if (msg.method === "initialize") {
          res.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "sess-1" });
          return res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "mock", version: "1" } } }));
        }
        seen.sessions.add(req.headers["mcp-session-id"]);
        if (msg.method === "tools/list") {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              result: {
                tools: [
                  { name: "echo", description: "Echo text back", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }, annotations: { readOnlyHint: true } },
                  { name: "add-numbers", description: "Add two numbers", inputSchema: { $schema: "http://json-schema.org/draft-07/schema#", type: "object", properties: { a: { type: "number" }, b: { type: "number" } } } },
                ],
              },
            }),
          );
        }
        if (msg.method === "tools/call") {
          const { name, arguments: a } = msg.params;
          if (!["echo", "add-numbers"].includes(name)) {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { isError: true, content: [{ type: "text", text: `Unknown tool ${name}` }] } }));
          }
          const text = name === "echo" ? `echo: ${a.text}` : String(Number(a.a) + Number(a.b));
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          res.write(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/progress", params: {} })}\n\n`);
          return res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text }] } })}\n\n`);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "nope" } }));
      });
    });
    mcp.listen(0, () => {
      mcpUrl = `http://localhost:${mcp.address().port}/mcp`;
      resolve();
    });
  });
}

test.before(async () => {
  await startMcp();
  demo = spawn(process.execPath, [path.join(__dirname, "..", "scripts", "hive-demo.js")], {
    env: { ...process.env, PORT: String(PORT), HIVE_ALLOW_PRIVATE_TOOLS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  demo.stdout.on("data", (d) => (out += d));
  demo.stderr.on("data", (d) => (out += d));
  for (let i = 0; i < 240 && !out.includes("Hive demo ready"); i++) {
    if (demo.exitCode !== null) throw new Error(`demo exited:\n${out}`);
    await sleep(250);
  }
  assert.ok(out.includes("Hive demo ready"), out);
  await ok("POST", "/api/user/login", { username: "owner", password: "owner123" });
});

test.after(() => {
  demo?.kill("SIGTERM");
  mcp?.close();
});

test("the toolbox lists the open-source ecosystem with how Hive uses each tool", async () => {
  const t = await ok("GET", "/api/hive/toolbox");
  assert.ok(t.tools.length >= 300, `only ${t.tools.length} tools`);
  assert.ok(Object.keys(t.categories).length >= 14);
  assert.ok(t.directories.length >= 15);
  const by = (n) => t.tools.find((x) => x.name === n);
  assert.equal(by("LiteLLM").use.how, "provider");
  assert.equal(by("SearXNG").use.how, "search");
  assert.equal(by("Repomix").use.how, "builtin");
  assert.equal(by("Superpowers").use.how, "skill");
  assert.ok(t.tools.every((x) => /^https?:\/\//.test(x.url)), "every tool links to its project");
  assert.equal(new Set(t.tools.map((x) => x.id)).size, t.tools.length, "ids are unique");
});

test("a remote MCP server connects, lists tools, and its tools run (JSON + SSE replies, session id, token)", async () => {
  const bad = await call("POST", "/api/hive/toolbox/connect", { kind: "mcp", url: "ftp://nope" });
  assert.equal(bad.status, 400);
  const r = await ok("POST", "/api/hive/toolbox/connect", { kind: "mcp", name: "Mock", url: mcpUrl, token: "tok-123", toolId: "memory-mcp" });
  assert.equal(r.tools, 2);
  const t = await ok("GET", "/api/hive/toolbox");
  const int = t.integrations.find((i) => i.id === r.id);
  assert.ok(int && int.enabled && int.hasSecret && int.tools.length === 2);
  assert.equal(t.tools.find((x) => x.id === "memory-mcp").connected, true);
  const echo = await ok("POST", `/api/hive/toolbox/integrations/${r.id}/call`, { tool: "echo", input: { text: "hi" } });
  assert.equal(echo.content, "echo: hi");
  assert.ok(!echo.isError);
  const sum = await ok("POST", `/api/hive/toolbox/integrations/${r.id}/call`, { tool: "add-numbers", input: { a: 2, b: 3 } });
  assert.equal(sum.content, "5");
  assert.ok(seen.sessions.has("sess-1"), "session id is sent back");
  assert.ok(seen.auth.has("Bearer tok-123"), "token is sent as a bearer token");
  const missing = await ok("POST", `/api/hive/toolbox/integrations/${r.id}/call`, { tool: "nope", input: {} });
  assert.ok(missing.isError);
  await ok("PATCH", `/api/hive/toolbox/integrations/${r.id}`, { enabled: false });
  assert.equal((await ok("GET", "/api/hive/toolbox")).integrations.find((i) => i.id === r.id).enabled, false);
  await ok("DELETE", `/api/hive/toolbox/integrations/${r.id}`);
  assert.equal((await ok("GET", "/api/hive/toolbox")).integrations.length, 0);
});

test("the Token Steward audits spend, applies a fix in one click and plans a prompt", async () => {
  await ok("PUT", "/api/hive/plugins/builtin/repo_map", { enabled: false });
  const rep = await ok("GET", "/api/hive/steward?days=30");
  assert.ok(rep.score >= 0 && rep.score <= 100);
  assert.ok(Array.isArray(rep.tips) && rep.tips.length > 0);
  const tip = rep.tips.find((t) => t.id === "repo_map");
  assert.ok(tip, "suggests turning the repo map back on");
  await ok("POST", "/api/hive/steward/apply", { action: tip.action });
  const after = await ok("GET", "/api/hive/steward?days=30");
  assert.ok(!after.tips.some((t) => t.id === "repo_map"));
  assert.ok(after.savers.find((s) => s.id === "repo_map").enabled);
  assert.ok(after.savers.find((s) => s.id === "token_steward").enabled, "the Steward is on by default");
  const plan = await ok("POST", "/api/hive/steward/plan", { prompt: "Rename the variable foo to bar in utils.js", chat: false });
  assert.ok(plan.kind && plan.cheapest && plan.best);
});

test("long chats are compacted into a cached summary by the Token Steward", async () => {
  await ok("PUT", "/api/hive/plugins/builtin/token_steward", { enabled: true, config: { triggerTokens: 600, keepTokens: 250 } });
  const boot = await ok("GET", "/api/hive/bootstrap");
  const key = boot.keys[0];
  const { convo } = await ok("POST", "/api/hive/convos", {});
  const long = "Here are the details of the project we discussed. ".repeat(40);
  let notes = "";
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${base}/api/hive/convos/${convo.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: base },
      body: JSON.stringify({ text: `Turn ${i}. ${long}`, agent: { provider: key.provider, keyId: "auto" }, stream: true }),
    });
    assert.ok(r.status < 300, `send ${r.status}`);
    notes += await r.text();
  }
  assert.match(notes, /Token Steward folded \d+ earlier messages/);
  await ok("PUT", "/api/hive/plugins/builtin/token_steward", { enabled: true, config: { triggerTokens: 24000, keepTokens: 8000 } });
});
