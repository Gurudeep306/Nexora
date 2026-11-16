# Handoff — everything done, and everything left to do, end to end

Read this first in every new session, then `AGENTS.md` and `CLAUDE.md`. The
prompt to start the next session is `docs/NEXT_SESSION_PROMPT.md`.

**Keep this file current.** Before you stop for any reason (usage limit, end
of session, the owner interrupts), update "Where it stands" and "What is left,
in order", and push it with your work. Short, plain sentences, exact paths.

Contents:

1. How the owner wants work done
2. Branch, PRs and merging
3. Where it stands
4. What is done (all sessions)
5. The visual dry run: design and how it works
6. What is left, in order (the end-to-end plan)
7. How to check your work (tools and scripts)
8. Things learnt the hard way

---

## 1. How the owner wants work done

- **Quality.** Highest quality, professional, "never fails in any case".
  Finish one thing fully before the next: tests, light + dark + phone, axe 0.
- **Look.** Everything matches the site: the Field Journal look, tokens only,
  no glows or gradients, and clay only for the one primary action or the
  "you are here" mark. Clay is never text.
- **Honesty.** Never show made-up data. Say plainly what is not possible, and
  build the legitimate version. Never suggest breaking a provider's terms
  (for example several free accounts at one provider for one person).
- **Explaining.** Short sentences, exact clicks. The owner reads on a phone.
  Every report says what changed, what was checked, and what is not done and
  why, with screenshots (desktop light, desktop dark, phone).
- **Merging.** Only the owner says "merge". Merging to `main` deploys the
  live site (Render).
- **Interruptions.** The owner often sends new messages mid-task. Answer
  briefly, then carry on. Commit and push often so nothing is lost.
- **Speed.** When the owner asks for things "all at once", split independent
  pieces between helper agents, each in its own worktree. Each helper writes
  only new files. Then check and integrate their work yourself. This is how
  the C and JavaScript/TypeScript dry runs were built in session 3.

## 2. Branch, PRs and merging

- Work on the session's own branch (named in the session's system prompt).
  Never commit to `main`. One PR per finished piece. No force-push.
- After a PR merges, restart the branch from the new `main` (stash, `git
  checkout -B <branch> origin/main`, pop). If the push is refused because the
  remote branch still holds old merged history, run
  `git fetch origin <branch> && git merge -s ours FETCH_HEAD` and push.
- Wait for green CI (Server tests, Client build, GATE notes) before merging,
  and squash-merge.
- `git add -A` also picks up helper worktrees under `.claude/worktrees/`.
  Add that folder to `.git/info/exclude` first.

## 3. Where it stands (2026-11-16, session 5)

- **Merged and live:** #127, #128, #129 (dry run: Python, C++, C, Java,
  JavaScript, TypeScript), **#130** (Solve page redesign + dry run for Go,
  Rust, C#; C# runs on .NET 9 first), **#131** (dry run for Kotlin and Swift;
  Kotlin stderr no longer cut short). The dry run works in 11 languages.
- **Open PR: Admin → Compilers (section 6, item 5)**, first on branch
  `claude/fervent-curie-vjgcd8` (#132). Session 5 checked it and continued on
  `claude/clever-keller-vgi9vo` (the same work plus a phone fix: admin
  `Panel` headers now wrap their button under the text, so the description
  is no longer squeezed into a thin column at 360px). Waiting for the
  owner's "merge".
  What it does:
  - `src/compilers.js`: the free public runners (Wandbox, Compiler Explorer,
    Kotlin Playground, Paiza.io) can be turned off; each one's compiler
    version per language is chosen by an updater that runs every 6 hours
    (and from "Check for new versions"): it reads each service's own list
    (`/api/list.json`, `/api/compilers`, `/versions`), takes the newest
    stable version **in the same family** (gcc stays gcc, C stays C), runs
    the language's self-test (`src/judge-selftest.js`) and uses it only if it
    prints 15. Big jumps in languages that break old programs (Scala 2→3,
    Ruby 3→4, Zig 0.x, Haskell 9.x, Python/PHP/Perl majors…, the `CAREFUL`
    table) wait for an admin. A kept (pinned) version never changes; "Use
    built-in" goes back to the version in `src/remote-exec.js`.
  - `src/remote-exec.js`: `useCompilerChoices` hook, `compilerFor(engine,
    lang)`, `runOn(...)` (one exact compiler, no cache/failover),
    `publicChain` skips services turned off.
  - Admin → Code runners shows two new panels (`CompilersPanels.tsx`):
    Public runners (status, list read, on/off, last check: updated / waiting
    / failed with details) and Languages (searchable; each language's chain
    and the version each runner uses; Keep this version / Let it update /
    Use built-in).
  - Routes in `src/routes/admin.js` (`/api/admin/compilers*`, perm
    `site.settings`, audited). Tests: `tests/compilers.test.js` (no network).
  - **Real check, 2026-11-16:** 21 newer versions passed and would be used
    (GCC 16.2, Rust 1.99, Java 27, Python 3.14/3.15, Go 1.26, .NET 10, Swift
    6.4.2, Kotlin 2.4.21…); 5 held (Ruby 4, Scala 3, Zig 0.17, Haskell
    9.12); Objective-C on GCC 16 failed (a header is gone) and stays old.
- **Not done in this PR (do next, in this order):**
  1. **After merge, check the dry run on the new versions.** The updater
     only runs the self-test. Run the scratch suites of all 11 traced
     languages against the versions the live updater picked (or pin the old
     version for a language whose tracer breaks, and fix the tracer).
  2. **Key-based services** (handoff item 5): check each one's terms first
     (self-hosted Judge0, JDoodle free tier, Glot.io, Coliru), then add only
     the allowed ones, with keys sealed like AI keys
     (`src/hive/vault.js`). Say plainly in the admin page which are not
     allowed and why.
  3. ~~Screenshots and axe~~ **DONE (session 5):** axe 0 and no sideways
     scroll in light, dark and phone; Admin → AI models and Site also
     re-checked after the shared `Panel` change.
- **Dry-run test programs are in the repo now:** `scripts/dryrun-suites/<lang>/`
  (Go 10, Rust 11, C# 7, Kotlin 5, Swift 6; `<name>.in` is the input) and
  `scripts/dryrun-suites/run.js <lang> [engine]` runs them plain and traced
  on the public runners (needs the proxy preload, section 7).
- **Owner decisions (2026-11-16):** the dry run for Ruby, PHP, Lua, Perl and
  for functional languages is **later**, not now. The ideas in section 6,
  item 7 are **no for now**.
- **Item 1 (live check) needs the owner**: the site is private, so only the
  owner can sign in and press Dry run on the live site in each language.

## 4. What is done (all sessions)

### Session 4 in detail (dry run for Go, Rust, C#, Kotlin, Swift; Solve page)

- Merged: #127 (judge, runners, editor help, How it runs, Python dry run),
  #128 (dry-run known issues), **#129** (dry run for C++, C, Java,
  JavaScript, TypeScript). The dry run works in 6 languages.
- **Open PR: the Solve page redesign (section 6, item 2) — done**, branch
  `claude/fervent-curie-vjgcd8`. Waiting for the owner's "merge".
- **Item 1 (live check) needs the owner**: the site is private, so only the
  owner can sign in and press Dry run on the live site in each language.
- **Dry run for Go — done (session 4)**, in the same PR:
  `src/dryrun/go.js` + `go-runtime.go`. Reflection-based runtime; imports
  added (aliased) on the package line; a deferred `__nxDone` per function
  reports a panic on its line and re-panics, so the program behaves exactly
  as before; output counted by wrapping `fmt.Print*` and the `os.Stdout`
  handed to writers (no goroutines, nothing can be lost); `byte`s shown as
  characters; maps drawn sorted (Go's order is random); only `package main`
  types become objects; `Len/Less/Swap/String/Error` methods not traced.
  Picture-picker: Go stacks (`st = append(st, x)` + `st[:len(st)-1]`),
  queues (`q = q[1:]`), `container/heap`, edge lists (`edges` of pairs),
  field names matched without case (`Val`, `Next`, `Left`). Checked: 10
  classic programs print exactly the same traced and untraced
  (`node scripts/dryrun-trace.mjs <file> go`), `tests/dryrun-go.test.js`.
  Also checked through the live runners (Wandbox, Compiler Explorer,
  Paiza.io): same output, same steps.
- **Dry run for Rust — done (session 4)**, same PR: `src/dryrun/rust.js` +
  `rust-runtime.rs`. Values through a `__nx_rt::S` trait with "autoref
  specialisation" (S if the type has it, else short Debug text, else
  nothing — never a compile error); the student's non-generic structs get
  an `S` impl (objects by address: `Option<Box<Node>>` lists,
  `Rc<RefCell<TreeNode>>` trees); frame `Drop` sends `ret` (also while
  unwinding); a panic hook reports the line and message, then Rust's own
  message is printed; output counted by wrapping println!/print!/
  writeln!/write!. **Borrow-checker rules** (the hard part): a step only
  reads variables that are surely readable — not after a move (passed /
  assigned / returned / iterated / stored by value, consumed by
  `into_iter`/`unwrap`…, bound by value in `if let`/`while let`/`match`;
  `x = f(x)` makes x readable again), not while lent out as `&mut`
  (`&mut x`, `iter_mut`, `get_mut`, `entry`… for as long as the binding
  lives; in `if let`/`match`/`for` bodies), not a `let x;` before its value;
  Copy values (numbers, bools, chars, refs) are always readable. Iterators
  and IO plumbing are left out. `impl Trait for X` methods (Ord, Display,
  Iterator…) are not traced; nor are closures. If the traced copy still
  does not compile, `dryRun()` says so honestly (Run still works). Checked:
  11 programs print exactly the same traced and untraced (incl. moves,
  `&mut` loans, `let x;`, linked lists, Rc<RefCell> BST, BinaryHeap with
  Reverse, VecDeque, HashMap, BufWriter + writeln!, labels, tuple structs),
  `tests/dryrun-rust.test.js`, and through Compiler Explorer.
- **Loops without an update** (Rust `for`/`loop`, Go `range`): the
  end-of-pass step is added at the end of the body, so `j` is not shown one
  box too far.
- **C# dry run: DONE** (`src/dryrun/csharp.js` + `csharp-runtime.cs`).
  Classic `Main`, top-level programs, local functions and `=>` bodies (the
  `=>` and `;` are commented out so lines stay put); List/arrays (1D, 2D,
  jagged), Dictionary, Stack, Queue, HashSet, PriorityQueue, linked lists,
  exceptions on their line. ToString/Equals/CompareTo and IO helpers are not
  traced. 7 programs print exactly the same traced and untraced on Compiler
  Explorer (.NET 9). CI has no dotnet, so `tests/dryrun-csharp.test.js`
  checks the instrumented code and replays traces recorded from a real run
  (`tests/fixtures/dryrun-csharp-*.json`).
- **C# now runs on .NET 9 first** (Compiler Explorer), Mono as fallback.
  Before, Run/Submit went to Wandbox's Mono first, which gave a false
  compile error for local functions, top-level programs and PriorityQueue.
- **Kotlin dry run: DONE** (`src/dryrun/kotlin.js` + `kotlin-runtime.kt`).
  Block and `= expr` functions (the latter wrapped in `.let { try … }` so
  the type is still inferred), local functions, classes and objects (their
  readable properties; not lateinit, lazy or custom getters), labels,
  `val x: Int` set later. Output is counted by file-level print/println and
  `System.out` → `__Nx.out` (no System.setOut, which the Playground may
  block). The grammar leaves a body written on the next line (`for (…)` ⏎
  body) as the next statement: it is re-attached, so no step goes between.
  5 programs print exactly the same on the Kotlin Playground; tests replay
  recorded traces (`tests/fixtures/dryrun-kotlin-*.json`).
- **Kotlin stderr fix:** the Playground sends stderr in one block per stretch
  between stdout writes; only the first was kept. Now all are joined.
- **Known:** Compiler Explorer's Kotlin (kotlinc 2.3.10) crashes with a
  StackOverflowError even on plain programs (seen 2026-11-16). The Playground
  is first in the chain, so students are not affected unless it is down.
- **Swift dry run: DONE** (`src/dryrun/swift.js` + `swift-runtime.swift`).
  Functions get a frame closed by `defer`; a one-expression body (implicit
  return) becomes `return __nx_f.ret(…)`, but an if/switch that returns from
  its branches stays a statement. Top-level code is the "main" frame.
  Methods read stored properties (not lazy/computed/static; init is not
  traced). `if let`/`guard let`/`while let`/`catch let` bindings, labels,
  `let x: Int` set later. A crash (index out of range, `!` on nil) is a
  signal: reported on its line, then the program stops as before. 6 programs
  print exactly the same on Compiler Explorer and Paiza; tests replay
  recorded traces (`tests/fixtures/dryrun-swift-*.json`).
- **All 10 compiled/typed languages now have the dry run:** Python, C++, C,
  Java, JavaScript, TypeScript, Go, Rust, C#, Kotlin, Swift.
- **Next for the agent: section 6, item 3** — Ruby, PHP, Lua, Perl (they
  have built-in trace hooks; test through the remote runners with the proxy
  preload), then functional languages.
- The owner said **no for now** to the ideas in section 6, item 7.


### Site-wide UI (sessions before 2, PRs #117–#126)

- **Field Journal look**, rolled out in phases to every page. Details are in
  `docs/ui/FIELD_JOURNAL_HANDOVER.md` and `docs/ui/field-journal.md`.
- **Ten themes**, plus "Make it yours" (accent, ink, faces, corners, Dock).
  Theme menu in the top bar. See AGENTS.md.
- **Landing, sign-in and the private "Coming soon" page** with the owner/staff
  sign-in. The NG mark never vanishes.
- **Notes and lessons** share one reader. The search is the "ledger line".
- **Learn** is clear and linked: subject pages open on Lessons.
- **Admin:**
  - AI models (any OpenAI-compatible provider, sealed keys)
  - Site defaults
- **Problems:**
  - search and filters are back
  - one dropdown style everywhere (and dropdowns scroll)
  - source imports fixed
- **Home:**
  - everything in progress rotates, with its real animation
  - "For you today"
  - animations are sized properly
- **Hive:** see `docs/hive/GUIDE.md`.

### Coding (session 2, PR #127)

- **The judge never blames the student** (`src/remote-exec.js`):
  - Each language has a chain of runners: our own Piston servers, then
    Wandbox, Compiler Explorer, Kotlin Playground, Paiza.io.
  - Busy runners are skipped and rested. Real CE/WA/RE/TLE are never retried.
  - When everything is down, the student sees "busy, not your code".
- **Our own runners:**
  - Code: `src/piston.js`, `src/runners.js`, `deploy/runner/setup.sh`,
    `docs/ops/fast-judge.md`.
  - Admin: Admin → Code runners. A runner is tested on save and its password
    is sealed.
  - Or set `PISTON_URL` / `PISTON_TOKEN` on Render. The owner will create the
    machines.
- **Exact errors:**
  - Kotlin errors point at the student's line.
  - C# errors are no longer empty.
  - Julia load errors are reported honestly.
- **Editor help for all 36 languages** (`client/src/lib/langIntel.ts`,
  `langIntelMore.ts`): completions, parameter hints, hover docs.
- **"How it runs"** (Solve tab; `src/explain-run.js`, `/api/explain-run`,
  `client/src/components/solve/journey/`): write → read → check → translate
  (real assembly or bytecode, tied to lines) → run. 20 languages have a real
  listing. Not yet checked on a phone.

### The visual dry run (sessions 2–3, PRs #127, #128, #129)

- **Python:** the tracer is `src/dryrun/python.js`.
- **C++, C, Java, JavaScript, TypeScript** (session 3, PR #129):
  - each has a tree-sitter instrumenter and a small runtime
  - all 193 Learn solutions per language print exactly the right answer when
    traced
  - all five run on Wandbox
- **The shared player:** `client/src/learn/engine/FramePlayer.tsx`, used by
  the DSA chapters and the dry run.
- **The Solve page panel:** `client/src/components/solve/dryrun/DryRunPanel.tsx`,
  plus a Dry run button next to Run and Submit.
- **Session 3 fixes:**
  - pointer-chip contrast
  - a taller dry run, and a full-height Results tab on phones
  - role colours: the journal kit wiped them on every player, the DSA
    chapters included
  - recursion trees
  - dict-of-dict tries
  - ∞ for an "infinity" the code uses
  - long values get wider boxes
  - weights are not graph pointers
  - full screen is a labelled dialog
  - values written the language's way (`nullptr`, `null`, `None`)
  - small records show their fields
  - one recursion tree at a time, only for calls that recurse
  - a reversed list is no longer called circular
  - C/C++ local arrays show only the part written
  - contrast of line numbers and return values
- **Checked:**
  - 14 real Python programs in the browser
  - C++/C/Java/JS/TS programs in the browser
  - axe 0 in light, dark and phone, across several themes
  - bubble sort and 2D DP in all ten themes
  - DSA lesson `/learn/dsa/arrays/6` in all ten themes, light and dark

## 5. The visual dry run — design and how it works

**What the owner asked for:** while solving any problem, in any language, a
student presses **Dry run** and watches their own code run on each sample,
like the DSA chapters:

- arrays appear as boxes and values drop in
- the index variables ride under the boxes, named exactly as in the code
  (`i`, `j`, `j+1`, `lo`, `hi`)
- swaps glide and the current line is lit
- variables show what they were before
- the call stack and the recursion tree grow and shrink
- the output builds up

It must never fail silently.

**The owner's words:** "work on all types of datastructure and as best a
spossible with proper naming present as per the code i want the best work
here". Every picture is named after the student's variable: the list is
`head`, the tree is `root`, the window is `l … r`.

**Pipeline (three layers):**

1. **Trace** (server, per language). The program runs on the normal runners
   with tracing added. It writes one JSON event per step to stderr after the
   marker `\x1eNXT `. The format is documented at the top of
   `src/dryrun/index.js`:
   - Events:
     - `call` (function, call id, depth, arguments)
     - `line` (the line that just ran, changed variables `v`, gone names
       `x`, changed objects `h`, output length `o`)
     - `ret` (`r`)
     - `exc` (`m`)
     - `cap`
   - Values:
     - scalars
     - `{t:'list'|'tuple'|'set'|'deque', n, i}`
     - `{t:'dict', n, k}`
     - `{t:'ref', id}` into the heap
     - `{t:'big'|'num'|'str', s}`
   - Limits: 3000 events, 1.5 MB, 80 items per list, 300 characters per
     string.
   - Per language (`TRACERS` in `src/dryrun/index.js`):
     - **Python** — `python.js`, `sys.settrace`.
     - **C++** — `cpp.js` + `cpp-runtime.h` (prepended, ends with `#line 1`).
       Template serializer, struct fields through a generated
       `friend __nx_fields`, pointers followed only into `new`'d blocks,
       `cout`/`printf` counted, crash signal handler on its own stack.
     - **C** — `c.js` + `c-runtime.h`. Type descriptors from declarations,
       `malloc`/`free` tracked.
     - **Java** — `java.js` + `java-runtime.java` (appended as the
       non-public class `__Nx`). Reflection, try/catch/finally per method.
     - **JavaScript and TypeScript** — `js.js` + `js-runtime.js` (joined onto
       line 1; for TypeScript loaded through `(0, eval)("…")`).
     - **Shared** — `treesitter.js` (parsers from `web-tree-sitter` 0.25.10 +
       `tree-sitter-wasms` 0.1.13, pinned) and `macros.js` (expands the
       student's own `#define`s, line for line).
   - `dryRun()`:
     - when the traced copy does not compile, it runs the student's own
       code; if that also fails, the student sees their own compiler message
     - otherwise it says honestly that the tracer can't follow this program
2. **Frames** (client, `client/src/components/solve/dryrun/`):
   - `replay.ts` rebuilds snapshots from the events. `setLanguage()` decides
     how values are written.
   - `toFrames.ts` picks the picture from the data and how the code uses it:
     - arrays with index pointers, compare / write / new / swap roles, and
       window bands
     - strings as characters
     - sets and tuples
     - stacks and queues (from methods in any language)
     - heaps (array + tree)
     - union-find (forest) and segment trees
     - grids / DP tables (with the cell read and written lit)
     - adjacency lists and matrices (graph)
     - maps
     - linked lists (singly, doubly, circular)
     - binary trees, N-ary trees and tries (objects or dicts of dicts)
     - graph objects
     - bitmasks
     - the recursion tree, call stack, variables with "was", and output
3. **Player** (`client/src/learn/engine/FramePlayer.tsx`, views in
   `client/src/learn/engine/views/`):
   - stage, note, legend, controls, scrubber with marks, speeds, step log,
     full screen (a dialog) and keyboard
   - the DSA chapters use the same player

**Never fails:** every failure shows a plain reason and a way forward:

- a language not traced yet (the panel lists the ones that are)
- the step cap
- a crash: the animation stops on the line, with the message
- the runner is busy
- the program does not compile (the student's own message)
- the tracer can't follow the program (said honestly)

**Known limits (tell the owner if asked):**

- **C:**
  - not followed: pointers into the middle of a block, pointers to arrays
    (`int (*a)[10]`), 2D array parameters, unions, bit-fields, `char*` to
    string literals
  - structs declared inside a function are not drawn
- **JavaScript:**
  - not traced: async and generator functions, and anonymous callbacks
    other than array methods (`sort` comparators, `setTimeout`)
- **All languages:**
  - not traced: input/output helpers (`ni()`, `nextInt()`, `read()`…), on
    purpose
  - a big array is checked only at its start, to find the part in use
    (sieves stay fast)

## 6. What is left, in order (the end-to-end plan)

Each item is one finished, tested PR. Report to the owner after each.

### 1. Check the live site after #129 deploys

- On https://nexoraguru.in, open any problem.
- For each of Python, C++, C, Java, JavaScript and TypeScript: paste a small
  program, press Dry run, and see it draw.
- The live server runs code remotely (Wandbox), so this is the real test.
- Note how long TypeScript takes (Wandbox compiles it: about 15–40 s). If it
  is too slow, say so and offer a faster path. Our own Piston runner has
  `tsx`; the owner must create one, see `docs/ops/fast-judge.md`.

### 2. Solve page redesign — every button in its best place — DONE (session 4)

What was built (`client/src/pages/SolvePage.tsx`, `components/solve/CodeEditor.tsx`,
`ProblemPanel.tsx`, `LanguagePicker.tsx`):

- Top bar: language · Dry run · Run · Submit (the one clay button) · ⋯ (full-
  screen arena, layout presets, the key list). The old AI menu is gone.
- Examples: "Run this", "Dry run this", "Add to tests" on each example.
- Editor header: file chip with the saved dot; Format (only JS/TS/JSON/CSS/
  HTML, where Monaco has a real formatter); Snippets; Reset to template;
  **Help** (AI: hint, explain my error, fix my code, ask the tutor ⌘J); ⋯
  Editor settings (theme, font size, indent, wrap, minimap, Vim, AI
  suggestions, copy, download, shortcuts, full screen). Undo/Redo buttons,
  the timer, char count, wrap label and theme name are gone.
- Status bar: Ln/Col, language, issue count (click → Result), saved.
- Results: 4 tabs — Tests (+ "Generate with AI"), Result (issues listed on
  top, click → line), Dry run ("Watch it run" / "Under the hood"), Coach
  (Hints / Analysis). Old links (`openTab('analysis')` etc.) still land in
  the right tab and view.
- Phone: Dry run · Run · Submit bar at the bottom. Alt+D opens the dry run.
- Checked: axe 0 and no sideways scroll in light, dark and phone; 533 tests.

The plan that was followed:

**The owner's words:** "i want the buttons not everything at the bottom part i
want it to uniquely place all buttons and remove all unnecessary features …
by analyzing what to place where to make it look the best and show case best
… all buttons not just dry run".

**What is there today** (`client/src/pages/SolvePage.tsx`,
`components/solve/*`). It is too much, and much of it appears twice:

- **Top bar:** layout menu, full-screen arena, language picker, an "AI tools"
  menu (Fix my code, Analyse my code, See how it runs, Generate tests, Ask the
  assistant, Inline suggestions), Dry run, Run, Submit.
- **Editor toolbar (15):** editor theme, font −/+, word wrap, minimap, Vim,
  snippets, template, copy, download, undo, redo, keyboard shortcuts, focus.
- **Editor status bar:** Ln/Col, language, indent width, line/char count,
  session timer, wrap state, issue count, saved state, theme name.
- **Bottom panel, 8 tabs:** Tests, Result, Dry run, AI tests, Analysis, How it
  runs, Coach, Issues. Three of these are also in the AI menu.
- **Problem panel:** Description / Submissions, examples with copy and "Add to
  tests", translate bar.

**The plan.** Each control lives where it is used, and nothing appears twice.

1. **Top bar** = the actions on the code, nothing else.
   - Left: the problem title + difficulty.
   - Right, in this order: language picker · **Dry run** · **Run** ·
     **Submit** (the only clay button) · one "⋯".
   - The "⋯" holds: layout, full-screen arena, shortcuts, reset layout.
2. **Actions on a sample sit on the sample.** Each example in the Problem
   panel gets "Run this" and "Dry run this" beside its copy button. They
   select that case and act. "Add to tests" stays.
3. **The editor header is slim.**
   - Left: a file chip (`main.py`, with the saved dot).
   - Right: Format, Snippets, Reset to template, and "⋯ Editor settings"
     (theme, font size, wrap, minimap, Vim, indent, inline AI suggestions,
     copy, download, shortcuts).
   - Remove: the Undo/Redo buttons (the keys stay), the session timer, the
     char count, the theme name and the wrap label.
   - The status bar keeps Ln/Col, language and the issue count. Clicking the
     count jumps to the first error and opens Result.
4. **AI help in one drawer.** One "Help" button (or ⌘J) opens: Hint, Fix my
   code, Explain my error (only when there is one), Ask. "Analyse", "See how
   it runs" and "Generate tests" live in the tabs they open.
5. **Results panel: 4 tabs.**
   - **Tests:** the cases, custom input, "Paste many tests", "Generate tests
     with AI".
   - **Result:** run and judge results, with compile errors explained and
     linked to lines (Issues folds in here).
   - **Dry run:** a switch "Under the hood" shows How it runs.
   - **Coach:** hints, issues, and Analysis (complexity, what to improve).
6. **Phone:** Problem / Code / Results tabs at the top, and a sticky bottom
   bar with Dry run · Run · Submit.
7. **Keys:** Ctrl/⌘+Enter runs, Ctrl/⌘+Shift+Enter submits, Alt+D starts a
   dry run. All are listed in "⋯ → Shortcuts".
8. **Nothing is lost.** Every advanced feature is reachable in at most two
   clicks; only duplicates and noise go.
   - Check: axe 0 in light, dark and phone, no sideways scroll at 360 px.
   - Check "How it runs" on a phone (never done yet).

### 3. Dry run for the other languages

- **Go, Rust, C#, Kotlin, Swift: DONE.** The approach — a tree-sitter
  instrumenter + a small runtime that writes the same events, on the same
  lines.
  - The grammars are in `tree-sitter-wasms`.
  - The local box has no compilers for them. Test through Wandbox
    (`remoteRun` in `src/remote-exec.js`, via the demo proxy) and against
    the Learn corpus where solutions exist.
- **Then the rest — NOT NOW (owner, 2026-11-16).** Do not start these:
  - Ruby, PHP, Lua and Perl have built-in trace hooks (like Python's
    `settrace`).
  - Haskell, OCaml, Clojure, Scheme and the other functional languages:
    show calls and values, no boxes, and say so on screen.
- Add each language to `TRACERS` and `DRY_RUN_LANGS`.

### 4. Dry run polish (smaller, can go with item 3)

- **Swift and C# structs** show as one line of text (`UF(p: [0, 0, 2, 3])`):
  draw their fields (as objects without identity) so a union-find's array
  is a real array.

- **JavaScript:** trace async functions and `sort` comparators.
- **C:** pointers into arrays.
- **Labels:** a "first k of N" label when a vector is capped.
- **Linked lists:** the `prev` / `cur` chips sitting on the same node overlap
  a little. Give each pointer its own lane, like arrays do.
- **The step note** reads "Line 8: … — a changes". Say what changed:
  "a[1] 4 → 2".

### 5. Admin → Compilers (approved)

- **One list:** every code-running service with its health and the
  compilers it offers — Wandbox, Compiler Explorer, Paiza.io, Kotlin
  Playground, our own runners.
- **Key-based services:** only where their terms allow it. Check each first:
  self-hosted Judge0, JDoodle free tier, Glot.io, Coliru.
- **Keys:** admins add them, sealed like AI keys.
- **Self-updating:** every few hours the server fetches each service's
  compiler list (`/api/list.json`, `/api/compilers`, `/api/v2/runtimes`…),
  tests them, and updates each language's chain by itself. New versions
  appear without code changes.
- **Controls:** a per-language view of the chain, and on/off per service.

### 6. The older requests (the owner's first brief) — each its own PR

"Add as many features to each as possible."

**A. Compiler and editor, the unfinished parts**

- **Plain-English error explanations on the exact line, for every runner.**
  - Rewrite `client/src/lib/diagnostics.ts` against the real formats:
    - gcc/clang `<source>:L:C`
    - javac `Main.java:L:`
    - Go `./prog.go:L:C`
    - Rust `--> file:L:C`
    - C#/TS/F# `file(L,C):`
    - D/Nim/Pascal `file(L)`
    - Python `File "…", line L`
    - Ruby `file:L:`
    - PHP `on line L`
    - Perl `at file line L`
    - Lua `file:L:`
    - OCaml `File "…", line L, characters`
    - Crystal `In file:L:C`
    - Groovy `@ line L, column C`
    - Scheme `at line L`
    - Node `file:L` + stack frames
    - Java/Kotlin `(File.java:L)`
  - Accept only the student's own file names (`<source>`, `prog.*`, `Main.*`,
    `main.*`, `example.*`, `File.kt`, `/workspace/Main.*`,
    `/home/wandbox/prog.*`, `arena_*`), never system headers.
  - Add a "What it means" line for common errors:
    - undeclared name, missing `;`, unmatched brackets, indentation
    - type mismatch, index out of range, division by zero, null/None
    - bad number input, reading past the input, recursion too deep
    - missing return, code outside a function, Java public class
    - duplicate name, out of memory
  - Show it in the marker, the Result tab and the status bar.
- **Live syntax check while typing**, for every language: unmatched brackets
  and unterminated strings (aware of comments and strings), and Python mixed
  tabs/spaces.
- **Format for every language:** JS/TS through Monaco; brace languages
  re-indented by brace depth; the rest get only trailing whitespace trimmed.
  Say plainly which languages get a full formatter.
- **A cheat sheet per language**, opened from the editor: read a line, read n
  numbers, fast I/O, print, arrays, maps, sort, common mistakes.
- **A Playwright test per language:** completions, signature help, hover and
  cheat sheet.
- **Coding analysis page** (`client/src/pages/AnalyticsPage.tsx`,
  `/api/stats`): by difficulty, tag, language, verdict trend, time to solve,
  weak tags with links; plus a per-problem analysis.
- **Levels:**
  - show "+XP" and level progress on Accepted
  - the Profile explains how the level is earned: Problem XP is the Rift
    level (`calcLevel`), plus a quarter of the Nexus web rank
    (`src/nexus/ranks.js`)

**B. Problem pipeline** (`src/sources/*.js`)

- Every source imports the full statement, all samples, limits, tags, rating
  and images. Images are stored and served by us, never hot-linked.
- An audit script, and an Admin page of gaps per source and per problem, with
  re-import.
- Never bypass bot protection. Use official APIs and open datasets
  (`src/sources/cf-dataset.js`).

**C. Staff-only "Add a coding problem" editor** (`src/authz`)

- Statement with maths and images.
- Samples + hidden tests (paste, upload or generate).
- Limits, a custom checker, tags, rating, editorial.
- Solutions in 5 languages, run on the judge against every test before
  publishing.
- Preview as a student.

**D. Social** (`src/routes/social.js`, `client/src/components/social/*`)

- DMs, and groups (create, invite, roles).
- Typing indicator, read receipts, attachments, reactions, search.
- Rich share cards for problems, solutions, contests and GATE questions.

**E. Contests** (`/api/contests/*`, `client/src/components/contests/*`,
`pages/WorkshopPage.tsx`)

- Make a contest from anywhere: pick questions and timeline, share a link.
- Custom questions with every feature:
  - coding: statement, samples, hidden tests, limits, editorial
  - GATE: MCQ / MSQ / NAT, marks, negative marks, figures, solutions
- Teacher GATE contests: marks list, analysis per question, per student and
  per time, CSV export.

**F. Linked platforms** (`src/accounts.js`)

- More sites.
- Proof of ownership by a one-time code the user puts on their profile there.
- Import solves and achievements.
- Real OAuth only where it exists (GitHub). Never a fake permission screen.

### 7. Ideas never started — the owner said NO for now (2026-11-16): do not start them

- Fine-tuned Nexora models trained on our own data (GATE solutions,
  animation scenes).
- A Modal or Kaggle version of the model farm.
- More DSA chapters to the same depth as the finished ones.

## 7. How to check your work

```bash
npm install && npm install --prefix client
npm test                                    # all must pass (533 at the end of session 3)
cd client && npx tsc -b && npx oxlint <touched files> && npx vite build
npm i --no-save --prefix /tmp/axe axe-core  # once, for the browser checks
```

**The demo server, with the real code runners:**

- The container needs the agent proxy.
  1. Install `https-proxy-agent` in a scratch folder.
  2. Write a preload that sets it as the agent on every `https.request` to a
     non-localhost host (CA `/root/.ccr/ca-bundle.crt`).
  3. Start the demo:
     `NODE_OPTIONS="-r /path/preload.js" PORT=3300 node scripts/hive-demo.js`
     (NODE_OPTIONS, so the server's child process gets it too).
- Log in as owner / owner123.
- The demo database is new on every start. Rebuild the client after client
  changes, and restart the demo after server changes (the runtimes are read
  when it starts).

**Scripts:**

- `node client/scripts/check-page.cjs <route> <name> [light,dark,phone]` —
  axe + overflow + screenshots for any page.
- `node client/scripts/check-dryrun.cjs <name> <lang> <file> [light|dark|phone] [theme]`
  — runs the dry run on the Solve page:
  - creates the test problem if missing
  - `STEP=mid` moves the scrubber, `FOCUS=1` opens full screen
  - `WAIT=40000` for TypeScript
- `node scripts/dryrun-trace.mjs <file> <lang> [input]` — what each step
  draws, in the terminal (`AT=20 N=3`, `EV=10`).
- `node scripts/dryrun-trace.mjs --corpus <lang>` — every Learn solution must
  print exactly its expected output when traced. Use it after any tracer
  change. Python, C++, C, Java and JS give 193/193. TypeScript gives 192/193
  under Node's quick type-stripping: one solution has a top-level `return`
  that `tsx` and Wandbox accept.
- To force the remote runners, call `remoteRun(code, input, lang)` from
  `src/remote-exec.js` through the proxy preload.

## 8. Things learnt the hard way

**Dry run:**

- A step is sent before each statement and reports the line before it. A
  loop's end-of-pass step runs before its update (`j++`), or the pointers
  show one box too far.
- **Java:**
  - only read variables that are surely assigned
  - never add a statement after `return`/`break` (unreachable is a compile
    error)
  - put the step before a label, not between the label and its loop
  - methods returning `byte`/`short`/`char` need a cast around the
    returned value
- **C++:**
  - the judge swaps `<bits/stdc++.h>` for its own list on clang, so the
    runtime includes exact headers and must build with GCC and Clang
  - `vector<int> a(n);` parses like a prototype; treat a local prototype
    with unnamed parameters as a variable
- **TypeScript on Wandbox** is compiled down to old JavaScript, where
  `for…of` over a Map does nothing. Hence the eval'd runtime.
- **Big arrays:** scan only their start on every step, or a sieve of a
  million takes minutes.

**Styles:**

- `[data-kit='journal'] .viz-cell` has the same specificity as the role
  rule and loads later. Role colours need their own journal rule
  (`theme/styles.css`).
- axe fails opacity fades and small coloured text on tints. Use solid
  tokens: secondary text for quiet text, and mix the state colours toward
  the text colour.
