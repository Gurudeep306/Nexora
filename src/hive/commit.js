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

module.exports = { commitTask, BRANCH_RE };
