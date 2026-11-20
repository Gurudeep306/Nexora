// Hive v3 end to end, through the demo harness (scripts/hive-demo.js): the
// real server + the real bridge on a temp git repo + mock provider/GitHub.
// Streamed chat replies, side-by-side answers, machine tasks with command
// approvals, the terminal, checkpoints + restore, the GitHub access doctor,
// cached-token accounting and the idea launchpad.
const { freePort } = require('./helpers/free-port');
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

let PORT = 0;
let base = '';
let demo;
let cookie = "";

async function call(method, url, body) {
  const r = await fetch(base + url, { method, headers: { "Content-Type": "application/json", Cookie: cookie, Origin: base }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}
const ok = async (method, url, body) => {
  const r = await call(method, url, body);
  assert.ok(r.status < 300, `${method} ${url} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitTask(id, { approve = false } = {}) {
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    // The automatic reviewer on a machine session runs the checks too; approve those.
    if (approve) for (const a of (await ok("GET", "/api/hive/approvals")).approvals) await ok("POST", `/api/hive/approvals/${a.id}`, { approved: true });
    const t = await ok("GET", `/api/hive/tasks/${id}`);
    if (!["running", "queued"].includes(t.task.status)) return t;
  }
  throw new Error("task did not finish");
}

test.before(async () => {
  PORT = await freePort();
  base = `http://localhost:${PORT}`;
  demo = spawn(process.execPath, [path.join(__dirname, "..", "scripts", "hive-demo.js")], {
    env: { ...process.env, PORT: String(PORT), DEMO_POLICY: "ask" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  demo.stdout.on("data", (d) => (out += d));
  demo.stderr.on("data", (d) => (out += d));
  for (let i = 0; i < 240 && !out.includes("Hive demo ready"); i++) {
    if (demo.exitCode !== null) throw new Error(`demo exited:\n${out}`);
    await sleep(250);
  }
  assert.ok(out.includes("Hive demo ready"), out);
  await ok("POST", "/api/user/login", { username: "owner", password: "owner123" });
});

test.after(() => {
  demo?.kill("SIGTERM");
});

test("chat replies stream on the send request (NDJSON) and side-by-side answers work", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const key = boot.keys[0];
  assert.equal(key.defaultModel, "demo-coder-large", "default picked from the live model list");
  const c = (await ok("POST", "/api/hive/convos", {})).convo;
  const r = await fetch(`${base}/api/hive/convos/${c.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: base },
    body: JSON.stringify({ text: "Explain the repo", agent: { provider: key.provider, keyId: "auto" }, agents: [{ provider: key.provider, keyId: "auto" }, { provider: key.provider, keyId: "auto", model: "demo-coder-mini" }], stream: true }),
  });
  assert.match(r.headers.get("content-type"), /ndjson/);
  const events = (await r.text()).trim().split("\n").map((l) => JSON.parse(l));
  const types = events.map((e) => e.type);
  assert.equal(types[0], "msg");
  assert.equal(types.filter((t) => t === "start").length, 2, "one reply per model");
  assert.ok(types.includes("delta"));
  const done = events.filter((e) => e.type === "done");
  assert.equal(done.length, 2);
  for (const d of done) {
    assert.equal(d.data.error, null);
    assert.match(d.data.content, /quick overview/);
  }
  const stored = await ok("GET", `/api/hive/convos/${c.id}`);
  const answers = stored.messages.filter((m) => m.role === "assistant");
  assert.equal(answers.length, 2);
  assert.ok(answers[0].group_id && answers[0].group_id === answers[1].group_id);
  await ok("POST", `/api/hive/convos/${c.id}/prefer`, { messageId: answers[1].id });
});

test("machine task: real files, approval-gated commands, terminal, checkpoints and restore", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const key = boot.keys[0];
  const ms = await ok("GET", "/api/hive/machines");
  assert.equal(ms.machines.length, 1);
  assert.equal(ms.machines[0].online, true, "the bridge connected");
  const proj = boot.projects.find((p) => p.machine_id);
  const { task } = await ok("POST", `/api/hive/projects/${proj.id}/tasks`, { prompt: "Support quantities and run the tests", agents: [{ provider: key.provider, keyId: "auto" }] });
  // The agent's command waits for a human.
  let approved = false;
  for (let i = 0; i < 60 && !approved; i++) {
    await sleep(250);
    const a = await ok("GET", "/api/hive/approvals");
    if (a.approvals.length) {
      assert.equal(a.approvals[0].command, "node --test");
      await ok("POST", `/api/hive/approvals/${a.approvals[0].id}`, { approved: true });
      approved = true;
    }
  }
  assert.ok(approved, "an approval was requested");
  const t = await waitTask(task.id, { approve: true });
  // Machine sessions get the automatic review too (their changes live in git, not hive_changes).
  let reviewer = null;
  for (let i = 0; i < 40 && !reviewer; i++) {
    reviewer = (await ok("GET", `/api/hive/tasks/${task.id}`)).agents.find((a) => a.name === "reviewer");
    if (!reviewer) await sleep(250);
  }
  assert.ok(reviewer, "the automatic reviewer joined the machine session");
  await waitTask(task.id, { approve: true });
  const kinds = t.events.map((e) => e.kind);
  assert.ok(kinds.includes("approval") && kinds.includes("approval_result"));
  const run = t.events.find((e) => e.kind === "tool_result" && e.data.name === "run_command");
  assert.match(run.data.preview, /exit 0/);
  const changes = await ok("GET", `/api/hive/tasks/${task.id}/changes`);
  assert.deepEqual(changes.changes.map((c) => c.path), ["src/cart.js"]);
  const file = await ok("GET", `/api/hive/tasks/${task.id}/file?path=src/cart.js`);
  assert.equal(file.status, "modified");
  assert.match(file.current, /qty/);
  // Each session works in its own git worktree: the project folder stays clean.
  const wt = t.task.folder;
  assert.ok(t.task.worktree && wt !== proj.folder && /\.hive-worktrees/.test(wt), `private worktree, got ${wt}`);
  const clean = await ok("POST", `/api/hive/machines/${ms.machines[0].id}/exec`, { folder: proj.folder, command: "git status --short" });
  assert.doesNotMatch(clean.output, /src\/cart\.js/);
  // Terminal.
  const ex = await ok("POST", `/api/hive/machines/${ms.machines[0].id}/exec`, { folder: wt, command: "git status --short" });
  assert.match(ex.output, /src\/cart\.js/);
  // Checkpoint taken when the agent finished; revert by hand, then restore it.
  const cps = (await ok("GET", `/api/hive/tasks/${task.id}/checkpoints`)).checkpoints;
  assert.ok(cps.some((c) => c.files === 1));
  await ok("POST", `/api/hive/machines/${ms.machines[0].id}/exec`, { folder: wt, command: "git checkout -- src/cart.js" });
  assert.equal((await ok("GET", `/api/hive/tasks/${task.id}/changes`)).changes.length, 0);
  await ok("POST", `/api/hive/tasks/${task.id}/checkpoints/${cps.find((c) => c.files === 1).id}/restore`, {});
  assert.equal((await ok("GET", `/api/hive/tasks/${task.id}/changes`)).changes.length, 1, "the agent's result is back");
  // Bridge endpoints need the machine token.
  assert.equal((await fetch(`${base}/api/hive-bridge/poll`, { headers: { Authorization: "Bearer hvm_wrongwrongwrongwrongwrong" } })).status, 401);
});

test("GitHub doctor explains missing access; cached tokens don't eat the budget", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const rep = await ok("POST", `/api/hive/github/${boot.github[0].id}/test`, { owner: "octo", repo: "secret" });
  assert.equal(rep.report.ok, false);
  assert.equal(rep.report.status, 404);
  assert.ok(rep.report.steps.length >= 1);
  const good = await ok("POST", `/api/hive/github/${boot.github[0].id}/test`, { owner: "octo", repo: "demo-shop" });
  assert.equal(good.report.ok, true);
  assert.equal(good.report.canPush, true);
  const k = boot.keys[0];
  assert.ok(k.todayTokens > 0 && k.periodStart, "usage summary includes today + period");
});

test("prompt-cache reads are tracked but not charged against a key's budget", async () => {
  process.env.DB_PATH = ":memory:";
  const { initHiveDb } = require("../src/hive/db");
  await initHiveDb();
  const keys = require("../src/hive/keys");
  const id = await keys.createKey({ provider: "anthropic", label: "t", apiKey: "sk-ant-test-1234567890", tokenLimit: 10000, limitPeriod: "day" }, "u");
  await keys.recordUsage(id, "u", { input: 1000, output: 50, cacheRead: 900 });
  const k = (await keys.listKeys()).find((x) => x.id === id);
  assert.equal(k.used, 150, "100 fresh input + 50 output");
  assert.equal(k.periodCached, 900);
  assert.equal(k.remaining, 9850);
});

test("launchpad: idea → plan → new repo, PLAN.md, memory and milestone 1", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const { idea } = await ok("POST", "/api/hive/ideas", { pitch: "Uptime alerts on Telegram for my sites" });
  assert.equal(idea.status, "planned");
  assert.equal(idea.plan.name, "PulseWatch");
  const r = await ok("POST", `/api/hive/ideas/${idea.id}/launch`, { githubId: boot.github[0].id, repoName: "pulsewatch", agents: [{ provider: boot.keys[0].provider, keyId: "auto" }] });
  assert.equal(r.project.repo_name, "pulsewatch");
  assert.equal(r.project.idea_id, idea.id);
  const mem = await ok("GET", `/api/hive/projects/${r.project.id}/memory`);
  assert.ok(mem.memory.some((m) => m.title === "Stack"));
  assert.match(r.task.title, /Milestone 1/);
  const ideas = await ok("GET", "/api/hive/ideas");
  assert.equal(ideas.ideas.find((i) => i.id === idea.id).status, "launched");
});

test("a key whose check failed is retried after a cool-down, and 'no key' explains why", async () => {
  process.env.DB_PATH = ":memory:";
  const { initHiveDb, run } = require("../src/hive/db");
  await initHiveDb();
  const keys = require("../src/hive/keys");
  const id = await keys.createKey({ provider: "openai", label: "Team GPT", apiKey: "sk-test-abcdefghijkl" }, "u");
  await run("UPDATE hive_keys SET status='invalid', status_detail='Missing scopes: model.read', updated_at=? WHERE id=?", [Date.now(), id]);
  assert.equal(await keys.pickKey("openai"), null, "just rejected: skipped for now");
  assert.match(await keys.explainNoKey("openai"), /Team GPT.*rejected.*model\.read/);
  await run("UPDATE hive_keys SET updated_at=? WHERE id=?", [Date.now() - 11 * 60_000, id]);
  assert.equal((await keys.pickKey("openai"))?.id, id, "retried after the cool-down");
  assert.match(await keys.explainNoKey("mistral"), /No Mistral key yet/);
});

test("compare on a machine: each attempt has its own copy, and adopting one brings its code in", async () => {
  const boot = await ok("GET", "/api/hive/bootstrap");
  const key = boot.keys[0];
  const proj = boot.projects.find((p) => p.machine_id);
  const { task } = await ok("POST", `/api/hive/projects/${proj.id}/tasks`, { prompt: "Support quantities and run the tests", mode: "compare", agents: [{ provider: key.provider, keyId: "auto" }, { provider: key.provider, keyId: "auto", model: "demo-coder-mini" }] });
  await waitTask(task.id, { approve: true });
  const t = await ok("GET", `/api/hive/tasks/${task.id}`);
  const tries = t.agents.filter((a) => a.variant === a.id);
  assert.equal(tries.length, 2);
  const copies = tries.map((a) => a.worktree);
  assert.ok(copies.every(Boolean) && copies[0] !== copies[1] && !copies.includes(t.task.folder), `separate copies: ${copies.join(", ")}`);
  for (const a of tries) {
    const ch = await ok("GET", `/api/hive/tasks/${task.id}/changes?variant=${a.id}`);
    assert.deepEqual(ch.changes.map((c) => c.path), ["src/cart.js"], "each attempt's own diff");
  }
  await ok("POST", `/api/hive/tasks/${task.id}/adopt`, { variant: tries[1].id });
  const main = await ok("GET", `/api/hive/tasks/${task.id}/changes`);
  assert.deepEqual(main.changes.map((c) => c.path), ["src/cart.js"], "the adopted attempt is now the session's result");
  const file = await ok("GET", `/api/hive/tasks/${task.id}/file?path=src/cart.js`);
  assert.match(file.current, /qty/);
});

test("live terminal: a real shell on the machine, typed into from the browser", async () => {
  const ms = await ok("GET", "/api/hive/machines");
  const m = ms.machines[0];
  const boot = await ok("GET", "/api/hive/bootstrap");
  const folder = boot.projects.find((p) => p.machine_id).folder;
  const { terminal } = await ok("POST", `/api/hive/machines/${m.id}/terms`, { folder, cols: 90, rows: 24 });
  assert.ok(terminal.id.startsWith("term"));
  assert.equal(terminal.mode, "pty", "python3 gives a real pseudo-terminal");
  assert.equal((await ok("GET", `/api/hive/machines/${m.id}/terms`)).terminals.length, 1);
  // Read the stream in the background while typing.
  const ctl = new AbortController();
  let out = "";
  let next = 0;
  const reading = (async () => {
    const r = await fetch(`${base}/api/hive/machines/${m.id}/terms/${terminal.id}/stream?from=0`, { headers: { Cookie: cookie }, signal: ctl.signal });
    const dec = new TextDecoder();
    let buf = "";
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const ev = JSON.parse(buf.slice(0, i));
        buf = buf.slice(i + 1);
        if (ev.type === "data") {
          out += ev.data;
          next = ev.next;
        }
      }
    }
  })().catch(() => {});
  await ok("POST", `/api/hive/machines/${m.id}/terms/${terminal.id}/input`, { data: "echo hello-$((40+2)); tput cols; pwd\r" });
  for (let i = 0; i < 60 && !/hello-42[\s\S]*\b90\b/.test(out); i++) await sleep(150);
  assert.match(out, /hello-42/, "the shell ran the command");
  assert.match(out, /\b90\b/, "the shell sees the terminal's width");
  assert.ok(out.includes(folder), "it starts in the project folder");
  // Resize, and the shell sees the new size.
  await ok("POST", `/api/hive/machines/${m.id}/terms/${terminal.id}/resize`, { cols: 132, rows: 40 });
  await ok("POST", `/api/hive/machines/${m.id}/terms/${terminal.id}/input`, { data: "tput cols\r" });
  for (let i = 0; i < 60 && !/\b132\b/.test(out); i++) await sleep(150);
  assert.match(out, /\b132\b/);
  ctl.abort();
  await reading;
  // Reconnecting from an offset replays only what came after it.
  const again = await fetch(`${base}/api/hive/machines/${m.id}/terms/${terminal.id}/stream?from=0`, { headers: { Cookie: cookie } });
  const reader = again.body.getReader();
  let replay = "";
  for (let i = 0; i < 10 && !replay.includes("hello-42"); i++) replay += new TextDecoder().decode((await reader.read()).value || new Uint8Array());
  assert.match(replay, /hello-42/, "output is kept for reconnects");
  await reader.cancel();
  assert.ok(next > 0);
  await ok("DELETE", `/api/hive/machines/${m.id}/terms/${terminal.id}`);
  assert.equal((await call("POST", `/api/hive/machines/${m.id}/terms/${terminal.id}/input`, { data: "x" })).status, 404, "closed terminals take no input");
});
