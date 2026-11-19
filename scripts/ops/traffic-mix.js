#!/usr/bin/env node
// Scripted traffic mix for measuring database usage (docs/ops/db-usage.md).
//
//   node scripts/ops/traffic-mix.js [--out result.json] [--keep]
//
// Always runs against a fresh LOCAL temp database (TURSO_* are blanked), in
// production mode with DB_STATS=1 and the internet stubbed out:
//   1. boot #1 creates the schema; the owner and a member register
//   2. the fixture (27,718 problems, users, progress, social, GATE) is seeded
//   3. boot #2 is measured: the boot itself, then the private-mode gate,
//      anonymous hits and health checks, then a signed-in owner and member
//      browsing problems (filters/search/sort/pages), hub, profile, social,
//      GATE, leaderboards and AI-tutor lookups, then a quiet period in which
//      only background jobs run.
// Prints a per-endpoint table and writes the raw /api/admin/db-stats JSON.
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const args = process.argv.slice(2);
const outFile = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const QUIET_MS = Number(process.env.MIX_QUIET_MS) || 20000;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexora-dbmix-"));
const DB = path.join(tmp, "mix.db");
const PORT = 27000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const OWNER = "mixowner";
const MEMBER = "mixalice";
const PASSWORD = "mix-password-123";

let proc = null;
let log = "";
function boot() {
  log = "";
  proc = spawn(process.execPath, ["--require", path.join(__dirname, "offline-stub.cjs"), "src/server.js"], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: "production",
      PORT: String(PORT),
      DB_PATH: DB,
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      USE_CLOUD_DB: "",
      DB_STATS: "1",
      OWNER_USERNAME: OWNER,
      SESSION_SECRET: "traffic-mix-secret-0123456789abcdef0123456789",
      DISABLE_PUPPETEER: "1",
      // The statement backfill is measured on its own (docs/ops/db-usage.md).
      STATEMENT_BACKFILL: "0",
      JUDGE_MODE: "remote",
      STUDIO_PASSWORD: "traffic-mix-studio-password-0123456789",
      ...(process.env.MIX_EXTRA_ENV ? JSON.parse(process.env.MIX_EXTRA_ENV) : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
}
async function stop() {
  if (!proc || proc.exitCode !== null) return;
  proc.kill("SIGTERM");
  await new Promise((r) => proc.once("exit", r));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUp() {
  for (let i = 0; i < 240; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`, { headers: hdr() })).ok) return;
    } catch {}
    if (proc.exitCode !== null) throw new Error(`server exited: ${log}`);
    await sleep(250);
  }
  throw new Error(`server not up: ${log}`);
}

let ipSeq = 1;
function hdr(cookie, extra = {}) {
  // Behind Render's proxy: https + a client IP (spread so the production rate
  // limiter doesn't throttle the scripted mix).
  return {
    "X-Forwarded-Proto": "https",
    "X-Forwarded-For": `10.9.${Math.floor(ipSeq / 200) % 250}.${ipSeq++ % 200}`,
    Origin: BASE,
    ...(cookie ? { Cookie: cookie } : {}),
    ...extra,
  };
}
const counts = { requests: 0, statuses: {} };
async function hit(method, p, { cookie, body, html } = {}) {
  const r = await fetch(`${BASE}${p}`, {
    method,
    headers: hdr(cookie, {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(html ? { Accept: "text/html" } : {}),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
  counts.requests++;
  counts.statuses[r.status] = (counts.statuses[r.status] || 0) + 1;
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: r.status, json, headers: r.headers };
}
const GET = (p, o) => hit("GET", p, o);
const POST = (p, body, o = {}) => hit("POST", p, { ...o, body });
const PUT = (p, body, o = {}) => hit("PUT", p, { ...o, body });

async function signIn(username, register) {
  const r = await fetch(`${BASE}/api/user/${register ? "register" : "login"}`, {
    method: "POST",
    headers: hdr(null, { "Content-Type": "application/json" }),
    body: JSON.stringify({ username, password: PASSWORD, email: `${username}@example.invalid` }),
  });
  if (r.status !== 200) throw new Error(`${username} ${register ? "register" : "login"}: ${r.status} ${await r.text()}`);
  return (r.headers.get("set-cookie") || "").split(";")[0];
}

async function stats(cookie) {
  const r = await GET("/api/admin/db-stats?top=40", { cookie });
  if (r.status !== 200) throw new Error(`db-stats ${r.status}`);
  return r.json;
}
const diff = (a, b) => ({
  statements: b.totals.statements - a.totals.statements,
  reads: b.totals.reads - a.totals.reads,
  written: b.totals.written - a.totals.written,
});

/** A signed-in user's typical session. */
async function browse(cookie, username) {
  // Hub / home
  await GET("/api/site/status", { cookie });
  await GET("/api/auth/status", { cookie });
  await GET("/api/site/badges", { cookie });
  await GET("/api/stats", { cookie });
  await GET("/api/nexus", { cookie });
  await GET("/api/level-roadmap", { cookie });
  await GET("/api/performance", { cookie });
  await GET("/api/social/notifications/unread", { cookie });
  await GET(`/api/messages/unread/${username}`, { cookie });
  // Problems: list, filters, search, sort, pagination, one problem
  await GET("/api/problems?limit=50", { cookie });
  await GET("/api/problems?limit=50&offset=50", { cookie });
  await GET("/api/problems?limit=50&offset=100", { cookie });
  await GET("/api/problems?platform=codeforces&minRating=1200&maxRating=1600&limit=50", { cookie });
  await GET("/api/problems?tag=dp&limit=50", { cookie });
  await GET("/api/problems?search=Tree&limit=50", { cookie });
  await GET("/api/problems?status=solved&limit=50", { cookie });
  await GET("/api/problems?status=unsolved&sort=title&order=desc&limit=50", { cookie });
  await GET("/api/tags", { cookie });
  await GET("/api/bookmarks", { cookie });
  const first = (await GET("/api/problems?platform=atcoder&limit=5", { cookie })).json?.problems?.[0];
  if (first) {
    await GET(`/api/problems/${first.id}`, { cookie });
    await GET(`/api/problem-statement/${first.id}`, { cookie });
    await GET(`/api/decomposition/${first.id}`, { cookie });
  }
  await GET("/api/skill-tree", { cookie });
  await GET("/api/roadmap", { cookie });
  await GET("/api/weakness-analysis", { cookie });
  await GET("/api/settings", { cookie });
  // Leaderboards
  await GET("/api/leaderboard", { cookie });
  await GET("/api/gate/leaderboard?period=week", { cookie });
  // Profile
  await GET(`/api/profiles/${username}`, { cookie });
  await GET(`/api/profiles/${username}/showcase`, { cookie });
  await GET("/api/profiles/fx_user3", { cookie });
  await GET("/api/profiles/fx_user3/showcase", { cookie });
  // Social
  await GET("/api/social/feed", { cookie });
  await GET("/api/social/feed?tab=explore", { cookie });
  await GET("/api/social/trending", { cookie });
  await GET("/api/social/suggestions", { cookie });
  await GET("/api/social/notifications", { cookie });
  await GET("/api/social/users/fx_user3/posts", { cookie });
  // GATE
  await GET("/api/gate/meta", { cookie });
  await GET("/api/gate/questions?exam=CSE&limit=20", { cookie });
  await GET("/api/gate/me/summary", { cookie });
  await GET("/api/gate/daily", { cookie });
  await GET("/api/gate/trends?exam=CSE", { cookie });
  await GET("/api/gate/questions/cse-1991-a-1-i/stats", { cookie });
  // AI tutor data lookups (no model call: the agent status + conversation list)
  await GET("/api/agent/status", { cookie });
  await GET("/api/agent/conversations", { cookie });
  // Learn
  await GET("/api/tutorials", { cookie });
  await GET("/api/forge/paths", { cookie });
}

(async () => {
  try {
    // ── boot #1: schema + accounts ──
    boot();
    await waitUp();
    await signIn(OWNER, true);
    await signIn(MEMBER, true);
    await stop();
    // ── fixture ──
    execFileSync(process.execPath, [path.join(__dirname, "seed-fixture.js"), DB, "--users", `${OWNER},${MEMBER}`], { stdio: "inherit" });

    // ── boot #2: measured ──
    boot();
    await waitUp();
    await sleep(3000); // catalog warm-up, startup jobs
    const owner = await signIn(OWNER, false);
    const s0 = await stats(owner);
    const phases = [{ phase: "boot (incl. warm-up)", ...s0.totals, requests: 0 }];
    let prev = s0;
    const phase = async (name, fn) => {
      const before = counts.requests;
      await fn();
      const now = await stats(owner);
      phases.push({ phase: name, requests: counts.requests - before, ...diff(prev, now) });
      prev = now;
    };

    await phase("health checks ×30", async () => {
      for (let i = 0; i < 30; i++) await GET("/api/health");
    });
    await phase("private-mode gate: anonymous ×40", async () => {
      for (let i = 0; i < 10; i++) {
        await GET("/", { html: true });
        await GET("/api/problems");
        await GET("/api/site/status");
        await GET("/api/auth/status");
      }
    });
    await phase("owner session", () => browse(owner, OWNER));
    // Open the site so members and anonymous visitors get in.
    await phase("owner opens the site", async () => {
      const r = await PUT("/api/admin/site/private-mode", { enabled: false }, { cookie: owner });
      if (r.status !== 200) throw new Error(`private-mode off: ${r.status} ${JSON.stringify(r.json)}`);
    });
    const member = await signIn(MEMBER, false);
    await phase("member session ×2", async () => {
      await browse(member, MEMBER);
      await browse(member, MEMBER);
    });
    await phase("anonymous browsing ×10", async () => {
      for (let i = 0; i < 10; i++) {
        await GET("/api/site/status");
        await GET("/api/problems?limit=50");
        await GET(`/api/problems?limit=50&offset=${i * 50}`);
        await GET("/api/leaderboard");
        await GET("/api/social/trending");
        await GET("/api/gate/trends?exam=CSE");
      }
    });
    await phase(`quiet ${Math.round(QUIET_MS / 1000)}s (background jobs only)`, () => sleep(QUIET_MS));

    const final = await stats(owner);

    // ── boot #3: a plain restart (what Render's free plan does all day) ──
    await stop();
    boot();
    await waitUp();
    await sleep(3000);
    const restart = (await stats(await signIn(OWNER, false))).totals;
    phases.push({ phase: "restart: cold start + sign-in (separate process)", requests: 1, statements: restart.statements, reads: restart.reads, written: restart.written });

    const result = { at: new Date().toISOString(), requests: counts.requests, statuses: counts.statuses, phases, final, restart };
    if (outFile) fs.writeFileSync(outFile, JSON.stringify(result, null, 2));

    const fmt = (n) => Number(n).toLocaleString("en-US");
    console.log("\n| Phase | Requests | Statements | Rows read (est.) | Rows written |\n|---|---:|---:|---:|---:|");
    for (const p of phases) console.log(`| ${p.phase} | ${fmt(p.requests)} | ${fmt(p.statements)} | ${fmt(p.reads)} | ${fmt(p.written)} |`);
    const t = final.totals;
    console.log(`| **total** | ${fmt(counts.requests)} | ${fmt(t.statements)} | ${fmt(t.reads)} | ${fmt(t.written)} |`);
    console.log("\n| Endpoint | Requests | Rows read | Reads/request | Rows written |\n|---|---:|---:|---:|---:|");
    for (const e of final.endpoints.slice(0, 30)) {
      console.log(`| ${e.route} | ${e.requests} | ${fmt(e.reads)} | ${fmt(Math.round(e.reads / Math.max(e.requests, 1)))} | ${fmt(e.written)} |`);
    }
    console.log(`| (boot + background) | – | ${fmt(final.background.reads)} | – | ${fmt(final.background.written)} |`);
    console.log("\nTop statements by rows read:");
    for (const q of final.topReads.slice(0, 15)) console.log(`  ${fmt(q.reads).padStart(12)}  ×${q.calls}  ${q.scans.length ? `[SCAN ${q.scans.join(",")}] ` : ""}${q.sql.slice(0, 150)}`);
    console.log("\nTop statements by rows written:");
    for (const q of final.topWrites.slice(0, 8)) console.log(`  ${fmt(q.written).padStart(12)}  ×${q.calls}  ${q.sql.slice(0, 150)}`);
    console.log(`\nstatuses: ${JSON.stringify(counts.statuses)}`);
  } catch (e) {
    console.error(e);
    console.error(log.slice(-4000));
    process.exitCode = 1;
  } finally {
    await stop();
    if (!args.includes("--keep")) fs.rmSync(tmp, { recursive: true, force: true });
    else console.log(`kept ${tmp}`);
  }
})();
