// Read-only view of a repository at one commit, shared by every agent working
// on it. The file list comes from the git tree API (fast); file contents come
// from one streamed tarball download indexed in memory (so `search` can grep
// the whole repo), with the contents API as a fallback while it loads or for
// files too big to keep.
const gh = require("./github");

const MAX_FILE = 512 * 1024; // bytes kept per file
const MAX_TOTAL = Number(process.env.HIVE_SNAPSHOT_MB || 64) * 1024 * 1024;
const MAX_SNAPSHOTS = 3;
const SKIP_DIRS = /(^|\/)(node_modules|\.git|dist|build|\.next|vendor|coverage|__pycache__)\//;

const cache = new Map(); // `${owner}/${repo}@${sha}` -> snapshot

const isText = (buf) => {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
  return true;
};

function touch(key, snap) {
  cache.delete(key);
  cache.set(key, snap);
  while (cache.size > MAX_SNAPSHOTS) cache.delete(cache.keys().next().value);
}

/** Get (or start loading) the snapshot of owner/repo at commit sha. */
async function getSnapshot(token, owner, repo, sha) {
  const key = `${owner}/${repo}@${sha}`;
  let snap = cache.get(key);
  if (snap) {
    touch(key, snap);
    await snap.treeReady;
    return snap;
  }
  snap = {
    key,
    owner,
    repo,
    sha,
    token,
    entries: new Map(), // path -> { mode, size }
    files: new Map(), // path -> Buffer (text files within budget)
    bytes: 0,
    status: "loading",
    truncatedTree: false,
    rawCache: new Map(),
  };
  touch(key, snap);
  snap.treeReady = (async () => {
    const commit = await gh.commit(token, owner, repo, sha);
    const tree = await gh.tree(token, owner, repo, commit.commit.tree.sha);
    snap.truncatedTree = !!tree.truncated;
    for (const e of tree.tree || []) {
      if (e.type === "blob") snap.entries.set(e.path, { mode: e.mode, size: e.size || 0 });
    }
  })();
  snap.contentReady = snap.treeReady
    .then(async () => {
      const res = await gh.tarball(token, owner, repo, sha);
      await require("./tar").readTarGz(res.body, {
        want: (p, size) => size <= MAX_FILE && snap.bytes + size <= MAX_TOTAL && !SKIP_DIRS.test(p),
        onEntry: ({ path, mode, size, data }) => {
          if (!snap.entries.has(path)) snap.entries.set(path, { mode: mode & 0o111 ? "100755" : "100644", size });
          if (data && isText(data)) {
            snap.files.set(path, data);
            snap.bytes += data.length;
          }
        },
      });
      snap.status = "ready";
    })
    .catch((e) => {
      snap.status = "partial";
      snap.error = e.message;
    });
  try {
    await snap.treeReady;
  } catch (e) {
    cache.delete(key);
    throw e;
  }
  return snap;
}

/** Text of one file at the snapshot's commit, or null when it doesn't exist. */
async function readBase(snap, path) {
  if (!snap.entries.has(path)) return null;
  const buf = snap.files.get(path);
  if (buf) return buf.toString("utf8");
  if (snap.rawCache.has(path)) return snap.rawCache.get(path);
  const raw = await gh.rawFile(snap.token, snap.owner, snap.repo, path, snap.sha);
  const text = isText(raw) ? raw.toString("utf8") : null;
  if (text !== null && raw.length <= 2 * MAX_FILE) {
    snap.rawCache.set(path, text);
    if (snap.rawCache.size > 200) snap.rawCache.delete(snap.rawCache.keys().next().value);
  }
  if (text === null) throw new Error(`${path} is a binary file`);
  return text;
}

module.exports = { getSnapshot, readBase, isText, MAX_FILE };
