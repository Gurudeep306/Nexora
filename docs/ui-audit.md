# Hive UI audit (phase 15.1, before any code changes)

This audit is the first step of the Hive redesign brief ("simple, calm, cool").
It records what exists today, how the 21 sections map onto the new structure,
which URLs must redirect, which components to build or replace, the risks, and
the merges I recommend doing differently.

## 1. Stack

| Layer | What Hive uses today |
|---|---|
| Framework | React 19 + TypeScript, built with Vite 8 |
| Router | react-router-dom 7. All of Hive lives under one `/hive/*` route; `client/src/hive/HivePage.tsx` holds the shell and a nested `<Routes>`, and every page is `lazy()`-loaded |
| Styling | Tailwind CSS 4 with the **site's own semantic tokens** (`--color-bg-app`, `--color-text-primary`, `--color-accent-brand`, `--color-state-*`, …) in `client/src/index.css`. The site has a theme system (`client/src/theme/`: palettes, looks, fonts) that users can change, so Hive follows the theme picked on NexoraGuru. Hive-specific classes live in `client/src/hive/hive.css` (`hive-card`, `hive-line`, `hive-composer`, …) |
| Components | `client/src/components/ui/` (Button, Card, Input, Menu, Modal, Select, Tabs, Table, Tooltip, Toast via sonner, Kbd, EmptyState, Badge, Progress, …), built on Radix (`radix-ui`). Hive adds its own pieces in `client/src/hive/ui.tsx` (PageTitle, IconTile, LimitBar, StatusPill/StatusDot, ProviderGlyph, …) and `agents.tsx` (AgentMark, AgentAvatar, family colours) |
| Icons | lucide-react (Hive uses only lucide; the site also bundles heroicons, tabler, remix, iconoir and phosphor elsewhere) |
| Motion | `motion` (framer-motion) is used in about 30 Hive files: page and list entrances, the sidebar width animation, and popovers |
| Data | A hand-written store (`client/src/hive/store.tsx`): one `bootstrap` call, socket.io for live updates (`hub.emit` on the server), and `api.ts` fetchers. There is no React Query or SWR |
| Charts | recharts (lazy chunk, about 88 KB gzipped), used on Usage, Budgets and Keys |
| Markdown | react-markdown with remark-gfm and remark-math (`AiMarkdown`, a lazy chunk of about 47 KB gzipped) |

**Baseline bundle (gzipped):** site entry `index` 119 KB, Hive shell (`HivePage`) 18 KB. Per-page chunks: ProjectPage 33, DrivePage 16, PipelinesPage 15, KeysPage 12, ChatPage 11 and Copilot 9 KB. Lighthouse, INP and React Profiler numbers will be recorded on the deployed site in the verification phase (15.6), so before-and-after use the same environment.

## 2. Routes and the 21 sections today

All routes are declared in `HivePage.tsx`. The navigation (sidebar, icon rail, launcher, mobile menu and ⌘K) is defined once in `useNav()` in the same file.

| # | Section | Route | Page component | Shared pieces it uses |
|---|---|---|---|---|
| 1 | Mission control | `/hive` | `pages/HomePage.tsx` | its own composer (`hive-composer`), `Explore` 21-card grid, LiveWall, health strip |
| 2 | Copilot | `/hive/copilot` | `pages/CopilotPage.tsx` → `Copilot.tsx` (`CopilotThread`) | its own composer, BrainPill, ActiveWork ("On it"), Steps, AiMarkdown, ProjectFocus, LiveStatus |
| 3 | Chat | `/hive/chat/:convoId?` | `pages/ChatPage.tsx` | its own composer, AgentPicker/AgentChip, Judge compare, AiMarkdown, uploads |
| 4 | Your GitHub | `/hive/repos` | `pages/ReposPage.tsx` | repo cards with a filled **Chat** button on every card, FolderImport, ConnectGithub |
| 5 | Projects | `/hive/p/:projectId/*` (session: `/hive/p/:id/t/:taskId`) | `pages/ProjectPage.tsx` → `Session.tsx` (1,456 lines) | its own session composer, AgentChip, BoardView, ChangesView, FilesView, TeamFloor, WorkMap, LiveCode |
| 6 | Dispatcher | `/hive/dispatch` | `pages/DispatchPage.tsx` | its own textarea, cost-strategy segmented control, plan graph |
| 7 | Pipelines | `/hive/pipelines` | `pages/PipelinesPage.tsx` (1,732 lines) | pipeline editor, Architect |
| 8 | Automations | `/hive/automations` | `pages/AutomationsPage.tsx` | schedules list and forms |
| 9 | Launchpad | `/hive/launchpad/:ideaId?` | `pages/LaunchpadPage.tsx` | idea composer, idea → project |
| 10 | Build NexoraGuru | `/hive/nexora` | `pages/NexoraGuide.tsx` | guided steps |
| 11 | Machines | `/hive/machines` | `pages/MachinesPage.tsx` | machine cards, terminal, approvals |
| 12 | Drive | `/hive/drive` | `pages/DrivePage.tsx` (1,904 lines) | list/grid, uploads, previews |
| 13 | Keys & limits | `/hive/keys` | `pages/KeysPage.tsx` | KeyRow, LimitBar, FreeSetup, Subscriptions, ConnectGithub |
| 14 | Models | `/hive/models` | `pages/ModelsPage.tsx` (+ `RadarTab.tsx`) | model cards with score rings and bars |
| 15 | Agent health | `/hive/health` | `pages/HealthPage.tsx` | LimitBar, verify progress |
| 16 | Toolbox | `/hive/toolbox` | `pages/ToolboxPage.tsx` | catalogue, MCP connect |
| 17 | Plugins | `/hive/plugins` | `pages/PluginsPage.tsx` | toggles |
| 18 | Memory | `/hive/memory` | `pages/MemoryPage.tsx` | memory list, composer |
| 19 | Usage | `/hive/usage` | `pages/UsagePage.tsx` | recharts |
| 20 | Budgets | `/hive/budgets` | `pages/BudgetsPage.tsx` | recharts, forms |
| 21 | Token Steward | `/hive/steward` | `pages/StewardPage.tsx` | score, savings, its own composer |

**Shell pieces (`HivePage.tsx`):**

- `ActivityBar`: the unlabelled icon rail.
- `Sidebar` and `NavSections`: a labelled, grouped sidebar. It is hidden by default inside sessions, which is why the rail is often all you see.
- `TopBar`: breadcrumb, `ProjectSwitcher`, `ModelsAtWork`, bell, avatar, and the unlabelled live dot.
- `Palette`: ⌘K, which shows the 21 sections as big cards.
- `Launcher`: ⌘., another grid of the same 21 sections.
- `ApprovalsTray`: a floating card.
- `TeamDrawer`.
- `MobileNav`.
- `CopilotDock`, from `Copilot.tsx`: the floating round bot button plus a panel, opened with ⌘I.

## 3. New information architecture: mapping

| New group | New nav item | Absorbs (old name → new place) |
|---|---|---|
| top | **Home** | Mission control → Home (Needs you / Running now / Recent; the Explore grid is removed) |
| top | **Inbox** (new) | Approvals (machine commands), Copilot reviews, failed or stopped runs, limit warnings and team @mentions, all from data Hive already has |
| Work | **Copilot** | Copilot; Dispatcher → Copilot "Plan a team" mode |
| Work | **Chat** | Chat (compare stays) |
| Work | **Projects** | Your GitHub + Projects in one list; Launchpad → Projects › New project › From idea; Build NexoraGuru → pinned guide inside Projects; Upload folder → New project › Upload folder |
| Work | **Pipelines** | Pipelines + Automations (tabs: Pipelines / Schedules) |
| Resources | **Machines** | Machines |
| Resources | **Drive** | Drive |
| AI setup | **Models** | Models + Agent health (tabs: Catalogue / Health) |
| AI setup | **Keys & limits** | Keys & limits |
| AI setup | **Extensions** | Toolbox + Plugins + Memory (tabs) |
| Spend | **Spend** | Usage + Budgets + Token Steward (tabs: Overview / Budgets / Savings) |
| bottom | Team, Settings, user menu | Team drawer, Settings (new: appearance, density, motion, shortcuts) |

## 4. Redirects (every old URL keeps working)

| Old URL | New URL |
|---|---|
| `/hive/dispatch` | `/hive/copilot?mode=team` |
| `/hive/repos` | `/hive/projects` |
| `/hive/launchpad`, `/hive/launchpad/:ideaId` | `/hive/projects?tab=ideas` and `/hive/projects/ideas/:ideaId` |
| `/hive/nexora` | `/hive/projects/guide` (also pinned in the sidebar) |
| `/hive/automations` | `/hive/pipelines?tab=schedules` |
| `/hive/health` | `/hive/models?tab=health` |
| `/hive/toolbox`, `/hive/plugins`, `/hive/memory` | `/hive/extensions?tab=toolbox`, `?tab=plugins`, `?tab=memory` |
| `/hive/usage`, `/hive/budgets`, `/hive/steward` | `/hive/spend?tab=overview`, `?tab=budgets`, `?tab=savings` |
| `/hive/p/:id/*`, `/hive/chat/:id`, `/hive/copilot` | unchanged |

Query strings (for example `?add=<vendor>` on Keys, or `?model=` and `?drive=` on Chat) are carried through every redirect. Old names stay as ⌘K keywords: Dispatcher, Launchpad, Token Steward, Your GitHub, repos, Agent health, Automations, Usage and Budgets.

Implementation is low-risk. Each existing page component is mounted unchanged inside a tab of its new parent first, then restyled. No backend route changes.

## 5. Duplicates found

| Kind | Where | Plan |
|---|---|---|
| **Composers** (8+) | HomePage, Copilot, ChatPage, Session, DispatchPage, LaunchpadPage, MemoryPage, StewardPage, AutomationsPage, PipelinesPage, TeamChat | One `<Composer>` with intents Ask / Do it / Plan a team for Home, Copilot and Chat. Session, Launchpad and the others reuse its textarea, attachment and submit parts |
| **Entry points to the 21 sections** (5) | icon rail, sidebar, Home Explore grid, ⌘K Palette (cards), ⌘. Launcher (cards), mobile menu | Keep the labelled sidebar plus ⌘K rows only. Remove the Explore grid and the Launcher (⌘. opens ⌘K). Mobile gets a bottom tab bar |
| **"Talk to AI" surfaces** (5) | Home composer, Copilot page, CopilotDock panel, Chat, Dispatcher | One composer with intents. The CopilotDock floating button becomes the ⌘I right panel |
| **Status badges** (3 styles) | `StatusPill`/`StatusDot` (ui.tsx), the Session's own badges, inline coloured spans on Keys, Health, Machines and Copilot | One `StatusPill` with the fixed vocabulary (Queued, Planning, Running, Needs you, In review, Done, Failed, Stopped, Limited), always icon + word + colour |
| **Model pickers** (2) | `AgentPicker` (chat, sessions) and the Copilot brain menu | Keep AgentPicker as the one picker, upgraded (Recommended, Favourites, keyboard, virtualised). The brain menu reuses it |
| **Primary buttons per screen** | Repos (a purple "Chat" on every card), Keys (filled "Add" on every row), Dispatcher (several) | One primary per view; row actions become ghost buttons that appear on hover, plus a ⋯ menu |
| **Cards where rows fit** | Repos, Models (cards with placeholder score 42), Keys, Machines, Health | Rows and tables; cards only for real objects |
| **Unlabelled status** | TopBar live dot, rail badges | A labelled status line in the sidebar footer ("All systems ok" / "1 provider limited") |
| **Plumbing in messages** | Copilot replies print `/hive/p/prj_…/t/tsk_…` and raw model slugs | Link chips ("Open result ↗") and friendly model names, with the slug in a tooltip |

## 6. Components to create or replace

**Build new** (in `client/src/hive/kit/`, on top of `components/ui`):

- **Composer.** Intent switch, collapsible Options row, helper line, attachments.
- **StatusPill.** The fixed vocabulary.
- **QuotaMeter.** Replaces the drawing part of `LimitBar`; keeps its data logic.
- **Row and RowList.** A 40px row with a hover ⋯ menu, a virtualised list, and J/K keys.
- **DataTable.** Sticky header, sorting, numbers aligned right, optional virtualisation.
- **RightPanel.** A resizable slot used for Copilot, details and the run inspector.
- **CopyField.** Monospace, truncated in the middle, with a copy button.
- **ModelChip.** Friendly name, with the slug in a tooltip.
- **RunTimeline**, **ToolCallRow** and **ReceiptCard**.
- **SegmentedControl.**
- **EmptyState** and **ErrorState** variants.
- **Inbox** two-pane view.
- **SettingsPage**, with a shortcuts sheet.

**Replace or restyle:**

- **Sidebar.** Grouped, labelled, collapsible to a rail that expands on hover, with pinned items and a status footer.
- **TopBar.** Remove the switcher clutter and the unlabelled dot.
- **Palette.** Rows instead of cards, actions, synonyms, `>` and `@`, and a "Ask Copilot" fallback.
- Remove **Launcher**, the **Explore** grid, the **CopilotDock** floating button and the floating **ApprovalsTray** (approvals move to Inbox).
- **AgentPicker.** Upgrade it.
- **ModelsPage.** Change it to a table.
- **ReposPage + ProjectPage.** Merge them into the Projects list.

**Reuse:** Button, Input, Select, Menu, Modal (Radix dialogs with focus trap and Esc), Tabs, Tooltip, Kbd, sonner Toast, and the existing skeletons.

## 7. Risks

1. **Theme and fonts vs. the site.** The brief specifies fixed OKLCH tokens and Inter. Nexora already has a semantic token layer, a user-selectable theme system (palettes, looks, fonts, light/dark) and Geist bundled. AGENTS.md also asks Hive to match the site. Shipping a separate `tokens.css` with hard-coded colours would split Hive from the site and break users' chosen themes. **Recommendation:** add the brief's semantic names (`--bg-app`, `--surface-1..3`, `--border*`, `--text-1..3`, `--accent*`, status) as **aliases onto the site tokens**. Hive gets the calm charcoal / violet values through a "Hive" default look, while still respecting a user's theme and light/dark. Use Geist, which is already shipped and is in the brief's list, instead of adding Inter.
2. **Motion library.** `motion` is used in about 30 Hive files. Removing it all at once is a large diff with regression risk. Plan: drop page and list entrance animations and the animated sidebar width first, using CSS transitions and View Transitions as the brief says. Keep `motion` only where it does real work (drag reordering, presence of small popovers) until each screen is redone.
3. **Big pages.** Session (1,456 lines), Drive (1,904) and Pipelines (1,732) work and are well tested by use. They will be restyled in place, not rewritten. The brief's "simple vertical step list" for the pipeline editor is close to what exists today.
4. **Inbox needs one read-only endpoint.** It gathers approvals, reviews, failures, limits and mentions from existing tables. That is a new GET route with no change to existing behaviour; the brief's "nothing breaks" holds.
5. **Charts.** recharts (88 KB gzipped) is above the brief's ~40 KB chart budget. It is already lazy-loaded and only on Spend. Plan: keep it lazy in phase 15.5 and swap it for small hand-made SVG charts when Spend is rebuilt, which removes the chunk.
6. **Keyboard shortcuts.** Single-key shortcuts (C, G then X, J/K, [) must not fire while typing and must be switch-offable (WCAG 2.1.4). That means one central shortcut manager, replacing today's scattered `keydown` listeners in HivePage, Copilot and ChatPage.
7. **Mobile.** A bottom tab bar under 640px is new; it is tested at 390px and 320px in 15.6.
8. **Volume.** This is roughly 8 pull requests. Each one ships behind the same routes, keeps every feature working, and is verified (tests, typecheck, build, screenshots) before merging. Merging deploys the live site.

## 8. Merges I recommend doing differently

| Brief | Recommendation | Why |
|---|---|---|
| Launchpad fully absorbed into "New project › From idea" | Projects gets an **Ideas** tab; "New project › From idea" opens it | Launchpad keeps a list of ideas with their own lifecycle (idea → plan → project); a menu item alone would hide that list |
| Build NexoraGuru as a "pinned project/template" | Keep it as a **guide page** under Projects (`/hive/projects/guide`), pinned in the sidebar | It is a step-by-step guide (code → PR → live site), not a project or repo |
| Dispatcher → Copilot "Plan a team" mode | Do it, but mount the existing Dispatcher plan editor inside Copilot's team mode | The plan graph and editor already do "plan → edit → run" well; rebuilding them is risk without benefit |
| Pipeline editor as a simple vertical step list | Restyle what exists | It already is a vertical step list |

Every other merge in §3.1 can be done as written.

## 9. Order of work (one PR per step, each verified before merge)

1. **Foundations.** Token aliases plus the "Hive" look, primitives (StatusPill, QuotaMeter, Row, DataTable, SegmentedControl, CopyField, ModelChip, EmptyState, ErrorState), and a dev-only `/hive/dev/ui` gallery.
2. **Shell.** Labelled sidebar with groups, rail-on-hover, pinned items and status line; quiet top bar; RightPanel with the ⌘I Copilot panel (floating button removed); ⌘K rewrite; shortcut manager; View Transitions; redirects for every merged route.
3. **Composer and agent UX.** Shared Composer with three intents and Options; live tasks bar; run timeline, tool calls, receipts; hiding plumbing; streaming batching; AgentPicker upgrade.
4. **Home + Inbox.**
5. **Projects** (merged list), then **Keys & limits** and **Models** (table plus Health tab).
6. **Copilot and Chat** pages on the new composer, plus **Spend** (tabs and a small SVG chart).
7. **Drive, Pipelines + Schedules, Machines, Extensions, Settings.**
8. **Verification.** Every old URL, axe, keyboard-only flows, Lighthouse and Profiler before and after, screenshots at 1440 and 390 px, and `docs/ui-changes.md`.
