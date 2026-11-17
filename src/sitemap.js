// The site map (Admin → Site map): every part of NexoraGuru as a tree, what
// each part's pages and API are, and where its code lives. For each part the
// owner (and anyone with Site settings) picks who sees it:
//
//   visible  everyone (the default)
//   staff    staff only — everyone else gets "not found"
//   soon     staff only, everyone else sees "coming soon"
//   hidden   switched off — only the owner still sees it (to check it)
//
// A child part is never more open than its parent. Enforced on the server
// (sitemapGate, mounted in src/authz/access.js: API calls get 403
// feature_disabled) and in the app (AppLayout hides pages; menus drop them).
//
// The older on/off feature flags (Admin → Site) are the same switch for the
// parts that carry a `flag`: a part with no choice made follows its flag.
// Every path in `files` must exist (tests/sitemap.test.js checks).

const MODES = ["visible", "staff", "soon", "hidden"];
const STRICT = { visible: 0, soon: 1, staff: 2, hidden: 3 };

/** id, label, parent, page paths (regex source), API paths (regex source), flag, files. */
const PARTS = [
  { id: "hub", label: "Home", pages: "^/hub(/|$)", core: true, files: ["client/src/pages/HubPage.tsx", "client/src/components/hub/"] },

  { id: "learn", label: "Learn", pages: "^/learn(/|$)", api: "^/api/(learn|learning)(/|$)", flag: "learn", files: ["client/src/pages/LearnPage.tsx", "client/src/pages/SubjectPage.tsx", "client/src/learn/", "src/routes/learn.js", "src/routes/learning.js", "src/learn/"] },
  { id: "learn.dsa", parent: "learn", label: "DSA course", pages: "^/(learn/dsa|solve/learn)(/|$)", api: "^/api/learn/problems(/|$)", files: ["client/src/learn/content/", "client/src/learn/algorithms/", "client/src/learn/engine/", "src/learn/problems/", "scripts/learn/"] },

  { id: "nexus", label: "Nexus", pages: "^/nexus(/|$)", api: "^/api/nexus(/|$)", flag: "nexus", files: ["client/src/pages/NexusPage.tsx", "client/src/components/nexus/", "src/nexus/", "content/nexus/"] },

  { id: "gate", label: "GATE CSE", pages: "^/gate(/|$)", api: "^/api/gate(/|$)", flag: "gate", files: ["client/src/pages/GatePage.tsx", "client/src/pages/gate/GateHomePage.tsx", "client/src/gate/", "src/routes/gate.js", "src/routes/gate-me.js", "src/gate/"] },
  { id: "gate.practice", parent: "gate", label: "Practice", pages: "^/gate/(practice|subjects)(/|$)", files: ["client/src/gate/practice/", "client/src/gate/QuestionView.tsx"] },
  { id: "gate.notes", parent: "gate", label: "Notes", pages: "^/gate/notes(/|$)", api: "^/api/gate/notes(/|$)", flag: "notes", files: ["client/src/pages/gate/notes/", "src/routes/gate-notes.js", "content/gate-notes/"] },
  { id: "gate.tests", parent: "gate", label: "Mock tests", pages: "^/gate/(tests|cbt)(/|$)", api: "^/api/gate/tests(/|$)", files: ["client/src/pages/gate/GateTestsPage.tsx", "client/src/pages/gate/GateTestPage.tsx", "client/src/pages/GateCbtPage.tsx", "client/src/gate/cbt/"] },
  { id: "gate.review", parent: "gate", label: "Review queue", pages: "^/gate/review(/|$)", files: ["client/src/pages/gate/GateReviewPage.tsx"] },
  { id: "gate.daily", parent: "gate", label: "Daily question", pages: "^/gate/daily(/|$)", api: "^/api/gate/daily(/|$)", files: ["client/src/pages/gate/GateDailyPage.tsx"] },
  { id: "gate.leaderboard", parent: "gate", label: "Leaderboard", pages: "^/gate/leaderboard(/|$)", api: "^/api/gate/leaderboard(/|$)", files: ["client/src/pages/gate/GateLeaderboardPage.tsx"] },
  { id: "gate.planner", parent: "gate", label: "Planner", pages: "^/gate/planner(/|$)", files: ["client/src/pages/gate/GatePlannerPage.tsx"] },
  { id: "gate.notebook", parent: "gate", label: "Notebook", pages: "^/gate/notebook(/|$)", files: ["client/src/pages/gate/GateNotebookPage.tsx"] },
  { id: "gate.analytics", parent: "gate", label: "GATE analytics", pages: "^/gate/analytics(/|$)", files: ["client/src/pages/gate/GateAnalyticsPage.tsx", "client/src/gate/insights/"] },
  { id: "gate.syllabus", parent: "gate", label: "Syllabus", pages: "^/gate/syllabus(/|$)", files: ["client/src/pages/gate/GateSyllabusPage.tsx"] },

  { id: "practice", label: "Problems", pages: "^/(problems(/|$)|solve/(?!learn/))", api: "^/api/(problems|problem-statement)(/|$)", flag: "practice", files: ["client/src/pages/ProblemsPage.tsx", "client/src/pages/SolvePage.tsx", "client/src/components/problems/", "client/src/components/solve/", "src/sources/"] },
  { id: "practice.workshop", parent: "practice", label: "Workshop", pages: "^/workshop(/|$)", api: "^/api/forge(/|$)", flag: "workshop", files: ["client/src/pages/WorkshopPage.tsx", "client/src/components/workshop/", "src/routes/forge.js"] },
  { id: "practice.submissions", parent: "practice", label: "Submissions", pages: "^/submissions(/|$)", files: ["client/src/pages/SubmissionsPage.tsx", "client/src/components/submissions/"] },

  { id: "contests", label: "Contests", pages: "^/contests(/|$)", api: "^/api/(contests|live|hosted)(/|$)", flag: "contests", files: ["client/src/pages/ContestsPage.tsx", "client/src/pages/contests/", "client/src/components/contests/", "src/routes/hosted-contests.js", "src/routes/live.js", "src/contests.js"] },
  { id: "contests.hosted", parent: "contests", label: "Make your own contest", pages: "^/contests/(new|c/|\\d+/)", api: "^/api/hosted(/|$)", files: ["client/src/pages/contests/", "client/src/components/contests/hosted/", "src/routes/hosted-contests.js", "src/contests.js"] },
  { id: "contests.live", parent: "contests", label: "Live classes", api: "^/api/live(/|$)", files: ["src/routes/live.js"] },

  { id: "social", label: "Social", pages: "^/social(/|$)", api: "^/api/(friends|messages|rooms|feed|social|chat)(/|$)", flag: "social", files: ["client/src/pages/SocialPage.tsx", "client/src/pages/social/", "client/src/components/social/", "src/routes/social.js", "src/routes/chat.js", "src/chat.js"] },
  // Social's sections are tabs in the address (/social?tab=messages).
  { id: "social.friends", parent: "social", label: "Friends", pages: "^/social\\?(.*&)?tab=friends(&|$)", api: "^/api/friends(/|$)", files: ["client/src/components/social/FriendsTab.tsx"] },
  { id: "social.messages", parent: "social", label: "Messages", pages: "^/social\\?(.*&)?tab=messages(&|$)", api: "^/api/(chat|messages)(/|$)", files: ["client/src/components/social/MessagesTab.tsx", "client/src/components/social/chat/", "src/routes/chat.js", "src/chat.js"] },
  { id: "social.rooms", parent: "social", label: "Solve rooms", pages: "^/social\\?(.*&)?tab=rooms(&|$)", api: "^/api/rooms(/|$)", files: ["client/src/components/social/RoomsTab.tsx"] },
  { id: "social.leaderboard", parent: "social", label: "Leaderboard", pages: "^/social\\?(.*&)?tab=leaderboard(&|$)", files: ["client/src/components/social/LeaderboardTab.tsx"] },

  { id: "ai_tutor", label: "AI tutor", api: "^/api/(agent|ai)(/|$)", flag: "ai_tutor", files: ["client/src/components/agent/", "src/routes/agent.js"] },

  { id: "analytics", label: "Analytics", pages: "^/analytics(/|$)", api: "^/api/(performance|stats)(/|$)", files: ["client/src/pages/AnalyticsPage.tsx", "client/src/components/analytics/"] },
  { id: "achievements", label: "Achievements", pages: "^/achievements(/|$)", files: ["client/src/pages/AchievementsPage.tsx", "client/src/components/achievements/"] },
  { id: "bookmarks", label: "Bookmarks", pages: "^/bookmarks(/|$)", api: "^/api/bookmarks(/|$)", files: ["client/src/pages/BookmarksPage.tsx"] },
  { id: "profiles", label: "Profiles", pages: "^/(u|profile)(/|$)", api: "^/api/profiles(/|$)", files: ["client/src/pages/ProfilePage.tsx", "client/src/components/profile/"] },

  // Always on: sign-in, settings, the look and Admin can't be switched off here.
  { id: "settings", label: "Settings and Appearance", pages: "^/(settings|theme)(/|$)", core: true, files: ["client/src/pages/SettingsPage.tsx", "client/src/pages/ThemeCentrePage.tsx", "client/src/components/account/", "client/src/components/look/"] },
  { id: "auth", label: "Sign-in and sign-up", pages: "^/(auth|welcome)(/|$)", core: true, files: ["client/src/pages/AuthPage.tsx", "client/src/pages/WelcomePage.tsx", "src/routes/auth.js"] },
  { id: "admin", label: "Admin", pages: "^/admin(/|$)", core: true, files: ["client/src/pages/AdminPage.tsx", "client/src/components/admin/", "src/routes/admin.js", "src/authz/"] },

  // Hive, the team's AI workspace: admins and the owner only, whatever is
  // chosen here (src/authz/permissions.js mayUseHive). Its parts can still be
  // hidden from admins ("hidden": the owner only).
  { id: "hive", label: "Hive", pages: "^/hive(/|$)", api: "^/api/hive(/|$)", hiveOnly: true, files: ["client/src/hive/HivePage.tsx", "client/src/hive/pages/HomePage.tsx", "src/routes/hive.js", "src/hive/hub.js"] },
  { id: "hive.copilot", parent: "hive", label: "Copilot", pages: "^/hive/copilot(/|$)", api: "^/api/hive/(copilot|dispatches|team|architect|approvals)(/|$)", files: ["client/src/hive/pages/CopilotPage.tsx", "client/src/hive/Copilot.tsx", "src/hive/copilot.js", "src/hive/dispatcher.js"] },
  { id: "hive.chat", parent: "hive", label: "Chat", pages: "^/hive/chat(/|$)", api: "^/api/hive/convos(/|$)", files: ["client/src/hive/pages/ChatPage.tsx", "src/hive/chat.js", "src/hive/chattools.js"] },
  { id: "hive.projects", parent: "hive", label: "Projects", pages: "^/hive/(projects|p)(/|$)", api: "^/api/hive/(projects|tasks|ideas|repos|github|import)(/|$)", files: ["client/src/hive/pages/ProjectPage.tsx", "client/src/hive/pages/ReposPage.tsx", "client/src/hive/pages/LaunchpadPage.tsx", "src/routes/hive-v4.js", "src/hive/repos.js", "src/hive/github.js"] },
  { id: "hive.pipelines", parent: "hive", label: "Pipelines and schedules", pages: "^/hive/pipelines(/|$)", api: "^/api/hive/(pipelines|pipeline-runs|schedules)(/|$)", files: ["client/src/hive/pages/PipelinesPage.tsx", "client/src/hive/pages/AutomationsPage.tsx", "src/hive/pipelines.js", "src/hive/automation.js"] },
  { id: "hive.machines", parent: "hive", label: "Machines", pages: "^/hive/machines(/|$)", api: "^/api/hive/(machines|subscriptions|bridge)(/|$)", files: ["client/src/hive/pages/MachinesPage.tsx", "client/src/hive/pages/MachineTerminalPage.tsx", "src/hive/machines.js", "src/hive/terminal.js", "bridge/"] },
  { id: "hive.drive", parent: "hive", label: "Drive", pages: "^/hive/drive(/|$)", api: "^/api/hive/(drive|files)(/|$)", files: ["client/src/hive/pages/DrivePage.tsx", "src/hive/drive.js"] },
  { id: "hive.models", parent: "hive", label: "Models and health", pages: "^/hive/models(/|$)", api: "^/api/hive/(models|health|catalog|bench|perf|route|agents)(/|$)", files: ["client/src/hive/pages/ModelsPage.tsx", "client/src/hive/pages/HealthPage.tsx", "src/hive/models.js", "src/hive/router.js", "src/hive/health.js"] },
  { id: "hive.keys", parent: "hive", label: "Keys and limits", pages: "^/hive/keys(/|$)", api: "^/api/hive/(keys|caps)(/|$)", files: ["client/src/hive/pages/KeysPage.tsx", "src/hive/keys.js", "src/hive/caps.js", "src/hive/vault.js"] },
  { id: "hive.extensions", parent: "hive", label: "Toolbox, plugins and memory", pages: "^/hive/extensions(/|$)", api: "^/api/hive/(toolbox|plugins|memory)(/|$)", files: ["client/src/hive/pages/ToolboxPage.tsx", "client/src/hive/pages/PluginsPage.tsx", "client/src/hive/pages/MemoryPage.tsx", "src/hive/toolbox.js", "src/hive/plugins.js"] },
  { id: "hive.spend", parent: "hive", label: "Spend and budgets", pages: "^/hive/spend(/|$)", api: "^/api/hive/(spend|steward|stats|alerts)(/|$)", files: ["client/src/hive/pages/UsagePage.tsx", "client/src/hive/pages/BudgetsPage.tsx", "client/src/hive/pages/StewardPage.tsx", "src/hive/steward.js"] },
  { id: "hive.inbox", parent: "hive", label: "Inbox", pages: "^/hive/inbox(/|$)", files: ["client/src/hive/pages/InboxPage.tsx", "client/src/hive/Inbox.tsx"] },
];

/* ── One part per subject, read from the content itself, so a new subject
   shows up here by itself: each GATE notes subject (Digital Logic, Discrete
   Maths…), each Learn subject, and each DSA chapter. ───────────────────── */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  } catch {
    return null;
  }
};
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function subjectParts() {
  const out = [];
  // GATE notes: content/gate-notes/<id>/_meta.json
  try {
    for (const id of fs.readdirSync(path.join(ROOT, "content/gate-notes")).sort()) {
      const meta = SLUG.test(id) && readJson(`content/gate-notes/${id}/_meta.json`);
      if (!meta) continue;
      out.push({ id: `gate.notes.${id}`, parent: "gate.notes", label: meta.title || id, order: meta.order ?? 99, pages: `^/gate/notes/${id}(/|$)`, api: `^/api/gate/notes/${id}(/|$)`, files: [`content/gate-notes/${id}/`] });
    }
  } catch {
    /* no notes folder */
  }
  // Learn subjects: content/nexus/<id>.json (the DSA course is its own part above).
  try {
    for (const f of fs.readdirSync(path.join(ROOT, "content/nexus")).sort()) {
      const id = f.replace(/\.json$/, "");
      if (!f.endsWith(".json") || !SLUG.test(id) || id === "dsa") continue;
      const subj = readJson(`content/nexus/${f}`);
      if (!subj || typeof subj.name !== "string") continue;
      out.push({ id: `learn.${id}`, parent: "learn", label: subj.name, order: subj.order ?? 999, pages: `^/learn/${id}(/|$)`, api: `^/api/nexus/[a-z-]+/${id}(/|$)`, files: [`content/nexus/${f}`] });
    }
  } catch {
    /* no subjects folder */
  }
  // DSA chapters: the course's syllabus (client/src/learn/content/dsa/syllabus.ts).
  try {
    const src = fs.readFileSync(path.join(ROOT, "client/src/learn/content/dsa/syllabus.ts"), "utf8");
    let order = 0;
    for (const m of src.matchAll(/\{ id: '([a-z0-9-]+)', unit: '[^']*', title: '((?:[^'\\]|\\.)*)'/g)) {
      const id = m[1];
      const files = [`client/src/learn/content/dsa/${id}/`];
      if (fs.existsSync(path.join(ROOT, `src/learn/problems/${id}.json`))) files.push(`src/learn/problems/${id}.json`);
      out.push({ id: `learn.dsa.${id}`, parent: "learn.dsa", label: m[2].replace(/\\'/g, "'"), order: order++, pages: `^/learn/dsa/(${id}|skill/${id})(/|$)`, files });
    }
  } catch {
    /* no syllabus */
  }
  return out.sort((a, b) => a.order - b.order);
}
PARTS.push(...subjectParts());

/* ── Admin's own sections, one part each (Admin → Staff access says who may
   use each; here the owner can keep any of them to themselves). Their only
   choices are "team" (visible: whoever has the permission) and "owner only"
   (hidden). ──────────────────────────────────────────────────────────── */
const ADMIN_FILES = {
  overview: ["client/src/components/admin/OverviewSection.tsx"],
  users: ["client/src/components/admin/UsersSection.tsx", "client/src/components/admin/UserDrawer.tsx"],
  staff: ["client/src/components/admin/StaffAccessSection.tsx", "src/authz/sections.js"],
  moderation: ["client/src/components/admin/ModerationSection.tsx", "src/authz/content.js"],
  site: ["client/src/components/admin/SiteSection.tsx", "src/authz/site-settings.js"],
  sitemap: ["client/src/components/admin/SiteMapSection.tsx", "src/sitemap.js"],
  ai: ["client/src/components/admin/AiSection.tsx", "src/ai/"],
  runners: ["client/src/components/admin/RunnersSection.tsx", "client/src/components/admin/CompilersPanels.tsx", "src/runners.js"],
  sources: ["client/src/components/admin/SourcesSection.tsx", "src/routes/sources.js", "src/sources/"],
  authored: ["client/src/components/admin/AuthoredSection.tsx", "client/src/pages/AuthorProblemPage.tsx", "src/routes/authoring.js", "src/authoring.js"],
  announcements: ["client/src/components/admin/SiteSection.tsx"],
  audit: ["client/src/components/admin/AuditSection.tsx"],
};
{
  const { SECTIONS } = require("./authz/sections");
  const list = [
    ...SECTIONS.slice(0, 2),
    { id: "staff", label: "Staff access", paths: [/^\/api\/admin\/staff-access(\/|$)/] },
    ...SECTIONS.slice(2),
  ];
  for (const sec of list) {
    PARTS.push({
      id: `admin.${sec.id}`,
      parent: "admin",
      label: sec.label,
      adminSection: true,
      pages: `^/admin\\?(.*&)?section=${sec.id}(&|$)`,
      api: sec.paths.map((re) => `(?:${re.source})`).join("|"),
      files: ADMIN_FILES[sec.id] || ["client/src/pages/AdminPage.tsx"],
    });
  }
}

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));
const COMPILED = PARTS.map((p) => ({ ...p, pagesRe: p.pages ? new RegExp(p.pages, "i") : null, apiRe: p.api ? new RegExp(p.api, "i") : null }));
// Deepest first, so the most specific part wins.
const depth = (p) => (p.parent ? 1 + depth(BY_ID.get(p.parent)) : 0);
const API_ORDER = COMPILED.filter((p) => p.apiRe).sort((a, b) => depth(b) - depth(a));

/** The mode the owner chose for each part (with the old flags for parts that carry one). */
function chosenModes(settings) {
  const raw = settings?.site_parts || {};
  const flags = settings?.feature_flags || {};
  const out = {};
  for (const p of PARTS) {
    if (p.core) out[p.id] = "visible";
    else if (MODES.includes(raw[p.id])) out[p.id] = raw[p.id];
    else out[p.id] = p.flag && flags[p.flag] === false ? "hidden" : "visible";
  }
  return out;
}

/** Each part's mode after its parents: a child is never more open than its parent. */
function effectiveModes(settings) {
  const chosen = chosenModes(settings);
  const out = {};
  const eff = (id) => {
    if (out[id]) return out[id];
    const p = BY_ID.get(id);
    let m = chosen[id];
    if (p.parent) {
      const up = eff(p.parent);
      if (STRICT[up] > STRICT[m]) m = up;
    }
    return (out[id] = m);
  };
  for (const p of PARTS) eff(p.id);
  return out;
}

/** May this viewer use a part in this mode? who: { owner, staff, hive } */
function allowed(mode, who, part) {
  if (who.owner) return true;
  // Hive has two choices, like Admin's own sections: admins and the owner
  // (the default: full access), or the owner only ("hidden"). Members never.
  if (part && isHive(part)) return !!who.hive && mode !== "hidden";
  if (part?.adminSection) return mode !== "hidden"; // the team (by permission), or the owner only
  if (mode === "visible") return true;
  if (mode === "hidden") return false;
  return !!who.staff; // staff and soon
}
/** The old feature flag a part falls under (its own, or its nearest parent's). */
const flagOf = (p) => (p.flag ? p.flag : p.parent ? flagOf(BY_ID.get(p.parent)) : null);
const isHive = (p) => (p.hiveOnly ? true : p.parent ? isHive(BY_ID.get(p.parent)) : false);

function partForApi(path) {
  for (const p of API_ORDER) if (p.apiRe.test(path)) return p;
  return null;
}

/**
 * For /api/site/status: the parts this viewer can't use, with their page
 * paths, so the app can hide them; and the old flags, worked out the same
 * way for this viewer.
 */
function viewerParts(settings, who) {
  const modes = effectiveModes(settings);
  const blocked = [];
  for (const p of PARTS) {
    if (p.core || allowed(modes[p.id], who, p)) continue;
    blocked.push({ id: p.id, label: p.label, mode: modes[p.id], pages: p.pages || null });
  }
  const flags = {};
  for (const p of PARTS) if (p.flag) flags[p.flag] = allowed(modes[p.id], who, p);
  return { blocked, flags };
}

module.exports = { MODES, PARTS, BY_ID, chosenModes, effectiveModes, allowed, isHive, flagOf, partForApi, viewerParts };
