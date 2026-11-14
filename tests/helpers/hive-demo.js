// Starts scripts/hive-demo.js for an end-to-end test on a port the OS says is
// free, waits until the demo is ready, and stops it (and its server) cleanly.
//
// A fixed or randomly guessed port can already be taken (a demo on :3000, a
// server from an earlier run still closing, any other app). If the port is
// taken between picking it and the server binding it, the server exits with
// "cannot listen on port" and we try again on a new port.
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DEMO = path.join(__dirname, "..", "..", "scripts", "hive-demo.js");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startOnce(env, timeoutMs) {
  const port = await freePort();
  const proc = spawn(process.execPath, [DEMO], {
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  proc.stdout.on("data", (d) => (out += d));
  proc.stderr.on("data", (d) => (out += d));
  const stop = async () => {
    if (proc.exitCode !== null || proc.signalCode !== null) return;
    const gone = new Promise((r) => proc.once("exit", r));
    proc.kill("SIGTERM");
    const t = setTimeout(() => proc.kill("SIGKILL"), 8000);
    await gone;
    clearTimeout(t);
  };
  const end = Date.now() + timeoutMs;
  while (!out.includes("Hive demo ready")) {
    if (proc.exitCode !== null) return { ok: false, portTaken: out.includes("cannot listen on port"), out };
    if (Date.now() > end) {
      await stop();
      return { ok: false, portTaken: false, out: `demo not ready after ${timeoutMs} ms:\n${out}` };
    }
    await sleep(100);
  }
  return { ok: true, port, base: `http://localhost:${port}`, stop, output: () => out };
}

/** Start the demo; resolves to { port, base, stop(), output() }. */
async function startDemo(env = {}, { timeoutMs = 90000, attempts = 3 } = {}) {
  let last;
  for (let i = 0; i < attempts; i++) {
    last = await startOnce(env, timeoutMs);
    if (last.ok) return last;
    if (!last.portTaken) break;
  }
  throw new Error(`demo failed to start:\n${last.out}`);
}

module.exports = { startDemo, freePort };
