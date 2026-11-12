// A task's working copy: the repo snapshot at the task's base commit plus an
// overlay of changes (hive_changes). Several agents share one overlay
// ("main"); compare-mode agents each get their own variant. Writes go through
// a per-file lock so concurrent agents never lose each other's edits.
const { run, all, now } = require("./db");
const { readBase } = require("./snapshot");

const overlays = new Map(); // `${taskId}:${variant}` -> Map(path -> { content, deleted, author, updated_at })
const locks = new Map(); // `${taskId}:${variant}:${path}` -> Promise

class ToolError extends Error {}

function cleanPath(p) {
  let s = String(p ?? "").trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
  if (!s || s.length > 400 || s.includes("\0")) throw new ToolError(`Invalid path: "${p}"`);
  const parts = s.split("/").filter((x) => x && x !== ".");
  if (parts.some((x) => x === "..")) throw new ToolError(`Path may not contain "..": ${p}`);
  if (parts[0] === ".git") throw new ToolError("The .git directory is off limits");
  return parts.join("/");
}

function globToRegex(glob) {
  let re = "";
  const g = String(glob);
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        re += ".*";
        i++;
        if (g[i + 1] === "/") i++;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "{") {
      const end = g.indexOf("}", i);
      if (end > i) {
        re += `(${g.slice(i + 1, end).split(",").map((x) => x.replace(/[.+^$()|[\]\\]/g, "\\$&")).join("|")})`;
        i = end;
      } else re += "\\{";
    } else re += c.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

async function overlayOf(taskId, variant) {
  const k = `${taskId}:${variant}`;
  let ov = overlays.get(k);
  if (ov) return ov;
  ov = new Map();
  const rows = await all("SELECT path, content, deleted, author, updated_at FROM hive_changes WHERE task_id=? AND variant=?", [taskId, variant]);
  for (const r of rows) ov.set(r.path, { content: r.content, deleted: !!r.deleted, author: r.author, updated_at: r.updated_at });
  // Another request may have loaded it meanwhile; keep the first.
  if (!overlays.has(k)) overlays.set(k, ov);
  return overlays.get(k);
}

function dropOverlay(taskId) {
  for (const k of [...overlays.keys()]) if (k.startsWith(`${taskId}:`)) overlays.delete(k);
}

async function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((r) => (release = r));
  locks.set(key, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === next || locks.size > 5000) locks.delete(key);
  }
}

/** Create a workspace handle bound to one task variant and snapshot. */
function workspace({ task, variant = "main", snap }) {
  const taskId = task.id;
  const lockKey = (path) => `${taskId}:${variant}:${path}`;

  async function read(path) {
    const p = cleanPath(path);
    const ov = await overlayOf(taskId, variant);
    const hit = ov.get(p);
    if (hit) return hit.deleted ? null : hit.content;
    return readBase(snap, p);
  }

  async function put(path, content, deleted, author) {
    const p = cleanPath(path);
    const ov = await overlayOf(taskId, variant);
    const base = snap.entries.has(p) ? await readBase(snap, p).catch(() => null) : null;
    const t = now();
    // Back to the base text (or deleting a file that never existed): no change.
    if ((deleted && !snap.entries.has(p)) || (!deleted && base !== null && base === content)) {
      ov.delete(p);
      await run("DELETE FROM hive_changes WHERE task_id=? AND variant=? AND path=?", [taskId, variant, p]);
      return;
    }
    ov.set(p, { content: deleted ? null : content, deleted, author, updated_at: t });
    await run(
      `INSERT INTO hive_changes(task_id, variant, path, content, deleted, author, updated_at) VALUES(?,?,?,?,?,?,?)
       ON CONFLICT(task_id, variant, path) DO UPDATE SET content=excluded.content, deleted=excluded.deleted, author=excluded.author, updated_at=excluded.updated_at`,
      [taskId, variant, p, deleted ? null : content, deleted ? 1 : 0, author, t],
    );
  }

  async function listPaths() {
    const ov = await overlayOf(taskId, variant);
    const set = new Set(snap.entries.keys());
    for (const [p, v] of ov) v.deleted ? set.delete(p) : set.add(p);
    return [...set].sort();
  }

  return {
    taskId,
    variant,
    snap,
    cleanPath,
    read,

    async exists(path) {
      return (await read(path).catch(() => null)) !== null;
    },

    listPaths,

    async list({ path = "", pattern, limit = 400 } = {}) {
      const dir = path ? cleanPath(path).replace(/\/$/, "") + "/" : "";
      const re = pattern ? globToRegex(pattern) : null;
      const out = [];
      let total = 0;
      for (const p of await listPaths()) {
        if (dir && !p.startsWith(dir)) continue;
        if (re && !re.test(p) && !re.test(p.slice(dir.length))) continue;
        total++;
        if (out.length < limit) out.push(p);
      }
      return { paths: out, total };
    },

    async write(path, content, author) {
      const p = cleanPath(path);
      if (typeof content !== "string") throw new ToolError("content must be a string");
      if (content.length > 1_000_000) throw new ToolError("File too large (1 MB max)");
      return withLock(lockKey(p), async () => {
        const before = await read(p).catch(() => null);
        await put(p, content, false, author);
        return { path: p, created: before === null };
      });
    },

    async edit(path, oldStr, newStr, { replaceAll = false, author } = {}) {
      const p = cleanPath(path);
      if (typeof oldStr !== "string" || typeof newStr !== "string") throw new ToolError("old_string and new_string must be strings");
      if (!oldStr) throw new ToolError("old_string is empty — use write_file to create a file");
      return withLock(lockKey(p), async () => {
        const cur = await read(p);
        if (cur === null) throw new ToolError(`${p} does not exist`);
        const count = cur.split(oldStr).length - 1;
        if (count === 0) throw new ToolError(`old_string was not found in ${p}. Re-read the file: another agent may have changed it.`);
        if (count > 1 && !replaceAll) throw new ToolError(`old_string occurs ${count} times in ${p}; add surrounding context to make it unique, or set replace_all`);
        const next = replaceAll ? cur.split(oldStr).join(newStr) : cur.replace(oldStr, () => newStr);
        await put(p, next, false, author);
        return { path: p, replacements: replaceAll ? count : 1 };
      });
    },

    async remove(path, author) {
      const p = cleanPath(path);
      return withLock(lockKey(p), async () => {
        if ((await read(p).catch(() => null)) === null) throw new ToolError(`${p} does not exist`);
        await put(p, null, true, author);
        return { path: p };
      });
    },

    async revert(path) {
      const p = cleanPath(path);
      const ov = await overlayOf(taskId, variant);
      ov.delete(p);
      await run("DELETE FROM hive_changes WHERE task_id=? AND variant=? AND path=?", [taskId, variant, p]);
    },

    async search(query, { glob, limit = 80, caseSensitive = false, waitMs = 45000 } = {}) {
      let re;
      try {
        re = new RegExp(query, caseSensitive ? "g" : "gi");
      } catch {
        re = new RegExp(String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "g" : "gi");
      }
      // Wait (bounded) for the content index of the repository.
      if (snap.status === "loading") {
        await Promise.race([snap.contentReady, new Promise((r) => setTimeout(r, waitMs))]);
      }
      const gre = glob ? globToRegex(glob) : null;
      const ov = await overlayOf(taskId, variant);
      const hits = [];
      let files = 0;
      const scan = (path, text) => {
        if (hits.length >= limit) return;
        let matched = false;
        const lines = text.split("\n");
        for (let i = 0; i < lines.length && hits.length < limit; i++) {
          re.lastIndex = 0;
          if (re.test(lines[i])) {
            matched = true;
            hits.push({ path, line: i + 1, text: lines[i].slice(0, 240) });
          }
        }
        if (matched) files++;
      };
      for (const [p, v] of ov) {
        if (v.deleted || (gre && !gre.test(p) && !gre.test(p.split("/").pop()))) continue;
        scan(p, v.content || "");
      }
      for (const [p, buf] of snap.files) {
        if (ov.has(p) || (gre && !gre.test(p) && !gre.test(p.split("/").pop()))) continue;
        scan(p, buf.toString("utf8"));
        if (hits.length >= limit) break;
      }
      return { hits, files, complete: snap.status === "ready", note: snap.status !== "ready" ? "Index still loading or partial: large/binary files and some directories are not searchable; read files directly." : undefined };
    },

    /** Changed files with line stats, for the review panel and commits. */
    async changes() {
      const ov = await overlayOf(taskId, variant);
      const out = [];
      for (const [path, v] of ov) {
        const existed = snap.entries.has(path);
        let base = null;
        if (existed) base = await readBase(snap, path).catch(() => null);
        const st = lineStats(base || "", v.deleted ? "" : v.content || "");
        out.push({
          path,
          status: v.deleted ? "deleted" : existed ? "modified" : "added",
          additions: st.add,
          deletions: st.del,
          author: v.author,
          updated_at: v.updated_at,
          mode: snap.entries.get(path)?.mode || "100644",
        });
      }
      return out.sort((a, b) => a.path.localeCompare(b.path));
    },

    async overlayEntries() {
      return [...(await overlayOf(taskId, variant)).entries()];
    },
  };
}

/** Lines added/removed between two texts (multiset approximation, O(n)). */
function lineStats(a, b) {
  const count = new Map();
  for (const l of a ? a.split("\n") : []) count.set(l, (count.get(l) || 0) + 1);
  let add = 0;
  for (const l of b ? b.split("\n") : []) {
    const c = count.get(l) || 0;
    if (c > 0) count.set(l, c - 1);
    else add++;
  }
  let del = 0;
  for (const c of count.values()) del += c;
  return { add, del };
}

/** Copy one variant's overlay onto another (compare mode: adopt a winner). */
async function adoptVariant(taskId, from, to = "main") {
  await run("DELETE FROM hive_changes WHERE task_id=? AND variant=?", [taskId, to]);
  await run(
    `INSERT INTO hive_changes(task_id, variant, path, content, deleted, author, updated_at)
     SELECT task_id, ?, path, content, deleted, author, updated_at FROM hive_changes WHERE task_id=? AND variant=?`,
    [to, taskId, from],
  );
  overlays.delete(`${taskId}:${to}`);
}

module.exports = { workspace, adoptVariant, dropOverlay, cleanPath, globToRegex, lineStats, ToolError };
