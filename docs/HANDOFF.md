# Handoff — continue the owner's current work

Read this first in a new session, then `AGENTS.md` and `CLAUDE.md`.
The exact prompt to start the next session is in `docs/NEXT_SESSION_PROMPT.md`. Keep this
file current: before you stop for any reason (usage limit, end of session,
the owner interrupts), update **"Where it stands"** and **"Next, in order"**
and push it with your work. Short, plain sentences; exact paths.

Finished earlier: the Field Journal UI rollout (`docs/ui/FIELD_JOURNAL_HANDOVER.md`).

## How the owner wants work done

- Highest quality, professional, "never fails in any case". Finish one thing
  fully (tests, light + dark + phone, axe 0) before the next.
- Everything matches the site: Field Journal look, tokens only, no glows or
  gradients, clay only for the one primary action / "you are here" mark.
- Honest always: never show made-up data; say plainly what is not possible
  and build the legitimate version. Never suggest breaking a provider's terms
  (for example several free Oracle accounts for one person).
- Explain simply: short sentences, exact clicks. The owner reads on a phone.
- Only the owner says "merge". Merging deploys the live site.
- The owner often interrupts with new messages: answer briefly, then carry
  on. Commit and push often so nothing is lost (a stop hook also asks for it).

## Branch and PR

- Branch: `claude/fervent-curie-vjgcd8` (this session may push only here).
- PR: https://github.com/Gurudeep306/Nexora/pull/127 — open, CI green on
  every earlier head. Holds all the coding work below. Not merged.
- If a push is refused because the remote holds already-merged history:
  `git merge -s ours origin/claude/fervent-curie-vjgcd8`, then push. Never
  force-push.

## Where it stands (2026-11-16, session 2)

Done and pushed in PR #127:

1. **Judge never blames the student, with backups for every language**
   (`src/remote-exec.js`). Each language has a chain of runners: our own
   Piston servers first, then Wandbox, Compiler Explorer (Godbolt), Kotlin
   Playground, Paiza.io. A busy / silent runner is skipped and rested (30 s,
   doubling to 5 min). Real CE/WA/RE/TLE are never retried. All down →
   "busy, not your code". Self-test: 31 of 36 languages pass in 69 s (was
   14 in 487 s). Elixir and Scheme newly work. Groovy and Nim only have
   Wandbox. Clojure, PowerShell, Tcl have no free runner (shown unavailable).
2. **Our own runners** (`src/piston.js`, `src/runners.js`,
   `deploy/runner/setup.sh`, `docs/ops/fast-judge.md`): any number of
   Piston servers. Add them in **Admin → Code runners**
   (`client/src/components/admin/RunnersSection.tsx`, routes
   `/api/admin/runners*` in `src/routes/admin.js`): address + password,
   tested on save with a real program, password sealed, each runner only
   gets the languages it has, order and on/off switches. Or set
   `PISTON_URL` / `PISTON_TOKEN` (comma lists) on Render. The setup script
   turns any Ubuntu machine (Oracle free / Hetzner / AWS, x86 or ARM) into a
   runner with HTTPS at `<ip>.sslip.io`. The owner will create the machines.
3. **Exact errors**: Kotlin errors and crashes point at the student's own
   line (past the stdin shim); Compiler Explorer C# errors are no longer
   empty; a Julia load error cut off by the sandbox is reported honestly.
4. **Editor help for all 36 languages** (`client/src/lib/langIntel.ts`,
   `langIntelMore.ts`, `CodeEditor.tsx`): completions, parameter hints and
   hover docs for every judge language.
5. **"How it runs"** (Solve page tab; `src/explain-run.js`, `/api/explain-run`,
   `client/src/components/solve/journey/`): five stops — write, read
   (Monaco's real tokens), check (real compiler), translate (real assembly /
   bytecode from Godbolt, each instruction tied to its line, played step by
   step with plain-English notes, optimised vs as written), run. 20
   languages have a real listing; the rest say so honestly. Checked: axe 0 in
   light, dark and full screen. **Not yet checked on a phone.**

In progress — **visual dry run** (the owner's top request). Built and
pushed so far:

- Layer 1, trace: `src/dryrun/python.js` (Python, `sys.settrace`; class
  bodies / comprehensions skipped; `__slots__` objects read; heap sent as
  deltas), `src/dryrun/index.js` (shared parser, `dryRun()`),
  `/api/dryrun` in `src/server.js`. Tests: `tests/dryrun.test.js` (6).
- Layer 2, frames: `client/src/components/solve/dryrun/replay.ts` and
  `toFrames.ts`. Covers, named as in the code: arrays (index pointers incl.
  `j+1`, compare / write / new / gliding swap, sliding-window band l … r),
  strings as characters, sets, tuples, stacks and queues (also of pairs),
  heaps (array + heap tree), union-find (forest of sets), segment trees
  (array + tree), grids / DP tables, adjacency lists and matrices (graph),
  dicts (map, new / changed keys), linked lists (singly, doubly, circular,
  named after `head`), binary trees (named after `root`), N-ary trees and
  tries (edge letters, ● for word ends), graph objects (`neighbors`),
  bitmasks in binary, objects as `P(x=1, y=2)`, call stack with return
  values, variables with "was", output. Tests: `tests/dryrun-frames.test.js`
  (19, run real Python traces through the converter; Node runs the client
  TypeScript directly).
- Layer 3, player: `client/src/learn/engine/FramePlayer.tsx` is now the one
  player (DSA chapters + dry run). `VizPlayer.tsx` = the chapter's input form
  + FramePlayer. New: `map` and `calls` views (`views/MapCalls.tsx`),
  timeline marks above the scrubber (`[` / `]` jump between them), a
  footnote slot, `resetKey`, `autoplay`. **Check DSA chapters in the
  browser after this refactor** (not yet done).
- Solve page UI: `client/src/components/solve/dryrun/DryRunPanel.tsx`,
  a **Dry run** tab and a **Dry run** button next to Run / Submit
  (`client/src/pages/SolvePage.tsx`). Sample picker (every test + custom
  input), "Run again" / "Run my latest code", honest messages for an
  unsupported language, no code, no input, runner busy, program error,
  capped trace. Checked in a browser (bubble sort in Python, light and
  dark): real values, pointers `j` and `j+1`, variables, code line, marks.
- **Known issues to fix first next session:**
  1. axe colour-contrast on the pointer-name chips (`.viz-pointer-name`
     in `client/src/learn/engine/views/ArrayView.tsx`, colours from
     `ptrHue` in `views/stage.ts`). This is in the shared view, so the DSA
     chapters have it too. Fix the colours (text on the chip ≥ 4.5:1 in
     light and dark, all ten themes) and re-run axe.
  2. The Solve page's bottom panel is short; the dry run reads best in
     full screen. Make the Dry run open taller (or offer "open large").
  3. Not yet checked: the dry run on a phone; DSA chapters in dark mode
     and on a phone after the FramePlayer refactor; `learn.css` still has
     a gradient + glow on `.viz-meter-fill` (against the house rules).
- Not built yet: the rest of the Solve-page tidy, other languages,
  Admin → Compilers.

## The visual dry run — full design (build exactly this)

**What the owner asked for:** while a student solves any problem, in any
language, they can watch their own code run on each sample case like the
DSA chapters: an array appears as boxes, values drop in, `i`/`j` ride under
the boxes, swaps slide, the current line is lit, the output grows. It must be
better than the current DSA player, and the DSA chapters must use the same
improved player so the site is uniform. It must never fail silently.

**The owner's words (keep to them):** "work on all types of datastructure
and as best a spossible with proper naming present as per the code i want
the best work here". So: every data structure a student can write gets a
proper picture, and every picture, pointer and card is named exactly as the
variable / field is named in the student's code (the list is "head", not
"linked list"; the window is "l … r").

**Data structures to cover (status in "Where it stands"):** array / list,
string (as characters when indexed), tuple, set, dict / map (Counter,
defaultdict, OrderedDict), stack (append + pop, monotonic stacks too),
queue / deque (BFS, with tuples), heap / priority queue (heapq: array + the
binary-heap tree), 2D grid / matrix / DP table, adjacency list (list or
dict), adjacency matrix, edge list, graph objects (`neighbors`), singly /
doubly / circular linked list, binary tree / BST, N-ary tree (`children`
list), trie (`children` dict, edge letters), union-find (`parent` array as
a forest), segment tree / Fenwick (array + tree), sliding window / two
pointers (a range band between l and r), bitmasks (binary form), the call
stack (recursion, return values), output.

**Pipeline (three layers):**

1. **Trace** (server, per language). The program runs unchanged on the
   normal runners, with a tracer that writes one JSON event per step to
   stderr after the marker `\x1eNXT `. Event format (shared by every
   language, documented at the top of `src/dryrun/index.js`):
   `call` (function, call id, depth, params), `line` (line that just ran,
   changed variables, gone names, changed heap objects, output length),
   `ret` (return value), `exc` (error at a line), `cap` (step limit hit —
   the program still finishes). Values: scalars, `{t:'list'|'tuple'|'set'|'deque',n,i}`,
   `{t:'dict',n,k}`, `{t:'ref',id}` into the heap `h`, `{t:'big'|'num'|'str',s}`.
   Limits: 3000 events, 1.5 MB, lists capped at 80 items, strings 300 chars.
   - Python: done (`sys.settrace`; class bodies and comprehensions skipped;
     call ids from a counter; heap sent as deltas).
   - JavaScript / TypeScript: plan — instrument with a parser and run on the
     same runners (or in a browser Web Worker), same events.
   - C++, C, Java, Go, Rust, C#, Kotlin, Swift…: plan — parse the student's
     code with tree-sitter (web-tree-sitter, wasm grammars, runs in Node),
     insert after each statement a call that prints the in-scope variables
     as one event (a small per-language helper prints vectors, maps, sets,
     strings, arrays with known size, structs). Run the instrumented copy on
     the normal runners. Same events, so nothing else changes.
   - Functional languages (Haskell, Lisp, OCaml): show calls and values, no
     boxes; say so on screen.
2. **Frames** (client, `client/src/components/solve/dryrun/`, to write):
   replay the events into snapshots (call stack, each call's variables, the
   heap, output so far), then turn each snapshot into a learn-engine
   `Frame` (`client/src/learn/engine/types.ts`):
   - list of scalars → `array` (index pointers = int variables that appear
     inside `name[...]` in the source, also `i+1` style; roles: `write` for
     a changed cell, `new` for an added one, `swap` when two cells
     exchange — cell ids follow values so the swap glides; `compare` /
     `active` for cells indexed on the line that just ran);
   - list used with `append` + `pop()` → `stack`; `deque` / `popleft` /
     `pop(0)` → `queue`;
   - list of lists → `grid` (`dp[i][j]` lit), or `graph` when it is an
     adjacency list (name like adj/graph/g, or values are node indexes);
   - dict → `map` (new view); set → `array` labelled "set";
   - objects with `next` → `list` (pointers = variables holding a node);
     with `left`/`right` → binary `tree`;
   - scalars → `vars` with "was …";
   - call stack → `calls` (new view); output → `output`;
   - note per step: "Line 5: s += x — s 4 → 9", "Call fib(n=3)",
     "fib returns 2", "Error on line 7: …".
3. **Player** (shared): extract the chrome of
   `client/src/learn/engine/VizPlayer.tsx` (stage, note, legend, controls,
   scrubber, speeds, step log, full screen, keyboard) into one
   `FramePlayer`, used by the DSA chapters (VizPlayer = input form +
   FramePlayer) and by the dry run (sample picker + FramePlayer). Upgrades
   go into the shared player so both improve: timeline marks for calls /
   errors / output on the scrubber, the new `map` and `calls` views. The
   DSA chapters must look and work as before or better — check several
   chapters in the browser after the refactor.

**Never fails:** every failure shows a plain reason and a way forward:
language not traced yet → say which languages are; the trace capped →
"showing the first 3000 steps; the program still finished"; the program
errors → the animation stops on the error line with the real message;
runner busy → the judge's own "busy, not your code" message and a retry
button; huge arrays → first 80 boxes with "80 of N".

**Where it appears:** a **Dry run** button next to Run and Submit on the
Solve page, opening the dry run on the selected sample (sample picker
inside). "How it runs" becomes a second view inside it ("Under the hood").

## Next, in order

1. (done) map / calls views. 2. (done) replay + toFrames.
3. (done in code) FramePlayer; still to check DSA chapters in a browser.
4. (done) `DryRunPanel.tsx`. Still to do: fix the "Known issues" above,
   then check in a browser bubble sort, two pointers, a stack, a dict
   count, recursion (fib), a linked list, a BFS on an adjacency list, a 2D
   DP, a heap, a trie — light, dark, phone, axe 0.
5. Solve page redesign (section "Solve page redesign — every button in its
   best place").
6. Dry run for C++, Java, C, JavaScript (tree-sitter instrumentation),
   then Go, Rust, C#, Kotlin, Swift and the rest.
7. Admin → Compilers (see below).
8. Then the older requests, in full detail in "Older requests": A (the
   unfinished compiler/editor items, coding analysis, +XP), B problem
   pipeline, C staff problem editor, D social, E contests, F linked
   platforms.

### Solve page redesign — every button in its best place (owner's request)

**The owner's words (keep to them):** "i want the buttons not everything at
the bottom part i want it to uniquely place all buttons and remove all
unnecessary features … by analyzing what to place where to make it look the
best and show case best … all buttons not just dry run".

**What is there today (counted 2026-11-16)** — too much, much of it twice:
- Top bar: layout menu, full-screen arena, language picker, an "AI tools"
  menu (Fix my code, Analyse my code, See how it runs, Generate tests, Ask
  the assistant, Inline suggestions), Dry run, Run, Submit.
- Editor toolbar (15): editor theme, font −/+, word wrap, minimap, Vim,
  snippets, template, copy, download, undo, redo, keyboard shortcuts, focus.
- Editor status bar: Ln/Col, language, indent width, line/char count,
  session timer, wrap state, issue count, saved state, theme name.
- Bottom panel, 8 tabs: Tests, Result, Dry run, AI tests, Analysis, How it
  runs, Coach, Issues. Three of these are also in the AI menu.
- Problem panel: Description / Submissions, examples with copy and "Add to
  tests", translate bar.

**The plan — each control lives where it is used, nothing appears twice:**

1. **Top bar = the three actions on the code, nothing else.**
   Left: problem title + difficulty. Right, in this order:
   language picker · **Dry run** · **Run** · **Submit** (the only clay
   button) · one "⋯" (layout, full-screen arena, shortcuts, reset layout).
   The AI menu goes away from here (see 4).
2. **Actions on a sample sit on the sample.** In the Problem panel, each
   example gets two small inline actions beside its copy button: "Run this"
   and "Dry run this" (they select that case and act). "Add to tests"
   stays. This is the unique placement: you act on the case you are reading.
3. **The editor header is slim.** File chip (`main.py`, with the saved dot)
   on the left; on the right only: Format, Snippets, Reset to template, and
   "⋯ Editor settings" (theme, font size, wrap, minimap, Vim, indent, inline
   AI suggestions, copy, download, shortcuts). Remove the Undo / Redo
   buttons (Ctrl+Z / Ctrl+Y stay), the session timer, the char count, the
   theme name and the wrap label from the status bar. Status bar keeps
   Ln/Col, language and the issue count — clicking the count jumps to the
   first error and opens Result.
4. **AI help in one place.** One "Help" button at the top right of the
   editor (or the existing ⌘J assistant) opens one drawer with: Hint, Fix my
   code, Explain my error (only when there is one), Ask. "Analyse my code",
   "See how it runs" and "Generate tests" move into the tabs they open (not
   menu items).
5. **Results panel: 4 tabs, each with its own tools inside.**
   - **Tests** — the cases, the custom input, "Paste many tests",
     "Generate tests with AI".
   - **Result** — run / judge results; compile errors with the plain-
     English explanation and line links (the old Issues tab folds in).
   - **Dry run** — the visual dry run; a switch "Under the hood" shows the
     How-it-runs view (tokens, compiler, assembly / bytecode).
   - **Coach** — hints and issues found, plus Analysis (complexity, what
     to improve).
6. **Phone:** Problem / Code / Results tabs at the top (as now) and a
   sticky bottom action bar with Dry run · Run · Submit within thumb reach.
7. **Keys:** Ctrl/⌘+Enter Run, Ctrl/⌘+Shift+Enter Submit, Alt+D Dry run;
   list them in "⋯ → Shortcuts".
8. **Nothing is lost:** every advanced feature stays reachable (AGENTS.md:
   "simple, but every advanced feature stays"); only duplicates and noise
   go. Check: axe 0, light / dark / phone, no sideways scroll at 360 px, and
   every old feature can still be reached in at most two clicks.

### Admin → Compilers (approved)

One list of every code-running service with its health and the compilers it
offers: Wandbox, Compiler Explorer, Paiza.io, Kotlin Playground, our own
runners, and key-based services whose terms allow it (check each first:
self-hosted Judge0, JDoodle free tier, Glot.io, Coliru for C++). Admins add
keys (sealed like AI keys). Every few hours the server fetches each
service's compiler list (`/api/list.json`, `/api/compilers`,
`/api/v2/runtimes`, …), tests them, and updates the per-language chain by
itself; new versions appear without code changes; broken ones are skipped.
Per-language view of the chain, on/off per service.

## Older requests (from the owner's first brief, 2026-11-16) — still to do

These are the owner's earlier asks. They are not forgotten; do them after
the dry run, the Solve page redesign and Admin → Compilers, each as its own
finished, tested PR. "Add as many features to each as possible."

**A. Compiler and editor — the parts not finished yet**
- Plain-English error explanations: rewrite `client/src/lib/diagnostics.ts`
  against the real error formats from every runner (collected this session:
  gcc/clang `<source>:L:C`, javac `Main.java:L:`, Go `./prog.go:L:C`, Rust
  `--> file:L:C`, C#/TypeScript/F# `file(L,C):`, D/Nim/Pascal `file(L)`,
  Python `File "…", line L`, Ruby `file:L:`, PHP `on line L`, Perl
  `at file line L`, Lua `file:L:`, OCaml `File "…", line L, characters`,
  Crystal `In file:L:C`, Groovy `@ line L, column C`, Scheme `at line L`,
  Node `file:L` + `(file:L:C)` frames, Java/Kotlin `(File.java:L)` frames).
  Accept only the student's own file names (`<source>`, `prog.*`, `Main.*`,
  `main.*`, `example.*`, `File.kt`, `/workspace/Main.*`,
  `/home/wandbox/prog.*`, `arena_*`), never system headers. Add a short
  "What it means" line for common errors (undeclared name, missing `;`,
  unmatched brackets, indentation, type mismatch, index out of range,
  division by zero, null/None, bad number input, reading past the input,
  recursion too deep, missing return, code outside a function, Java public
  class, duplicate name, out of memory). Show it in the marker, the Result
  tab and the status bar.
- Live syntax check while typing for every language: unmatched brackets
  and unterminated strings (comment- and string-aware), Python mixed
  tabs/spaces. JS/TS keep Monaco's own checks.
- Format for every language: JS/TS through Monaco; brace languages
  re-indented by brace depth (strings and comments respected); others:
  trailing spaces and tabs only. Say plainly which languages get a full
  formatter.
- A cheat sheet per language (read a line, read n numbers, fast I/O, print,
  arrays, maps, sort, common mistakes), opened from the editor.
- Playwright test per language: open Solve, pick the language, type, check
  completions, signature help, hover docs and the cheat sheet appear.
- Coding analysis page (`client/src/pages/AnalyticsPage.tsx`, `/api/stats`):
  by difficulty, tag, language, verdict trend, time to solve, weak tags
  with links; plus per-problem analysis.
- Levels: show "+XP" and level progress on Accepted, and explain on the
  Profile how the level is earned (Problem XP is the whole Rift level,
  `calcLevel`; a quarter of the Nexus web rank, `src/nexus/ranks.js`).

**B. Problem pipeline** (`src/sources/*.js`): every source imports the full
statement, all samples, limits, tags, rating and images (saved and served by
us, never hot-linked). An audit script and an Admin page listing gaps per
source and per problem, with a re-import button. Never bypass a site's bot
protection; use official APIs / open datasets (`src/sources/cf-dataset.js`).

**C. Staff-only "Add a coding problem" editor** (uses `src/authz`):
statement with maths and images, samples and hidden tests (paste / upload /
generate), limits, a custom checker, tags, rating, editorial, solutions in
5 languages that are run on the judge against every test before the
problem can be published; preview as a student.

**D. Social** (`src/routes/social.js`, `/api/rooms`, `/api/messages`,
`client/src/components/social/*`): direct messages, groups (create, invite,
roles), typing indicator, read receipts, attachments, reactions, search;
rich share cards for problems, solutions, contests and GATE questions in
chats and the feed.

**E. Contests** (`/api/contests/*` in `src/server.js`,
`client/src/components/contests/*`, `pages/WorkshopPage.tsx`): make a
contest from anywhere (a problem page, a GATE question, a set); choose
questions and timeline; share a link. Contest makers write custom questions
with every feature (coding: statement, samples, hidden tests, limits,
editorial; GATE: MCQ / MSQ / NAT with marks, negative marks, figures,
solutions). Teacher GATE contests: share with students, marks list,
analysis per question / per student / time, export (CSV).

**F. Linked platforms** (`src/accounts.js`): more sites; proof of ownership
by a one-time code the user puts on their profile there; import solves and
achievements. Real OAuth only where it exists (GitHub). Never build a fake
"allow this site" permission screen.

## How to check your work

```bash
npm test                                   # all pass (≈ 480 now)
cd client && npx tsc -b && npx oxlint <touched files> && npx vite build
PORT=3300 node scripts/hive-demo.js        # owner / owner123; serves client/dist
npm i --no-save --prefix /tmp/axe axe-core
node client/scripts/check-page.cjs /route name     # light, dark, phone: axe + overflow
```

- **Reaching the real runners from the demo:** the container needs the
  agent proxy. Make a preload that sets `https-proxy-agent` on every
  `https.request` (CA `/root/.ccr/ca-bundle.crt`), install the agent in a
  scratch folder, and start the demo with
  `NODE_OPTIONS="-r /path/preload.js" PORT=3300 node scripts/hive-demo.js`
  (NODE_OPTIONS so the server child process gets it too).
- **A problem to test the Solve page:** the demo has none. Log in and
  `POST /api/custom-problems {title, statement, samples:[{input,output}]}`,
  then open `/solve/custom/1`. Code is read from localStorage key
  `nexora:code:custom-1:<lang>`; on a phone, open the Results pane first.
- Rebuild the client after every change; restart the demo after server
  changes.
