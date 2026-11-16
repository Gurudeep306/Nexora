# Prompt for the next session

Copy everything inside the box below into a new Claude Code session on the
Nexora repository.

````text
You are continuing work on NexoraGuru (GitHub repo Gurudeep306/Nexora, live at
https://nexoraguru.in). Work with the highest, most professional quality
possible: it must never fail in any case, look like the rest of the site, and
be honest about anything that is not possible.

STEP 0 — Read first, in this order:
  1. docs/HANDOFF.md — the full state, the full design of the visual dry run,
     the "Known issues to fix first", and "Next, in order". Follow it.
  2. AGENTS.md and CLAUDE.md — the project rules.
  3. docs/ui/field-journal.md and docs/ui/premium.md — the look.
  The work so far is on branch claude/fervent-curie-vjgcd8, in PR #127
  (https://github.com/Gurudeep306/Nexora/pull/127, not merged). Start your
  branch from it (or continue on it if your session may push there). Only I
  say "merge"; merging deploys the live site.

STEP 1 — Set up and check what exists:
  npm install && npm install --prefix client
  npm test                      (all must pass, about 500)
  cd client && npx tsc -b && npx vite build
  Start the demo through the agent proxy so it can reach the real code runners
  (exact steps in docs/HANDOFF.md, "How to check your work"), log in as
  owner / owner123, create a problem, open /solve/custom/1, choose Python,
  press "Dry run", and see the current state for yourself.

WHAT I WANT (in my own words, keep to them):
  "work on all types of datastructure and as best a spossible with proper
  naming present as per the code i want the best work here"

THE MAIN GOAL — the visual dry run, for every language:
  While solving any problem, a student presses "Dry run" and watches THEIR OWN
  code run on each sample case, like the DSA chapters: arrays appear as boxes,
  values drop in, the index variables (named exactly as in the code: i, j,
  j+1, lo, hi, mid…) ride under the boxes, swaps glide, the current line is
  lit, variables show what they were before, the call stack grows and shrinks
  with recursion, and the output builds up. It must work for any question
  (the picture is chosen from the data and how the code uses it) and for
  every kind of data structure: arrays, strings, tuples, sets, maps, stacks,
  queues / deques, heaps / priority queues, 2D grids / DP tables, adjacency
  lists and matrices, graph objects, linked lists (singly, doubly, circular),
  binary trees / BSTs, N-ary trees, tries, union-find, segment trees,
  sliding windows, bitmasks, recursion. Every picture is named after the
  student's own variable (the list is "head", the tree is "root").
  The DSA chapters and the dry run use ONE shared player
  (client/src/learn/engine/FramePlayer.tsx), so improve it in one place and
  both get better. Make it better than the current DSA player, not a copy.

  Done already (Python): tracer (src/dryrun/), converter
  (client/src/components/solve/dryrun/replay.ts, toFrames.ts), shared player,
  Solve page panel and button. 25 tests in tests/dryrun*.test.js.

DO NEXT, in this order (one finished, tested, pushed piece at a time):
  1. Fix the "Known issues to fix first" in docs/HANDOFF.md: pointer-chip
     contrast (axe 0 in light and dark, all ten themes), a taller / full-
     screen dry run on the Solve page, phone layout, DSA chapters checked in
     dark mode and on a phone after the refactor, the gradient/glow left in
     learn.css.
  2. Check the dry run in a browser with real programs: bubble sort, two
     pointers, sliding window, stack, queue/BFS on a graph, dict counting,
     recursion (fib, permutations), linked list reversal, BST insert, trie
     insert, heap (Dijkstra), union-find, 2D DP. Fix whatever looks wrong or
     is named wrong. Screenshots: desktop light, desktop dark, phone.
  3. Dry run for C++, Java, C and JavaScript/TypeScript, then Go, Rust, C#,
     Kotlin, Swift and the rest: instrument the student's code with a real
     parser (web-tree-sitter in Node, wasm grammars), insert after every
     statement a call that prints the in-scope variables as the same JSON
     events Python uses (format at the top of src/dryrun/index.js), run the
     instrumented copy on the normal runners, keep the student's stdout
     separate. Small per-language helpers print vectors, maps, sets, strings,
     arrays, structs, pointers to nodes. Test each language with real
     programs through the real runners. Functional languages: show calls and
     values and say so on screen.
  4. Solve page redesign — ALL buttons, not just Dry run (my words: "i want
     the buttons not everything at the bottom part i want it to uniquely
     place all buttons and remove all unnecessary features … by analyzing
     what to place where to make it look the best and show case best"). The
     full plan is in docs/HANDOFF.md, "Solve page redesign — every button in
     its best place": top bar = language · Dry run · Run · Submit · ⋯ only;
     "Run this" / "Dry run this" on each example in the Problem panel; a
     slim editor header (Format, Snippets, Reset, ⋯ Editor settings) and a
     slim status bar; one AI Help drawer instead of a menu that repeats the
     tabs; results panel with 4 tabs (Tests, Result, Dry run with "Under the
     hood", Coach with Analysis); a sticky Run / Dry run / Submit bar on
     phones. Nothing advanced is deleted, only duplicates and noise.
  5. Admin → Compilers: every code-running service in one list with health
     and the compilers it offers; key-based services only where their terms
     allow (check each); the compiler list refreshes by itself every few
     hours and updates each language's chain; on/off per service.
  6. Then the older list in docs/HANDOFF.md ("Older requests").

RULES (never break):
  - Never commit to main. Push only to your session's branch. One PR per
    finished piece. No force-push. Only I say "merge".
  - No secrets, no model names in commits / PRs / code comments.
  - Never skip, disable or delete a test.
  - Hive (client/src/hive/**, --hv-* tokens) stays untouched.
  - Tokens only, no raw colours; clay is never text; no glows or gradients.
  - Light and dark, reduced motion, no sideways scroll at 360px.
  - Never show made-up data. Be honest about anything not done or not
    possible. Never suggest breaking a provider's terms.
  - Never send my or users' personal data to outside services.
  - Before every push: npm test, cd client && npx tsc -b, oxlint on touched
    files (no new warnings), npx vite build, axe 0 on touched routes (light,
    dark, phone).
  - Keep docs/HANDOFF.md current and pushed before you stop for any reason;
    commit and push often (I interrupt with new messages).

HOW TO REPORT TO ME: short, simple sentences (I read on my phone), what
changed, what you checked, what is not done and why, with screenshots
(desktop light, desktop dark, phone).
````
