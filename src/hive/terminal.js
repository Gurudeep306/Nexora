// Live terminals on a machine: a real shell the person types into from the
// browser. The bridge runs the shell in a pseudo-terminal and keeps its
// output; Hive relays keystrokes in and output out over plain HTTP, so it
// works through the same long-poll connection as everything else, and a
// dropped browser picks up where it left off (output is read by offset).
const { newId } = require("./db");
const machines = require("./machines");

const terms = new Map(); // termId -> { machineId, username, folder, createdAt, cols, rows, mode }
const MAX_PER_PERSON = 6;

function mine(username) {
  return [...terms.entries()].filter(([, t]) => t.username === username).map(([id, t]) => ({ id, ...t }));
}

async function open({ machineId, username, folder = "", cols, rows }) {
  // At the limit, the oldest shell (often a tab left open on another device) makes room.
  const existing = mine(username)
    .filter((t) => t.machineId === machineId)
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const t of existing.slice(0, Math.max(0, existing.length - MAX_PER_PERSON + 1))) await close(machineId, t.id);
  const id = newId("term");
  let r;
  try {
    r = await machines.call(machineId, "pty_open", { id, folder, cols, rows }, { timeoutMs: 30_000 });
  } catch (e) {
    if (/Unknown operation/.test(e.message)) {
      throw Object.assign(new Error("This machine's bridge is too old for live terminals. Update it: Hive → Machines → the machine → New token, then run the new command on the machine."), { status: 409 });
    }
    throw e;
  }
  terms.set(id, { machineId, username, folder: r.cwd || folder, createdAt: Date.now(), cols: r.cols, rows: r.rows, mode: r.mode });
  return { id, ...r };
}

/** The terminal, if it exists on this machine and belongs to this person. */
function own(termId, machineId, username) {
  const t = terms.get(termId);
  if (!t || t.machineId !== machineId || t.username !== username) {
    throw Object.assign(new Error("That terminal is closed or isn't yours"), { status: 404 });
  }
  return t;
}

const read = (machineId, id, from) => machines.call(machineId, "pty_read", { id, from }, { timeoutMs: 25_000 });
const write = (machineId, id, data) => machines.call(machineId, "pty_write", { id, data }, { timeoutMs: 15_000 });
const resize = (machineId, id, cols, rows) => machines.call(machineId, "pty_resize", { id, cols, rows }, { timeoutMs: 15_000 });

async function close(machineId, id) {
  terms.delete(id);
  return machines.call(machineId, "pty_close", { id }, { timeoutMs: 15_000 }).catch(() => ({ closed: false }));
}

function forget(id) {
  terms.delete(id);
}

module.exports = { open, own, read, write, resize, close, forget, mine };
