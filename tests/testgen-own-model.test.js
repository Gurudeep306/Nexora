// AI tests on NexoraGuru's own model (deploy/coder-model): the site talks to an
// OpenAI-compatible server (llama.cpp's llama-server) with that server's own
// password, asks the short test-generation steps in plain code blocks, checks
// the answers by running them, and keeps the set for the next person.
// The model here is a stand-in that answers the way a small model does.
const { freePort } = require('./helpers/free-port');
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let hasPython = true;
try {
  execSync("python3 --version", { stdio: "ignore" });
} catch {
  hasPython = false;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexora-own-model-"));
const DB = path.join(tmp, "test.db");
const PASSWORD = "own-server-password-123";
let proc, mock, base, cookie, pid;
let serverLog = "";
const asked = [];

const fence = (lang, code) => "```" + lang + "\n" + code.trim() + "\n```";
const GEN = `
def gen(rng, size):
    n = {"tiny": rng.randint(1, 3), "small": rng.randint(1, 8), "medium": rng.randint(50, 200), "large": rng.randint(1000, 3000)}[size]
    return " ".join(str(rng.randint(-20, 20)) for _ in range(2)) + "\\n"
`;
const BRUTE = "a, b = map(int, input().split())\nprint(a + b)";

// What the stand-in model says to each step (it reads the prompt, like the real one).
function reply(messages) {
  const text = messages.map((m) => m.content).join("\n");
  if (/define gen\(rng, size\)/.test(text)) return { step: "cases", content: `Generator:\n${fence("python", GEN)}\n${fence("input", "0 0")}\n${fence("input", "-20 20")}` };
  if (/fails a sample/.test(text)) return { step: "fix", content: fence("python", BRUTE) };
  if (/brute-force Python 3 program/.test(text)) return { step: "brute", content: fence("python", BRUTE) };
  if (/efficient Python 3 solution/.test(text)) return { step: "solution", content: fence("python", "import sys\nprint(sum(map(int, sys.stdin.read().split())))") };
  return { step: "other", content: "ok" };
}

const call = async (method, p, ck, body) => {
  const r = await fetch(`${base}${p}`, { method, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers };
};
const testgen = async (body) => {
  const r = await fetch(`${base}/api/ai/testgen`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body) });
  const lines = (await r.text()).trim().split("\n").map((l) => JSON.parse(l));
  return lines[lines.length - 1];
};

test.before(async () => {
  if (!hasPython) return;
  // The stand-in llama-server: OpenAI-compatible, checks its own password.
  mock = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (req.headers.authorization !== `Bearer ${PASSWORD}`) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "Invalid API Key" } }));
      }
      if (req.url.endsWith("/models")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "nexora-coder", object: "model" }] }));
      }
      const body = JSON.parse(raw || "{}");
      const r = reply(body.messages || []);
      asked.push(r.step);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "x", object: "chat.completion", model: body.model, choices: [{ index: 0, message: { role: "assistant", content: r.content }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } }));
    });
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(port), NODE_ENV: "test", DB_PATH: DB, DISABLE_PUPPETEER: "1", DISABLE_SCRAPER: "1", GROQ_API_KEY: PASSWORD, GROQ_BASE_URL: `http://127.0.0.1:${mock.address().port}/v1`, GROQ_MODEL: "nexora-coder", GROQ_FAST_MODEL: "nexora-coder", GROQ_FALLBACK_MODEL: "nexora-coder" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (d) => (serverLog += d));
  proc.stderr.on("data", (d) => (serverLog += d));
  for (let i = 0; i < 160; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {
      /* not up yet */
    }
    if (proc.exitCode !== null) throw new Error(`server exited early: ${serverLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(DB, { timeout: 10000 });
  db.exec("INSERT INTO problems(platform, problem_id, title, url, rating, tags) VALUES('atcoder','own_a','A + B','https://x',800,'[]')");
  pid = Number(db.prepare("SELECT id FROM problems WHERE problem_id='own_a'").get().id);
  db.prepare("INSERT INTO problem_statements(problem_rowid, statement, input_spec, output_spec, samples, scraped_at) VALUES(?,?,?,?,?,datetime('now'))").run(
    pid,
    "<p>Given two integers a and b (-20 ≤ a, b ≤ 20), print a + b.</p>",
    "<p>One line: a and b.</p>",
    "<p>Print a + b.</p>",
    JSON.stringify([{ input: "1 2\n", output: "3\n" }, { input: "-5 5\n", output: "0\n" }]),
  );
  db.close();
  const name = "om" + Date.now().toString(36);
  const r = await call("POST", "/api/user/register", null, { username: name, email: `${name}@t.io`, password: "secret123" });
  cookie = r.headers.get("set-cookie").split(";")[0];
});
test.after(async () => {
  mock?.close();
  if (!proc) return;
  const done = new Promise((r) => proc.once("exit", r));
  proc.kill("SIGKILL");
  await done;
});

test("tests come from your own model in short steps, with checked answers", { skip: !hasPython }, async () => {
  const done = await testgen({ problem_id: pid, count: 8 });
  assert.equal(done.ok, true, JSON.stringify(done).slice(0, 400) + serverLog.slice(-800));
  assert.deepEqual([...new Set(asked)].sort(), ["brute", "cases", "solution"], "the three short steps, no single big JSON plan");
  assert.ok(done.tests.length >= 4, `kept ${done.tests.length}`);
  for (const t of done.tests) {
    const [a, b] = t.input.trim().split(/\s+/).map(Number);
    assert.equal(t.expected.trim(), String(a + b), `the expected output is right for ${JSON.stringify(t.input)}`);
  }
  assert.ok(done.tests.some((t) => t.confidence === "verified"), "two solutions agreed");
  assert.ok(done.tests.some((t) => t.size === "edge"), "the model's edge cases are in");
});

test("the next person gets the same tests at once, without asking the model", { skip: !hasPython }, async () => {
  const before = asked.length;
  const t0 = Date.now();
  const again = await testgen({ problem_id: pid, count: 8 });
  assert.equal(again.ok, true);
  assert.equal(again.stats.cached, true);
  assert.ok(again.tests.length >= 4);
  assert.equal(asked.length, before, "the model was not asked again");
  assert.ok(Date.now() - t0 < 3000, "ready at once");
});

test("Make a new set asks the model again", { skip: !hasPython }, async () => {
  const before = asked.length;
  const fresh = await testgen({ problem_id: pid, count: 8, fresh: true });
  assert.equal(fresh.ok, true);
  assert.notEqual(fresh.stats.cached, true);
  assert.ok(asked.length > before);
});
