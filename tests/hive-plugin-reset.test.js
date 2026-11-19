// A project that changed a built-in plugin can go back to following the
// workspace setting (src/hive/plugins.js resetBuiltin).
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_PATH = ":memory:";
process.env.NODE_ENV = "test";

test("a project override can be dropped; the project then follows the workspace again", async () => {
  const db = require("../src/hive/db");
  await db.initHiveDb();
  const plugins = require("../src/hive/plugins");
  await plugins.setBuiltin("*", "terse", { enabled: true }, "owner");
  await plugins.setBuiltin("p1", "terse", { enabled: false, config: {} }, "owner");
  let r = (await plugins.resolvePlugins("p1")).builtins.terse;
  assert.equal(r.enabled, false);
  assert.equal(r.scope, "p1");

  assert.equal(await plugins.resetBuiltin("p1", "terse"), true);
  r = (await plugins.resolvePlugins("p1")).builtins.terse;
  assert.equal(r.enabled, true, "follows the workspace");
  assert.equal(r.scope, "*");
  assert.equal(await plugins.resetBuiltin("p1", "terse"), false, "nothing left to drop");

  // The workspace row dropped: back to the built-in default.
  await plugins.resetBuiltin("*", "terse");
  r = (await plugins.resolvePlugins("p1")).builtins.terse;
  assert.equal(r.scope, "default");
  assert.equal(r.enabled, plugins.BUILTIN.get("terse").default);
  await assert.rejects(plugins.resetBuiltin("p1", "nope"), /Unknown plugin/);
});
