// End-to-end check of the "deployed" configuration: production mode, a
// Turso-style remote database (mocked locally), remote-only judging.
// Verifies that logins and uploaded files survive a server restart — the
// exact situation on a free host that sleeps and wipes its disk.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const ROOT = path.join(__dirname, "..");
const DB_PORT = 18089;
const APP_PORT = 14100;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexora-cloud-"));
let mock;
let app;

const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(APP_PORT),
  APP_URL: BASE,
  SESSION_SECRET: "ci-secret-ci-secret-ci-secret-ci-secret-1234",
  STUDIO_PASSWORD: "ci-studio-password",
  TURSO_DATABASE_URL: `http://127.0.0.1:${DB_PORT}`,
  TURSO_AUTH_TOKEN: "",
  JUDGE_MODE: "remote",
  DISABLE_PUPPETEER: "1",
  DB_PATH: path.join(tmp, "unused.db"),
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`timeout waiting for ${url}`);
}
function startApp() {
  app = spawn(process.execPath, ["src/server.js"], { cwd: ROOT, env, stdio: "ignore" });
  return waitFor(`${BASE}/api/health`);
}
async function stopApp() {
  if (!app) return;
  const done = new Promise((r) => app.once("exit", r));
  app.kill("SIGKILL");
  await done;
  app = null;
}
// Requests look like they came through Render's HTTPS proxy.
const H = { "Content-Type": "application/json", "X-Forwarded-Proto": "https" };

before(async () => {
  mock = spawn(process.execPath, [path.join(__dirname, "helpers", "hrana-mock.js"), path.join(tmp, "cloud.db"), String(DB_PORT)], { stdio: "ignore" });
  await waitFor(`http://127.0.0.1:${DB_PORT}/health`);
  await startApp();
});
after(async () => {
  await stopApp();
  mock?.kill("SIGKILL");
});

test("health reports the cloud database driver", async () => {
  const h = await (await fetch(`${BASE}/api/health`)).json();
  assert.equal(h.ok, true);
  assert.equal(h.db, "libsql");
  assert.equal(h.env, "production");
});

test("login session and uploaded avatar survive a restart + disk wipe", async () => {
  const user = `ci${Date.now().toString(36)}`;
  const reg = await fetch(`${BASE}/api/user/register`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ username: user, email: `${user}@ci.test`, password: "secret123" }),
  });
  assert.equal(reg.status, 200);
  const cookie = reg.headers.get("set-cookie").split(";")[0];
  assert.match(cookie, /^nx\.sid=/);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const up = await (
    await fetch(`${BASE}/api/user/avatar`, {
      method: "POST",
      headers: { ...H, Cookie: cookie },
      body: JSON.stringify({ username: user, image: `data:image/png;base64,${png.toString("base64")}` }),
    })
  ).json();
  assert.equal(up.ok, true, JSON.stringify(up));

  // Simulate the free host sleeping: kill the server and wipe the upload.
  await stopApp();
  fs.rmSync(path.join(ROOT, "public", up.avatar_url), { force: true });
  await startApp();

  const status = await (await fetch(`${BASE}/api/auth/status`, { headers: { ...H, Cookie: cookie } })).json();
  assert.equal(status.authenticated, true, "session was lost on restart");
  assert.equal(status.user.username, user);

  const img = await fetch(`${BASE}${up.avatar_url}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), png);
  fs.rmSync(path.join(ROOT, "public", up.avatar_url), { force: true });
});

test("user code is never executed on the host in remote judge mode", async () => {
  const u = `cr${Date.now().toString(36)}`;
  const reg = await fetch(`${BASE}/api/user/register`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ username: u, email: `${u}@ci.test`, password: "secret123" }),
  });
  const cookie = reg.headers.get("set-cookie").split(";")[0];
  const r = await (
    await fetch(`${BASE}/api/run`, {
      method: "POST",
      headers: { ...H, Cookie: cookie },
      body: JSON.stringify({ language: "javascript", input: "", code: "console.log(process.env.SESSION_SECRET)" }),
    })
  ).json();
  assert.ok(!String(r.output || "").includes(env.SESSION_SECRET), "secret leaked from local execution");
});
