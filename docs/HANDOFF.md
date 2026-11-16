# Handoff — continue the owner's current work

Read this first in a new session, then `AGENTS.md` and `CLAUDE.md`. Keep this
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

In progress (not committed when this was written — see git status):

6. **Visual dry run** — the owner's top request now. See the full design
   below. Done so far:
   - `src/dryrun/python.js` — Python tracer (sys.settrace), tested.
   - `src/dryrun/index.js` — shared trace parser + `dryRun()`.
   - `/api/dryrun` in `src/server.js`.
   - `tests/dryrun.test.js` — 6 tests, pass.
   - `client/src/learn/engine/types.ts` — new structure kinds `map` and
     `calls` (views not written yet; `StructureView` must handle them or the
     typecheck fails).

## The visual dry run — full design (build exactly this)

**What the owner asked for:** while a student solves any problem, in any
language, they can watch their own code run on each sample case like the
DSA chapters: an array appears as boxes, values drop in, `i`/`j` ride under
the boxes, swaps slide, the current line is lit, the output grows. It must be
better than the current DSA player, and the DSA chapters must use the same
improved player so the site is uniform. It must never fail silently.

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

1. Write the `map` and `calls` views (`client/src/learn/engine/views/`),
   add them to `StructureView`; typecheck.
2. Write `client/src/components/solve/dryrun/replay.ts` and `toFrames.ts`
   (layer 2 above).
3. Extract `FramePlayer` from `VizPlayer.tsx`; VizPlayer keeps working.
4. `DryRunPanel.tsx`: sample picker, calls `/api/dryrun`, plays frames.
   Check bubble sort, two pointers, a stack, a dict count, recursion
   (fib), a linked list, a BFS on an adjacency list, a 2D DP — light,
   dark, phone, axe 0.
5. Solve page tidy (task list in "Owner-approved Solve page changes").
6. Dry run for C++, Java, C, JavaScript (tree-sitter instrumentation),
   then Go, Rust, C#, Kotlin, Swift and the rest.
7. Admin → Compilers (see below).
8. Then the older list: problem pipeline, staff problem editor, social,
   contests, linked platforms (section "Older requests").

### Owner-approved Solve page changes

- A **Dry run** button next to Run and Submit.
- Bottom tabs 7 → 4: Tests (with "Generate tests with AI" inside), Result
  (Issues folded in), Dry run (with "Under the hood"), Coach (Analysis
  inside).
- Editor toolbar: keep Snippets, Format, Template, Full screen visible;
  move theme, font size, wrap, minimap, Vim, copy, download, shortcuts into
  a "⋯ More" menu; drop the Undo / Redo buttons (keys still work); move the
  session timer and character count from the status bar into More.
  Nothing is deleted (AGENTS.md: every advanced feature stays).

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

## Older requests (not started)

- Problem pipeline (`src/sources/*.js`): full statements, all samples,
  images saved locally; audit script + Admin report. Do not bypass bot
  protection.
- Staff-only "Add a coding problem" editor (statement, tests, limits,
  checker, editorial, 5-language solutions run on the judge first).
- Social: DMs, groups, typing, read receipts, attachments, share cards.
- Contests from anywhere; custom coding and GATE questions; teacher GATE
  contests with marks, analysis, export.
- Linked platforms: more sites, ownership proof by a one-time code. Only
  GitHub has real OAuth; never fake a permission screen.
- Coding analysis page and "+XP / level progress" on Accepted (Problem XP
  is the whole Rift level, `calcLevel`; a quarter of the Nexus rank).

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
