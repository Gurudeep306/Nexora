// Hive Drive: the team's file manager. Folders and files (PDFs, images,
// documents, notes, data) per project or shared across Hive. Chats and agents
// read from it and save to it (generated PDFs, reports), files can be attached
// to sessions, and when the work is done a selection is committed to the
// project's GitHub repository as a pull request.
const { run, get, all, newId, now } = require("./db");
const gh = require("./github");
const vault = require("./vault");

const MAX_FILE = 20 * 1024 * 1024;
const MAX_TOTAL = Number(process.env.HIVE_DRIVE_MB || 1024) * 1024 * 1024;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS hive_drive (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'file',
    file_id TEXT,
    mime TEXT,
    size INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_hive_drive_path ON hive_drive(project_id, path)",
];
let ready = null;
const init = () => (ready ||= (async () => {
  for (const s of SCHEMA) await run(s);
})());

class DriveError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** "/a/b.pdf" — absolute, no "..", no empty parts. */
function clean(p) {
  const s = String(p ?? "").trim().replace(/\\/g, "/");
  const parts = s.split("/").filter((x) => x && x !== ".");
  if (parts.some((x) => x === ".." || x.length > 120 || /[\0<>:"|?*]/.test(x))) throw new DriveError(`Invalid path: ${p}`);
  const out = `/${parts.join("/")}`;
  if (out.length > 400) throw new DriveError("Path too long");
  return out;
}
const parentOf = (p) => (p.lastIndexOf("/") <= 0 ? "/" : p.slice(0, p.lastIndexOf("/")));
const nameOf = (p) => p.slice(p.lastIndexOf("/") + 1);
const pid = (projectId) => (projectId ? String(projectId) : "");

const isText = (mime, name) => /^text\/|json|xml|javascript|yaml|csv|markdown|x-sh|sql|svg/.test(mime || "") || /\.(md|txt|js|jsx|ts|tsx|py|go|rs|java|rb|php|cs|c|h|cpp|json|ya?ml|toml|sql|sh|css|html|csv|env|ini|svg)$/i.test(name || "");

function publicRow(r) {
  return { id: r.id, projectId: r.project_id || null, path: r.path, name: nameOf(r.path), kind: r.kind, fileId: r.file_id, mime: r.mime, size: Number(r.size || 0), note: r.note || null, createdBy: r.created_by, updatedBy: r.updated_by, createdAt: r.created_at, updatedAt: r.updated_at, text: r.kind === "file" && isText(r.mime, r.path) };
}

async function ensureFolders(projectId, path, by) {
  let cur = parentOf(path);
  const chain = [];
  while (cur !== "/") {
    chain.unshift(cur);
    cur = parentOf(cur);
  }
  const t = now();
  for (const f of chain) {
    await run(
      "INSERT INTO hive_drive(id, project_id, path, kind, created_by, updated_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(project_id, path) DO NOTHING",
      [newId("drv"), pid(projectId), f, "folder", by, by, t, t],
    );
  }
}

/** Children of a folder (folders first). */
async function list({ folder = "/", projectId = null } = {}) {
  await init();
  const f = clean(folder);
  const prefix = f === "/" ? "/" : `${f}/`;
  const rows = await all("SELECT * FROM hive_drive WHERE project_id=? AND path LIKE ? ORDER BY kind DESC, path", [pid(projectId), `${prefix.replace(/[%_]/g, (c) => `\\${c}`)}%`]);
  const direct = rows.filter((r) => r.path !== f && !r.path.slice(prefix.length).includes("/"));
  return direct.map(publicRow).sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1));
}

async function tree({ projectId = null } = {}) {
  await init();
  return (await all("SELECT * FROM hive_drive WHERE project_id=? ORDER BY path", [pid(projectId)])).map(publicRow);
}

async function search({ query, projectId = null }) {
  await init();
  const q = `%${String(query || "").replace(/[%_]/g, (c) => `\\${c}`)}%`;
  return (await all("SELECT * FROM hive_drive WHERE project_id=? AND path LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 100", [pid(projectId), q])).map(publicRow);
}

async function usage() {
  await init();
  const r = await get("SELECT COALESCE(SUM(size),0) AS bytes, COUNT(*) AS files FROM hive_drive WHERE kind='file'");
  return { bytes: Number(r?.bytes || 0), files: Number(r?.files || 0), limit: MAX_TOTAL };
}

async function mkdir({ path, projectId = null, by }) {
  await init();
  const p = clean(path);
  if (p === "/") return null;
  await ensureFolders(projectId, `${p}/x`, by);
  return publicRow(await get("SELECT * FROM hive_drive WHERE project_id=? AND path=?", [pid(projectId), p]));
}

/** Save a file (replaces an existing file at that path). */
async function put({ path, projectId = null, mime, buffer, by, note = null }) {
  await init();
  const p = clean(path);
  if (p === "/") throw new DriveError("Give the file a name");
  if (buffer.length > MAX_FILE) throw new DriveError("File too large (20 MB max)");
  const u = await usage();
  const prev = await get("SELECT * FROM hive_drive WHERE project_id=? AND path=?", [pid(projectId), p]);
  if (prev?.kind === "folder") throw new DriveError("A folder already has that name", 409);
  if (u.bytes - Number(prev?.size || 0) + buffer.length > MAX_TOTAL) throw new DriveError(`Drive is full (${Math.round(MAX_TOTAL / 1048576)} MB) — delete some files first`, 413);
  await ensureFolders(projectId, p, by);
  const fileId = newId("file");
  const t = now();
  const m = String(mime || "application/octet-stream").slice(0, 120);
  await run("INSERT INTO hive_files(id, name, mime, size, data_b64, origin, created_by, created_at) VALUES(?,?,?,?,?,?,?,?)", [fileId, nameOf(p), m, buffer.length, buffer.toString("base64"), "drive", by, t]);
  if (prev) {
    await run("UPDATE hive_drive SET file_id=?, mime=?, size=?, updated_by=?, updated_at=?, note=COALESCE(?, note) WHERE id=?", [fileId, m, buffer.length, by, t, note, prev.id]);
    if (prev.file_id) await run("DELETE FROM hive_files WHERE id=? AND origin='drive'", [prev.file_id]);
  } else {
    await run("INSERT INTO hive_drive(id, project_id, path, kind, file_id, mime, size, note, created_by, updated_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", [newId("drv"), pid(projectId), p, "file", fileId, m, buffer.length, note, by, by, t, t]);
  }
  return publicRow(await get("SELECT * FROM hive_drive WHERE project_id=? AND path=?", [pid(projectId), p]));
}

/** A free path: "report.pdf" → "report (2).pdf" when taken. */
async function freePath({ path, projectId = null }) {
  let p = clean(path);
  const dot = p.lastIndexOf(".");
  const stem = dot > p.lastIndexOf("/") ? p.slice(0, dot) : p;
  const ext = dot > p.lastIndexOf("/") ? p.slice(dot) : "";
  for (let i = 2; await get("SELECT id FROM hive_drive WHERE project_id=? AND path=?", [pid(projectId), p]); i++) p = `${stem} (${i})${ext}`;
  return p;
}

async function entry({ path, projectId = null }) {
  await init();
  const r = await get("SELECT * FROM hive_drive WHERE project_id=? AND path=?", [pid(projectId), clean(path)]);
  if (!r) throw new DriveError("Not found", 404);
  return r;
}

async function read({ path, projectId = null }) {
  const r = await entry({ path, projectId });
  if (r.kind !== "file") throw new DriveError("That is a folder");
  const f = await get("SELECT data_b64 FROM hive_files WHERE id=?", [r.file_id]);
  return { row: publicRow(r), buffer: Buffer.from(f?.data_b64 || "", "base64") };
}

async function readText({ path, projectId = null }) {
  try {
    const { row, buffer } = await read({ path, projectId });
    if (!row.text) return null;
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

/** Rename or move a file or folder (with everything inside). */
async function move({ from, to, projectId = null, by }) {
  await init();
  const a = clean(from);
  const b = clean(to);
  if (a === "/" || b === "/") throw new DriveError("Can't move the root");
  if (b === a || b.startsWith(`${a}/`)) throw new DriveError("Can't move a folder into itself");
  const src = await entry({ path: a, projectId });
  if (await get("SELECT id FROM hive_drive WHERE project_id=? AND path=?", [pid(projectId), b])) throw new DriveError("Something already has that name", 409);
  await ensureFolders(projectId, b, by);
  const t = now();
  await run("UPDATE hive_drive SET path=?, updated_by=?, updated_at=? WHERE id=?", [b, by, t, src.id]);
  if (src.kind === "folder") {
    const inside = await all("SELECT id, path FROM hive_drive WHERE project_id=? AND path LIKE ?", [pid(projectId), `${a}/%`]);
    for (const r of inside) await run("UPDATE hive_drive SET path=?, updated_at=? WHERE id=?", [b + r.path.slice(a.length), t, r.id]);
  }
  return publicRow(await get("SELECT * FROM hive_drive WHERE id=?", [src.id]));
}

async function remove({ path, projectId = null }) {
  await init();
  const p = clean(path);
  const r = await entry({ path: p, projectId });
  const rows = r.kind === "folder" ? await all("SELECT * FROM hive_drive WHERE project_id=? AND (path=? OR path LIKE ?)", [pid(projectId), p, `${p}/%`]) : [r];
  for (const x of rows) {
    if (x.file_id) await run("DELETE FROM hive_files WHERE id=? AND origin='drive'", [x.file_id]);
    await run("DELETE FROM hive_drive WHERE id=?", [x.id]);
  }
  return rows.length;
}

/** Copy an already stored file (a chat upload, a generated document) into Drive. */
async function addStored({ fileId, path, projectId = null, by }) {
  const f = await get("SELECT * FROM hive_files WHERE id=?", [fileId]);
  if (!f) throw new DriveError("File not found", 404);
  const p = await freePath({ path: path || `/uploads/${f.name}`, projectId });
  return put({ path: p, projectId, mime: f.mime, buffer: Buffer.from(f.data_b64, "base64"), by });
}

/**
 * Commit Drive files into the project's repository on a new branch and open
 * a pull request. `paths` are Drive paths (files or folders); `targetDir` is
 * where they land in the repo (keeps the structure below the common folder).
 */
async function toGithub({ project, paths, targetDir = "", branch, message, openPr = true, by }) {
  if (!project.github_id) throw new DriveError("This project has no GitHub repository");
  const cred = await get("SELECT * FROM hive_github WHERE id=?", [project.github_id]);
  if (!cred) throw new DriveError("GitHub connection not found");
  const token = vault.open(cred.token_enc);
  const { BRANCH_RE } = require("./commit");
  if (!BRANCH_RE.test(branch || "") || branch === project.default_branch) throw new DriveError("Pick a new branch name (not the default branch)");
  // Expand folders.
  const files = [];
  for (const raw of paths.slice(0, 200)) {
    const p = clean(raw);
    const r = await entry({ path: p, projectId: project.id });
    if (r.kind === "file") files.push({ path: p, base: parentOf(p) });
    else for (const x of await all("SELECT path FROM hive_drive WHERE project_id=? AND kind='file' AND path LIKE ?", [project.id, `${p}/%`])) files.push({ path: x.path, base: parentOf(p) });
  }
  if (!files.length) throw new DriveError("Nothing to send");
  const dir = String(targetDir || "").replace(/^\/+|\/+$/g, "");
  if (dir.split("/").some((x) => x === ".." || x === ".git")) throw new DriveError("Invalid target folder");
  const { repo_owner: o, repo_name: n } = project;
  const head = await gh.commit(token, o, n, project.default_branch);
  const tree = [];
  for (const f of files) {
    const { buffer } = await read({ path: f.path, projectId: project.id });
    const rel = f.path.slice(f.base === "/" ? 1 : f.base.length + 1);
    const blob = await gh.createBlobBase64(token, o, n, buffer.toString("base64"));
    tree.push({ path: dir ? `${dir}/${rel}` : rel, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await gh.createTree(token, o, n, head.commit.tree.sha, tree);
  const commit = await gh.createCommit(token, o, n, `${message || `Add ${files.length} file${files.length === 1 ? "" : "s"} from Hive Drive`}\n\nSent from Nexora Hive Drive by @${by}.`, newTree.sha, [head.sha]);
  try {
    await gh.createRef(token, o, n, branch, commit.sha);
  } catch (e) {
    if (e.status !== 422) throw e;
    await gh.updateRef(token, o, n, branch, commit.sha, true);
  }
  let pr = null;
  if (openPr) {
    try {
      const p = await gh.createPull(token, o, n, { title: message || `Files from Hive Drive`, head: branch, base: project.default_branch, body: `Files sent from Hive Drive by @${by}:\n\n${tree.map((t) => `- \`${t.path}\``).join("\n")}` });
      pr = { url: p.html_url, number: p.number };
    } catch (e) {
      if (e.status !== 422) throw e;
    }
  }
  return { branch, sha: commit.sha, files: tree.map((t) => t.path), pr };
}

/** Bring files from the repository's default branch into Drive. */
async function fromGithub({ project, repoPaths, folder = "/repo", by }) {
  const cred = await get("SELECT * FROM hive_github WHERE id=?", [project.github_id]);
  if (!cred) throw new DriveError("GitHub connection not found");
  const token = vault.open(cred.token_enc);
  const out = [];
  for (const rp of repoPaths.slice(0, 50)) {
    const clean2 = String(rp).replace(/^\/+/, "");
    const buf = await gh.rawFile(token, project.repo_owner, project.repo_name, clean2, project.default_branch);
    const mime = /\.pdf$/i.test(clean2) ? "application/pdf" : /\.(png|jpe?g|gif|webp)$/i.test(clean2) ? `image/${clean2.split(".").pop().replace("jpg", "jpeg")}` : isText("", clean2) ? "text/plain" : "application/octet-stream";
    out.push(await put({ path: `${clean(folder)}/${clean2}`, projectId: project.id, mime, buffer: buf, by }));
  }
  return out;
}

module.exports = { init, clean, list, tree, search, usage, mkdir, put, freePath, read, readText, move, remove, addStored, toGithub, fromGithub, DriveError, MAX_FILE, isText };
