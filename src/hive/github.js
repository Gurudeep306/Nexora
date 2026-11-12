// Minimal GitHub REST client for Hive (fetch-based, one token per call).
const API = process.env.HIVE_GITHUB_API || "https://api.github.com";

class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function gh(token, method, path, { body, accept, raw } = {}) {
  const res = await fetch(path.startsWith("http") ? path : API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept || "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "nexora-hive",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "follow",
  });
  if (raw) {
    if (!res.ok) throw new GitHubError(res.status, `GitHub ${res.status} for ${path}`);
    return res;
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && data.message) || `GitHub ${res.status}`;
    throw new GitHubError(res.status, `${msg} (${method} ${path.replace(API, "")})`);
  }
  return data;
}

const enc = encodeURIComponent;
const repoPath = (o, r) => `/repos/${enc(o)}/${enc(r)}`;
const refPath = (ref) => String(ref).split("/").map(enc).join("/");

module.exports = {
  GitHubError,
  me: (t) => gh(t, "GET", "/user"),
  listRepos: (t) => gh(t, "GET", "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member"),
  repo: (t, o, r) => gh(t, "GET", repoPath(o, r)),
  branches: (t, o, r) => gh(t, "GET", `${repoPath(o, r)}/branches?per_page=100`),
  commit: (t, o, r, ref) => gh(t, "GET", `${repoPath(o, r)}/commits/${refPath(ref)}`),
  tree: (t, o, r, treeSha) => gh(t, "GET", `${repoPath(o, r)}/git/trees/${enc(treeSha)}?recursive=1`),
  tarball: (t, o, r, sha) => gh(t, "GET", `${repoPath(o, r)}/tarball/${enc(sha)}`, { raw: true }),
  rawFile: async (t, o, r, path, ref) => {
    const res = await gh(t, "GET", `${repoPath(o, r)}/contents/${path.split("/").map(enc).join("/")}?ref=${enc(ref)}`, {
      accept: "application/vnd.github.raw",
      raw: true,
    });
    return Buffer.from(await res.arrayBuffer());
  },
  createBlob: (t, o, r, content) =>
    gh(t, "POST", `${repoPath(o, r)}/git/blobs`, { body: { content: Buffer.from(content, "utf8").toString("base64"), encoding: "base64" } }),
  createTree: (t, o, r, baseTree, tree) => gh(t, "POST", `${repoPath(o, r)}/git/trees`, { body: { base_tree: baseTree, tree } }),
  createCommit: (t, o, r, message, tree, parents) =>
    gh(t, "POST", `${repoPath(o, r)}/git/commits`, { body: { message, tree, parents } }),
  getRef: (t, o, r, branch) => gh(t, "GET", `${repoPath(o, r)}/git/ref/heads/${refPath(branch)}`),
  createRef: (t, o, r, branch, sha) => gh(t, "POST", `${repoPath(o, r)}/git/refs`, { body: { ref: `refs/heads/${branch}`, sha } }),
  updateRef: (t, o, r, branch, sha, force = false) =>
    gh(t, "PATCH", `${repoPath(o, r)}/git/refs/heads/${refPath(branch)}`, { body: { sha, force } }),
  createPull: (t, o, r, body) => gh(t, "POST", `${repoPath(o, r)}/pulls`, { body }),
};
