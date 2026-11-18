# Nexora — guide for every AI agent

Read this before working in this repository. It is the shared context for every
model that works here: Claude Code, Codex, Mistral Vibe, and every model Hive
runs (its agents, its Copilot and its project chats). Keep it current: when you
learn something every future agent needs, add it here in the same pull request.

## What Nexora is

**NexoraGuru** (live at https://nexoraguru.in) is an end-to-end computer-science
learning platform for Indian students. Every idea is animated step by step.

- **Learn**: deep, animated courses. The DSA course is the flagship. It has
  derivations and proofs, many advanced animations, lots of problems with
  detailed editorials, and solutions in C++, Java, Python, JavaScript and C.
- **GATE CSE**: past papers (PYQs) with verified solutions and figures, notes,
  practice, timed tests in an exam console, a spaced-repetition review queue,
  daily questions and leaderboards.
- **Nexus**: a map of 60+ CS subjects as radial "Rift Trees" of nodes. Mastery
  is computed on the server from lessons finished and questions solved.
- **Practice/Judge**: problems from Codeforces, CodeChef, AtCoder, LeetCode,
  SPOJ and Project Euler, judged in 30+ languages, with XP, streaks and the
  11-tier Rift levels from Bit to ∞ Overflow.
- **Hive** (`/hive`, staff only): the team's multi-agent AI workspace, used to
  build Nexora itself. See [Hive](#hive) below.

## How the owner wants work done

The owner is the founder. These preferences come from many sessions. Follow them.

- **Quality first, always.** Never ship half-done work. Finish one topic or
  feature fully before starting the next. Saving tokens must never lower quality.
- **UI matters most.** Everything should look and feel like the Nexora site:
  clean, structured, easy to find, with good animation. No clutter. Nothing
  should need hunting through menus to find. Simple, but every advanced
  feature stays.
- **Free where possible.** Prefer free and open models, free tiers and free
  hosting. Don't propose paid services unless there is no free option of
  equal quality, and say so plainly when there isn't one.
- **Be honest.** If something can't be done, is against a provider's terms, or
  costs money, say so directly and give the legitimate alternative. Do not
  promise "unlimited" or "free forever" when it isn't.
- **Explain simply.** The owner often works from a phone or between classes.
  Give step-by-step instructions with exact clicks and commands, short
  sentences, and no jargon. Ask for a screenshot when something on their side
  is unclear.
- **Automate.** The owner wants agents to keep working (overnight, across
  model limits) and the Copilot to handle things end to end.

## Rules that are never broken

- **Never commit to `main`.** Work on a branch, open a pull request, wait for
  green CI, then squash-merge. **Merging to `main` deploys the live site**:
  Render (`render.yaml`, service `nexora`) deploys `main` once CI passes. The
  "Deploy API (Oracle)" workflow is unused; it skips itself because no Oracle
  server is set up. Hive's always-on worker machines are separate (AWS).
- No force-pushes. No rewriting someone else's history.
- Never commit secrets (`.env`, keys, tokens). Never send the owner's or users'
  personal data (emails, names) to outside services.
- Don't put model names or ids in commit messages, PR titles or code comments.
- Never skip, disable or delete a test to get CI green. Fix the cause.
- The Hive Copilot's permission to merge is an admin-only switch and is **off
  by default**. Don't turn it on yourself.
- Several free accounts per person at one provider, or sharing one person's
  plan across many people, breaks providers' terms. Don't build or suggest it.
  Each staff member can add their own keys, and paid plans can be connected
  one per account.

## Stack and layout

- **Server**: Node.js + Express (`src/server.js` plus routers in `src/routes/`),
  SQLite/libSQL (Turso in production), socket.io.
- **Client**: React 19 + Vite + TypeScript + Tailwind CSS 4, framer-motion,
  lucide icons (`client/`).

| Path | What's there |
|---|---|
| `src/routes/` | API routers (auth, learn, gate, gate-me, gate-notes, hive, hive-v4, hive-ops, admin, social, …) |
| `src/gate/` | GATE grading, spaced-repetition review, figures |
| `src/nexus/` | Nexus subjects, mastery and per-user cache (`invalidateNexusUser` on every progress write) |
| `src/learn/` | Learn problems (`src/learn/problems/<topic>.json`) |
| `src/hive/` | Hive: agents, router, keys, Copilot, Dispatcher, Drive, health, providers |
| `client/src/pages/` | Site pages; `client/src/hive/` is the Hive app |
| `client/src/learn/` | Learn engine and course content (`AUTHORING.md` explains it) |
| `client/src/viz/` | Animation player and scene schema |
| `content/nexus/` | One JSON file per subject, plus streams, routes and hubs |
| `content/gate-notes/`, `GATE_PYQ/`, `public/gate-fig/` | GATE notes, past papers and figures |
| `scripts/learn/` | Problem and solution build/verify pipeline |
| `bridge/` | Hive bridge (runs Claude Code / Codex / Vibe on a worker machine) |
| `deploy/` | Deploy configs; `deploy/model-farm/` serves open models on a GPU |
| `docs/` | `docs/hive/GUIDE.md`, `docs/gate/*`, `docs/ui/*`, `docs/ops/*` |
| `tests/` | Server tests (`node --test`) |

## Commands

```bash
npm install && npm install --prefix client   # install
npm run dev                                   # API on :3000 (watch mode)
npm run client:dev                            # client (Vite)
npm test                                      # all server tests — must pass
cd client && npx tsc -b                       # typecheck — must pass
cd client && npx oxlint src                   # lint
cd client && npx vite build                   # production build
npm run notes:check                           # GATE notes integrity
npm run nexus:check                           # Nexus subject files
node scripts/hive-demo.js                     # Hive demo with mock providers (login owner / owner123)
```

Learn problems:

```bash
python3 scripts/learn/build.py --strict <topic>    # writes src/learn/problems/<topic>.json
python3 scripts/learn/verify.py <topic> -j 4       # runs every solution on every test
node client/scripts/check-learn.mjs <topic>        # content integrity
```

Before pushing, run the tests, the typecheck and the build for the parts you
changed.

## Design and UI conventions

- Use the site's design tokens, not raw colours: `bg-bg-app`, `bg-bg-surface`,
  `text-text-primary`, `text-text-secondary`, `text-text-muted`,
  `accent-brand`, `state-success`, `state-warning`, `state-error` and
  `state-info`.
- Light and dark themes must both work. Respect `prefers-reduced-motion`.
  Layouts must work at phone width with no horizontal scroll.
- Hive screens are built from the Hive kit (`client/src/hive/kit/`):
  - `--hv-*` tokens
  - `StatusPill`, `Row`/`RowList`, `DataTable`, `SegmentedControl`,
    `Composer`, `StackedBars`/`Sparkline`, `Empty`
  - a plain page header (title plus one short line)
  - one primary button per page
  - no raw ids shown to people

  No hexagons, honeycomb patterns, glow blobs or gradient text.
  `docs/ui-changes.md` has the full rules, the old-URL redirects and how the
  redesign was checked (axe with 0 violations, keyboard, responsiveness).
- Animations explain an idea. They are never decoration only.
- **Premium look, site-wide (2026).** See `docs/ui/premium.md`:
  - The NexoraGuru mark is "One line": the N and G written by hand in one
    line of ink with a shared stem, and a clay full stop where the pen stops
    (`MARK_N`, `MARK_G`, `MARK_DOT` and `markSvg` in
    `client/src/components/brand/traversal.ts`). The ink takes the text colour;
    the full stop is clay. It is drawn to be animated: `LogoMark interactive`
    writes it once (top bar, landing, sign-in), `LogoMark write` writes it on
    mount, and `MarkLoader` keeps writing it (the page loader); the boot screen
    in `client/index.html` writes it in plain CSS. Don't add gradients, glows
    or extra colours. Regenerate the files with
    `node scripts/brand/build-brand.mjs && node scripts/brand/render-brand.mjs`.
  - No gradient text, no coloured glow blobs or "light pools", no neon
    `shadow-[0_0_…]` glows, no rainbow gradients on bars or buttons.
  - Colour means something: the accent is for the primary action and the
    current item; success, warning and error are for state. Icons default to
    the "quiet" container (a neutral tile and a grey glyph).
  - Marketing pages (landing, sign-in) use a solid ink primary button (white
    on dark, black on light). Inside the app, primary buttons use the accent.
  - Back buttons use `BackButton` with no props. It goes to the page you came
    from in this tab, else one level up, and its label names the place.
- **Ten themes (Appearance page, `/theme`).** A look is one of ten themes
  (`client/src/theme/styles.ts`): Field Journal (default), Sakura, Arcade,
  Greenhouse, Observatory, Blueprint, Sketchbook, Block Print, Terminal and
  Clear. Each brings its own palette (light and dark), type, shapes, icons and
  drawn pattern. On top of any theme people can choose (Appearance → Make it
  yours, look v6): an accent colour (`ACCENTS`) and a text ink (`INKS`) in
  `theme/palettes.ts`, each checked for contrast on all ten themes by
  `tests/theme-contrast.test.js`; interface, heading and reading faces
  (`theme/fonts.ts`); corners and drawings (`theme/personal.css`); text size,
  code font and solution handwriting; and the Dock (position, size, names,
  bar, `components/layout/dockStore.ts`). 'theme' means the theme's own. The
  top-bar theme menu is `components/look/LookPopover.tsx`. All themes dress the same page kit, so build pages with
  the kit (`ed-*` classes, `data-ui` hooks, tokens) and they work in every
  theme. Theme rules live in `theme/themes.css`; see `docs/ui/premium.md`
  ("Adding a theme"). Admins can set the default theme (Admin → Site).
- **Landing and sign-in** (`pages/LandingPage.tsx`, `pages/AuthPage.tsx`) use the
  editorial "field journal" look (owner's choice, 2026-11): parchment and ivory
  paper, Newsreader serif for prose, Geist for controls, hairlines instead of
  shadows, one clay button (bottom-only radius) for the main action. Tokens are
  `--ed-*` in `styles/journal.css` (scope `.lp` / `.ed`), light and dark.
- **Field Journal is the house style and the default** (rollout in phases,
  2026-11). It carries the landing look into the app: `journal` style +
  `parchment` palette, the shared `ed-*` classes in `styles/journal.css`, kit
  and shell rules under `[data-kit='journal']` in `theme/styles.css` (every
  theme sets `data-kit="journal"`; to branch in code use `isJournalKit()`).
  Clay is never text; one clay action per screen; no shadows, glows or
  gradients. Hive keeps its old look (`hiveLook` in `theme/look.ts`). See
  `docs/ui/field-journal.md`. Every animation there is a real lesson (binary search, round-robin,
  BFS) or shows real numbers. Copy stays true to the site: no invented stats.
- **Notes and lessons** share one reader (`styles/reader.css`): a lesson list on
  the left and "On this page" on the right, each folding to a slim strip (the
  shared `components/reader/panels.ts`, keys `[` and `]`), and one reading
  column in between that grows with the window and when a panel folds
  (`--nr-col` in `theme/styles.css`; figures, animations and code break out
  to `--nr-wide`). Reading pages use the whole window (`isReaderRoute`), with
  no GATE frame and no Dock. GATE notes and DSA lessons both use it, and a
  skill with written notes opens them here (the skill card is `?card=1`).
- **Search** uses one field style, the "ledger line" (`styles/search.css`,
  `SearchInput`, `SearchCombobox`; `variant="bar"` is the top bar's pill): a
  hairline, an italic serif hint, an ink line drawn on focus. Keep text around
  search bars to a minimum. Lessons, subjects and skills are found through one
  index, `lib/lessonSearch.ts` (top bar, ⌘K palette, `LessonFinder` on Learn).
- **Subject pages** (`/learn/<subject>`) open on **Lessons** (`SubjectBook.tsx`:
  the GATE notes or DSA chapters, each one click from the reader, never locked);
  Skills, Skill tree, Plan and Leaderboard are tabs. Link to a subject's home,
  not to `/gate/notes/<id>` or `/learn?tab=dsa` (that one redirects).
- **AI models** are chosen in Admin → AI models (`src/ai/settings.js`): any
  OpenAI-compatible provider, keys sealed at rest, a model per slot and per
  feature. The GROQ_* environment applies when nothing is chosen.

## Content authoring

- **Learn**: algorithms are written with `trace()`/`Tracer`, using
  `t.step(stepId, note, vars)`, and code lines are tagged `// @step`. Views are
  array, list, tree, graph, hash, grid, stack, queue and meter. Every
  editorial needs the headings `## Intuition`, `## Approach` and
  `## Complexity`; `## Why it works` and `## Pitfalls` are encouraged. Every
  problem has solutions in all five languages. See `client/src/learn/AUTHORING.md`.
- **GATE**: see `docs/gate/AUTHORING_QUICK.md` and `docs/gate/SOLUTION_AUTHORING.md`.
  Check every solution against the official paper.
- In TypeScript template strings, escape math backslashes (`\\infty`).

## Hive

Hive is the staff-only multi-agent workspace at `/hive`. The full guide is
`docs/hive/GUIDE.md`, and what has been built is in `docs/hive/HISTORY.md`.

- **Copilot**: the owner's chief of staff. Claude (on the owner's plan) leads:
  it plans, starts sessions, gives work to the right agents, checks the
  results and reports back. It can do anything the owner can do in Hive
  through its tools. "Save Claude tokens" is on by default: other models do the
  work, and a reviewer from a different model family checks it. Claude-only
  areas (signature UI, shaders, architecture, final review) always go to Claude.
- **Agents**: Claude Code, Codex and Mistral Vibe run on the always-on worker
  machine `hive-worker` (AWS EC2) through the bridge, on the owner's plans.
  API models are added as keys under Keys & limits: free sources, OpenRouter,
  Groq, Gemini, the GPU farm, OneAIAPIKey and more. Only models that answered a
  real test call are offered.
- **Router**: picks the best model per kind of work, with quality first.
  Hard engineering needs a high bar (normally Claude). Measured speed decides
  between models of similar quality.
- **Projects**: any GitHub repo, opened as a project with a brief written from
  its code. Each project has its own chat. Machine agents get the repo cloned
  onto their machine automatically.
- **Context**: this file is given to every agent and every project chat. Shared
  project memory (Hive → Memory) holds facts the team adds over time.

## Where things stand

- Done: the landing and login redesign; the DSA course chapters published so
  far; the GATE platform (practice, review, tests, notes, figures); Nexus;
  Hive with the Copilot, Dispatcher, Judge, pipelines, automations, Drive,
  health checks, budgets, subscriptions (Claude Code, Codex, Vibe), per-project
  chat and the model farm.
- **AI courses (planned, not built):** the plan, agent rules, notation, the
  200-topic curriculum and the verified sources are in `docs/ai-courses/`
  (start with its README). Any agent working on AI content follows
  `docs/ai-courses/AGENT_RULES.md`.
- Ideas not built yet:
  - Fine-tuned Nexora models trained on our own data (GATE solutions,
    animation scenes).
  - A Modal or Kaggle version of the model farm.
  - More DSA chapters to the same depth as the finished ones.
