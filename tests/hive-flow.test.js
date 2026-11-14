// The Copilot → workers → judge flow: routing by kind, tolerant verdict parsing,
// and per-model exclusion when one model of a key fails.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_PATH = ":memory:";
process.env.NODE_ENV = "test";

test("a long prompt the Copilot wrote keeps its kind; a long one from a person is still 'hard'", () => {
  const router = require("../src/hive/router");
  const prompt = `Add a unit test for the cart total function in src/cart.js.\n${"Context line about the cart module and how totals are computed. ".repeat(80)}`;
  assert.ok(prompt.length > 4000);
  assert.equal(router.classify(prompt).kind, "hard", "a person's long request is treated as hard");
  assert.notEqual(router.classify(prompt, { byPerson: false }).kind, "hard", "a written brief is not hard just for being long");
});

test("verdict JSON the way models write it still parses", () => {
  const { extractJson } = require("../src/hive/llm");
  const messy = 'Here is my verdict:\n```json\n{\n  winner: "B",\n  // B passes the tests\n  ranking: [{candidate: \'B\', score: 8,}, {candidate: "A", score: 5}],\n  reason: "B handles empty carts",\n}\n```';
  const v = extractJson(messy);
  assert.equal(v.winner, "B");
  assert.equal(v.ranking.length, 2);
  assert.equal(v.ranking[0].candidate, "B");
  assert.throws(() => extractJson("no json here"));
});

test("one failing model doesn't throw away the whole key in llm.ask", async () => {
  const http = require("http");
  const db = require("../src/hive/db");
  await db.initHiveDb();
  const keys = require("../src/hive/keys");
  const router = require("../src/hive/router");
  const llm = require("../src/hive/llm");
  // An OpenAI-compatible endpoint: "m-bad" answers with broken JSON, "m-good" with a valid reply.
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { model } = JSON.parse(body);
      calls.push(model);
      const text = model === "m-bad" ? "{ not json" : '{"ok":true}';
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1 } })}\n\n`);
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const fakeKey = { id: "key_or", provider: "openrouter", default_model: "m-bad", base_url: `http://127.0.0.1:${server.address().port}/v1` };
  const orig = { candidates: router.candidates, rank: router.rank, secretOf: keys.secretOf, recordUsage: keys.recordUsage };
  router.candidates = async ({ exclude }) =>
    ["m-bad", "m-good"]
      .filter((m) => !exclude.keys?.includes(fakeKey.id) && !exclude.vendorModels?.includes(`openrouter|${m}`))
      .map((m) => ({ key: fakeKey, vendor: "openrouter", model: m, card: { name: m }, vendorLabel: "OpenRouter" }));
  router.rank = (list) => ({ ranked: list });
  keys.secretOf = () => "sk-test";
  keys.recordUsage = async () => {};
  try {
    const r = await llm.ask({ kind: "review", prompt: "x", json: true });
    assert.deepEqual(calls, ["m-bad", "m-good"], "the second model of the same key was tried");
    assert.equal(r.data.ok, true);
  } finally {
    Object.assign(router, { candidates: orig.candidates, rank: orig.rank });
    Object.assign(keys, { secretOf: orig.secretOf, recordUsage: orig.recordUsage });
    server.close();
  }
});

test("daily caps are limits until the reset; reset headers are read", () => {
  const { classify, retryAtFrom } = require("../src/hive/providers/common");
  assert.equal(classify(429, "Rate limit reached for requests per day (RPD)").kind, "quota");
  assert.equal(classify(429, "free-models-per-day limit exceeded").kind, "quota");
  assert.equal(classify(429, "Too many requests, slow down").kind, "rate");
  assert.equal(classify(404, "Not Found").kind, "bad_request", "a bare 404 is a wrong URL, not a missing model");
  assert.equal(classify(404, "The model gpt-x does not exist").kind, "model");
  const now = Date.UTC(2026, 0, 1, 10, 0, 0);
  const h = (o) => ({ get: (n) => o[n] ?? null });
  assert.equal(retryAtFrom(h({ "retry-after": "30" }), "rate", now), now + 30_000);
  assert.equal(retryAtFrom(h({ "x-ratelimit-reset-requests": "1m30s" }), "rate", now), now + 90_000);
  assert.equal(retryAtFrom(h({}), "quota", now), Date.UTC(2026, 0, 2), "a daily cap with no header resets at midnight UTC");
  assert.equal(retryAtFrom(h({}), "rate", now), null);
});

test("a stalled provider call ends with a retryable network error", async () => {
  const { callTimeouts, ProviderError } = require("../src/hive/providers/common");
  const tm = callTimeouts(null, { firstByteMs: 30, idleMs: 30, totalMs: 1000 });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(tm.signal.aborted, true);
  assert.throws(() => tm.check(), (e) => e instanceof ProviderError && e.kind === "network" && e.retryable === true);
  tm.done();
  // The caller's own stop is not reported as a timeout.
  const ctl = new AbortController();
  const tm2 = callTimeouts(ctl.signal, { firstByteMs: 1000 });
  ctl.abort();
  assert.equal(tm2.signal.aborted, true);
  assert.doesNotThrow(() => tm2.check());
  tm2.done();
});
