#!/usr/bin/env node
// Nexora Hive bridge — lets Hive agents work in folders on THIS computer:
// read/write files, run commands and tests, start dev servers, use git.
//
//   node hive-bridge.js --server https://nexoraguru.in --token hvm_… --root ~/code
//
// • Only folders under --root (repeatable) are reachable; paths are checked here.
// • Commands run with your user's permissions. In Hive, the machine's policy
//   decides whether each command needs a human's approval first (default: ask).
// • Talks to Hive over HTTPS long-polling: no inbound ports, works behind NAT.
// • Zero dependencies, Node 18+. Stop it any time with Ctrl+C.
"use strict";
// Subscription CLIs Hive may start here (never a shell, never another binary).
const CLI_BIN = { claude: "claude", codex: "codex", vibe: "vibe" };
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const VERSION = "1.2.0";
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : process.env[`HIVE_${name.toUpperCase()}`] || fallback;
};
const multi = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
const expand = (p) => path.resolve(String(p).replace(/^~(?=$|[\\/])/, os.homedir()));

const SERVER = String(opt("server", "") || "").replace(/\/+$/, "");
const TOKEN = opt("token", "");
const ROOTS = (multi("root").length ? multi("root") : [opt("root", process.cwd())]).map(expand);
// `node hive-bridge.js --hook` is what Claude Code runs before each shell
// command when the machine's policy is "ask": it asks Hive (a human on the
// team) and answers Claude Code with allow / deny.
if (args.includes("--hook")) {
  runHook().then(
    (out) => {
      process.stdout.write(JSON.stringify(out));
      process.exit(0);
    },
    (e) => {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `Hive approval failed: ${e.message}` } }));
      process.exit(0);
    },
  );
} else if (!SERVER || !TOKEN) {
  console.error("Usage: node hive-bridge.js --server https://your-site --token hvm_… [--root ~/code]...");
  process.exit(1);
}
if (!args.includes("--hook")) for (const r of ROOTS) if (!fs.existsSync(r)) fs.mkdirSync(r, { recursive: true });

const MAX_READ = 1_500_000;
const MAX_OUT = 200_000;
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", ".cache", "__pycache__", ".venv", "venv", "target", ".turbo", "coverage"]);

/** Resolve a path and refuse anything outside the allowed roots. */
function safe(p) {
  const abs = expand(p || ROOTS[0]);
  const ok = ROOTS.some((r) => abs === r || abs.startsWith(r + path.sep));
  if (!ok) throw new Error(`Outside the bridge's allowed folders: ${abs}`);
  return abs;
}
const inFolder = (folder, rel = "") => {
  const base = safe(folder);
  const abs = path.resolve(base, String(rel || ""));
  if (abs !== base && !abs.startsWith(base + path.sep)) throw new Error(`Path escapes the project folder: ${rel}`);
  if (abs.split(path.sep).includes(".git") && rel) throw new Error("The .git directory is off limits");
  return abs;
};

function sh(cmd, { cwd, timeoutMs = 120000, env, input } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, { cwd, shell: true, env: { ...process.env, FORCE_COLOR: "0", CI: "1", ...(env || {}) } });
    let out = "";
    const add = (d) => {
      out += d;
      if (out.length > MAX_OUT * 2) out = out.slice(-MAX_OUT);
    };
    child.stdout.on("data", add);
    child.stderr.on("data", add);
    if (input) child.stdin.end(input);
    const timer = setTimeout(() => {
      out += `\n[timed out after ${Math.round(timeoutMs / 1000)}s — process killed]`;
      killTree(child);
    }, timeoutMs);
    child.on("error", (e) => (out += `\n${e.message}`));
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, output: out.length > MAX_OUT ? `… [${out.length - MAX_OUT} chars cut]\n` + out.slice(-MAX_OUT) : out, ms: Date.now() - started });
    });
  });
}
function killTree(child) {
  try {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    else child.kill("SIGKILL");
  } catch {}
}

async function walk(base, sub = "", out = [], limit = 20000) {
  const dir = path.join(base, sub);
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (out.length >= limit) break;
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) await walk(base, rel, out, limit);
    } else if (e.isFile()) out.push(rel);
  }
  return out;
}

async function listFiles(folder) {
  const base = safe(folder);
  if (fs.existsSync(path.join(base, ".git"))) {
    const r = await sh("git ls-files -co --exclude-standard", { cwd: base, timeoutMs: 30000 });
    if (r.code === 0) return r.output.split("\n").filter(Boolean).slice(0, 50000);
  }
  return walk(base);
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

const procs = new Map(); // id -> { child, log, cmd, cwd, started }
const runs = new Map(); // id -> Claude Code / Codex run (JSON-lines output buffer)

const OPS = {
  async info() {
    return { version: VERSION, hostname: os.hostname(), platform: `${process.platform}-${process.arch}`, node: process.version, roots: ROOTS, user: os.userInfo().username, cpus: os.cpus().length, memGb: Math.round(os.totalmem() / 1e9) };
  },
  async folders({ path: p }) {
    const base = safe(p || ROOTS[0]);
    const entries = await fsp.readdir(base, { withFileTypes: true }).catch(() => []);
    const dirs = [];
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
      const abs = path.join(base, e.name);
      dirs.push({ name: e.name, path: abs, git: fs.existsSync(path.join(abs, ".git")) });
    }
    return { path: base, roots: ROOTS, dirs: dirs.sort((a, b) => a.name.localeCompare(b.name)) };
  },
  async list({ folder }) {
    return { paths: await listFiles(folder) };
  },
  async read({ folder, path: rel }) {
    const abs = inFolder(folder, rel);
    const st = await fsp.stat(abs).catch(() => null);
    if (!st || !st.isFile()) return { content: null };
    if (st.size > MAX_READ) throw new Error(`File is too large to read (${Math.round(st.size / 1024)} KB)`);
    const buf = await fsp.readFile(abs);
    if (isBinary(buf)) throw new Error("Binary file — not readable as text");
    return { content: buf.toString("utf8") };
  },
  async write({ folder, path: rel, content }) {
    const abs = inFolder(folder, rel);
    const existed = fs.existsSync(abs);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, String(content), "utf8");
    return { created: !existed };
  },
  async remove({ folder, path: rel }) {
    await fsp.rm(inFolder(folder, rel), { force: true });
    return {};
  },
  async search({ folder, query, glob, caseSensitive, limit = 80 }) {
    const base = safe(folder);
    let re;
    try {
      re = new RegExp(query, caseSensitive ? "" : "i");
    } catch {
      re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "" : "i");
    }
    const globRe = glob ? new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".") + "$") : null;
    const hits = [];
    for (const rel of await listFiles(folder)) {
      if (hits.length >= limit) break;
      if (globRe && !globRe.test(rel)) continue;
      let buf;
      try {
        const abs = path.join(base, rel);
        if ((await fsp.stat(abs)).size > 1_000_000) continue;
        buf = await fsp.readFile(abs);
      } catch {
        continue;
      }
      if (isBinary(buf)) continue;
      const lines = buf.toString("utf8").split("\n");
      for (let i = 0; i < lines.length && hits.length < limit; i++) if (re.test(lines[i])) hits.push({ path: rel, line: i + 1, text: lines[i].slice(0, 300) });
    }
    return { hits };
  },
  async exec({ folder, command, timeoutMs, input }) {
    const cwd = safe(folder);
    return sh(String(command), { cwd, timeoutMs: Math.min(Number(timeoutMs) || 120000, 30 * 60000), input });
  },
  async git({ folder, args: gitArgs = [], token }) {
    // Runs git with an argument list (no shell). A GitHub token, if given, is
    // passed for this one call only and never written to disk.
    const cwd = safe(folder);
    const pre = token ? ["-c", `http.extraHeader=Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`] : [];
    return new Promise((resolve) => {
      const child = spawn("git", [...pre, ...gitArgs.map(String)], { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
      child.on("error", (e) => resolve({ code: 1, output: e.message }));
      child.on("close", (code) => resolve({ code, output: out.slice(-MAX_OUT) }));
    });
  },
  async clone({ parent, url, name, token, branch }) {
    const base = safe(parent || ROOTS[0]);
    const dest = path.join(base, String(name).replace(/[^\w.-]/g, "-"));
    if (fs.existsSync(dest)) return { path: dest, existed: true };
    const r = await OPS.git({ folder: base, args: ["clone", ...(branch ? ["--branch", branch] : []), url, dest], token });
    if (r.code !== 0) throw new Error(r.output.trim().slice(-800) || "git clone failed");
    return { path: dest, existed: false };
  },
  async mkdir({ parent, name }) {
    const dest = path.join(safe(parent || ROOTS[0]), String(name).replace(/[^\w.-]/g, "-"));
    await fsp.mkdir(dest, { recursive: true });
    return { path: dest };
  },
  async proc_start({ folder, command, id }) {
    const cwd = safe(folder);
    if (procs.has(id)) throw new Error("A process with that id is already running");
    const child = spawn(String(command), { cwd, shell: true, env: { ...process.env, FORCE_COLOR: "0", BROWSER: "none" } });
    const p = { child, log: "", cmd: command, cwd, started: Date.now(), exit: null };
    const add = (d) => {
      p.log += d;
      if (p.log.length > MAX_OUT) p.log = p.log.slice(-MAX_OUT);
    };
    child.stdout.on("data", add);
    child.stderr.on("data", add);
    child.on("close", (code) => (p.exit = code ?? -1));
    procs.set(id, p);
    await new Promise((r) => setTimeout(r, 2500));
    return { id, running: p.exit === null, log: p.log.slice(-6000) };
  },
  async proc_logs({ id }) {
    const p = procs.get(id);
    if (!p) throw new Error("No such process");
    return { id, running: p.exit === null, exit: p.exit, log: p.log.slice(-20000), cmd: p.cmd };
  },
  async proc_stop({ id }) {
    const p = procs.get(id);
    if (p) killTree(p.child);
    procs.delete(id);
    return { stopped: !!p };
  },
  async procs() {
    return { procs: [...procs.entries()].map(([id, p]) => ({ id, cmd: p.cmd, cwd: p.cwd, running: p.exit === null, started: p.started })) };
  },
  /** Is Claude Code / Codex / Mistral Vibe installed here, and signed in? */
  async cli_detect({ cli }) {
    const bin = CLI_BIN[cli] || "claude";
    const v = await sh(`${bin} --version`, { timeoutMs: 20000 });
    if (v.code !== 0) return { installed: false, version: null, loggedIn: false, detail: v.output.trim().slice(-300) };
    let loggedIn = false;
    let detail = "";
    if (bin === "claude") {
      const st = await sh("claude auth status --json", { timeoutMs: 20000 });
      try {
        const j = JSON.parse(st.output.slice(st.output.indexOf("{")));
        loggedIn = !!j.loggedIn;
        detail = [j.authMethod, j.email || j.account?.email, j.subscriptionType].filter(Boolean).join(" · ");
      } catch {
        detail = st.output.trim().slice(-200);
      }
    } else if (bin === "vibe") {
      // `vibe --setup` keeps the key in $VIBE_HOME/.env (default ~/.vibe/.env).
      const envFile = path.join(process.env.VIBE_HOME || path.join(os.homedir(), ".vibe"), ".env");
      let saved = "";
      try {
        saved = fs.readFileSync(envFile, "utf8");
      } catch {}
      loggedIn = !!process.env.MISTRAL_API_KEY || /^\s*MISTRAL_API_KEY\s*=\s*\S+/m.test(saved);
      detail = loggedIn ? "signed in" : "not signed in — run: vibe --setup";
    } else {
      const st = await sh("codex login status", { timeoutMs: 20000 });
      loggedIn = st.code === 0 && !/not logged in/i.test(st.output);
      detail = st.output.trim().split("\n").pop().slice(0, 200);
      if (!loggedIn && fs.existsSync(path.join(os.homedir(), ".codex", "auth.json"))) loggedIn = true;
    }
    return { installed: true, version: v.output.trim().split("\n").pop(), loggedIn, detail };
  },
  /** Start Claude Code / Codex (no shell) and buffer its JSON-lines output. */
  async run_start({ folder, cli, args: cliArgs = [], env = {}, input, id, hook }) {
    if (runs.has(id)) throw new Error("A run with that id already exists");
    let cwd;
    if (folder) cwd = safe(folder);
    else {
      cwd = path.join(ROOTS[0], ".hive-chat");
      fs.mkdirSync(cwd, { recursive: true });
    }
    const bin = CLI_BIN[cli] || "claude";
    const argv = cliArgs.map(String);
    if (hook && bin === "claude") {
      const self = path.resolve(process.argv[1]);
      const settings = { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: `"${process.execPath}" "${self}" --hook`, timeout: 900 }] }] } };
      argv.push("--settings", JSON.stringify(settings));
    }
    const childEnv = { ...process.env, ...env, HIVE_RUN: id, HIVE_SERVER: SERVER, HIVE_TOKEN: TOKEN, FORCE_COLOR: "0", CI: "1" };
    const child = spawn(bin, argv, { cwd, env: childEnv, detached: process.platform !== "win32" });
    const r = { child, lines: [], base: 0, partial: "", stderr: "", exit: null, started: Date.now(), waiters: [] };
    const wake = () => {
      for (const w of r.waiters.splice(0)) w();
    };
    child.stdout.on("data", (d) => {
      r.partial += d;
      const parts = r.partial.split("\n");
      r.partial = parts.pop();
      for (const l of parts) if (l.trim()) r.lines.push(l);
      // Keep memory bounded: drop the oldest lines the server has surely read.
      if (r.lines.length > 20000) {
        r.lines.splice(0, 5000);
        r.base += 5000;
      }
      wake();
    });
    child.stderr.on("data", (d) => {
      r.stderr = (r.stderr + d).slice(-8000);
    });
    child.on("error", (e) => {
      r.stderr += `\n${e.message}`;
      r.exit = r.exit ?? -1;
      wake();
    });
    child.on("close", (code) => {
      if (r.partial.trim()) r.lines.push(r.partial);
      r.partial = "";
      r.exit = code ?? -1;
      wake();
    });
    if (input != null) child.stdin.end(String(input));
    else child.stdin.end();
    runs.set(id, r);
    return { id, pid: child.pid };
  },
  /** Lines since `from` (waits up to ~2 s for new output). */
  async run_read({ id, from = 0 }) {
    const r = runs.get(id);
    if (!r) return { gone: true, lines: [], next: from, done: true, exit: null };
    const avail = () => r.base + r.lines.length > from || r.exit !== null;
    if (!avail()) await new Promise((res) => {
      const t = setTimeout(res, 2000);
      r.waiters.push(() => (clearTimeout(t), res()));
    });
    const start = Math.max(0, from - r.base);
    const lines = r.lines.slice(start, start + 2000);
    const next = r.base + start + lines.length;
    const done = r.exit !== null && next >= r.base + r.lines.length;
    if (done) setTimeout(() => runs.get(id) === r && runs.delete(id), 10 * 60_000).unref?.();
    return { lines, next, done, exit: r.exit, stderr: done ? r.stderr.slice(-4000) : undefined };
  },
  async run_stop({ id }) {
    const r = runs.get(id);
    if (!r || r.exit !== null) return { stopped: false };
    try {
      if (process.platform !== "win32") process.kill(-r.child.pid, "SIGTERM");
      else killTree(r.child);
    } catch {
      killTree(r.child);
    }
    setTimeout(() => r.exit === null && killTree(r.child), 5000).unref?.();
    return { stopped: true };
  },
  /** A private working copy (git worktree) per task, next to the project folder. */
  async worktree_add({ folder, name, branch }) {
    const base = safe(folder);
    const parent = path.join(path.dirname(base), ".hive-worktrees");
    const dest = path.join(parent, `${path.basename(base)}-${String(name).replace(/[^\w.-]/g, "-")}`);
    safe(dest);
    if (fs.existsSync(dest)) return { path: dest, existed: true };
    fs.mkdirSync(parent, { recursive: true });
    const r = await OPS.git({ folder: base, args: ["worktree", "add", "-b", String(branch), dest, "HEAD"] });
    if (r.code !== 0) {
      const r2 = await OPS.git({ folder: base, args: ["worktree", "add", dest, String(branch)] });
      if (r2.code !== 0) throw new Error(r.output.trim().slice(-600) || "git worktree add failed");
    }
    // Reuse the main checkout's installed dependencies when there are any.
    for (const dep of ["node_modules", "client/node_modules"]) {
      const from = path.join(base, dep);
      const to = path.join(dest, dep);
      if (fs.existsSync(from) && !fs.existsSync(to)) {
        try {
          fs.mkdirSync(path.dirname(to), { recursive: true });
          fs.symlinkSync(from, to, "dir");
        } catch {}
      }
    }
    return { path: dest, existed: false };
  },
  async worktree_remove({ folder, path: wt }) {
    const base = safe(folder);
    const target = safe(wt);
    const r = await OPS.git({ folder: base, args: ["worktree", "remove", "--force", target] });
    return { removed: r.code === 0, output: r.output.slice(-400) };
  },
  async http_get({ url }) {
    // Fetch a local dev server page (preview / smoke checks). Localhost only.
    const u = new URL(url);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) throw new Error("Only localhost URLs");
    const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    return { status: res.status, contentType: res.headers.get("content-type"), body: text.slice(0, 100000) };
  },
};

async function api(p, body) {
  const res = await fetch(`${SERVER}/api/hive-bridge${p}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": `NexoraHiveBridge/${VERSION}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  if (res.status === 401) {
    console.error("✗ Hive rejected the token — create a new one in Hive → Machines.");
    process.exit(2);
  }
  if (!res.ok) throw new Error(`${p} → HTTP ${res.status}`);
  return res.json();
}

async function handle(job) {
  const t = Date.now();
  let result;
  try {
    const fn = OPS[job.op];
    if (!fn) throw new Error(`Unknown operation ${job.op}`);
    result = { ok: true, data: await fn(job.args || {}) };
  } catch (e) {
    result = { ok: false, error: String(e.message || e) };
  }
  const label = job.op === "exec" ? `$ ${String(job.args?.command).slice(0, 80)}` : `${job.op} ${job.args?.path || ""}`;
  console.log(`${result.ok ? "✓" : "✗"} ${label} (${Date.now() - t} ms)`);
  for (let i = 0; i < 3; i++) {
    try {
      await api("/result", { jobId: job.id, ...result });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function main() {
  const info = await OPS.info();
  const hello = await api("/hello", { info });
  console.log(`✓ Connected to Hive as machine "${hello.name}". Allowed folders:\n  ${ROOTS.join("\n  ")}\nWaiting for work… (Ctrl+C to stop)`);
  let backoff = 1000;
  for (;;) {
    try {
      const r = await api("/poll");
      backoff = 1000;
      for (const job of r.jobs || []) handle(job);
    } catch (e) {
      console.error(`… connection problem (${e.message}); retrying in ${Math.round(backoff / 1000)}s`);
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 30000);
    }
  }
}

process.on("SIGINT", () => {
  for (const p of procs.values()) killTree(p.child);
  for (const r of runs.values()) if (r.exit === null) killTree(r.child);
  console.log("\nBridge stopped.");
  process.exit(0);
});
async function runHook() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  let input = {};
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {}
  const command = input.tool_input?.command || JSON.stringify(input.tool_input || {}).slice(0, 2000);
  const res = await fetch(`${SERVER}/api/hive-bridge/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": `NexoraHiveBridge/${VERSION}` },
    body: JSON.stringify({ run: process.env.HIVE_RUN || "", tool: input.tool_name || "Bash", command: String(command).slice(0, 4000) }),
    signal: AbortSignal.timeout(16 * 60_000),
  });
  const j = res.ok ? await res.json() : { approved: false, reason: `HTTP ${res.status}` };
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: j.approved ? "allow" : "deny",
      permissionDecisionReason: j.approved ? `Approved in Hive${j.by ? ` by @${j.by}` : ""}` : `Not approved in Hive: ${j.reason || "denied"}`,
    },
  };
}

if (!args.includes("--hook")) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
