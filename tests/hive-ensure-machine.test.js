// A machine agent (Vibe / Claude Code / Codex) on a GitHub project that isn't
// on a machine: Hive clones the repo onto the machine where that agent is
// connected and links the project — like a cloud agent checking out a repo.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_PATH = ":memory:";
process.env.NODE_ENV = "test";

test("the repo is cloned onto the agent's machine once, then reused; API-only agents need no machine", async () => {
  const db = require("../src/hive/db");
  await db.initHiveDb();
  const vault = require("../src/hive/vault");
  const machines = require("../src/hive/machines");
  const t = Date.now();
  await db.run("INSERT INTO hive_github(id, label, token_enc, created_by, created_at) VALUES(?,?,?,?,?)", ["gh1", "me", vault.seal("ghp_x"), "owner", t]).catch(async () => {
    const cols = (await db.all("PRAGMA table_info(hive_github)")).map((c) => c.name);
    throw new Error(`hive_github columns: ${cols.join(",")}`);
  });
  await db.run("INSERT INTO hive_projects(id, name, github_id, repo_owner, repo_name, default_branch, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)", ["p1", "Nexora", "gh1", "me", "Nexora", "main", "owner", t, t]);
  await db.run("INSERT INTO hive_machines(id, name, token_hash, created_by, created_at) VALUES(?,?,?,?,?)", ["m1", "hive-worker", "h", "owner", t]);
  await db.run("INSERT INTO hive_keys(id, provider, preset, label, secret_enc, last4, owner, created_at, updated_at, machine_id) VALUES(?,?,?,?,?,?,?,?,?,?)", ["k1", "vibe", "vibe", "Vibe", "none", "plan", "owner", t, t, "m1"]);

  const calls = [];
  const orig = { isOnline: machines.isOnline, call: machines.call };
  machines.isOnline = (id) => id === "m1";
  machines.call = async (id, op, args) => {
    calls.push({ id, op, args });
    return { path: "/home/ubuntu/code/Nexora", existed: false };
  };
  try {
    const repos = require("../src/hive/repos");
    assert.equal((await repos.ensureOnMachine("p1", ["auto", "gemini"])).machine_id ?? null, null, "API agents: nothing to clone");
    const p = await repos.ensureOnMachine("p1", ["vibe"]);
    assert.equal(p.machine_id, "m1");
    assert.equal(p.folder, "/home/ubuntu/code/Nexora");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].op, "clone");
    assert.equal(calls[0].args.url, "https://github.com/me/Nexora.git");
    assert.equal(calls[0].args.token, "ghp_x", "the token goes to the machine for this one clone");
    await repos.ensureOnMachine("p1", ["vibe"]);
    assert.equal(calls.length, 1, "already there: no second clone");

    machines.call = async () => {
      throw new Error("remote: Invalid username or token. fatal: Authentication failed");
    };
    await db.run("UPDATE hive_projects SET machine_id=NULL, folder=NULL WHERE id='p1'");
    await assert.rejects(repos.ensureOnMachine("p1", ["vibe"]), /token is invalid or expired.*Your GitHub/);
  } finally {
    Object.assign(machines, orig);
  }
});

test("projects on a GitHub connection whose token died move to a working connection that can see the repo", async () => {
  const db = require("../src/hive/db");
  const vault = require("../src/hive/vault");
  const gh = require("../src/hive/github");
  const repos = require("../src/hive/repos");
  const t = Date.now();
  await db.run("INSERT INTO hive_github(id, label, token_enc, created_by, created_at) VALUES(?,?,?,?,?)", ["dead", "old", vault.seal("ghp_dead"), "owner", t]);
  await db.run("INSERT INTO hive_github(id, label, token_enc, created_by, created_at) VALUES(?,?,?,?,?)", ["good", "new", vault.seal("ghp_good"), "owner", t + 1]);
  await db.run("INSERT INTO hive_projects(id, name, github_id, repo_owner, repo_name, default_branch, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)", ["p2", "Twin", "dead", "me", "Twin", "main", "owner", t, t]);
  const orig = gh.listRepos;
  gh.listRepos = async (token) => {
    if (token === "ghp_good") return [{ full_name: "me/Twin", name: "Twin", owner: { login: "me" }, private: true, default_branch: "main", permissions: { push: true } }];
    if (token === "ghp_x") return [];
    throw Object.assign(new Error("Bad credentials (GET /user/repos)"), { status: 401 });
  };
  try {
    repos.clearCache();
    const r = await repos.allRepos({ force: true });
    assert.ok(r.errors.some((e) => /Bad credentials/.test(e)));
    assert.equal((await db.get("SELECT github_id FROM hive_projects WHERE id='p2'")).github_id, "good");
  } finally {
    gh.listRepos = orig;
    repos.clearCache();
  }
});

test("only models that answered are offered; untested keys show just their defaults; all-failed shows none", () => {
  const { workingModels } = require("../src/hive/keys");
  const base = { provider: "openrouter", models_json: JSON.stringify(["a", "b", "c", "openai/gpt-oss-120b:free"]), default_model: "b" };
  assert.deepEqual(workingModels({ ...base, verified_json: JSON.stringify({ at: 1, ok: ["c"], failed: { a: "x" } }) }), ["c"]);
  assert.deepEqual(workingModels({ ...base, verified_json: JSON.stringify({ at: 1, ok: [], failed: { a: "x", b: "x", c: "x" } }) }), [], "all failed: nothing to pick");
  assert.deepEqual(workingModels({ ...base, verified_json: JSON.stringify({ at: 1, ok: [], failed: {}, stoppedBy: "rate" }) }), ["b"], "rate-limited before any answered: just the default");
  const untested = workingModels(base);
  assert.ok(untested.includes("b") && untested.length < 4, `untested: short list, got ${untested}`);
  assert.deepEqual(workingModels({ provider: "claude_code", preset: "claude_code", models_json: JSON.stringify(["default", "opus"]) }), ["default", "opus"]);
});

test("a project's own chat is reused, and knows the repo and its brief", async () => {
  const db = require("../src/hive/db");
  const chat = require("../src/hive/chat");
  await db.run("UPDATE hive_projects SET instructions=? WHERE id='p1'", ["- Stack: Node + React\n- Run: npm test"]);
  const a = await chat.projectChat("owner", "p1");
  assert.equal(a.project_id, "p1");
  assert.match(a.title, /Nexora/);
  const b = await chat.projectChat("owner", "p1");
  assert.equal(b.id, a.id, "the same chat comes back");
  const c = await chat.projectChat("owner", "p1", { fresh: true });
  assert.notEqual(c.id, a.id, "a new one on request");
  const ctx = await chat.projectContext("p1");
  assert.match(ctx, /me\/Nexora/);
  assert.match(ctx, /npm test/);
  assert.equal(await chat.projectContext(null), "");
});

test("the repo's AGENTS.md (else CLAUDE.md) is the guide every agent gets; a CLAUDE.md that only imports AGENTS.md is skipped", async () => {
  const { repoGuide } = require("../src/hive/runner");
  const files = { "AGENTS.md": "# Rules\nNever commit to main." };
  const read = async (f) => files[f] ?? null;
  assert.match(await repoGuide(read), /AGENTS\.md.*Never commit to main/s);
  assert.match(await repoGuide(async (f) => (f === "CLAUDE.md" ? "Use pnpm." : null)), /CLAUDE\.md.*pnpm/s);
  assert.equal(await repoGuide(async (f) => (f === "CLAUDE.md" ? "@AGENTS.md\n" : null)), "");
  assert.equal(await repoGuide(async () => { throw new Error("404"); }), "");
});

test("models failing in real use right now are left out of the picker", async () => {
  const db = require("../src/hive/db");
  const keys = require("../src/hive/keys");
  const vault = require("../src/hive/vault");
  const t = Date.now();
  await db.run("INSERT INTO hive_keys(id, provider, label, secret_enc, last4, models_json, owner, created_at, updated_at, verified_json, status) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["kf", "groq", "Groq", vault.seal("gsk_x"), "x", JSON.stringify(["good", "flaky"]), "owner", t, t, JSON.stringify({ at: t, ok: ["good", "flaky"], failed: {} }), "ok"]);
  await db.run("INSERT INTO hive_health(key_id, model, fail_count, consecutive_fails, last_fail, last_ok) VALUES(?,?,?,?,?,?)", ["kf", "flaky", 3, 3, t, t - 60_000]);
  const k = (await keys.listKeys()).find((x) => x.id === "kf");
  assert.deepEqual(k.models, ["good"]);
  assert.deepEqual(k.failingModels, ["flaky"]);
  await db.run("UPDATE hive_health SET consecutive_fails=0, last_ok=? WHERE key_id='kf'", [t + 1000]);
  assert.deepEqual((await keys.listKeys()).find((x) => x.id === "kf").models, ["good", "flaky"], "it comes back once it answers again");
});

test("a paid key that was never tested gets tested; a tested paid key is left alone", async () => {
  const db = require("../src/hive/db");
  const vault = require("../src/hive/vault");
  const health = require("../src/hive/health");
  const t = Date.now();
  await db.run("INSERT INTO hive_keys(id, provider, label, secret_enc, last4, models_json, owner, created_at, updated_at, status, base_url) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["kpaid", "mistral", "Mistral", vault.seal("x"), "x", JSON.stringify(["mistral-medium-latest"]), "owner", t, t, "ok", "http://127.0.0.1:9/v1"]);
  await db.run("INSERT INTO hive_keys(id, provider, label, secret_enc, last4, models_json, owner, created_at, updated_at, status, verified_json, base_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", ["kpaid2", "mistral", "Mistral 2", vault.seal("x"), "x", JSON.stringify(["mistral-medium-latest"]), "owner", t, t, "ok", JSON.stringify({ at: t, ok: ["mistral-medium-latest"], failed: {} }), "http://127.0.0.1:9/v1"]);
  const out = await health.verifyAll({ olderThanMs: 20 * 3600_000 });
  const ids = out.map((x) => x.keyId);
  assert.ok(ids.includes("kpaid"), "never tested: tested now");
  assert.ok(!ids.includes("kpaid2"), "tested paid key: not re-tested daily");
});

test("every key carries each model's measured speed, and chats without a project get the focused project as background", async () => {
  const db = require("../src/hive/db");
  const keys = require("../src/hive/keys");
  const chat = require("../src/hive/chat");
  await db.run("INSERT OR REPLACE INTO hive_health(key_id, model, ok_count, consecutive_fails, last_ok, latency_ms) VALUES(?,?,?,?,?,?)", ["kf", "good", 4, 0, Date.now(), 850]);
  const k = (await keys.listKeys()).find((x) => x.id === "kf");
  assert.equal(k.speed.good, 850);
  const bg = await chat.projectContext("p1", { background: true });
  assert.match(bg, /^Background: the person is currently working on the project/);
  assert.match(bg, /npm test/, "the brief comes along");
  assert.match(await chat.projectContext("p1"), /^This chat is about the project/);
});
