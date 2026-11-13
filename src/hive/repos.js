// Every GitHub repository Hive can reach, in one list.
//
// Connect GitHub once; from then on any repo the token can see is one click
// (or one sentence to the Copilot) away from being worked on: opening it
// makes it a project and writes a project brief — what the code is, its
// stack, how to run and test it, conventions — from the README, the
// manifests and the file tree, so every agent starts with context instead
// of being told it by hand.
const { run, get, all, newId, now } = require("./db");
const gh = require("./github");
const vault = require("./vault");

let cache = { at: 0, repos: null };
const TTL = 3 * 60_000;

const tokenOf = (row) => vault.open(row.token_enc);

/** All repositories across every GitHub connection, newest activity first. */
async function allRepos({ force = false } = {}) {
  const projects = await all("SELECT id, name, repo_owner, repo_name FROM hive_projects WHERE repo_owner <> ''");
  const byRepo = new Map(projects.map((p) => [`${p.repo_owner}/${p.repo_name}`.toLowerCase(), p]));
  if (force || !cache.repos || Date.now() - cache.at > TTL) {
    const conns = await all("SELECT * FROM hive_github ORDER BY created_at");
    const seen = new Map();
    const errors = [];
    for (const c of conns) {
      let list = [];
      try {
        list = await gh.listRepos(tokenOf(c));
      } catch (e) {
        errors.push(`${c.label}: ${e.message}`);
        continue;
      }
      for (const r of list) {
        const key = r.full_name.toLowerCase();
        const canPush = !!(r.permissions?.push || r.permissions?.admin);
        const prev = seen.get(key);
        // Prefer a connection that can push (agents open pull requests).
        if (prev && (prev.canPush || !canPush)) continue;
        seen.set(key, { owner: r.owner.login, name: r.name, fullName: r.full_name, private: r.private, defaultBranch: r.default_branch, description: r.description || "", language: r.language || null, pushedAt: r.pushed_at, stars: r.stargazers_count || 0, githubId: c.id, connection: c.label, canPush });
      }
    }
    cache = { at: Date.now(), repos: [...seen.values()].sort((a, b) => Date.parse(b.pushedAt || 0) - Date.parse(a.pushedAt || 0)), errors };
  }
  return {
    repos: cache.repos.map((r) => {
      const p = byRepo.get(r.fullName.toLowerCase());
      return { ...r, projectId: p?.id || null };
    }),
    connections: (await all("SELECT id FROM hive_github")).length,
    errors: cache.errors || [],
  };
}

/** Find a repo by "owner/name", "name" or a GitHub URL. */
async function findRepo(ref) {
  const s = String(ref || "")
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  if (!s) return null;
  const { repos } = await allRepos();
  const low = s.toLowerCase();
  const hit = repos.find((r) => r.fullName.toLowerCase() === low) || repos.find((r) => r.name.toLowerCase() === low) || repos.find((r) => r.fullName.toLowerCase().includes(low));
  if (hit || !s.includes("/")) return hit || null;
  // Not in the (cached, newest-first) list — e.g. a repo created a moment ago: ask GitHub directly.
  const [owner, name] = s.split("/");
  for (const c of await all("SELECT * FROM hive_github ORDER BY created_at")) {
    try {
      const r = await gh.repo(tokenOf(c), owner, name);
      return { owner: r.owner.login, name: r.name, fullName: r.full_name, private: r.private, defaultBranch: r.default_branch, description: r.description || "", language: r.language || null, pushedAt: r.pushed_at, stars: r.stargazers_count || 0, githubId: c.id, connection: c.label, canPush: !!(r.permissions?.push || r.permissions?.admin) };
    } catch {
      /* not visible to this connection */
    }
  }
  return null;
}

/**
 * Open a repository as a project (or return the project it already is).
 * The project brief is written in the background.
 */
async function openRepo(ref, { username = "hive", brief = true } = {}) {
  const r = await findRepo(ref);
  if (!r) {
    const n = (await all("SELECT id FROM hive_github")).length;
    throw Object.assign(new Error(n ? `No repository called “${ref}” is visible to the connected GitHub account(s)` : "Connect GitHub first (Keys → GitHub): one token, then every repo is available"), { status: 404 });
  }
  const existing = await get("SELECT * FROM hive_projects WHERE lower(repo_owner)=lower(?) AND lower(repo_name)=lower(?)", [r.owner, r.name]);
  if (existing) return { project: existing, created: false, repo: r };
  const id = newId("prj");
  const t = now();
  const colors = ["violet", "blue", "cyan", "green", "amber", "rose"];
  await run(
    `INSERT INTO hive_projects(id, name, github_id, repo_owner, repo_name, default_branch, description, instructions, color, created_by, created_at, updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, r.name.slice(0, 60), r.githubId, r.owner, r.name, r.defaultBranch || "main", (r.description || "").slice(0, 300), "", colors[r.name.length % colors.length], username, t, t],
  );
  const project = await get("SELECT * FROM hive_projects WHERE id=?", [id]);
  try {
    require("./hub").emit("project", project);
  } catch {
    /* tests */
  }
  if (brief) writeBrief(id).catch((e) => console.error("[hive brief]", e.message));
  return { project, created: true, repo: r };
}

const KEY_FILE = /(^|\/)(README(\.md)?|CLAUDE\.md|AGENTS\.md|CONTRIBUTING\.md|package\.json|pyproject\.toml|requirements\.txt|go\.mod|Cargo\.toml|composer\.json|Gemfile|pom\.xml|build\.gradle|Dockerfile|docker-compose\.ya?ml|Makefile|\.github\/workflows\/[^/]+\.ya?ml|tsconfig\.json|vite\.config\.[jt]s|next\.config\.[jt]s)$/i;

/** Write a short project brief for agents from the repo itself (free model). */
async function writeBrief(projectId, { force = false } = {}) {
  const p = await get("SELECT * FROM hive_projects WHERE id=?", [projectId]);
  if (!p || !p.repo_owner) return null;
  if (p.instructions && p.instructions.trim() && !force) return p.instructions;
  const conn = await get("SELECT * FROM hive_github WHERE id=?", [p.github_id]);
  if (!conn) return null;
  const t = tokenOf(conn);
  const head = await gh.commit(t, p.repo_owner, p.repo_name, p.default_branch || "main");
  const tree = await gh.tree(t, p.repo_owner, p.repo_name, head.commit.tree.sha);
  const paths = (tree.tree || []).filter((x) => x.type === "blob").map((x) => x.path);
  const map = require("./plugins").repoMap(paths, 120);
  const picks = paths.filter((x) => KEY_FILE.test(x) && x.split("/").length <= 3).slice(0, 10);
  const files = [];
  for (const f of picks) {
    try {
      const buf = await gh.rawFile(t, p.repo_owner, p.repo_name, f, p.default_branch || "main");
      files.push(`--- ${f}\n${buf.toString("utf8").slice(0, f.toLowerCase().includes("readme") ? 6000 : 2500)}`);
    } catch {
      /* skip unreadable */
    }
  }
  const prompt = `Write a project brief for AI coding agents about to work in the repository ${p.repo_owner}/${p.repo_name}. It is given to every agent before its task.

Cover, only from the evidence below (never invent):
- What the project is and who it is for (2 sentences)
- Stack and key libraries
- Layout: where the main parts live (paths)
- How to install, run, build and test (exact commands from the manifests/CI)
- Conventions worth keeping (style, structure, naming) and anything risky to touch (deploy config, migrations, secrets)

Markdown, at most ~350 words, terse bullet points.

${map}

${files.join("\n\n")}`;
  const llm = require("./llm");
  const out = await llm.ask({ kind: "reading", prompt, freeOnly: true, username: "hive-brief", projectId });
  const text = String(out?.text || out || "").trim().slice(0, 7000);
  if (!text) return null;
  const fresh = await get("SELECT instructions FROM hive_projects WHERE id=?", [projectId]);
  // Never overwrite instructions someone wrote meanwhile.
  if (fresh?.instructions?.trim() && !force) return fresh.instructions;
  await run("UPDATE hive_projects SET instructions=?, updated_at=? WHERE id=?", [`<!-- written by Hive from the repository; edit freely -->\n${text}`, now(), projectId]);
  try {
    require("./hub").emit("project", await get("SELECT * FROM hive_projects WHERE id=?", [projectId]));
  } catch {
    /* tests */
  }
  return text;
}

const clearCache = () => (cache = { at: 0, repos: null });

module.exports = { allRepos, findRepo, openRepo, writeBrief, clearCache };
