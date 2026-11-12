// Checkpoints: saved states of a task's working copy, so any result can be
// restored after a worse one. Taken automatically when an agent finishes
// (labelled with who did what) and before another agent joins, and on demand.
//
// GitHub tasks: the overlay (hive_changes rows) is copied as JSON.
// Machine tasks: `git stash create` captures the working tree as a commit
// object without touching it; restoring resets to HEAD and applies it.
const { run, get, all, newId, now, json } = require("./db");
const hub = require("./hub");
const { dropOverlay } = require("./workspace");

const MAX_PER_TASK = 60;

async function create(ctx, { variant = "main", label, agentId = null, by = null, auto = false } = {}) {
  const task = ctx.task;
  let overlay = null;
  let gitSha = null;
  let files = 0;
  if (ctx.machine) {
    const { machineWorkspace } = require("./localws");
    const ws = machineWorkspace({ machineId: ctx.machine.id, folder: ctx.machine.folder });
    await ws.git(["add", "-A"]);
    const r = await ws.git(["stash", "create", `hive checkpoint: ${label || ""}`.slice(0, 200)]);
    await ws.git(["reset", "-q"]);
    gitSha = r.code === 0 ? r.output.trim() || "HEAD" : null;
    files = (await ws.changes()).length;
    if (!gitSha) return null;
  } else {
    const rows = await all("SELECT path, content, deleted, author, updated_at FROM hive_changes WHERE task_id=? AND variant=?", [task.id, variant]);
    overlay = rows;
    files = rows.length;
  }
  // Skip an automatic checkpoint identical to the latest one.
  const last = await get("SELECT * FROM hive_checkpoints WHERE task_id=? AND variant=? ORDER BY created_at DESC LIMIT 1", [task.id, variant]);
  const body = overlay ? JSON.stringify(overlay) : null;
  if (auto && last && ((body && last.overlay_json === body) || (gitSha && last.git_sha === gitSha))) return last;
  const id = newId("cp");
  await run(
    "INSERT INTO hive_checkpoints(id, task_id, variant, label, agent_id, overlay_json, git_sha, files, created_by, auto, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    [id, task.id, variant, String(label || "Checkpoint").slice(0, 200), agentId, body, gitSha, files, by, auto ? 1 : 0, now()],
  );
  // Keep the newest N automatic ones.
  const old = await all("SELECT id FROM hive_checkpoints WHERE task_id=? AND auto=1 ORDER BY created_at DESC LIMIT -1 OFFSET ?", [task.id, MAX_PER_TASK]);
  for (const o of old) await run("DELETE FROM hive_checkpoints WHERE id=?", [o.id]);
  const cp = await get("SELECT id, task_id, variant, label, agent_id, git_sha, files, created_by, auto, created_at FROM hive_checkpoints WHERE id=?", [id]);
  hub.emitTask(task.id, "checkpoint", cp);
  return cp;
}

async function list(taskId) {
  return all("SELECT id, task_id, variant, label, agent_id, git_sha, files, created_by, auto, created_at FROM hive_checkpoints WHERE task_id=? ORDER BY created_at DESC LIMIT 100", [taskId]);
}

/** Restore a checkpoint into a variant (default: the one it came from). */
async function restore(ctx, cpId, { into, by } = {}) {
  const cp = await get("SELECT * FROM hive_checkpoints WHERE id=? AND task_id=?", [cpId, ctx.task.id]);
  if (!cp) throw Object.assign(new Error("Checkpoint not found"), { status: 404 });
  const variant = into || cp.variant;
  // Save where we are first, so a restore can itself be undone.
  await create(ctx, { variant, label: `Before restoring “${cp.label}”`, by, auto: true }).catch(() => null);
  if (ctx.machine) {
    const { machineWorkspace } = require("./localws");
    const ws = machineWorkspace({ machineId: ctx.machine.id, folder: ctx.machine.folder });
    await ws.git(["reset", "-q", "--hard", "HEAD"]);
    await ws.git(["clean", "-fdq"]);
    if (cp.git_sha && cp.git_sha !== "HEAD") {
      const r = await ws.git(["stash", "apply", cp.git_sha]);
      if (r.code !== 0) throw Object.assign(new Error(`Couldn't restore: ${r.output.trim().slice(-400)}`), { status: 409 });
    }
  } else {
    const rows = json(cp.overlay_json, []);
    await run("DELETE FROM hive_changes WHERE task_id=? AND variant=?", [ctx.task.id, variant]);
    for (const r of rows) {
      await run("INSERT INTO hive_changes(task_id, variant, path, content, deleted, author, updated_at) VALUES(?,?,?,?,?,?,?)", [ctx.task.id, variant, r.path, r.content, r.deleted ? 1 : 0, r.author, r.updated_at]);
    }
    dropOverlay(ctx.task.id);
  }
  hub.emitTask(ctx.task.id, "changes", { variant });
  return { variant, label: cp.label };
}

module.exports = { create, list, restore };
