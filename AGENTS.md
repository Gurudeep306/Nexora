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
  once CI passes, the "Deploy site" workflow ships it to the server in India
  (an Azure VM; the database is Turso in Mumbai). See `docs/deploy/SERVER.md`.
  Render is suspended. Hive's always-on worker machines are separate (AWS).
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
| `src/db.js`, `src/db-stores.js` | Database layer. Tables are split into stores (core, hive, files, cache, logs), each optionally its own database; no statement may touch two stores (`docs/ops/DATA_SPLIT.md`) |
| `src/nexus/` | Nexus subjects, mastery and per-user cache (`invalidateNexusUser` on every progress write) |
| `src/learn/` | Learn problems (`src/learn/problems/<topic>.json`) |
| `src/hive/` | Hive: agents, router, keys, Copilot, Dispatcher, Drive, health, providers |
| `client/src/pages/` | Site pages; `client/src/hive/` is the Hive app |
| `client/src/learn/` | Learn engine and course content (`AUTHORING.md` explains it) |
| `client/src/viz/` | Animation player and scene schema |
| `content/nexus/` | One JSON file per subject, plus streams, routes and hubs |
| `content/gate-notes/`, `public/gate-fig/` | GATE notes and figures. The past-paper PDFs and third-party reference notes are in the private repo `Gurudeep306/Materials` (clone it next to this one; the GATE scripts find it there or via `GATE_PYQ_DIR`) |
| `scripts/learn/` | Problem and solution build/verify pipeline |
| `bridge/` | Hive bridge (runs Claude Code / Codex / Vibe on a worker machine) |
| `deploy/` | Deploy configs; `deploy/model-farm/` serves open models on a GPU; `deploy/coder-model/` runs NexoraGuru's own small coding model on a free Oracle server (the Solve page's AI tests); `deploy/voice-server/` runs its own free Indian voices there (HeadTTS + Kokoro, exact lip shapes for the virtual teacher) |
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

Server tests that start their own server get a free port from
`tests/helpers/free-port.js` (`await freePort()`); never pick a random port
from a range, since test files run in parallel and a clash fails the run.

## Design and UI conventions

- Use the site's design tokens, not raw colours: `bg-bg-app`, `bg-bg-surface`,
  `text-text-primary`, `text-text-secondary`, `text-text-muted`,
  `accent-brand`, `state-success`, `state-warning`, `state-error` and
  `state-info`.
- Light and dark themes must both work. Respect `prefers-reduced-motion`.
  Layouts must work at phone width with no horizontal scroll.
- Hive screens are built from the Hive kit (`client/src/hive/kit/`) on the
  site's own theme ("the desk", `docs/ui/hive-desk.md`; mark and boot screen
  in `hive/HiveLogo.tsx` and `hive/HiveBoot.tsx`):
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
- **Twelve themes (Appearance page, `/theme`).** A look is one of twelve themes
  (`client/src/theme/styles.ts`): Himalaya (default), Aurora, Sakura, Thar,
  Warli, Reef, Bauhaus, Arcade, Blueprint, Kerala, Cosmos and Ghats (owner's
  choice, 2026-11: no plain or basic themes). Each brings its own palette
  (light and dark), type, shapes, icons and a drawn, gently animated scene
  (`components/look/ThemeScene.tsx`, shapes in `sceneArt.ts`, colours in
  `theme-scene.css`): a fixed sky behind the window and a landscape band
  across the top of each page, kept calm on the left where titles sit, and
  off on reading and solving pages. Retired themes migrate in `look.ts`. On top of any theme people can choose (Appearance → Make it
  yours, look v6): an accent colour (`ACCENTS`) and a text ink (`INKS`) in
  `theme/palettes.ts`, each checked for contrast on all twelve themes by
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
- **The Field Journal kit** carries the landing look into the app (the
  Field Journal *theme* itself was retired in 2026-11; Himalaya is now the
  default): the shared `ed-*` classes in `styles/journal.css`, kit
  and shell rules under `[data-kit='journal']` in `theme/styles.css` (every
  theme sets `data-kit="journal"`; to branch in code use `isJournalKit()`).
  Clay is never text; one clay action per screen; no shadows, glows or
  gradients. Hive wears the same look, dressed as "the desk" for a work tool
  (`docs/ui/hive-desk.md`). See `docs/ui/field-journal.md`. Every animation there is a real lesson (binary search, round-robin,
  BFS) or shows real numbers. Copy stays true to the site: no invented stats.
- **Notes and lessons** share one reader (`styles/reader.css`): a lesson list on
  the left and "On this page" on the right, each folding to a slim strip (the
  shared `components/reader/panels.ts`, keys `[` and `]`), and one reading
  column in between that grows with the window and when a panel folds
  (`--nr-col` in `theme/styles.css`; figures, animations and code break out
  to `--nr-wide`). Reading pages use the whole window (`isReaderRoute`), with
  no GATE frame and no Dock. GATE notes and DSA lessons both use it, and a
  skill with written notes opens them here (the skill card is `?card=1`).
  Members can highlight and annotate notes lessons (`components/reader/LessonHighlights.tsx`,
  table `gate_notes_highlights`): painted with the CSS Custom Highlight API, so
  the lesson's markup is never touched, and found again by quote plus context
  (`components/reader/anchor.ts`). They are listed in GATE → Notebook → Highlights.
- **Handwritten working** (`src/routes/hand.js`, `components/hand/`, `pages/hand/`):
  under a GATE practice question, members add handwritten solutions from a
  tablet (one-time link/QR to the writing pad `/pad/<token>`), a phone camera
  (`/snap/<token>`) or an upload. The device is not signed in: the token stands
  for one member and one question for 12 hours and can only add solutions,
  so `/pad`, `/snap` and `/api/hand/device/*` pass private mode. Private until
  shared; shared ones show to others only after they answer, most helpful first.
- **Live** (`/live`; server `src/routes/live-rooms.js` and `src/live/*`, client
  `client/src/live/`): study rooms and calls. Video or voice, several screens
  at once, a whiteboard, a tablet joined by QR (`/live/d/<token>`, no sign-in,
  passes private mode), chat, hands, reactions, a waiting room and host
  controls, study tools (the room's question, quick polls, a shared timer, a
  shared code pad kept in step with Yjs); calls ring friends from Messages.
  A poll takes its own column (or a row under the people on narrow screens),
  never covering a tile. **Admin → Live** (`src/live/config.js`,
  `components/admin/LiveSection.tsx`) chooses how media travels: Cloudflare
  Realtime SFU (`client/src/live/cf.ts`; our server passes the browser's
  offers on over the socket with the sealed app token, so it never reaches a
  browser; 1,000 GB a month free), LiveKit (keys there or `LIVEKIT_*`,
  `deploy/livekit/README.md`), or direct (5 devices). Usage is estimated from
  what devices report; over the monthly limit new rooms go direct. In the direct mode the
  newcomer always starts each connection; keep that, or two offers clash and
  Chrome's ICE stalls. `routes/live.js` is the older LiveClass API, unrelated.
- **Explore** (`/explore`, `pages/explore/`): every feature on one page —
  grouped, one plain line each, where it lives and a link straight there,
  with a search box. The list is `pages/explore/features.ts`: when you add a
  feature people should find, add it there too (true names and addresses
  only). It is in the Dock (a default pin; Messages is not pinned, it is a section of Community), at the
  top of the Dock's "…" menu, and in the nav ("Discover").
- **Live lectures** (Live → Start a room or lecture → Live lecture; rooms
  with `kind = 'lecture'`): the host and co-hosts teach; everyone else joins
  as a `viewer` ("Watch the lecture": no camera or mic setup) and can chat,
  react and raise a hand. The server enforces it: a viewer's mic, camera and
  screens are dropped in `signal.js` until the teacher chooses "Let speak"
  (`speaker` event); "Stop" sends them back. Viewers are not on the stage,
  and the top bar counts who is watching. A new lecture opens on the tablet
  QR (`?teach=1`); a lecture's tablet opens its board by itself, so the
  teacher only scans. iPad and Android browsers cannot share their whole
  screen (Apple and Google allow it only in installed apps; Chrome on
  Android has getDisplayMedia but always refuses, so `canShareScreen()`
  checks `tabletKind()`), and recent macOS shows a mirrored iPad as black
  while anything shares the screen. So a tablet that scans Room → Tablet
  opens straight on the **teaching board** (`live/ui/Board.tsx`): pages, PDF
  notes or photos opened as pages (`boardFiles.ts`, pdf.js loaded only then,
  files stay on the device), pen, highlighter, eraser and a fading laser.
  "Other ways" in the panel keeps one-tap whole-screen sharing for laptops
  (`?share=screen`) and the Mac mirroring steps with that warning. Your own
  share is shown to you like everyone else's ("You're presenting", Stop),
  and `live/blank.ts` warns at once when a share sends a black picture. The
  stage fits a shared screen to its real shape; on upright screens the
  people fill the space under it. In direct (mesh) mode, if two offers clash
  ("RTP extension ID reassignment") the link rebuilds itself from the side
  that started it (`mesh.ts`, unstick/rebuild); keep that. Large audiences need the video server (Cloudflare or LiveKit,
  Admin → Live); direct mode holds 5 devices.
- **Messages, alerts and invites**: chats live in Community → Messages
  (`/social?tab=messages`; `/messages` only redirects there). That view fits
  the window exactly (`useFitHeight` in `MessagesTab.tsx`) so only the chat
  scrolls, never the page; on a phone an open chat takes the screen. Each
  Community section and each open chat is a history step, so Back walks back
  through them. The top-bar button opens the **quick chat**
  (`components/social/chat/QuickChat.tsx`, `quick.ts`): a panel beside any
  page on wide screens that stays open while you move around, with "Send
  this page" (the page under it, one tap). Message alerts open it too. Never
  scroll with `scrollIntoView` inside the chat (it moves the page); scroll the
  list itself. New messages pop up on any page like a phone's chat app
  (`components/social/MessageAlerts.tsx`: picture, name, text, quick reply,
  a soft chime; muted chats and the open one stay quiet). Notifications reach
  a device even with the site closed through free Web Push (`src/push.js`,
  `public/sw.js`, `lib/push.ts`; VAPID keys made once and sealed in
  `site_settings`; only people with no tab open get one; code never appears
  in an alert). Calls ring by push too. In a Live room, **Invite**
  (`live/ui/Invite.tsx`, `POST /api/live/rooms/:code/invite`) rings friends
  who are online and messages the join link to the rest; `ShareSheet`
  (`components/share/`) shares any link by WhatsApp, Telegram, email, QR or
  the phone's share sheet. Leaving a room mid-call keeps the call
  (`live/activeCall.ts`, `components/live/OngoingCall.tsx`).
- **Community** (`pages/SocialPage.tsx`, `social-page.css`) is laid out like a
  social app: a side menu on wide screens (profile, sections with badges,
  Live rooms, New post), section chips on a phone; no theme scene behind it
  or Messages.
- **Video explanations** (`src/routes/explain.js`, `client/src/explain/`): under
  GATE questions, notes lessons and DSA lessons, and beside every subtopic
  (h2) of a lesson (`SectionExplain`: an "Explain" mark placed into the
  heading, label drawn by CSS so the heading text stays clean; a side sheet;
  target `<lesson>#<heading id>`), members record an explanation in the
  browser (camera, screen, screen with a face bubble, or the whiteboard with
  an optional face bubble), upload a video file, or explain on an iPad by QR
  (`/explain/pad/<token>`, not signed in, passes private mode: whiteboard +
  mic + face, or the iPad's own Screen Recording picked as a file; the
  computer's studio sees the upload by itself). They
  trim it, mark chapters and upload it in resumable pieces; others watch it,
  mark it helpful or report it (three reports hide it). Files live on the
  server's disk (`EXPLAIN_DIR`, default `data/explain`, git-ignored), never in
  the database; quotas `EXPLAIN_MAX_MB` (300), `EXPLAIN_USER_MB` (2048),
  `EXPLAIN_TOTAL_GB` (8). Trim and chapters are numbers the player honours:
  nothing is re-encoded. On a question, videos wait until it has been tried.
- **Search** uses one field style, the "ledger line" (`styles/search.css`,
  `SearchInput`, `SearchCombobox`; `variant="bar"` is the top bar's pill): a
  hairline, an italic serif hint, an ink line drawn on focus. Keep text around
  search bars to a minimum. Lessons, subjects and skills are found through one
  index, `lib/lessonSearch.ts` (top bar, ⌘K palette, `LessonFinder` on Learn).
- **Subject pages** (`/learn/<subject>`) open on **Lessons** (`SubjectBook.tsx`:
  the GATE notes or DSA chapters, each one click from the reader, never locked);
  Skills, Skill tree, Plan and Leaderboard are tabs. Link to a subject's home,
  not to `/gate/notes/<id>` or `/learn?tab=dsa` (that one redirects).
- **Voice and the Action Graph** (`client/src/voice/`, plan in
  `docs/voice/BLUEPRINT.md`): every site action lives in one registry. A page
  offers its own with `useVoiceAction({ id, title, say: { en, hi }, args, risk,
  run })`; the ⌘K palette, the shortcut sheet and voice commands all read it.
  The mic (top bar) uses the browser's free speech recognition plus the
  rule matcher (`voice/actions/match.ts`, test set
  `docs/voice/tests/commands.json`, ≥ 95%); irreversible actions need a
  spoken or tapped confirm. **Scene Voice** (`voice/scene/`): with an animation
  on screen, the mic drives it — "swap pe ruko", "go to when low equals high",
  "what if sorted", "why did i become 4", "mid kya hai", predict mode. Every
  answer comes from the recorded frames (step ids, notes, vars, pointers),
  never a model (test set `docs/voice/tests/scene.json`). Name steps with the
  event words (`swap`, `cmp`, `found`, `push`, `pop`…) so students can jump to
  them. Keep every control's accessible name containing
  its visible text (`npm run voice:names`). **Guru** (`src/voice/guru.js`,
  `POST /api/voice/guru`): a spoken sentence that is not a command goes to
  the tutor, which follows `docs/voice/GURU_SPEC.md` — hints climb a ladder
  (1–6) while a question is unsolved, the Leak Guard blocks option letters,
  final numbers and code (one stricter retry, then a safe canned hint),
  off-topic and live-exam turns get a rule reply. It walks only free
  providers (Admin → AI models, `features.tutor` first) and fails over; if
  all fail it answers from the verified solution or says it can't, never
  guesses. **Code by voice** (`voice/code/`, lane C, no AI): with a code
  editor in use the mic edits it — "line 12 pe jao", "rename i to j" (skips
  strings, comments and fields), "for loop 0 se n tak" (written in the
  editor's language), "read line 5", "read my code", "undo"; each edit is one
  undo step and is outlined. Test set `docs/voice/tests/code.json`. On the
  Solve page "run" runs and "submit" asks to confirm. **Build mode**
  (`voice/code/build.ts`, `BuildSheet.tsx`, `src/voice/build.js`): "translate
  to python" rewrites the student's own code line for line (bugs kept) any
  time; any other change ("make it iterative") only after the server sees
  Accepted. The result is run on the examples (a translation must print what
  the original prints), retried with the failing case up to 3 times, and
  shown as a diff; nothing enters the editor until "Use this code" (one undo
  step). **Explain-back** (`voice/explain/`, `src/voice/explain.js`, tables
  `voice_explain`, `voice_hint_log`): after Accepted, explain the solution
  aloud or typed and trace one random small test by hand. The trace is
  checked exactly; a free model scores a five-part rubric and every point must
  quote the student's words. Guru stays quiet during it; a pass counts towards
  the DSA Nexus (like one more solve in the problem's skills, once per
  problem) only when no Guru help on that problem in the day before. **Mirror Run**
  (`voice/mirror/`, under every lesson animation, or say "mirror run"): the
  student says an approach, `POST /api/voice/pseudo` writes it as pseudocode
  exactly as said (never fixed), and `pseudo.ts` (a small interpreter, no
  eval) runs it on the lesson's input; `compare.ts` lines it up with the
  lesson's frames by variable values and asks one question at the first
  difference. Typing the steps needs no AI. **Listen** (`components/reader/ReadAloud.tsx`)
  follows the voice word by word (`wordTrack.ts`, CSS highlight `nr-word`)
  and answers "padh ke sunao" / "stop reading". **The exam console** has its
  own mic (`VoiceButton layer="top"`) and voice actions ("B chuno", "answer 42.5" or "minus do point paanch"
  on numerical questions (`voice/actions/number.ts`), "save and next", "question 12", "mark for review"; Guru gives no hints in a test).
  Alt+M opens the top mic anywhere. **Training data** rules are in
  `docs/voice/TRAINING.md`: our solutions and lessons were drafted with AI
  agents, so they are lookup material only, never training data; the
  data script accepts only open-licence teacher models. The voice feature never calls a paid service
  (`tests/voice-zero-spend.test.js`).
- **Voice recognition** (Admin → Voice recognition, `src/voice/stt.js`,
  `components/admin/VoiceSttSection.tsx`, client `voice/capture.ts` used by
  `listenOnce` in `voice/speech.ts`): a chain of speech-to-text services for
  Indian speech (default order Sarvam, Google, ElevenLabs Scribe, Groq Whisper,
  Deepgram, Azure, plus any Whisper-compatible server), each with its free
  limits; the chain moves on at 85% of any limit, after an error (rests) or a
  refused key, and falls back to the browser's own recognition, so nothing is
  charged. "Arrange the order automatically" (on by default) starts from the
  published accuracy order and moves services by real results (answers vs
  failures, reported confidence, speed; `voice_stt_stats`). One entry per
  service; more keys go inside it ("Add another person's key", `extraKeys`),
  each from a different person's own account with their agreement (owner name
  required, unique per service; consent ticked), used in turn by each
  account's own limits. One person's several accounts break the terms. Keys sealed, audio never stored, a fair daily
  share per student.
  The only voice file allowed to reach paid-capable hosts, behind free caps
  (`tests/voice-zero-spend.test.js`). Design: `docs/voice/STEP1_EARS_DESIGN.md`.
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
- **GATE notes subjects** (lessons, animations, Live Labs, PYQ mapping, Nexus
  links) are built with the binding pipeline in `docs/gate/notes-pipeline/`
  (`README.md`, `animations.md`, one file per subject). Digital Logic is the
  bar. The reference notes PDFs are third-party: they live in a private repo,
  never in this one.
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
- **Voice tutor (built through Phase 3; Phases 4–6 planned):** "NexoraGuru Voice" — talk to the
  whole site in English, Hindi and Hinglish, Scene Voice (talk to the
  animations), Mirror Run (your spoken algorithm animated, bugs included), the
  Guru tutor with a code-level Leak Guard, and the founder's AI voice on
  lessons. The blueprint, defaults and phases are in `docs/voice/BLUEPRINT.md`,
  with the research in `docs/voice/research/`. Training data must not come
  from closed models' outputs (their terms forbid it).
- **AI courses (planned, not built):** the plan, agent rules, notation, the
  200-topic curriculum and the verified sources are in `docs/ai-courses/`
  (start with its README). Any agent working on AI content follows
  `docs/ai-courses/AGENT_RULES.md`.
- Ideas not built yet:
  - Fine-tuned Nexora models trained on our own data (GATE solutions,
    animation scenes).
  - A Modal or Kaggle version of the model farm.
  - More DSA chapters to the same depth as the finished ones.
