# Hive: the desk

Hive (`/hive`, admins and the owner only) is the team's working room inside
NexoraGuru. Since 2026-11 it wears the **person's own theme**, like Admin and
every other page, dressed for a tool people sit in all day. The owner's brief:
match the site, clean and professional, no fake animation, nothing cartoonish,
keep every feature.

## The rules

- **Paper, not panels.** The page, the sidebar and the top bar share one
  canvas. Cards are the theme's card surface with one hairline. No shadows,
  glows or gradients anywhere inside Hive (`hive.css` removes them even from
  older markup and from the site's shared `Button`).
- **Type carries the hierarchy.** Page titles, section titles and big figures
  in the theme's display face (`hv-title`, `hv-h2`, `hv-figure`); small spaced
  capitals for labels (`hv-eyebrow`); data in the code face (`hv-mono`); the
  one line under a title in the reading face (`hv-lead`).
- **Colour means something.** The accent (clay in the house style) is for the
  one main action, the current place (the rule beside the current nav item,
  the line under the chosen tab) and "an agent is working". It is never text
  (`.text-accent-brand` reads as ink inside Hive). Success, warning and error
  are for state only.
- **Corners** follow the theme but are capped (`--hv-r-card` ≤ 10px), so
  round themes still look like a precise tool.
- **Motion shows something real**: the mark writing itself while Hive opens,
  a model's reasoning arriving, an agent at work. Everything stops under
  `prefers-reduced-motion`.
- **Honest states.** The loading screen never shows a percentage; it says
  when the server may be waking up. "Thinking" shows only the reasoning a
  model actually shared and the real seconds — never invented phases.

## The pieces

| What | Where |
|---|---|
| Tokens (`--hv-*` mapped onto the site's `--ed-*`) | `client/src/hive/kit/kit.css` |
| The desk layer (type, ledgers, nav, buttons, thinking) | `client/src/hive/hive.css` (component rules in `@layer components`) |
| The mark: an H whose bar runs on into the clay full stop | geometry `components/brand/hiveGeometry.ts`; animated `hive/HiveLogo.tsx` (`draw`, `loop`, `live`); everywhere else on the site `<Icon name="hive" />` (`components/brand/hiveMark.tsx`): the Dock, its More menu, the phone tab bar, the user menu, ⌘K search |
| Boot screen (also the chunk-loading fallback) | `client/src/hive/HiveBoot.tsx`, `client/src/hive/boot.css` |
| Page masthead (area label, title, one line, actions) | `kit/PageHeader.tsx` (`hiveArea()` picks the label) |
| Tabs-style choices | `kit/SegmentedControl.tsx` |
| Status labels (hairline, icon in the state colour) | `kit/StatusPill.tsx` |
| Waiting / Thought (the mark writing itself, live reasoning, "Thought for 12s") | `kit/Thinking.tsx`; a streaming answer ends in a clay full stop (`hive.css`) |
| The Hive bar (replaces the sidebar, 2026-11-18): back to NexoraGuru, the Hive name, system status, New, project in focus, inbox, team, Copilot panel, settings, search; then every section as a tab | `HivePage.tsx` (`HiveBar`, `SystemStatus`, `.hive-tab`) |
| Chat history (each chat, newest first, search) | `pages/ChatPage.tsx` (`ChatHistory`) |
| Copilot panel: docked or floating, draggable | `Copilot.tsx` (`CopilotPanel`) |
| Model picker | `AgentPicker.tsx` |

The mark uses the NG mark's grid, stroke weights and clay
(`components/brand/traversal.ts`), so the two read as one family.

## Reasoning is kept

Chat replies save the reasoning a model shares (`hive_convo_msgs.thinking`,
capped at 20k characters) with `think_ms` and `took_ms`, so a finished answer
shows "Thought for 12s · answered in 14s" and opens to the real text.

## Checking

`node scripts/hive-demo.js` (owner / owner123) and
`client/scripts/check-page.cjs` on every Hive route: axe 0 in light, dark and
phone, no sideways scroll. The demo's mock model streams reasoning, so the
thinking view can be seen end to end.

## The frame (owner's call, 2026-11-18)

Hive is its **own full-window page**, not inside the site's top bar and Dock
(tried and turned down). No sidebar: one Hive bar with tabs keeps it uncrowded.
It wears the person's site theme — its colours and its own heading and
reading faces — and edges are faint (`--hv-border*` are lighter, `--hv-fill`
soft fills replace outlines on chips, labels and secondary buttons).
