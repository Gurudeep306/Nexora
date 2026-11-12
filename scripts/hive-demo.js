#!/usr/bin/env node
// Hive demo / local playground — no real API keys needed.
//
//   node scripts/hive-demo.js            # http://localhost:3300, user "owner" / "owner123"
//
// Starts a mock AI provider (OpenAI-compatible streaming, with tool calls for
// agents), a mock GitHub (one small repo), and the real Nexora server against
// a throwaway SQLite file, then signs up the owner, connects GitHub, adds a key
// and creates a project. Open the printed URL and sign in.
const http = require("node:http");
const zlib = require("node:zlib");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.PORT || 3300);
const OWNER = process.env.DEMO_OWNER || "owner";
const PASSWORD = "owner123";
const GH_TOKEN = "ghp_demo_token_0000000000";

const REPO = {
  "README.md": "# Demo shop\n\nA tiny Express shop used to try Hive.\n",
  "package.json": JSON.stringify({ name: "demo-shop", version: "1.0.0", main: "src/server.js", scripts: { start: "node src/server.js", test: "node --test" } }, null, 2) + "\n",
  "src/server.js": "const express = require('express');\nconst { cart } = require('./cart');\n\nconst app = express();\napp.get('/cart', (req, res) => res.json(cart.items));\napp.listen(3000);\n",
  "src/cart.js": "const cart = { items: [] };\n\nfunction add(item) {\n  cart.items.push(item);\n}\n\nfunction total() {\n  return cart.items.reduce((s, i) => s + i.price, 0);\n}\n\nmodule.exports = { cart, add, total };\n",
  "test/cart.test.js": "const test = require('node:test');\nconst assert = require('node:assert');\nconst { add, total } = require('../src/cart');\n\ntest('total', () => {\n  add({ price: 2 });\n  assert.equal(total(), 2);\n});\n",
};

function tarGz(files) {
  const blocks = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const h = Buffer.alloc(512);
    h.write(name, 0, 100, "utf8");
    h.write("0000644\0", 100);
    h.write("0000000\0", 108);
    h.write("0000000\0", 116);
    h.write(data.length.toString(8).padStart(11, "0") + "\0", 124);
    h.write("00000000000\0", 136);
    h.write("        ", 148);
    h.write("0", 156);
    h.write("ustar\0", 257);
    h.write("00", 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
    blocks.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks));
}

const REPLY = `Here's a quick overview.

**What it does**
- \`src/cart.js\` keeps an in-memory cart with \`add()\` and \`total()\`.
- \`src/server.js\` exposes \`GET /cart\`.

\`\`\`js
function total() {
  return cart.items.reduce((sum, item) => sum + item.price * (item.qty ?? 1), 0);
}
\`\`\`

| Check | Status |
|---|---|
| Tests | 1 passing |
| Lint | not configured |

Want me to add quantities and a \`DELETE /cart/:id\` route?`;

function sseOpenAi(res, { text = "", reasoning = "", calls = [] }) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "x-ratelimit-remaining-tokens": "180000", "x-ratelimit-limit-tokens": "200000" });
  const chunks = [];
  for (const piece of reasoning.match(/.{1,24}/gs) || []) chunks.push({ choices: [{ delta: { reasoning: piece } }] });
  for (const piece of text.match(/.{1,12}/gs) || []) chunks.push({ choices: [{ delta: { content: piece } }] });
  calls.forEach((c, i) => chunks.push({ choices: [{ delta: { tool_calls: [{ index: i, id: `call_${Date.now()}_${i}`, function: { name: c.name, arguments: JSON.stringify(c.input) } }] } }] }));
  chunks.push({ choices: [{ delta: {}, finish_reason: calls.length ? "tool_calls" : "stop" }], usage: { prompt_tokens: 812, completion_tokens: 240 } });
  let i = 0;
  const tick = () => {
    if (i < chunks.length) {
      res.write(`data: ${JSON.stringify(chunks[i++])}\n\n`);
      setTimeout(tick, 18);
    } else {
      res.end("data: [DONE]\n\n");
    }
  };
  tick();
}

function startMock() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        const u = new URL(req.url, "http://x");
        const p = u.pathname;
        const json = (s, o) => {
          res.writeHead(s, { "Content-Type": "application/json" });
          res.end(JSON.stringify(o));
        };
        // ── AI provider ──
        if (p.endsWith("/models")) return json(200, { data: [{ id: "demo-coder-large" }, { id: "demo-coder-mini" }, { id: "demo-vision-2" }] });
        if (p.endsWith("/chat/completions")) {
          const b = JSON.parse(body || "{}");
          const msgs = b.messages || [];
          const toolRounds = msgs.filter((m) => m.role === "tool").length;
          if (b.tools?.length) {
            // A tiny agent: read, edit, finish.
            if (toolRounds === 0) return sseOpenAi(res, { reasoning: "Let me read the cart first.", text: "I'll look at the cart module.", calls: [{ name: "read_file", input: { path: "src/cart.js" } }] });
            if (toolRounds === 1)
              return sseOpenAi(res, {
                text: "Adding quantity support.",
                calls: [{ name: "edit_file", input: { path: "src/cart.js", old_string: "return cart.items.reduce((s, i) => s + i.price, 0);", new_string: "return cart.items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);" } }],
              });
            const canRun = b.tools.some((t) => t.function?.name === "run_command");
            if (toolRounds === 2 && canRun) return sseOpenAi(res, { text: "Running the tests.", calls: [{ name: "run_command", input: { command: "node --test" } }] });
            return sseOpenAi(res, { text: "All set — totals now multiply by quantity.", calls: [{ name: "finish", input: { summary: "Cart totals now respect item quantities. Tests pass." } }] });
          }
          return sseOpenAi(res, { reasoning: "The user wants an overview of the repo. I'll summarise the two modules.", text: REPLY });
        }
        // ── GitHub ──
        if ((p.startsWith("/user") || p.startsWith("/repos")) && req.headers.authorization !== `Bearer ${GH_TOKEN}`) return json(401, { message: "Bad credentials" });
        if (p === "/user") return json(200, { login: "octo" });
        if (p === "/user/repos") return json(200, [{ name: "demo-shop", full_name: "octo/demo-shop", owner: { login: "octo" }, default_branch: "main", private: false, description: "Demo shop", pushed_at: new Date().toISOString() }]);
        if (p === "/repos/octo/demo-shop") return json(200, { name: "demo-shop", owner: { login: "octo" }, default_branch: "main", description: "Demo shop" });
        if (p.startsWith("/repos/octo/demo-shop/branches")) return json(200, [{ name: "main" }]);
        if (p.startsWith("/repos/octo/demo-shop/commits/")) return json(200, { sha: "a".repeat(40), commit: { tree: { sha: "t".repeat(40) } } });
        if (p.startsWith("/repos/octo/demo-shop/git/trees/")) return json(200, { truncated: false, tree: Object.keys(REPO).map((f) => ({ path: f, type: "blob", mode: "100644", size: REPO[f].length })) });
        if (p.startsWith("/repos/octo/demo-shop/tarball/")) {
          res.writeHead(200, { "Content-Type": "application/gzip" });
          return res.end(tarGz(Object.fromEntries(Object.entries(REPO).map(([k, v]) => [`octo-demo-shop-aaaa/${k}`, v]))));
        }
        if (p.startsWith("/repos/octo/demo-shop/git/ref/heads/")) return json(404, { message: "Not Found" });
        if (p === "/repos/octo/demo-shop/git/blobs") return json(201, { sha: "b".repeat(40) });
        if (p === "/repos/octo/demo-shop/git/trees") return json(201, { sha: "n".repeat(40) });
        if (p === "/repos/octo/demo-shop/git/commits") return json(201, { sha: "c".repeat(40) });
        if (p === "/repos/octo/demo-shop/git/refs") return json(201, { ref: JSON.parse(body).ref });
        if (p === "/repos/octo/demo-shop/pulls") return json(201, { html_url: "https://github.com/octo/demo-shop/pull/1", number: 1 });
        json(404, { message: `mock: no route ${req.method} ${p}` });
      });
    });
    srv.listen(0, "127.0.0.1", () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

async function main() {
  const mock = await startMock();
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hive-demo-")), "demo.db");
  const base = `http://localhost:${PORT}`;
  const proc = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "development", DB_PATH: dbPath, DISABLE_PUPPETEER: "1", DISABLE_SCRAPER: "1", OWNER_USERNAME: OWNER, HIVE_GITHUB_API: mock.url, HIVE_DEMO: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
  process.on("SIGINT", () => (proc.kill(), process.exit(0)));
  process.on("SIGTERM", () => (proc.kill(), process.exit(0)));
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    if (proc.exitCode !== null || i > 200) throw new Error(`server failed:\n${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  let cookie = "";
  const call = async (method, url, body) => {
    const r = await fetch(base + url, { method, headers: { "Content-Type": "application/json", Cookie: cookie, Origin: base }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${method} ${url} → ${r.status} ${JSON.stringify(j)}`);
    return j;
  };
  await call("POST", "/api/user/register", { username: OWNER, password: PASSWORD });
  const gh = await call("POST", "/api/hive/github", { label: "octo", token: GH_TOKEN });
  await call("POST", "/api/hive/keys", { provider: "custom", label: "Demo AI", apiKey: "demo-key-123456", baseUrl: `${mock.url}/v1`, defaultModel: "demo-coder-large" });
  const ghId = gh.github?.id || gh.id || gh.account?.id;
  await call("POST", "/api/hive/projects", { githubId: ghId, owner: "octo", repo: "demo-shop", name: "Demo shop" }).catch((e) => console.warn("project:", e.message));
  // A machine: the real bridge, on a git checkout of the demo repo.
  const machine = await call("POST", "/api/hive/machines", { name: "Demo laptop" });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hive-machine-"));
  const repoDir = path.join(root, "demo-shop");
  for (const [f, c] of Object.entries(REPO)) {
    fs.mkdirSync(path.dirname(path.join(repoDir, f)), { recursive: true });
    fs.writeFileSync(path.join(repoDir, f), c);
  }
  const { execSync } = require("node:child_process");
  execSync('git init -q -b main && git add -A && git -c user.name=demo -c user.email=d@d commit -qm "initial"', { cwd: repoDir });
  const bridge = spawn(process.execPath, [path.join(__dirname, "..", "bridge", "hive-bridge.js"), "--server", base, "--token", machine.token, "--root", root], { stdio: ["ignore", "pipe", "pipe"] });
  bridge.stdout.on("data", (d) => process.env.DEMO_LOG && process.stdout.write(`[bridge] ${d}`));
  process.on("exit", () => bridge.kill());
  await new Promise((r) => setTimeout(r, 1500));
  await call("PATCH", "/api/hive/machines/" + machine.id, { policy: process.env.DEMO_POLICY || "ask" });
  await call("POST", "/api/hive/projects", { name: "Shop (laptop)", machineId: machine.id, folder: repoDir, color: "green" }).catch((e) => console.warn("local project:", e.message));
  console.log(`\nHive demo ready → ${base}/hive   (sign in as ${OWNER} / ${PASSWORD})\nMock provider + GitHub: ${mock.url}\n`);
  if (process.env.DEMO_LOG) proc.stdout.pipe(process.stdout);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
