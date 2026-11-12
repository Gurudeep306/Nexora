// A task's working copy on a real folder of a connected machine (the Hive
// bridge). Same interface as workspace.js, but files are read and written in
// place and "changes" come from git, so agents can also run commands, tests
// and dev servers against exactly what they edited.
const machines = require("./machines");
const { cleanPath, globToRegex, lineStats, ToolError } = require("./workspace");

const locks = new Map();
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
    if (locks.get(key) === next) locks.delete(key);
  }
}

function machineWorkspace({ machineId, folder }) {
  const call = (op, args, o) => machines.call(machineId, op, { folder, ...args }, o).catch((e) => {
    throw e.bridge ? new ToolError(e.message) : e;
  });
  let pathsCache = null;

  async function read(path) {
    const r = await call("read", { path: cleanPath(path) });
    return r.content;
  }

  async function git(args, o) {
    return call("git", { args }, o);
  }

  return {
    kind: "machine",
    machineId,
    folder,
    cleanPath,
    read,
    async listPaths() {
      if (pathsCache && Date.now() - pathsCache.at < 5000) return pathsCache.paths;
      const r = await call("list", {});
      pathsCache = { at: Date.now(), paths: r.paths };
      return r.paths;
    },
    async exists(path) {
      return (await read(path)) !== null;
    },
    async list({ path = "", pattern, limit = 400 } = {}) {
      const dir = path ? cleanPath(path) : "";
      const re = pattern ? globToRegex(pattern) : null;
      const all = (await this.listPaths()).filter((p) => (!dir || p === dir || p.startsWith(dir + "/")) && (!re || re.test(p)));
      return { paths: all.slice(0, limit), total: all.length };
    },
    async write(path, content) {
      const p = cleanPath(path);
      return withLock(`${machineId}:${folder}:${p}`, async () => {
        const r = await call("write", { path: p, content });
        pathsCache = null;
        return { path: p, created: r.created };
      });
    },
    async edit(path, oldStr, newStr, { replaceAll = false } = {}) {
      const p = cleanPath(path);
      return withLock(`${machineId}:${folder}:${p}`, async () => {
        const cur = await read(p);
        if (cur === null) throw new ToolError(`${p} does not exist`);
        const count = cur.split(oldStr).length - 1;
        if (!count) throw new ToolError(`old_string not found in ${p}. Read the file again and copy the exact text.`);
        if (count > 1 && !replaceAll) throw new ToolError(`old_string matches ${count} places in ${p}; add surrounding lines to make it unique or set replace_all.`);
        await call("write", { path: p, content: replaceAll ? cur.split(oldStr).join(newStr) : cur.replace(oldStr, () => newStr) });
        return { path: p, replacements: replaceAll ? count : 1 };
      });
    },
    async remove(path) {
      const p = cleanPath(path);
      await call("remove", { path: p });
      pathsCache = null;
      return { path: p };
    },
    async revert(path) {
      const p = cleanPath(path);
      const r = await git(["checkout", "HEAD", "--", p]);
      if (r.code !== 0) await call("remove", { path: p }); // untracked file
      pathsCache = null;
    },
    async search(query, { glob, limit = 80, caseSensitive = false } = {}) {
      const r = await call("search", { query, glob, caseSensitive, limit });
      return { hits: r.hits, files: new Set(r.hits.map((h) => h.path)).size, complete: true };
    },
    /** The file as committed (HEAD), for diffs. */
    async readBase(path) {
      const r = await git(["show", `HEAD:${cleanPath(path)}`]);
      return r.code === 0 ? r.output : null;
    },
    async changes() {
      const st = await git(["-c", "core.quotepath=off", "status", "--porcelain=v1", "--untracked-files=all"]);
      if (st.code !== 0) return [];
      const num = await git(["-c", "core.quotepath=off", "diff", "--numstat", "HEAD"]);
      const stats = new Map();
      for (const line of num.output.split("\n")) {
        const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
        if (m) stats.set(m[3], { add: Number(m[1]) || 0, del: Number(m[2]) || 0 });
      }
      const out = [];
      for (const line of st.output.split("\n")) {
        if (line.length < 4) continue;
        const code = line.slice(0, 2);
        let path = line.slice(3).trim();
        if (path.includes(" -> ")) path = path.split(" -> ")[1];
        path = path.replace(/^"|"$/g, "");
        const status = code.includes("D") ? "deleted" : code === "??" || code.includes("A") ? "added" : "modified";
        let s = stats.get(path);
        if (!s && status === "added") {
          const text = await read(path).catch(() => "");
          s = lineStats("", text || "");
          s = { add: s.add, del: 0 };
        }
        out.push({ path, status, additions: s?.add || 0, deletions: s?.del || 0, author: "working tree", updated_at: Date.now(), mode: "100644" });
      }
      return out.sort((a, b) => a.path.localeCompare(b.path));
    },
    async exec(command, { timeoutMs } = {}) {
      return call("exec", { command, timeoutMs }, { timeoutMs: (timeoutMs || 120000) + 10000 });
    },
    git,
    call,
  };
}

module.exports = { machineWorkspace };
