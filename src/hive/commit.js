// Turn a task's overlay into a commit on a branch (git data API), optionally
// opening a pull request. Re-committing replays the whole overlay onto the
// branch head, so only what changed since the last commit differs.
const gh = require("./github");
const { workspace } = require("./workspace");

const BRANCH_RE = /^(?!\/)(?!.*\/\/)(?!.*\.\.)(?!.*@\{)[A-Za-z0-9._\/-]{1,120}(?<![./])$/;

async function commitTask({ task, project, token, snap, variant = "main", message, branch, openPr, prTitle, prBody, author }) {
  if (!BRANCH_RE.test(branch || "")) throw Object.assign(new Error("Invalid branch name"), { status: 400 });
  if (branch === project.default_branch) throw Object.assign(new Error(`Commit to a new branch, not ${project.default_branch} — open a PR to merge`), { status: 400 });
  const ws = workspace({ task, variant, snap });
  const entries = await ws.overlayEntries();
  if (!entries.length) throw Object.assign(new Error("No changes to commit"), { status: 400 });
  const { repo_owner: o, repo_name: r } = project;

  // Parent: the branch head if the branch exists (re-commit), else the base.
  let parent = task.base_sha;
  let exists = false;
  try {
    const ref = await gh.getRef(token, o, r, branch);
    parent = ref.object.sha;
    exists = true;
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const parentCommit = await gh.commit(token, o, r, parent);
  const tree = [];
  for (const [path, v] of entries) {
    const mode = snap.entries.get(path)?.mode || "100644";
    if (v.deleted) tree.push({ path, mode, type: "blob", sha: null });
    else {
      const blob = await gh.createBlob(token, o, r, v.content || "");
      tree.push({ path, mode: mode === "120000" ? "100644" : mode, type: "blob", sha: blob.sha });
    }
  }
  const newTree = await gh.createTree(token, o, r, parentCommit.commit.tree.sha, tree);
  if (newTree.sha === parentCommit.commit.tree.sha) throw Object.assign(new Error("Nothing new to commit — the branch already has these changes"), { status: 400 });
  const commit = await gh.createCommit(token, o, r, `${message}\n\nMade in Nexora Hive by @${author}.`, newTree.sha, [parent]);
  if (exists) await gh.updateRef(token, o, r, branch, commit.sha);
  else await gh.createRef(token, o, r, branch, commit.sha);

  let pr = null;
  if (openPr && !task.pr_url) {
    try {
      pr = await gh.createPull(token, o, r, { title: prTitle || message.split("\n")[0], head: branch, base: project.default_branch, body: prBody || "" });
    } catch (e) {
      if (e.status !== 422) throw e; // 422: a PR for this branch already exists
    }
  }
  return { sha: commit.sha, url: commit.html_url || `https://github.com/${o}/${r}/commit/${commit.sha}`, branch, pr: pr ? { url: pr.html_url, number: pr.number } : null, files: entries.length };
}

/**
 * Machine tasks: the edits are already in a real git checkout — commit them
 * there on the task's branch, push with the project's token (passed for this
 * one call only) and open a PR through the API.
 */
async function commitOnMachine({ task, project, token, machine, message, branch, openPr, prTitle, prBody, author }) {
  const { machineWorkspace } = require("./localws");
  if (!BRANCH_RE.test(branch || "")) throw Object.assign(new Error("Invalid branch name"), { status: 400 });
  if (project.default_branch && branch === project.default_branch) throw Object.assign(new Error(`Commit to a new branch, not ${project.default_branch} — open a PR to merge`), { status: 400 });
  const ws = machineWorkspace({ machineId: machine.id, folder: machine.folder });
  const must = async (args, what, o) => {
    const r = await ws.git(args, o);
    if (r.code !== 0) throw Object.assign(new Error(`${what} failed: ${r.output.trim().slice(-600)}`), { status: 400 });
    return r;
  };
  const changes = await ws.changes();
  if (!changes.length) throw Object.assign(new Error("No changes to commit"), { status: 400 });
  await must(["checkout", "-B", branch], "Switching branch");
  await must(["add", "-A"], "Staging");
  const r = await ws.git(["-c", "user.name=Nexora Hive", "-c", "user.email=hive@nexora.local", "commit", "-m", `${message}\n\nMade in Nexora Hive by @${author}.`]);
  if (r.code !== 0 && !/nothing to commit/.test(r.output)) throw Object.assign(new Error(`Commit failed: ${r.output.trim().slice(-600)}`), { status: 400 });
  const sha = (await ws.git(["rev-parse", "HEAD"])).output.trim();
  let pushed = false;
  if (project.repo_owner && project.repo_name) {
    // The project's token, sent for this one push only (never stored on the machine).
    const r2 = await ws.call("git", { args: ["push", "-u", "origin", branch], token: token || undefined }, { timeoutMs: 180000 });
    if (r2.code !== 0) throw Object.assign(new Error(`Push failed: ${r2.output.trim().slice(-600)}`), { status: 400 });
    pushed = true;
  }
  let pr = null;
  if (pushed && openPr && !task.pr_url && token) {
    try {
      const p = await gh.createPull(token, project.repo_owner, project.repo_name, { title: prTitle || message.split("\n")[0], head: branch, base: project.default_branch, body: prBody || "" });
      pr = { url: p.html_url, number: p.number };
    } catch (e) {
      if (e.status !== 422) throw e;
    }
  }
  const url = project.repo_owner ? `https://github.com/${project.repo_owner}/${project.repo_name}/commit/${sha}` : null;
  return { sha, url, branch, pr, files: changes.length, pushed };
}

module.exports = { commitTask, commitOnMachine, BRANCH_RE };
