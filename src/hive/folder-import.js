// Upload a folder → it becomes a project agents can work on.
//
// Big folders don't belong in the database (Hive Drive stores files there).
// Instead the folder goes into a new private GitHub repository — GitHub keeps
// it, versions it and has no practical size limit for code — and the repo is
// opened as a Hive project with a brief written from its code. The browser
// sends the files in small batches (each file becomes a git blob straight
// away, so memory stays low), then one commit puts them all on the default
// branch.
const { run, get, newId, now, json } = require("./db");
const gh = require("./github");
const vault = require("./vault");

// Folders that are rebuilt from the code and never belong in a repository.
const SKIP_DIR = /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|\.turbo|\.cache|\.parcel-cache|dist|build|out|coverage|\.venv|venv|env|__pycache__|\.pytest_cache|\.mypy_cache|\.gradle|\.idea|\.DS_Store|target|Pods|DerivedData)(\/|$)/;
const SKIP_FILE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|\.env|\.env\.[^/]*local)$/;
const MAX_FILE = 95 * 1024 * 1024; // GitHub rejects files over 100 MB
const MAX_FILES = 20000;

const SCHEMA = `CREATE TABLE IF NOT EXISTS hive_folder_imports (
  id TEXT PRIMARY KEY,
  github_id TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL,
  entries_json TEXT NOT NULL DEFAULT '[]',
  skipped INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  project_id TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`;
let ready = null;
const init = () => (ready ||= run(SCHEMA));

const skipPath = (p) => SKIP_DIR.test(p) || SKIP_FILE.test(p);

/** A safe relative path inside the repo (no "..", no leading slash, no common top folder decided here). */
function cleanPath(p) {
  const parts = String(p || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((x) => x && x !== "." && x !== "..");
  return parts.join("/").slice(0, 400);
}

function repoName(name) {
  return (
    String(name || "project")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "project"
  );
}

async function tokenFor(githubId) {
  const row = githubId ? await get("SELECT * FROM hive_github WHERE id=?", [githubId]) : await get("SELECT * FROM hive_github ORDER BY created_at LIMIT 1");
  if (!row) throw Object.assign(new Error("Connect GitHub first (Your GitHub) — the folder is kept in a private repository there"), { status: 400 });
  return { row, token: vault.open(row.token_enc) };
}

/** Start an import: create the private repository. */
async function start({ name, githubId = null, isPrivate = true, description = "", username }) {
  await init();
  const { row, token } = await tokenFor(githubId);
  const base = repoName(name);
  let repo = null;
  let lastErr = null;
  for (let i = 0; i < 5 && !repo; i++) {
    try {
      repo = await gh.createRepo(token, { name: i ? `${base}-${i + 1}` : base, description: String(description || "").slice(0, 300), isPrivate: isPrivate !== false });
    } catch (e) {
      lastErr = e;
      if (!/already exists|name already/i.test(e.message)) break;
    }
  }
  if (!repo) throw Object.assign(new Error(`GitHub couldn't create the repository: ${lastErr?.message || "unknown error"}`), { status: 400 });
  const id = newId("imp");
  const t = now();
  await run("INSERT INTO hive_folder_imports(id, github_id, owner, repo, branch, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)", [id, row.id, repo.owner.login, repo.name, repo.default_branch || "main", username, t, t]);
  return { id, repo: `${repo.owner.login}/${repo.name}`, private: !!repo.private, maxFile: MAX_FILE };
}

async function importRow(id) {
  await init();
  const r = await get("SELECT * FROM hive_folder_imports WHERE id=?", [id]);
  if (!r) throw Object.assign(new Error("Upload not found"), { status: 404 });
  if (r.status !== "open") throw Object.assign(new Error("This upload is already finished"), { status: 409 });
  return r;
}

/** Add a batch of files: each becomes a git blob right away. */
async function addFiles(id, files) {
  const r = await importRow(id);
  const { token } = await tokenFor(r.github_id);
  const entries = json(r.entries_json, []);
  const known = new Map(entries.map((e, i) => [e.path, i]));
  const out = [];
  let skipped = 0;
  for (const f of files) {
    const p = cleanPath(f.path);
    if (!p || skipPath(p)) {
      skipped++;
      continue;
    }
    if (f.buffer.length > MAX_FILE) {
      out.push({ path: p, error: "Over 95 MB — GitHub can't store it in a repository (put it in Hive Drive or a release instead)" });
      continue;
    }
    if (entries.length >= MAX_FILES && !known.has(p)) {
      out.push({ path: p, error: `More than ${MAX_FILES} files` });
      continue;
    }
    try {
      const blob = await gh.createBlobBase64(token, r.owner, r.repo, f.buffer.toString("base64"));
      const e = { path: p, sha: blob.sha, mode: "100644", type: "blob" };
      if (known.has(p)) entries[known.get(p)] = e;
      else {
        known.set(p, entries.length);
        entries.push(e);
      }
      out.push({ path: p, ok: true });
    } catch (e) {
      out.push({ path: p, error: e.message });
    }
  }
  await run("UPDATE hive_folder_imports SET entries_json=?, skipped=skipped+?, updated_at=? WHERE id=?", [JSON.stringify(entries), skipped, now(), id]);
  return { files: out, skipped, total: entries.length };
}

/** Commit everything, open it as a project and write its brief. */
async function finish(id, { username }) {
  const r = await importRow(id);
  const { token } = await tokenFor(r.github_id);
  const entries = json(r.entries_json, []);
  if (!entries.length) throw Object.assign(new Error("No files were uploaded"), { status: 400 });
  // Strip one shared top folder ("my-app/src/…" → "src/…") so the repo root is the folder itself.
  const tops = new Set(entries.map((e) => e.path.split("/")[0]));
  const strip = tops.size === 1 && entries.every((e) => e.path.includes("/")) ? `${[...tops][0]}/` : "";
  const tree = entries.map((e) => ({ ...e, path: strip ? e.path.slice(strip.length) : e.path }));
  const head = await gh.getRef(token, r.owner, r.repo, r.branch);
  const parent = head.object.sha;
  const parentCommit = await gh.commit(token, r.owner, r.repo, parent);
  // GitHub limits one tree request; build it in chunks on top of each other.
  let baseTree = parentCommit.commit.tree.sha;
  for (let i = 0; i < tree.length; i += 2000) baseTree = (await gh.createTree(token, r.owner, r.repo, baseTree, tree.slice(i, i + 2000))).sha;
  const commit = await gh.createCommit(token, r.owner, r.repo, `Upload ${tree.length} files from Hive`, baseTree, [parent]);
  await gh.updateRef(token, r.owner, r.repo, r.branch, commit.sha);
  const repos = require("./repos");
  repos.clearCache();
  const opened = await repos.openRepo(`${r.owner}/${r.repo}`, { username, brief: false });
  await run("UPDATE hive_folder_imports SET status='done', project_id=?, updated_at=? WHERE id=?", [opened.project.id, now(), id]);
  repos.writeBrief(opened.project.id).catch((e) => console.error("[hive brief]", e.message));
  return { project: opened.project, repo: `${r.owner}/${r.repo}`, files: tree.length, skipped: r.skipped, commit: commit.sha };
}

module.exports = { start, addFiles, finish, skipPath, cleanPath, repoName, MAX_FILE, SKIP_DIR };
