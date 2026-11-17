// Staff access per Admin section: the owner (and admins the owner trusts with
// "staff.access") choose, for each staff member, whether each Admin section
// is hidden, read-only ("view") or editable ("edit"). With no choice made, a
// section follows the person's role and permissions, as before.
//
// Enforced on the server: sectionGate() runs on every request; for a path in
// a section with a choice made it refuses hidden sections (403) and writes to
// read-only ones (403), and lets view/edit stand in for the section's
// permissions on that request only (permissions.can reads req.sectionGrant),
// so a grant never leaks into the rest of the site.

/** Every Admin section, the permissions its API asks for, and its API paths. */
const SECTIONS = [
  { id: "overview", label: "Overview", group: "Insights", perms: ["analytics.view"], paths: [/^\/api\/admin\/(overview|db-stats)(\/|$)/] },
  { id: "users", label: "Users", group: "People", perms: ["users.view", "users.manage", "users.ban"], paths: [/^\/api\/admin\/(users|set-role)(\/|$)/] },
  { id: "moderation", label: "Moderation", group: "People", perms: ["content.moderate"], paths: [/^\/api\/admin\/(reports|content)(\/|$)/] },
  { id: "site", label: "Site", group: "Platform", perms: ["site.settings"], paths: [/^\/api\/admin\/site(\/|$)/] },
  { id: "ai", label: "AI models", group: "Platform", perms: ["site.settings"], paths: [/^\/api\/admin\/ai(\/|$)/] },
  { id: "runners", label: "Code runners", group: "Platform", perms: ["site.settings"], paths: [/^\/api\/admin\/(runners|compilers)(\/|$)/] },
  { id: "sources", label: "Problem sources", group: "Platform", perms: ["problems.manage"], paths: [/^\/api\/problem-sources(\/|$)/, /^\/api\/admin\/judge-selftest(\/|$)/] },
  { id: "authored", label: "Add a problem", group: "Platform", perms: ["problems.manage"], paths: [/^\/api\/authoring(\/|$)/] },
  { id: "announcements", label: "Announcements", group: "Platform", perms: ["announcements.post"], paths: [/^\/api\/admin\/announcements(\/|$)/] },
  { id: "audit", label: "Audit log", group: "Platform", perms: ["audit.view"], paths: [/^\/api\/admin\/audit(\/|$)/] },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);
const BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));
const LEVELS = ["none", "view", "edit"];
const RANK = { none: 0, view: 1, edit: 2 };

function sectionForPath(path) {
  for (const s of SECTIONS) if (s.paths.some((re) => re.test(path))) return s;
  return null;
}

/** "users=view,site=none" (group_concat) → { users: 'view', site: 'none' } */
function parseSections(raw) {
  const out = {};
  if (!raw) return out;
  for (const part of String(raw).split(",")) {
    const [k, v] = part.split("=");
    if (BY_ID.has(k) && RANK[v] !== undefined) out[k] = v;
  }
  return out;
}

/**
 * What a person gets in a section: 'edit', 'view' or 'none'.
 * access: { role, perms: Set, sections: {id: level} }
 */
function levelFor(access, sectionId) {
  if (!access) return "none";
  if (access.role === "owner") return "edit";
  const chosen = access.sections?.[sectionId];
  if (chosen) return chosen;
  const s = BY_ID.get(sectionId);
  return s && s.perms.some((p) => access.perms.has(p)) ? "edit" : "none";
}

function levelsFor(access) {
  return Object.fromEntries(SECTION_IDS.map((id) => [id, levelFor(access, id)]));
}

const READS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Express middleware; runs after the access control (req.access is set). */
function sectionGate(req, res, next) {
  const a = req.access;
  if (!a || a.role === "owner") return next();
  const s = sectionForPath(req.path);
  if (!s) return next();
  const chosen = a.sections?.[s.id];
  if (!chosen) return next(); // follows role and permissions, as before
  if (chosen === "none") {
    return res.status(403).json({ ok: false, code: "section_hidden", section: s.id, error: `You don't have access to ${s.label}` });
  }
  if (chosen === "view" && !READS.has(req.method)) {
    return res.status(403).json({ ok: false, code: "section_read_only", section: s.id, error: `You can see ${s.label} but not change it` });
  }
  req.sectionGrant = { section: s.id, level: chosen, perms: new Set(s.perms) };
  next();
}

module.exports = { SECTIONS, SECTION_IDS, LEVELS, RANK, sectionForPath, parseSections, levelFor, levelsFor, sectionGate };
