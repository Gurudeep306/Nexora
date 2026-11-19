// pm2 process file for the API on the Oracle VM.
//   start:   pm2 start deploy/oracle/ecosystem.config.cjs
//   reload:  pm2 reload nexora --update-env     (zero-downtime-ish restart)
//   logs:    pm2 logs nexora
//
// One process on purpose: socket.io rooms/presence and the in-memory caches
// live in the process, so a cluster would need a shared adapter (Redis).
// Environment comes from /opt/nexora/.env (the server loads it with dotenv).
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

// The commit this checkout is on, reported by /api/health. The deploy
// workflow waits for it to change; reading it here (not only from the
// caller's environment) keeps it right on every start, reload and reboot.
function gitCommit() {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  try {
    return require("child_process").execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

module.exports = {
  apps: [
    {
      name: "nexora",
      cwd: ROOT,
      script: "src/server.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        GIT_COMMIT: gitCommit(),
      },
      // The A1 VM has plenty of RAM; restart if something leaks badly.
      max_memory_restart: "1500M",
      // Wait for the port before calling the old process done (pm2 reload).
      listen_timeout: 15000,
      kill_timeout: 12000, // server.js closes gracefully within 10 s
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      time: true,
      out_file: path.join(ROOT, "logs", "nexora.out.log"),
      error_file: path.join(ROOT, "logs", "nexora.err.log"),
      merge_logs: true,
    },
  ],
};
