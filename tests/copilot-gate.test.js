// The Copilot's cheap quality gate and token-saving settings: a reviewer from a
// different model family than the authors (never the Claude plan), the GPU
// farm's specialist cards, and Claude-only areas on by default.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hive-gate-"));
process.env.DB_PATH = path.join(dir, "t.db");
process.env.NODE_ENV = "test";

const db = require("../src/hive/db");
const vault = require("../src/hive/vault");

test.before(async () => {
  await db.initHiveDb();
  const t = Date.now();
  // A GPU farm with three specialists from three labs, all free to run.
  await db.run("INSERT INTO hive_keys(id, provider, label, secret_enc, last4, models_json, owner, created_at, updated_at, free_tier, base_url, status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", [
    "farm1",
    "farm",
    "GPU farm",
    vault.seal("k"),
    "k",
    JSON.stringify(["qwen3.8-27b", "gemma-4-31b", "qwen3-coder-next", "paddleocr-vl"]),
    "owner",
    t,
    t,
    1,
    "http://127.0.0.1:9/v1",
    "ok",
  ]);
  await db.run("INSERT INTO hive_tasks(id, project_id, title, prompt, base_ref, base_sha, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)", ["task1", "p1", "Build a page", "Build it", "main", "x", "owner", t, t]);
  await db.run("INSERT INTO hive_agents(id, task_id, name, provider, model, instructions, key_id, started_by, created_at) VALUES(?,?,?,?,?,?,?,?,?)", ["a1", "task1", "Ada", "farm", "qwen3.8-27b", "Build it", "farm1", "owner", t]);
});

test("the quality gate picks a reviewer from a different model family than the authors, never the Claude plan", async () => {
  const copilot = require("../src/hive/copilot");
  const rv = await copilot.cheapReviewer("task1");
  assert.ok(rv, "a reviewer was found");
  assert.equal(rv.spec.provider, "farm");
  assert.equal(rv.spec.model, "gemma-4-31b", `Gemma (Google) reviews Qwen's work: ${JSON.stringify(rv)}`);
  assert.equal(rv.crossFamily, true);
});

test("OCR-only and translation-only specialists are never given agent work; hard work stays above farm models", () => {
  const { cardFor, quality, MIN_QUALITY } = require("../src/hive/catalog");
  assert.equal(cardFor("paddleocr-vl", "farm").tools, false);
  assert.equal(cardFor("sarvam-translate", "farm").tools, false);
  for (const m of ["qwen3.8-27b", "qwen3-coder-next", "uigen-x-32b", "gemma-4-31b"]) assert.ok(quality(cardFor(m, "farm"), "hard") < MIN_QUALITY.hard, `${m} must not take hard engineering on its own`);
  assert.ok(quality(cardFor("qwen3.8-27b", "farm"), "coding") >= MIN_QUALITY.coding);
});

test("token saving is on by default with Claude-only areas, and both can be changed", async () => {
  const copilot = require("../src/hive/copilot");
  const s = await copilot.brainSettings("someone");
  assert.equal(s.saveTokens, true);
  assert.ok(s.claudeOnly.length >= 3 && s.claudeOnly.some((x) => /Landing page/.test(x)));
  const saved = await copilot.saveSettings("someone", { saveTokens: false, claudeOnly: ["All UI"] });
  assert.equal(saved.saveTokens, false);
  assert.deepEqual(saved.claudeOnly, ["All UI"]);
  const kept = await copilot.saveSettings("someone", { autonomy: "assist" });
  assert.equal(kept.saveTokens, false, "other changes keep the setting");
  assert.deepEqual(kept.claudeOnly, ["All UI"]);
});

test("one Claude account can be the parent (leads); the setting persists alongside the others", async () => {
  const copilot = require("../src/hive/copilot");
  const saved = await copilot.saveSettings("lead", { brainKey: "key-main" });
  assert.equal(saved.brainKey, "key-main");
  const kept = await copilot.saveSettings("lead", { saveTokens: false });
  assert.equal(kept.brainKey, "key-main", "other changes keep the parent");
  const cleared = await copilot.saveSettings("lead", { brainKey: null });
  assert.equal(cleared.brainKey, null);
});
