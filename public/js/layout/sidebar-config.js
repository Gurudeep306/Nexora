/**
 * =============================================================================
 * Nexora — OrbitDock Premium Sidebar System
 * Configuration & Data Layer  |  v2.0.0
 * =============================================================================
 *
 * Exposes four plain globals (no module system required):
 *
 *   ORBITDOCK_CONFIG  — Primary nav config: orbit rail, workspaces,
 *                       context actions, quick-create menus.
 *   ORBITDOCK_ICONS   — Complete SVG icon set (full <svg> strings).
 *   SIDEBAR_ICONS     — Alias of ORBITDOCK_ICONS for backward compatibility.
 *   SIDEBAR_CONFIG    — Legacy section-based nav structure (safety compat).
 *
 * Mode system:  'student' | 'creator' | 'admin'
 * Each orbit rail item carries a `modes` array indicating which
 * mode(s) it belongs to. Workspace panels are keyed by mode name.
 *
 * SVG icon conventions:
 *   viewBox="0 0 24 24"  fill="none"  stroke="currentColor"
 *   stroke-width="1.75"  stroke-linecap="round"  stroke-linejoin="round"
 * =============================================================================
 */

/* ============================================================================
   § 1  ORBITDOCK_CONFIG
   ============================================================================ */

const ORBITDOCK_CONFIG = {
  /* --------------------------------------------------------------------------
     § 1.1  ORBIT RAIL
     Seven launcher buttons on the vertical icon strip.
     `modes` declares which workspace(s) each button belongs to — used by
     the renderer for active-state highlighting.
     -------------------------------------------------------------------------- */
  orbit: [
    {
      id: "hq",
      label: "HQ",
      icon: "home",
      route: "#/hub",
      modes: ["student"],
    },
    {
      id: "code",
      label: "Code",
      icon: "code",
      route: "#/problems",
      modes: ["student"],
    },
    {
      id: "learn",
      label: "Learn",
      icon: "book",
      route: "#/learn",
      modes: ["student"],
    },
    {
      id: "studio",
      label: "Studio",
      icon: "layers",
      route: "/studio",
      modes: ["creator"],
    },
    {
      id: "live",
      label: "Live",
      icon: "video",
      route: "/live-class",
      modes: ["creator"],
    },
    {
      id: "build",
      label: "Build",
      icon: "tool",
      route: "/forgebuilder",
      modes: ["admin"],
    },
    {
      id: "ai",
      label: "AI",
      icon: "cpu",
      route: "#/ailab",
      modes: ["student", "creator"],
    },
  ],

  /* --------------------------------------------------------------------------
     § 1.2  WORKSPACES
     Full sidebar navigation panel for each mode.
     Shape per workspace:
       { title, subtitle, groups[], pinnedTools[], statusCard{} }
     Shape per group:
       { id, title, items[] }
     Shape per item:
       { id, label, icon, route, [tab], [action], [badge] }
     -------------------------------------------------------------------------- */
  workspaces: {
    /* ·· STUDENT ·············································· */
    student: {
      title: "Student Space",
      subtitle: "Your coding command center",

      groups: [
        /* ── 1. Start ─────────────────────────────────────────── */
        {
          id: "start",
          title: "Start",
          items: [
            {
              id: "hub",
              label: "HQ",
              icon: "home",
              route: "#/hub",
              badge: null,
            },
            {
              id: "daily",
              label: "Daily Challenge",
              icon: "target",
              route: "#/problems?filter=daily",
              badge: "NEW",
            },
            {
              id: "recommended",
              label: "Recommended",
              icon: "sparkles",
              route: "#/problems?filter=recommended",
              badge: null,
            },
          ],
        },

        /* ── 2. Practice ──────────────────────────────────────── */
        {
          id: "practice",
          title: "Practice",
          items: [
            {
              id: "problems",
              label: "Problems",
              icon: "code",
              route: "#/problems",
              badge: null,
            },
            {
              id: "contests",
              label: "Contests",
              icon: "trophy",
              route: "#/contests",
              badge: null,
            },
            {
              id: "submissions",
              label: "Submissions",
              icon: "check",
              route: "#/submissions",
              badge: null,
            },
            {
              id: "bookmarks",
              label: "Bookmarks",
              icon: "bookmark",
              route: "#/bookmarks",
              badge: null,
            },
          ],
        },

        /* ── 3. Growth ────────────────────────────────────────── */
        {
          id: "growth",
          title: "Growth",
          items: [
            {
              id: "nexus",
              label: "Progress",
              icon: "chart",
              route: "#/nexus",
              badge: null,
            },
            {
              id: "skills",
              label: "Skill Tree",
              icon: "tree",
              route: "#/skills",
              badge: null,
            },
            {
              id: "achievements",
              label: "Achievements",
              icon: "award",
              route: "#/achievements",
              badge: null,
            },
            {
              id: "analytics",
              label: "Analytics",
              icon: "analytics",
              route: "#/analytics",
              badge: null,
            },
          ],
        },

        /* ── 4. Learn ─────────────────────────────────────────── */
        {
          id: "learngroup",
          title: "Learn",
          items: [
            {
              id: "learnhub",
              label: "Learn",
              icon: "book",
              route: "#/learn",
              badge: null,
            },
            {
              id: "ailab",
              label: "AI Lab",
              icon: "cpu",
              route: "#/ailab",
              badge: null,
            },
            {
              id: "forge",
              label: "Forge Roadmap",
              icon: "layers",
              route: "#/forge",
              badge: null,
            },
            {
              id: "workshop",
              label: "Workshop",
              icon: "wrench",
              route: "#/workshop",
              badge: null,
            },
          ],
        },

        /* ── 5. Community ─────────────────────────────────────── */
        {
          id: "community",
          title: "Community",
          items: [
            {
              id: "squad",
              label: "Squad",
              icon: "users",
              route: "#/social",
              badge: null,
            },
            {
              id: "doubts",
              label: "Doubts",
              icon: "help",
              route: "#/social?tab=doubts",
              badge: null,
            },
            {
              id: "messages",
              label: "Messages",
              icon: "message",
              route: "#/social?tab=chat",
              badge: null,
            },
          ],
        },

        /* ── 6. Tools ─────────────────────────────────────────── */
        {
          id: "tools",
          title: "Tools",
          items: [
            {
              id: "settings",
              label: "Settings",
              icon: "settings",
              route: "#/settings",
              badge: null,
            },
          ],
        },
      ],

      pinnedTools: ["problems", "continue", "ailab"],

      statusCard: {
        title: "Mission Status",
        fields: ["level", "streak", "solved", "xp"],
      },
    },

    /* ·· CREATOR ············································· */
    creator: {
      title: "Creator Studio",
      subtitle: "Build lessons, teach live, inspire students",

      groups: [
        /* ── 1. Overview ──────────────────────────────────────── */
        {
          id: "overview",
          title: "Overview",
          items: [
            {
              id: "studiohome",
              label: "Studio Home",
              icon: "home",
              route: "/studio",
              tab: "overview",
              badge: null,
            },
            {
              id: "recentwork",
              label: "Recent Work",
              icon: "clock",
              route: "/studio",
              tab: "overview",
              badge: null,
            },
            {
              id: "quickact",
              label: "Quick Actions",
              icon: "zap",
              route: "/studio",
              tab: "overview",
              badge: null,
            },
          ],
        },

        /* ── 2. Content ───────────────────────────────────────── */
        {
          id: "content",
          title: "Content",
          items: [
            {
              id: "courses",
              label: "Courses",
              icon: "book",
              route: "/studio",
              tab: "courses",
              badge: null,
            },
            {
              id: "lessons",
              label: "Lessons",
              icon: "notepad",
              route: "/studio",
              tab: "lessons",
              badge: null,
            },
            {
              id: "recordings",
              label: "Recordings",
              icon: "play",
              route: "/studio",
              tab: "recordings",
              badge: null,
            },
            {
              id: "notes",
              label: "Notes",
              icon: "notepad",
              route: "/studio",
              tab: "notes",
              badge: null,
            },
          ],
        },

        /* ── 3. Teaching Tools ────────────────────────────────── */
        {
          id: "teaching",
          title: "Teaching Tools",
          items: [
            {
              id: "explain",
              label: "ExplainLab",
              icon: "presentation",
              route: "/explainlab",
              badge: null,
            },
            {
              id: "liveclass",
              label: "LiveClass",
              icon: "video",
              route: "/live-class",
              badge: null,
            },
            {
              id: "writingpad",
              label: "Writing Pad",
              icon: "pen",
              route: "/studio",
              tab: "writingpad",
              badge: null,
            },
          ],
        },

        /* ── 4. Library ───────────────────────────────────────── */
        {
          id: "library",
          title: "Library",
          items: [
            {
              id: "medialibrary",
              label: "Media Library",
              icon: "image",
              route: "/studio",
              tab: "media",
              badge: null,
            },
            {
              id: "librnotes",
              label: "Notes",
              icon: "notepad",
              route: "/studio",
              tab: "notes",
              badge: null,
            },
          ],
        },

        /* ── 5. Student Interaction ───────────────────────────── */
        {
          id: "interaction",
          title: "Student Interaction",
          items: [
            {
              id: "stdoubts",
              label: "Student Doubts",
              icon: "help",
              route: "/studio",
              tab: "doubts",
              badge: 3,
            },
            {
              id: "feedback",
              label: "Feedback",
              icon: "feedback",
              route: "/studio",
              tab: "feedback",
              badge: null,
            },
          ],
        },

        /* ── 6. AI Tools ──────────────────────────────────────── */
        {
          id: "aitools",
          title: "AI Tools",
          items: [
            {
              id: "genLesson",
              label: "Generate Lesson",
              icon: "sparkles",
              route: null,
              action: "genLesson",
              badge: null,
            },
            {
              id: "genNotes",
              label: "Generate Notes",
              icon: "sparkles",
              route: null,
              action: "genNotes",
              badge: null,
            },
            {
              id: "genQuiz",
              label: "Generate Quiz",
              icon: "sparkles",
              route: null,
              action: "genQuiz",
              badge: null,
            },
          ],
        },

        /* ── 7. Studio Settings ───────────────────────────────── */
        {
          id: "studiosettings",
          title: "Studio Settings",
          items: [
            {
              id: "stanalytics",
              label: "Analytics",
              icon: "analytics",
              route: "/studio",
              tab: "analytics",
              badge: null,
            },
          ],
        },
      ],

      pinnedTools: ["courses", "lessons", "explain", "live"],

      statusCard: {
        title: "Today in Studio",
        fields: ["drafts", "doubts", "scheduled", "recordings"],
      },
    },

    /* ·· ADMIN ··············································· */
    admin: {
      title: "Build Center",
      subtitle: "Platform control and administration",

      groups: [
        /* ── 1. Control ───────────────────────────────────────── */
        {
          id: "control",
          title: "Control",
          items: [
            {
              id: "forge",
              label: "ForgeBuilder Home",
              icon: "hammer",
              route: "/forgebuilder",
              badge: null,
            },
            {
              id: "command",
              label: "Command Center",
              icon: "terminal",
              route: "/forgebuilder?panel=commands",
              badge: null,
            },
            {
              id: "publish",
              label: "Publish Center",
              icon: "upload",
              route: "/forgebuilder?panel=publish",
              badge: null,
            },
          ],
        },

        /* ── 2. UI System ─────────────────────────────────────── */
        {
          id: "ui",
          title: "UI System",
          items: [
            {
              id: "theme",
              label: "Theme Manager",
              icon: "palette",
              route: "/forgebuilder?panel=theme",
              badge: null,
            },
            {
              id: "navmgr",
              label: "Navigation Manager",
              icon: "menu",
              route: "/forgebuilder?panel=nav",
              badge: null,
            },
            {
              id: "components",
              label: "Components",
              icon: "grid",
              route: "/forgebuilder?panel=components",
              badge: null,
            },
          ],
        },

        /* ── 3. Platform ──────────────────────────────────────── */
        {
          id: "platform",
          title: "Platform",
          items: [
            {
              id: "users",
              label: "Users",
              icon: "users",
              route: "/forgebuilder?panel=users",
              badge: null,
            },
            {
              id: "roles",
              label: "Roles",
              icon: "shield",
              route: "/forgebuilder?panel=roles",
              badge: null,
            },
            {
              id: "content",
              label: "Content",
              icon: "book",
              route: "/forgebuilder?panel=content",
              badge: null,
            },
            {
              id: "livemgr",
              label: "LiveClass Manager",
              icon: "video",
              route: "/forgebuilder?panel=liveclass",
              badge: null,
            },
          ],
        },

        /* ── 4. System ────────────────────────────────────────── */
        {
          id: "system",
          title: "System",
          items: [
            {
              id: "health",
              label: "Health Monitor",
              icon: "activity",
              route: "/forgebuilder?panel=health",
              badge: null,
            },
            {
              id: "logs",
              label: "Logs",
              icon: "terminal",
              route: "/forgebuilder?panel=logs",
              badge: null,
            },
            {
              id: "settings",
              label: "Settings",
              icon: "settings",
              route: "/forgebuilder?panel=settings",
              badge: null,
            },
          ],
        },
      ],

      pinnedTools: ["forge", "theme", "health"],

      statusCard: {
        title: "System Status",
        fields: ["health", "pending", "warnings"],
      },
    },
  },

  /* --------------------------------------------------------------------------
     § 1.3  CONTEXT ACTIONS
     Per-page shortcut buttons that surface below the main nav when the
     user is on a matching route. Keyed by page/route identifier string.
     An empty array means no context actions for that page.
     -------------------------------------------------------------------------- */
  contextActions: {
    /* No context actions on the hub landing page */
    hub: [],

    problems: [
      {
        id: "filter",
        label: "Filter Problems",
        icon: "filter",
        action: "openProblemsFilter",
      },
      {
        id: "difficulty",
        label: "By Difficulty",
        icon: "zap",
        action: "filterByDifficulty",
      },
      { id: "tags", label: "By Tags", icon: "tag", action: "filterByTags" },
      {
        id: "unsolved",
        label: "Unsolved Only",
        icon: "circle",
        action: "filterUnsolved",
      },
      {
        id: "recommended",
        label: "Recommended",
        icon: "sparkles",
        action: "filterRecommended",
      },
      {
        id: "reset",
        label: "Reset Filters",
        icon: "refresh",
        action: "resetFilters",
      },
    ],

    learn: [
      {
        id: "search",
        label: "Search Topics",
        icon: "search",
        action: "searchTopics",
      },
      {
        id: "continue",
        label: "Continue Lesson",
        icon: "play",
        action: "continueLast",
      },
      {
        id: "live",
        label: "Upcoming Classes",
        icon: "video",
        action: "upcomingClasses",
      },
    ],

    ailab: [
      {
        id: "practice",
        label: "AI Practice",
        icon: "cpu",
        action: "aiPractice",
      },
      {
        id: "ml",
        label: "Machine Learning",
        icon: "layers",
        action: "filterML",
      },
      { id: "dl", label: "Deep Learning", icon: "layers", action: "filterDL" },
    ],

    social: [
      {
        id: "friends",
        label: "Find Friends",
        icon: "users",
        action: "findFriends",
      },
      { id: "rooms", label: "Squad Rooms", icon: "grid", action: "squadRooms" },
      {
        id: "feed",
        label: "Activity Feed",
        icon: "activity",
        action: "activityFeed",
      },
    ],

    studio: [
      {
        id: "newcourse",
        label: "Create Course",
        icon: "plus",
        action: "createCourse",
      },
      {
        id: "newlesson",
        label: "Create Lesson",
        icon: "plus",
        action: "createLesson",
      },
      { id: "openpad", label: "Writing Pad", icon: "pen", action: "openPad" },
      {
        id: "newexplain",
        label: "New Explanation",
        icon: "presentation",
        action: "newExplain",
      },
      {
        id: "startlive",
        label: "Start Live Class",
        icon: "video",
        action: "startLive",
      },
      {
        id: "uploadnotes",
        label: "Upload Notes",
        icon: "upload",
        action: "uploadNotes",
      },
    ],

    "live-class": [
      {
        id: "camera",
        label: "Toggle Camera",
        icon: "video",
        action: "toggleCamera",
      },
      { id: "mic", label: "Toggle Mic", icon: "mic", action: "toggleMic" },
      {
        id: "share",
        label: "Share Screen",
        icon: "share",
        action: "shareScreen",
      },
      { id: "chat", label: "Chat", icon: "message", action: "toggleChat" },
      { id: "record", label: "Record", icon: "circle", action: "toggleRecord" },
    ],

    explainlab: [
      { id: "pen", label: "Pen", icon: "pen", action: "selectPen" },
      { id: "eraser", label: "Eraser", icon: "eraser", action: "selectEraser" },
      { id: "shapes", label: "Shapes", icon: "square", action: "selectShapes" },
      { id: "addpage", label: "Add Page", icon: "plus", action: "addPage" },
      { id: "record", label: "Record", icon: "circle", action: "toggleRecord" },
      { id: "save", label: "Save Draft", icon: "save", action: "saveDraft" },
      { id: "publish", label: "Publish", icon: "upload", action: "publish" },
    ],

    forgebuilder: [
      {
        id: "newpage",
        label: "Create Page",
        icon: "plus",
        action: "createPage",
      },
      {
        id: "edittheme",
        label: "Edit Theme",
        icon: "palette",
        action: "editTheme",
      },
      {
        id: "health",
        label: "Health Check",
        icon: "activity",
        action: "runHealthCheck",
      },
      {
        id: "publish",
        label: "Publish Changes",
        icon: "upload",
        action: "publishChanges",
      },
    ],
  },

  /* --------------------------------------------------------------------------
     § 1.4  QUICK CREATE
     Floating "+" launcher options, segmented by mode.
     -------------------------------------------------------------------------- */
  quickCreate: {
    student: [
      {
        id: "solve",
        label: "Solve Problem",
        icon: "code",
        action: "solveProblem",
      },
      { id: "doubt", label: "Ask Doubt", icon: "help", action: "askDoubt" },
      { id: "join", label: "Join Live", icon: "video", action: "joinLive" },
      { id: "ai", label: "AI Tutor", icon: "cpu", action: "openAI" },
    ],

    creator: [
      {
        id: "course",
        label: "Create Course",
        icon: "book",
        action: "createCourse",
      },
      {
        id: "lesson",
        label: "Create Lesson",
        icon: "notepad",
        action: "createLesson",
      },
      { id: "pad", label: "Writing Pad", icon: "pen", action: "openPad" },
      {
        id: "explain",
        label: "New Explanation",
        icon: "presentation",
        action: "newExplain",
      },
      { id: "live", label: "Start Live", icon: "video", action: "startLive" },
      {
        id: "upload",
        label: "Upload Notes",
        icon: "upload",
        action: "uploadNotes",
      },
    ],

    admin: [
      { id: "page", label: "Create Page", icon: "plus", action: "createPage" },
      { id: "user", label: "Add User", icon: "users", action: "addUser" },
      {
        id: "theme",
        label: "Edit Theme",
        icon: "palette",
        action: "editTheme",
      },
      {
        id: "health",
        label: "Run Health Check",
        icon: "activity",
        action: "runHealthCheck",
      },
    ],
  },
};

/* ============================================================================
   § 2  ORBITDOCK_ICONS
   Complete SVG icon set. Every value is a full <svg>…</svg> string,
   safe for direct assignment to element.innerHTML.

   Attribute convention on every icon:
     viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="1.75"
     stroke-linecap="round"
     stroke-linejoin="round"

   Sections:
     2.1  Orbit Rail
     2.2  Workspace Navigation
     2.3  Context Actions & Tools
     2.4  UI Chrome & Utilities
     2.5  Brand
     2.6  Media & Content
     2.7  System & Admin
     2.8  Legacy Aliases
   ============================================================================ */

const ORBITDOCK_ICONS = {
  /* ── § 2.1  Orbit Rail ─────────────────────────────────────────────────── */

  /** House with door cutout — HQ / Student home */
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',

  /** Code angle-brackets  </> */
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',

  /** Open book with spine */
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',

  /** Three stacked layers — Studio / Creator */
  layers:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',

  /** Video camera with recording lens — Live / Video */
  video:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',

  /** Wrench tool — Build / Admin */
  tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',

  /** CPU chip with pin lines — AI Lab */
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',

  /* ── § 2.2  Workspace Navigation ───────────────────────────────────────── */

  /** Four rounded squares — Dashboard / HQ */
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',

  /** Solid triangle — Play / Continue */
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',

  /** Three concentric circles — Daily Challenge / Target */
  target:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',

  /** 4-pointed diamond star with small cross sparkles — Recommended / AI */
  sparkles:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',

  /** Single checkmark — Submissions / Done */
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',

  /** Ribbon bookmark — Bookmarks */
  bookmark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',

  /** Three vertical bars — Bar Chart / Progress */
  chart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',

  /** Hierarchy tree with parent node and two children — Skill Tree */
  tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="5" y2="16"/><line x1="12" y1="11" x2="19" y2="16"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>',

  /** Medal circle with ribbon — Achievements / Awards */
  award:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',

  /** Table grid — Analytics */
  analytics:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',

  /** Two overlapping silhouettes — Users / Community */
  users:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',

  /** Circle with question mark — Help / Doubts */
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',

  /** Speech bubble — Messages / Chat */
  message:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',

  /** Wrench / spanner — Workshop / Wrench tool */
  wrench:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',

  /** Gear cog — Settings */
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',

  /** Trophy cup with handles and base — Contests / Leaderboard */
  trophy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>',

  /* ── § 2.3  Context Actions & Tools ────────────────────────────────────── */

  /** Funnel shape — Filter */
  filter:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',

  /** Lightning bolt — Difficulty / Zap */
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',

  /** Price tag with dot hole — Tags */
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',

  /** Magnifying glass — Search */
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',

  /** Document with lines — Notepad / Notes */
  notepad:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',

  /** Monitor / screen with stand — Presentation / ExplainLab */
  presentation:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',

  /** Filled square — Stop */
  stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="currentColor"/></svg>',

  /** Microphone with stand — Mic / Audio */
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',

  /** Three nodes connected with lines — Share */
  share:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',

  /** Pen / pencil nib — Writing Pad */
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',

  /** Eraser block with swept line — Eraser tool */
  eraser:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>',

  /** Four rounded squares — Grid / Squad Rooms */
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',

  /** Plus sign — Add / Create */
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',

  /** Plain hollow circle — Record toggle button */
  circle:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>',

  /** Floppy disk — Save Draft */
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',

  /* ── § 2.4  UI Chrome & Utilities ──────────────────────────────────────── */

  /** Clock face with hands — Recent / Clock */
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',

  /** Artist palette with dot color picks */
  palette:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',

  /** Three horizontal lines — Hamburger / Navigation Manager */
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',

  /** Arrow pointing up from tray — Upload / Publish */
  upload:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',

  /** EKG / heartbeat waveform — Activity / Health */
  activity:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',

  /** Command prompt caret and underline — Terminal / Logs */
  terminal:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',

  /** Right-pointing chevron ›  */
  chevronRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',

  /** Left-pointing chevron ‹ */
  chevronLeft:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',

  /** Down-pointing chevron ˅ */
  chevronDown:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',

  /** X mark — Close / Dismiss */
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',

  /** Two circular arrows — Refresh / Reset */
  refresh:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',

  /** Rounded rectangle — Shapes / Square */
  square:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>',

  /** Map pin / location marker — Pin / Pinned Tools */
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',

  /** 5-pointed star — Star / Favourite */
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',

  /* ── § 2.5  Brand ───────────────────────────────────────────────────────── */

  /** Nexora "N" lettermark inside a circle — Brand logo */
  nexora:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 16V8l8 8V8"/></svg>',

  /* ── § 2.6  Media & Content ─────────────────────────────────────────────── */

  /** Landscape photo frame with mountain and sun — Media / Image */
  image:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',

  /** Speech bubble with horizontal rule lines — Feedback */
  feedback:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>',

  /* ── § 2.7  System & Admin ──────────────────────────────────────────────── */

  /** Hammer with handle and head — ForgeBuilder / Build */
  hammer:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5a2.12 2.12 0 0 1-3-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/></svg>',

  /** Shield / crest — Roles / Security */
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',

  /* ── § 2.8  Legacy Aliases ──────────────────────────────────────────────── */

  /**
   * 'record' — filled red-dot recording indicator.
   * v1 used this directly; v2 context actions reference 'circle' instead.
   * Kept so any existing code that calls ORBITDOCK_ICONS.record still works.
   */
  record:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/></svg>',

  /**
   * 'studio' — v1 orbit icon name, replaced by 'layers' in v2.
   * Kept so any renderer code that still requests icon 'studio' resolves
   * to the same layers graphic without throwing undefined.
   */
  studio:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',

  /** Sign-out arrow — Logout */
  logout:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',

  /** Notification bell */
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',

  /** Single person silhouette — User profile */
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
};

/* ============================================================================
   § 3  SIDEBAR_ICONS
   Backward-compatibility alias.
   Any existing code that references `SIDEBAR_ICONS` receives the same
   complete icon object without any changes needed at the call site.
   ============================================================================ */

const SIDEBAR_ICONS = ORBITDOCK_ICONS;

/* ============================================================================
   § 4  SIDEBAR_CONFIG  (Legacy)
   Original flat section-based navigation structure.
   Preserved so legacy code paths continue to function without modification.
   ============================================================================ */

const SIDEBAR_CONFIG = {
  sections: [
    {
      id: "main",
      title: "Main",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          route: "/",
          icon: "home",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "problems",
          label: "Problems",
          route: "/problems",
          icon: "code",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "contests",
          label: "Contests",
          route: "/contests",
          icon: "trophy",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
      ],
    },
    {
      id: "learning",
      title: "Learning",
      items: [
        {
          id: "learn",
          label: "Learn",
          route: "/learn",
          icon: "book",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "skill-tree",
          label: "Skill Tree",
          route: "/skills",
          icon: "tree",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "roadmap",
          label: "Roadmap",
          route: "/forge",
          icon: "layers",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
      ],
    },
    {
      id: "teaching",
      title: "Teaching",
      items: [
        {
          id: "explainlab",
          label: "ExplainLab",
          route: "/explainlab",
          icon: "presentation",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "studio",
          label: "Studio",
          route: "/studio",
          icon: "layers",
          badge: null,
          roles: ["admin", "teacher"],
        },
        {
          id: "live-classes",
          label: "Live Classes",
          route: "/live-class",
          icon: "video",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
      ],
    },
    {
      id: "tools",
      title: "Tools",
      items: [
        {
          id: "ai-lab",
          label: "AI Lab",
          route: "/ailab",
          icon: "cpu",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "forgebuilder",
          label: "ForgeBuilder",
          route: "/forgebuilder",
          icon: "hammer",
          badge: null,
          roles: ["admin"],
        },
      ],
    },
    {
      id: "social",
      title: "Social",
      items: [
        {
          id: "leaderboard",
          label: "Leaderboard",
          route: "/leaderboard",
          icon: "award",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "friends",
          label: "Friends",
          route: "/social",
          icon: "users",
          badge: null,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "doubts",
          label: "Doubts",
          route: "/social?tab=doubts",
          icon: "help",
          badge: 3,
          roles: ["admin", "teacher", "student"],
        },
      ],
    },
  ],

  footerItems: [
    {
      id: "settings",
      label: "Settings",
      route: "/settings",
      icon: "settings",
      roles: ["admin", "teacher", "student"],
    },
    {
      id: "logout",
      label: "Logout",
      route: "/logout",
      icon: "logout",
      roles: ["admin", "teacher", "student"],
    },
  ],
};

/* ============================================================================
   § 5  MODULE EXPORT GUARD
   Supports both plain-global <script> loading and CommonJS require()
   without breaking either environment.
   ============================================================================ */

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ORBITDOCK_CONFIG,
    ORBITDOCK_ICONS,
    SIDEBAR_ICONS,
    SIDEBAR_CONFIG,
  };
}
