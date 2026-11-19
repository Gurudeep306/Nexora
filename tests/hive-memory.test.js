// Shared project memory and personal facts: a fact learned twice is kept once
// (src/hive/memory.js), so agents' memory doesn't fill with copies.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_PATH = ":memory:";
process.env.NODE_ENV = "test";

test("a project note with the same title is updated, keeps its pin and moves to the top", async () => {
  const db = require("../src/hive/db");
  await db.initHiveDb();
  const { rememberProject } = require("../src/hive/memory");
  const a = await rememberProject("p1", "Error format", "APIs answer { error }", "@owner", { pinned: true });
  assert.equal(a.updated, false);
  await rememberProject("p1", "Tests", "npm test", "agent:Coder");
  const b = await rememberProject("p1", "  error FORMAT ", "APIs answer { error: string } with a 4xx", "agent:Coder");
  assert.equal(b.updated, true);
  assert.equal(b.id, a.id);
  const rows = await db.all("SELECT * FROM hive_memory WHERE project_id='p1' ORDER BY created_at DESC");
  assert.equal(rows.length, 2, "no second copy");
  const note = rows.find((r) => r.id === a.id);
  assert.equal(note.body, "APIs answer { error: string } with a 4xx");
  assert.equal(note.pinned, 1, "the pin is kept");
  assert.equal(note.title, "Error format", "the first title's spelling stays");
  // Another project keeps its own notes.
  assert.equal((await rememberProject("p2", "Error format", "x", "@owner")).updated, false);
});

test("a personal fact said again is not added twice", async () => {
  const db = require("../src/hive/db");
  await db.initHiveDb();
  const { rememberPerson } = require("../src/hive/memory");
  const a = await rememberPerson("guru", "Prefers short answers", "chat");
  const b = await rememberPerson("guru", "prefers short answers ", "user");
  assert.equal(b.updated, true);
  assert.equal(b.id, a.id);
  assert.equal((await rememberPerson("other", "Prefers short answers", "chat")).updated, false, "people don't share facts");
  assert.equal((await db.all("SELECT * FROM hive_user_memory WHERE username='guru'")).length, 1);
});
