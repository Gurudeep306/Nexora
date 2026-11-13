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
