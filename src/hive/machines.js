// Machines: computers and servers running the Hive bridge (bridge/hive-bridge.js).
// The bridge long-polls this server for jobs (read/write files, run commands,
// git, dev servers) and posts results back — no inbound connection needed.
//
// Commands an agent wants to run go through the machine's policy:
//   ask   → a staff member approves or denies each command in the UI (default)
//   auto  → run without asking (trusted sandbox / throwaway VM)
//   read  → file reads only; no writes, no commands
const crypto = require("crypto");
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");

const POLL_MS = 25_000;
const online = new Map(); // machineId -> { lastSeen, waiter: {res, timer} | null }
const queues = new Map(); // machineId -> [job]
const pending = new Map(); // jobId -> { resolve, reject, timer, machineId }
const approvals = new Map(); // approvalId -> { resolve, info }

const hash = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

async function createMachine(name, username) {
  const id = newId("mch");
  const token = `hvm_${crypto.randomBytes(24).toString("base64url")}`;
  await run("INSERT INTO hive_machines(id, name, token_hash, created_by, created_at) VALUES(?,?,?,?,?)", [id, name, hash(token), username, now()]);
  return { id, token };
}

async function rotateToken(id) {
  const token = `hvm_${crypto.randomBytes(24).toString("base64url")}`;
  await run("UPDATE hive_machines SET token_hash=? WHERE id=?", [hash(token), id]);
  return token;
}

async function byToken(token) {
  if (!token || !/^hvm_[\w-]{20,}$/.test(token)) return null;
  return get("SELECT * FROM hive_machines WHERE token_hash=?", [hash(token)]);
}

const isOnline = (id) => {
  const o = online.get(id);
  return !!o && (!!o.waiter || Date.now() - o.lastSeen < POLL_MS + 15_000);
};

function publicMachine(r) {
  return { id: r.id, name: r.name, createdBy: r.created_by, policy: r.policy, info: json(r.info_json, {}), lastSeen: r.last_seen, online: isOnline(r.id), createdAt: r.created_at };
}

async function listMachines() {
  return (await all("SELECT * FROM hive_machines ORDER BY created_at")).map(publicMachine);
}

function touch(id) {
  const o = online.get(id) || { lastSeen: 0, waiter: null };
  const was = isOnline(id);
  o.lastSeen = Date.now();
  online.set(id, o);
  if (!was) hub.emit("machines", { id, online: true });
  return o;
}

async function hello(machine, info) {
  touch(machine.id);
  await run("UPDATE hive_machines SET info_json=?, last_seen=? WHERE id=?", [JSON.stringify(info || {}).slice(0, 4000), now(), machine.id]);
  hub.emit("machines", { id: machine.id });
}

/** Long-poll: answer with queued jobs now, or hold the request up to 25 s. */
function poll(machine, res) {
  const o = touch(machine.id);
  run("UPDATE hive_machines SET last_seen=? WHERE id=?", [now(), machine.id]).catch(() => {});
  if (o.waiter) {
    clearTimeout(o.waiter.timer);
    o.waiter.res.json({ ok: true, jobs: [] });
  }
  const q = queues.get(machine.id);
  if (q?.length) {
    queues.set(machine.id, []);
    o.waiter = null;
    return res.json({ ok: true, jobs: q });
  }
  const waiter = { res, timer: null };
  waiter.timer = setTimeout(() => {
    if (o.waiter === waiter) o.waiter = null;
    res.json({ ok: true, jobs: [] });
  }, POLL_MS);
  res.on("close", () => {
    clearTimeout(waiter.timer);
    if (o.waiter === waiter) o.waiter = null;
  });
  o.waiter = waiter;
}

function result(machine, { jobId, ok, data, error }) {
  const p = pending.get(jobId);
  if (!p || p.machineId !== machine.id) return false;
  pending.delete(jobId);
  clearTimeout(p.timer);
  if (ok) p.resolve(data);
  else p.reject(Object.assign(new Error(error || "The bridge reported an error"), { bridge: true }));
  return true;
}

/** Run one operation on a machine and wait for its result. */
function call(machineId, op, args = {}, { timeoutMs = 90_000 } = {}) {
  if (!isOnline(machineId)) return Promise.reject(Object.assign(new Error("That machine is offline — start the Hive bridge on it"), { status: 409 }));
  const id = newId("job");
  const job = { id, op, args };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`The machine didn't answer in time (${op})`));
    }, timeoutMs + 5000);
    pending.set(id, { resolve, reject, timer, machineId });
    const o = online.get(machineId);
    if (o?.waiter) {
      clearTimeout(o.waiter.timer);
      const w = o.waiter;
      o.waiter = null;
      w.res.json({ ok: true, jobs: [job] });
    } else {
      const q = queues.get(machineId) || [];
      q.push(job);
      queues.set(machineId, q);
    }
  });
}

/**
 * Ask a human before running a command (policy "ask"). Resolves true/false.
 * The request is broadcast to Hive; anyone on staff can answer.
 */
function requestApproval(info, { timeoutMs = 15 * 60_000 } = {}) {
  const id = newId("apr");
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      approvals.delete(id);
      hub.emit("approval_done", { id, approved: false, by: null, timedOut: true });
      resolve({ approved: false, reason: "No one approved it within 15 minutes" });
    }, timeoutMs);
    timer.unref?.();
    approvals.set(id, { info: { id, ...info, at: Date.now() }, resolve: (v) => (clearTimeout(timer), resolve(v)) });
    hub.emit("approval", { id, ...info, at: Date.now() });
    if (info.taskId) hub.emitTask(info.taskId, "approval", { id, ...info, at: Date.now() });
  });
}

function answerApproval(id, { approved, by, note }) {
  const a = approvals.get(id);
  if (!a) return false;
  approvals.delete(id);
  hub.emit("approval_done", { id, approved: !!approved, by, note: note || null });
  a.resolve({ approved: !!approved, by, reason: note || (approved ? null : `Denied by @${by}`) });
  return true;
}

const pendingApprovals = () => [...approvals.values()].map((a) => a.info);

/** Cancel approvals for a task/agent that stopped. */
function dropApprovals(match) {
  for (const [id, a] of approvals) {
    if ((match.agentId && a.info.agentId === match.agentId) || (match.taskId && a.info.taskId === match.taskId)) {
      approvals.delete(id);
      hub.emit("approval_done", { id, approved: false, by: null });
      a.resolve({ approved: false, reason: "Stopped" });
    }
  }
}

module.exports = { createMachine, rotateToken, byToken, listMachines, publicMachine, hello, poll, result, call, isOnline, requestApproval, answerApproval, pendingApprovals, dropApprovals };
