# Hive premium UI (v2)

This document records the second Hive redesign. It aims for a Linear/Vercel/Raycast level of polish, with the **project workplace** first:

- the project home, `/hive/p/:id`
- the session, `/hive/p/:id/t/:taskId`

It builds on `docs/ui-changes.md` (v1, PRs #76–#87). The rules in `AGENTS.md` still apply.

## What the references taught us

I studied the references by reading their source code on GitHub. Several product sites (linear.app, langfuse.com, docs.langchain.com, learncursor.dev, blog.replit.com) are blocked by this cloud session's network settings. Those parts rely on the brief and on general knowledge of those products, and are marked "(brief)" below.

| Reference | What we take |
|---|---|
| **vercel/ai-elements** (`packages/elements/src`, read in full for the parts below) | **Tool cards** use one vocabulary of states: Pending → Running → Awaiting approval → Completed / Denied / Error. Each state is an icon plus a word in a small pill. The header is a collapsible trigger (wrench icon, tool name, status, chevron), and the body holds the parameters and the result. **Confirmation** has a title, a request, then accepted or rejected, with actions at the bottom right. **Queue** has collapsible sections with a label and count, and items with an indicator, description and actions. **Commit** shows a mono hash, message, author, time and a copy button. **TestResults** shows a summary, a progress bar, suites and per-test durations. **Task** collapses a group of steps into "Searching…" with file chips. **Checkpoint** is an icon and a trigger on the stream. **Plan** has a header, description, collapsible content and footer actions. The shared rule: progressive disclosure, so collapsed by default when finished and open while live. |
| **openstatus/data-table-filters** (read the component tree) | Cell renderers by data type (badge, number, bar, code, timestamp, level indicator), a column header with a sort menu, an actions bar, live rows and a skeleton row that matches the real rows. We mirror this in the kit's `DataTable`: right-aligned tabular numbers, status as a badge, and skeletons shaped like rows. |
| react-resizable-panels (already a dependency, v4) | `autoSaveId` persists pane sizes per surface. The session gets roster, stream and dock panes this way. |
| Linear, Vercel Geist (brief) | Hairline borders instead of heavy shadows. Radii of 6/12/pill. Negative tracking on titles. One primary action per view. Dense rows with J/K keys. No decoration. |
| Langfuse, Phoenix (brief) | The session timeline as a waterfall, with each span's tokens, cost and time on hover. |
| LangChain human-in-the-loop (brief) | Inline approval cards (command, Approve / Deny / Edit) mirrored in one queue (the Inbox), and lasting across restarts. |
| GitButler, GitHub "Files changed" (brief) | The Ship panel as a vertical stepper: commit → branch → PR → CI → merge → deploy. Diffs grouped by folder with +/− counts. |

## Decisions made in PR 1 (foundations)

- **hive.css**
  - Deleted the dead and decorative CSS: honeycomb backdrop, gradient text, the hexagon clip-path, the pop animation, the unused prose, panel and ring classes, the typewriter, and the bell wiggle.
  - Merged the override block that sat at the bottom of the file into the original rules.
  - Removed the gradient wash behind the main area.
  - Cards no longer lift on hover (border and elevation change only).
  - The composer uses `--elev-1` instead of a 60 px drop shadow.
- **Skeletons** pulse in opacity (`hive-pulse`). The sweeping sheen is gone. "Thinking…" labels pulse instead of using gradient text.
- **Reduced motion** stops every Hive animation and transition.
- **Hexagon swatches** (`hive-hex`, 12 files) are now round dots.
- **Chart tokens** `--chart-1..5` are added to the theme (`index.css` semantic roles). They are derived from each palette's own accent, info, success, warning and danger colours, so every palette, mode and accent gets a matching set. Budgets uses them.
- **Type scale tokens** in `kit.css`: 12 / 12.5 / 13.5 / 14 / 17 / 26 px.
- **New kit pieces**:
  - `PageHead`: 26 px title, one line under it and one primary action; stacks on phones.
  - `SectionLabel`: a 10.5 px uppercase label.
  - `OverflowTabs`: tabs that never scroll. Tabs that don't fit go into a "More" menu, and the active tab always stays visible. This is for the session dock.
  - All of them appear in the `/hive/dev/ui` gallery.

## Still to do (one PR each)

2. Shell: palette rows and context, shortcut overlay, approval cards, mobile sheets.
3. Project home: header, Pulse, sessions as a table with filters, the composer.
4. Session layout: persisted resizable panes, a one-row header, the roster, mobile sheets.
5. Stream: group reads ("Read N files"), tool, approval and result cards following ai-elements, and diff chips that open Changes.
6. Dock: Changes (Monaco inline diff), Files, Ship stepper, Terminal, Board, Checkpoints.
7. Flatten TeamFloor, WorkMap, LiveCode and LiveWall.
8. Unify the composer and `StatusPill`.
9. Page sweep.
10. Final check (axe, keyboard, INP, Lighthouse) and before/after screenshots.

New dependencies (vaul, cmdk, xterm, dnd-kit, nuqs, react-dropzone, TanStack Virtual) are added only in the PR that needs them. Each will be checked for size and lazy-loaded.
