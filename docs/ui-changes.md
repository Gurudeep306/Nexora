# Hive redesign: what changed

This is the record of the Hive UI redesign (November 2026). The goal was a
workspace that is simple, calm and quick to use, like Linear, Raycast or
Vercel, while every older feature still works. The plan and the audit it came
from are in `docs/ui-audit.md`.

It shipped in pull requests #76 to #86, one part at a time.

## The building blocks (`client/src/hive/kit/`)

Every new screen uses these, plus the site's own `components/ui`.

| Piece | What it is |
|---|---|
| `kit.css` | `--hv-*` names that point at the site's theme colours, so a user's NexoraGuru theme and light/dark mode carry into Hive. Also the focus ring, row density, view transitions and reduced motion. |
| `StatusPill` + `toStatus()` | One status vocabulary for everything: Queued, Planning, Running, Needs you, In review, Done, Failed, Stopped, Limited. Each status has an icon and a word, never colour alone. |
| `Row` / `RowList` | A 40 px row (32 px when compact). The whole row opens; actions appear on hover or focus; J/K moves between rows. |
| `DataTable` | Sortable columns, numbers right-aligned, low-priority columns hidden on small screens. |
| `SegmentedControl`, `QuotaMeter`, `CopyField`, `ModelChip`, `Empty`, `Problem` | The small parts every page needs. |
| `Composer` | The one message box: Ask, Do it or Plan a team, with options folded away. |
| `StackedBars`, `Sparkline` | Small charts in plain HTML/SVG. Hive no longer loads the chart library. |
| `useDensity()` | Comfortable or compact rows, chosen in Settings. |

A gallery of the kit is at `/hive/dev/ui` (development builds only).

## What changed for the user

**Shell**
- The sidebar has labels, 12 places in 4 groups, a project switcher at the
  top, a "New" menu, recent chats, and a status line at the bottom.
- The floating bot button is gone. ⌘I, or the Copilot button in the top bar,
  opens the Copilot as a side panel. Esc closes it.
- ⌘K finds pages, projects, commands and old names ("dispatcher",
  "launchpad", "alerts" and so on). Type `>` for commands or `@` for projects.
- Shortcuts: G then a letter goes somewhere, C starts a task, `/` searches,
  `[` folds the sidebar, `?` shows the list. You can switch single-key
  shortcuts off in Settings.
- On phones there is a bottom tab bar: Home, Inbox, Copilot, Chat and
  Projects.

**Pages**
- **Home** shows your own work: the composer, Needs you, Running, Recent and
  one line for today. The grid of every section is gone.
- **Inbox** (the bell) lists approvals, work to review, failures and limits
  hit, then every alert.
- **Copilot**:
  - Has a "Do it / Plan a team" switch. The Dispatcher now lives here.
  - Replies never show raw ids; internal paths become "Open result" links.
  - The "On it" bar uses status pills.
- **Chat** uses the same quiet starters, and its box has the same look as the
  shared composer.
- **Projects** is one list: your projects first, then every repository you
  can reach. Ideas and the NexoraGuru guide are tabs.
- **Models** is a sortable table. Models that aren't in the catalogue show
  "Unrated", never a made-up score. Health is a tab.
- **Keys & limits** has one primary button and one line of totals. Every
  key's limits and usage are unchanged.
- **Spend** has Overview, Budgets and Savings tabs, with the new charts.
- **Settings** has theme, density, motion (follows the device) and
  shortcuts.
- **Decoration removed**: honeycomb backgrounds, glow blobs, gradient text and
  pulsing orbs. Each page has one primary button.

## Old addresses

Every old URL redirects to its new home, and keeps its query string and hash.

| Old | New |
|---|---|
| `/hive/repos` | `/hive/projects` |
| `/hive/launchpad`, `/hive/launchpad/:id` | `/hive/projects/ideas`, `/hive/projects/ideas/:id` |
| `/hive/nexora` | `/hive/projects/guide` |
| `/hive/dispatch` | `/hive/copilot?mode=team` |
| `/hive/automations` | `/hive/pipelines/schedules` |
| `/hive/health` | `/hive/models/health` |
| `/hive/toolbox`, `/hive/plugins`, `/hive/memory` | `/hive/extensions`, `/hive/extensions/plugins`, `/hive/extensions/memory` |
| `/hive/usage`, `/hive/budgets`, `/hive/steward` | `/hive/spend`, `/hive/spend/budgets`, `/hive/spend/savings` |

## How it was checked

All of these ran against the demo server (`node scripts/hive-demo.js`) in
Chromium.

- **Redirects**: all 13 old addresses land on their new pages, including a
  query string and a hash.
- **Accessibility**: axe-core with the WCAG 2.0, 2.1 and 2.2 A/AA rules, on
  13 pages, in light and dark.
  - The first run found contrast, target-size, list-role, meter-label,
    aria-label and scroll-focus problems.
  - After the fixes: **0 violations** on every page, in both themes.
- **Keyboard**:
  - Tab reaches the navigation with a visible focus ring.
  - ⌘K opens search, and "alerts" finds the Inbox.
  - ⌘I opens the Copilot and Esc closes it.
- **Responsiveness**: Event Timing during typing, palette, sorting,
  navigation and filtering. The slowest interaction was 152 ms on the
  development build, under the 200 ms goal.
- **Layout**: screenshots at 1440 px and 390 px, light and dark, with no
  horizontal scroll.
- **Tests**: `npm test` (368 passing), `npx tsc -b`, oxlint and
  `npx vite build` on every PR.

Not done here: a Lighthouse run against the live site. Run it on
https://nexoraguru.in/hive after deploying if you want a production score.

## Rules for new Hive screens

- Build from the kit and the site tokens. Don't use raw colours.
- Use one primary button per page.
- Show status with `StatusPill` and its words.
- Use rows for lists and `DataTable` for comparisons.
- Never show raw ids. Turn them into names or links.
- No honeycomb, glow blobs or gradient text. Animation explains something,
  and stops when the device asks for reduced motion.
- Check light and dark, and phone width, before you push.
