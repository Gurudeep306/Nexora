// Mistral Vibe as a subscription agent: its headless run arguments, its
// streaming output (one session message per line) turned into Hive events,
// and the bridge-version guard.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_PATH = ":memory:";
const cli = require("../src/hive/providers/cli");

test("Vibe runs headless with streaming JSON; the brief goes first in the prompt; policy maps to Vibe agents", () => {
  const ask = cli.buildArgs({ cli: "vibe", model: "default", system: "BRIEF", prompt: "Fix the tests", policy: "ask" });
  assert.deepEqual(ask.args.slice(0, 3), ["--output", "streaming", "--trust"]);
  assert.ok(ask.args.includes("smart-approve"));
  assert.equal(ask.args.at(-2), "-p");
  assert.match(ask.args.at(-1), /^BRIEF\n\n---\n\nFix the tests$/);
  assert.equal(ask.input, null);
  assert.equal(ask.hook, false);
  assert.ok(cli.buildArgs({ cli: "vibe", prompt: "x", policy: "auto" }).args.includes("--auto-approve"));
  const read = cli.buildArgs({ cli: "vibe", prompt: "x", policy: "read" }).args;
  assert.ok(read.includes("--enabled-tools") && !read.includes("--auto-approve"));
  const m = cli.buildArgs({ cli: "vibe", model: "devstral-small", prompt: "x" }).args;
  assert.deepEqual(m.slice(m.indexOf("--model"), m.indexOf("--model") + 2), ["--model", "devstral-small"]);
  const chat = cli.buildArgs({ cli: "vibe", prompt: "hi", chat: true }).args;
  assert.ok(chat.includes("--max-turns") && !chat.includes("--auto-approve"));
});

test("Vibe streaming messages become text, thinking, tool calls, results, writes and a plan", () => {
  const st = { tools: new Map(), n: 0 };
  const lines = [
    { role: "system", content: "You are Vibe" },
    { role: "user", content: "Fix the tests" },
    { role: "assistant", content: "Looking at the tests.", reasoning_content: "Need to run them first", tool_calls: [{ id: "c1", function: { name: "bash", arguments: '{"command":"npm test"}' } }] },
    { role: "tool", tool_call_id: "c1", name: "bash", content: "1 failing", tool_result: { output: { returncode: 1 } } },
    { role: "assistant", content: "", tool_calls: [{ id: "c2", function: { name: "edit", arguments: '{"file_path":"src/a.js","old_string":"a","new_string":"b"}' } }] },
    { role: "tool", tool_call_id: "c2", name: "edit", content: "Edited src/a.js", tool_result: { output: { file: "src/a.js" } } },
    { role: "assistant", tool_calls: [{ id: "c3", function: { name: "todo", arguments: '{"action":"write","todos":[{"content":"Run tests","status":"completed"},{"content":"Fix","status":"pending"}]}' } }] },
    { role: "tool", tool_call_id: "c3", name: "todo", content: "ok" },
    { role: "assistant", content: "Fixed: the test passes now." },
  ];
  const ev = lines.flatMap((l) => cli.parseVibe(JSON.stringify(l), st));
  const kinds = ev.map((e) => e.kind);
  assert.deepEqual(kinds, ["thinking", "text", "tool_call", "tool_result", "tool_call", "tool_result", "plan", "text"]);
  assert.equal(ev[2].name, "run_command");
  assert.equal(ev[2].input.command, "npm test");
  assert.equal(ev[3].isError, true, "exit 1 is an error");
  assert.equal(ev[3].exit, 1);
  assert.equal(ev[4].name, "edit_file");
  assert.equal(ev[4].input.path, "src/a.js");
  assert.equal(ev[5].write, true);
  assert.equal(ev[5].path, "src/a.js");
  assert.deepEqual(ev[6].items, [{ text: "Run tests", done: true }, { text: "Fix", done: false }]);
  assert.equal(ev.at(-1).text, "Fixed: the test passes now.");
  assert.deepEqual(cli.parseVibe("not json", st), []);
});

test("a Vibe key pasted in Hive reaches the CLI as MISTRAL_API_KEY; Claude's token stays separate", () => {
  assert.deepEqual(cli.envFor("vibe", "k1"), { MISTRAL_API_KEY: "k1" });
  assert.deepEqual(cli.envFor("vibe", null), {});
  assert.deepEqual(cli.envFor("claude_code", "t"), { CLAUDE_CODE_OAUTH_TOKEN: "t" });
  assert.deepEqual(cli.envFor("codex", "x"), {});
});

test("an old bridge (before 1.2.0) is told to update instead of probing the wrong CLI", async () => {
  const db = require("../src/hive/db");
  await db.initHiveDb();
  const t = Date.now();
  for (const [id, v] of [
    ["m_old", "1.1.0"],
    ["m_new", "1.2.0"],
  ])
    await db.run("INSERT INTO hive_machines(id, name, token_hash, created_by, created_at, info_json) VALUES(?,?,?,?,?,?)", [id, id, `h_${id}`, "owner", t, JSON.stringify({ version: v })]);
  assert.equal(await cli.bridgeKnows("vibe", "m_old"), false);
  assert.equal(await cli.bridgeKnows("vibe", "m_new"), true);
  assert.equal(await cli.bridgeKnows("claude", "m_old"), true);
  await assert.rejects(cli.listModels({ cli: "vibe", machineId: "m_old", vendor: "vibe" }), /too old for Mistral Vibe/);
});

test("Vibe is a subscription vendor with its own card below Claude for hard work", () => {
  const { vendorOf } = require("../src/hive/providers");
  const v = vendorOf("vibe");
  assert.equal(v.subscription, true);
  assert.equal(v.cli, "vibe");
  const { cardFor, quality, MIN_QUALITY } = require("../src/hive/catalog");
  const card = cardFor("default", "vibe");
  assert.equal(card.tier, "sub");
  assert.ok(quality(card, "coding") >= MIN_QUALITY.coding, "takes everyday coding");
  assert.ok(quality(card, "hard") < MIN_QUALITY.hard, "hard engineering stays with Claude");
});

test("Vibe content given as typed parts or wrapped messages never shows as [object Object]", () => {
  const st = { tools: new Map(), n: 0 };
  const a = cli.parseVibe(JSON.stringify({ role: "assistant", content: [{ type: "thinking", thinking: [{ type: "text", text: "hmm" }] }, { type: "text", text: "Hello" }] }), st);
  assert.deepEqual(a.map((e) => e.kind), ["thinking", "text"]);
  assert.equal(a[1].text, "Hello");
  const b = cli.parseVibe(JSON.stringify({ type: "message", message: { role: "assistant", content: "Wrapped hi" } }), st);
  assert.equal(b[0].text, "Wrapped hi");
  for (const e of [...a, ...b]) assert.ok(!/object Object/.test(e.text));
});
