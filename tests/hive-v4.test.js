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

test("long chats are compacted into a cached summary by the Token Steward (written in the background)", async () => {
  await ok("PUT", "/api/hive/plugins/builtin/token_steward", { enabled: true, config: { triggerTokens: 600, keepTokens: 250 } });
  const boot = await ok("GET", "/api/hive/bootstrap");
  const key = boot.keys[0];
  const { convo } = await ok("POST", "/api/hive/convos", {});
  const long = "Here are the details of the project we discussed. ".repeat(40);
  let notes = "";
  // The summary is written in the background (never delaying a reply) and used from the next message on.
  for (let i = 0; i < 8; i++) {
    await sleep(300);
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

test("a model the provider retired is skipped: chat moves to the key's next model and never picks it again", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const key = boot.keys[0];
  const { convo } = await ok("POST", "/api/hive/convos", {});
  const r = await fetch(`${base}/api/hive/convos/${convo.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: base },
    body: JSON.stringify({ text: "Hello", agent: { provider: key.provider, keyId: key.id, model: "demo-retired" }, stream: true }),
  });
  const events = (await r.text()).trim().split("\n").map((l) => JSON.parse(l));
  const done = events.find((e) => e.type === "done");
  assert.ok(done, "a reply finished");
  assert.ok(!done.data?.error && !done.error, `no error shown: ${JSON.stringify(done)}`);
  assert.notEqual(done.data?.model ?? done.model, "demo-retired");
  assert.ok(events.some((e) => e.type === "note" && /isn't available any more/.test(JSON.stringify(e))), "the switch is explained");
  const after = (await ok("GET", "/api/hive/bootstrap")).keys.find((k) => k.id === key.id);
  assert.ok(!after.models.includes("demo-retired"), "the retired model is dropped from the key");
  await ok("POST", `/api/hive/keys/${key.id}/check`).catch(() => null);
  const rechecked = (await ok("GET", "/api/hive/bootstrap")).keys.find((k) => k.id === key.id);
  assert.ok(!rechecked.models.includes("demo-retired"), "and stays dropped after the model list is refreshed");
});

test("agent health: calls are recorded, probes run, and the board reports each agent", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const key = boot.keys[0];
  const pr = await ok("POST", "/api/hive/health/probe", { keyId: key.id });
  assert.equal(pr.results[0].ok, true, JSON.stringify(pr.results[0]));
  const board = (await ok("GET", "/api/hive/health")).keys.find((k) => k.keyId === key.id);
  assert.equal(board.state, "healthy");
  assert.ok(board.models.some((m) => m.ok > 0 && m.latencyMs != null));
});

test("the Dispatcher splits a request, assigns each part, and runs the team in dependency waves", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const project = boot.projects.find((p) => !p.machine_id) || boot.projects[0];
  const { dispatch } = await ok("POST", "/api/hive/dispatches", { projectId: project.id, request: "Add quantities to the cart, then document it" });
  assert.equal(dispatch.status, "planned");
  assert.equal(dispatch.plan.parts.length, 3);
  assert.deepEqual(dispatch.plan.parts.map((p) => p.kind), ["reading", "coding", "writing"]);
  assert.ok(dispatch.plan.parts.every((p) => p.pick && p.estimate), "every part has a model and an estimate");
  assert.deepEqual(dispatch.plan.parts[1].dependsOn, ["p1"]);
  const edited = (await ok("PATCH", `/api/hive/dispatches/${dispatch.id}`, { partId: "p3", remove: true })).dispatch;
  assert.equal(edited.plan.parts.length, 2);
  const started = (await ok("POST", `/api/hive/dispatches/${dispatch.id}/start`, {})).dispatch;
  assert.equal(started.status, "running");
  assert.ok(started.taskId);
  let d;
  for (let i = 0; i < 160; i++) {
    await sleep(250);
    d = (await ok("GET", `/api/hive/dispatches?project=${project.id}`)).dispatches.find((x) => x.id === dispatch.id);
    if (!["running", "planned"].includes(d.status)) break;
  }
  assert.equal(d.status, "done", JSON.stringify(d.error || d.progress));
  assert.equal(d.progress.p1.status, "done");
  assert.equal(d.progress.p2.status, "done");
  const t = await ok("GET", `/api/hive/tasks/${d.taskId}`);
  const stages = t.events.filter((e) => e.kind === "pipeline").map((e) => e.data.stage);
  assert.ok(stages.includes("Map the cart code") && stages.includes("Add quantity support"));
  assert.ok(t.agents.length >= 2);
});

test("routing keeps quality first: a faster but weaker model never beats a clearly better one", () => {
  const { rank } = require("../src/hive/router");
  const mk = (name, quality, speed, latencyMs) => ({ key: { id: name }, vendor: "x", model: name, card: { speed, name }, cost: "free", quality, priority: 0, latencyMs });
  const strong = mk("strong", 90, 2, 9000);
  const quick = mk("quick", 72, 5, 600);
  for (const pref of ["balanced", "fast", "savings", "quality"]) assert.equal(rank([quick, strong], "coding", pref).ranked[0].model, "strong", pref);
  // Similar quality: the faster one wins.
  const a = mk("a", 88, 2, 9000);
  const b = mk("b", 87, 5, 700);
  assert.equal(rank([a, b], "coding", "fast").ranked[0].model, "b");
  assert.equal(rank([a, b], "coding", "balanced").ranked[0].model, "b");
});

test("Hive Copilot operates the hive with tools, starts a session, and reviews it by itself when it finishes", async () => {
  const st = await ok("GET", "/api/hive/copilot");
  assert.ok(st.brain && !st.brain.error, JSON.stringify(st.brain));
  const r = await fetch(`${base}/api/hive/copilot`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: base }, body: JSON.stringify({ text: "Add quantities to the cart in the demo shop" }) });
  const events = (await r.text()).trim().split("\n").map((l) => JSON.parse(l));
  const tools = events.filter((e) => e.type === "tool_done").map((e) => e.data.tool);
  assert.deepEqual(tools.map((t) => t.name), ["hive_overview", "start_session"]);
  assert.ok(tools.every((t) => t.status === "done"), JSON.stringify(tools));
  const started = JSON.parse(tools[1].preview);
  assert.ok(started.sessionId, tools[1].preview);
  const done = events.find((e) => e.type === "done").data.message;
  assert.match(done.content, /Cart quantities/);
  // The Copilot watches the session and reviews it when it finishes.
  let review;
  for (let i = 0; i < 160 && !review; i++) {
    await sleep(250);
    review = (await ok("GET", "/api/hive/copilot")).messages.find((m) => m.role === "assistant" && m.auto);
  }
  assert.ok(review, "an automatic review was posted");
  assert.match(review.content, /Ready to ship/);
  assert.ok(review.tools.some((t) => t.name === "session_detail"));
  await ok("DELETE", "/api/hive/copilot");
  assert.equal((await ok("GET", "/api/hive/copilot")).messages.length, 0);
});

test("the Copilot's MCP endpoint (for Claude Code on your plan) speaks JSON-RPC and needs a live token", async () => {
  const bad = await fetch(`${base}/api/hive-mcp`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer nope" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  assert.equal(bad.status, 401);
  const copilot = require("../src/hive/copilot");
  const names = copilot.toolDefs().map((t) => t.name);
  for (const n of ["hive_overview", "list_models", "start_session", "plan_team", "start_team", "session_diff", "judge_session", "improve_prompt", "web_search"]) assert.ok(names.includes(n), n);
  // In-process: a valid token lists the tools.
  copilot._tokens.set("t1", { username: "owner", exp: Date.now() + 60000 });
  let out;
  const res = { status: () => res, json: (j) => (out = j), end: () => {} };
  await copilot.mcpHandle({ method: "POST", headers: { authorization: "Bearer t1" }, body: { jsonrpc: "2.0", id: 7, method: "initialize", params: { protocolVersion: "2025-06-18" } } }, res, {});
  assert.equal(out.result.serverInfo.name, "nexora-hive");
  await copilot.mcpHandle({ method: "POST", headers: { authorization: "Bearer t1" }, body: { jsonrpc: "2.0", id: 8, method: "tools/list" } }, res, {});
  assert.ok(out.result.tools.length >= 15 && out.result.tools.every((t) => t.inputSchema?.type === "object"));
});
