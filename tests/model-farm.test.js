// The model farm gateway (deploy/model-farm/gateway.py): one address and one
// key in front of many model servers. A mock vLLM server stands in for the GPU.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

let python = null;
for (const p of ["python3", "python"]) {
  try {
    execFileSync(p, ["--version"], { stdio: "ignore" });
    python = p;
    break;
  } catch {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let upstream;
let gateway;
let base;

function mockVllm(name) {
  return http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      if (req.url === "/v1/models") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ data: [{ id: name }] }));
      }
      const b = JSON.parse(body || "{}");
      if (req.url === "/v1/embeddings") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ data: [{ embedding: [0.1, 0.2], index: 0 }], model: b.model }));
      }
      if (b.stream) {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Hel" } }], model: b.model })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "lo" } }] })}\n\n`);
        return res.end("data: [DONE]\n\n");
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ model: b.model, choices: [{ message: { role: "assistant", content: `hi from ${b.model}` } }] }));
    });
  });
}

test.before(async () => {
  if (!python) return;
  upstream = mockVllm("qwen3.8-27b");
  await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
  const port = 8900 + Math.floor(Math.random() * 600);
  base = `http://127.0.0.1:${port}`;
  gateway = spawn(python, [path.join(__dirname, "../deploy/model-farm/gateway.py")], {
    env: { ...process.env, FARM_KEY: "sekret", FARM_PORT: String(port), FARM_ROUTES: JSON.stringify({ "qwen3.8-27b": `http://127.0.0.1:${upstream.address().port}`, "down-model": "http://127.0.0.1:1" }) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/health`);
      return;
    } catch {
      await sleep(100);
    }
  }
});

test.after(() => {
  gateway?.kill();
  upstream?.close();
});

const auth = { Authorization: "Bearer sekret", "Content-Type": "application/json" };

test("farm gateway: the key is required, /health needs none and shows which models are up", { skip: !python && "python not installed" }, async () => {
  assert.equal((await fetch(`${base}/v1/models`)).status, 401);
  assert.equal((await fetch(`${base}/v1/models`, { headers: { Authorization: "Bearer wrong" } })).status, 401);
  const h = await (await fetch(`${base}/health`)).json();
  assert.equal(h.models["qwen3.8-27b"], true);
  assert.equal(h.models["down-model"], false);
  const m = await (await fetch(`${base}/v1/models`, { headers: auth })).json();
  assert.deepEqual(
    m.data.map((x) => x.id),
    ["qwen3.8-27b"],
    "only models that are up are listed",
  );
});

test("farm gateway: routes by model, streams, embeds, and explains unknown models", { skip: !python && "python not installed" }, async () => {
  const r = await (await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: auth, body: JSON.stringify({ model: "qwen3.8-27b", messages: [{ role: "user", content: "hi" }] }) })).json();
  assert.equal(r.choices[0].message.content, "hi from qwen3.8-27b");
  // A Hugging Face style id maps to the served name.
  const r2 = await (await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: auth, body: JSON.stringify({ model: "Qwen/Qwen3.8-27B", messages: [] }) })).json();
  assert.equal(r2.model, "qwen3.8-27b");
  const s = await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: auth, body: JSON.stringify({ model: "qwen3.8-27b", stream: true, messages: [] }) });
  assert.match(s.headers.get("content-type"), /event-stream/);
  const text = await s.text();
  assert.ok(text.includes('"Hel"') && text.includes("[DONE]"), text);
  const e = await (await fetch(`${base}/v1/embeddings`, { method: "POST", headers: auth, body: JSON.stringify({ model: "qwen3.8-27b", input: "x" }) })).json();
  assert.equal(e.data[0].embedding.length, 2);
  const miss = await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: auth, body: JSON.stringify({ model: "nope", messages: [] }) });
  assert.equal(miss.status, 404);
  assert.match((await miss.json()).error.message, /does not exist on this farm/);
  const down = await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: auth, body: JSON.stringify({ model: "down-model", messages: [] }) });
  assert.equal(down.status, 503);
});
