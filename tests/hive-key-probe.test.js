// A gateway that serves chat but not GET /models (404) still connects: Hive
// checks the chat endpoint at the same address and falls back to the vendor's
// suggested models (each later tested with a real call). If nothing answers
// there, the error says to fix the address. Never tries other hosts.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

function server(handler) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      req.resume();
      req.on("end", () => handler(req, res));
    });
    s.listen(0, "127.0.0.1", () => resolve({ s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

test.before(async () => {
  process.env.DB_PATH = ":memory:";
  await require("../src/hive/db").initHiveDb();
});

test("models 404 but chat answers → the key connects with suggested models", async () => {
  const hits = [];
  const { s, url } = await server((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    if (req.url.endsWith("/chat/completions")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ choices: [{ message: { content: "h" } }] }));
    }
    res.writeHead(404).end();
  });
  try {
    const keys = require("../src/hive/keys");
    const id = await keys.createKey({ provider: "oneaiapikey", label: "One", apiKey: "sk-one-abcdefghijkl", baseUrl: `${url}/v1` }, "u");
    const r = await keys.checkKey(id);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(r.models.includes("openai/gpt-5"));
    assert.deepEqual(hits, ["GET /v1/models", "POST /v1/chat/completions"], "only the address the user gave");
  } finally {
    s.close();
  }
});

test("models and chat both 404 → a clear 'fix the address' error", async () => {
  const { s, url } = await server((req, res) => res.writeHead(404).end());
  try {
    const keys = require("../src/hive/keys");
    const id = await keys.createKey({ provider: "oneaiapikey", label: "One bad", apiKey: "sk-one-abcdefghijkl", baseUrl: `${url}/v1` }, "u");
    const r = await keys.checkKey(id);
    assert.equal(r.ok, false);
    assert.match(r.error, /Nothing answers at .*Address/);
  } finally {
    s.close();
  }
});
