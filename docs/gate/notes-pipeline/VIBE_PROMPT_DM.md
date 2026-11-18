# Prompt for Mistral Vibe: finish Discrete Mathematics

Paste everything inside the box into Mistral Vibe, in the Nexora repository. Use
the same prompt every session; each session continues from the build log.

````text
You are the lead author and engineer finishing NexoraGuru's GATE CSE notes for
Discrete Mathematics (subject key "dm"). This is the biggest subject on the
site, and graph theory is the hardest part to animate. The owner's standard:
"visualise every possible thing", no mistakes, no regrets. Quality is the
only measure of success. Never lower it to save time or tokens. Never ship
half-done work.

══════════════════════════════════════════════════════════════
0. READ FIRST (every session, in full, before touching anything)
══════════════════════════════════════════════════════════════
  git checkout main && git pull
  1. AGENTS.md
  2. docs/gate/notes-pipeline/dm.md          ← YOUR JOB BOOK. Binding. It lists
     every job in order (J0, E1, E2, E3, the labs, C2…C8, W), what "done"
     means for each, the bar per lesson, and the scenes each lesson must have.
  3. docs/gate/notes-pipeline/README.md      (general pipeline, stages N0–N9)
  4. docs/gate/notes-pipeline/animations.md  (scene and lab rules)
  5. content/gate-notes/_style.md            (writing style, binding)
  6. docs/handoff/notes-build-log.md         (what the last session did)
  7. content/gate-notes/_progress.json       (subjects.dm)
  When starting a chapter, also read in full: the chapter's section of
  content/gate-notes/dm/_outline.md, its _plan.md, all three published
  Chapter 1 lessons (content/gate-notes/dm/01-propositional-logic/*.md), and
  the Chapter 1 generator, solution and check files in
  content/gate-notes/_checks/dm/ (_viz_ch1_l0*.py, _sol_ch1_l0*.py,
  l1_0*_*.py). Copy their patterns exactly.

══════════════════════════════════════════════════════════════
1. PICK THE NEXT JOB
══════════════════════════════════════════════════════════════
The next job is the first one in dm.md §4 that is not done, in this order:
  J0 → E1 (smooth motion) → E2 (loop, multigraph edges) → E3 (graph toolkit)
  → C2 (Chapter 2) → relation-lab → C3 → hasse-lab → C4 → group-lab → C5
  → counting-lab → C6 → recurrence-lab → C7 → graph-lab → C8 → W.
One job per pull request. If a job is too big for one session, finish whole
lessons or whole components, push them, write exactly where you stopped in
docs/handoff/notes-build-log.md, and continue on the same branch next time.
Never leave half a lesson, half a scene or half a lab component in a commit.

══════════════════════════════════════════════════════════════
2. THE REFERENCE NOTES
══════════════════════════════════════════════════════════════
- The owner's notes PDF: GATE_CSE_Discrete_Mathematics_5_Notes.pdf (919 pages,
  sets A–E; page ranges and scan quality are in dm.md §2). If it is at the
  repository root, COPY it to GATE_NOTES/ (gitignored) and work from there.
  NEVER `git add` it, never commit anything rendered from it, never move or
  delete the root copy in a commit (that is the owner's decision).
- The PDF's bookmarks contain the note authors' names. NEVER write any of those
  names anywhere: not in lessons, code, comments, commits, PRs or logs. Sets are
  "A, B, C, D, E" only.
- For each lesson, read EXACTLY the set pages the outline lists for it, as
  images (pdftoppm at the dpi in dm.md §2), and write the lesson digest in
  content/gate-notes/_digest/dm/lessons/<lesson-id>.md (gitignored) in the
  digest format of README §4 N1: topic map with pages, key points, tricks
  tagged CORRECT / CORRECT-WITH-CAVEAT / WRONG with the reason, diagrams,
  worked examples each "Verified.", unclear pages, errors with the correct
  version and a counterexample, pages read with counts. Add new errors to
  content/gate-notes/_errata/dm.md (committed).
- The notes are a checklist of WHAT to cover and WHERE students go wrong.
  Copy nothing: no wording, no examples, no figures, no graphs.

══════════════════════════════════════════════════════════════
3. HOW EVERY LESSON IS BUILT (all of it, every time)
══════════════════════════════════════════════════════════════
For lesson MM of chapter N (files under content/gate-notes/dm/NN-<chapter>/
and content/gate-notes/_checks/dm/):
  a. Lesson digest from the set pages (section 2).
  b. NN-MM-<slug>.md, status: review, every frontmatter field, written to
     _style.md and the Chapter 1 lessons: opening, "Where this fits" with
     links, GATE radar table, then for every concept the full arc
     (:::intuition → :::definition → :::theorem + :::proof or :::derivation →
     how to use it → :::trap / :::trick), a "Worked examples" section per major
     concept with ≥ 4 :::example{level} (easy, medium, gate, and an "Edge
     case:" gate one), each with :::step{why="…"} and :::answer; :::check
     self-tests; a recap after each section; :::summary{depth="quick"};
     "Common mistakes"; :::practice embeds. Every top-level block has #id and
     depth.
  c. Every PYQ the outline assigns to the lesson, embedded where the reader
     can first solve it: :::pyq{id="…" tests="block-id,…" depth="…"}. No more,
     no fewer (lessons_chN.py checks this).
  d. lN_MM_<slug>.py: re-derives EVERY number, table, relation, poset, group
     table, count, closed form, graph property, worked-example answer, PYQ key
     (dmlib.assert_key) and practice answer, using the chapter library. Counts
     are checked by brute-force enumeration on small cases as well as by
     formula. It fails loudly on any mismatch.
  e. _sol_chN_lMM.py: a v2 solution for every PYQ of the lesson, written with
     dmlib.write_solutions: approach opens "Concept tested: …", ≥ 2 clear
     steps, pitfalls, a verification or a shortcut, optionAnalysis for EVERY
     option with why each wrong option is wrong, answer.matchesKey true. If
     your derivation disagrees with the stored key: check the official IIT key
     (GATE Overflow only as a pointer), write it in _errata/dm.md under B, and
     explain it in the solution. Never change a key silently. 25 dm PYQs are
     flagged needsReview: resolve each one you meet, with evidence.
  f. _viz_chN_lMM.py: every scene of the lesson (the floor list is in dm.md
     §5: ≥ 8 per lesson, ≥ 10 in Chapter 8), generated from the chapter
     library so the numbers are right by construction. Graph scenes use
     graphdraw.py and pass check_drawing. Every step has a caption that says
     what happened and why, like a teacher. Both canvases (wide and ≤ 360 px
     narrow) are designed, not just scaled. Then run _viz_chN.py (write) and
     viz_chN.py (check).
  g. Practice questions with dmlib.put_practice: ≥ 10, ids nx-dm-NN-MM-qNN,
     mixed MCQ/MSQ/NAT, MCQ keys spread over A–D, each with full solution
     steps, concept and common_wrong. Never reuse a PYQ's wording.
  h. Build and check after every lesson:
       node scripts/build-gate-notes.js --drafts
       python3 scripts/gate-notes/run_checks.py dm
     Fix everything before the next lesson. Commit the lesson alone.
The bar per lesson (dm.md §3): ≥ 7,000 words, ≥ 25 worked examples, ≥ 8
scenes (≥ 10 in Chapter 8) with ≥ 7 (≥ 9) animated, ≥ 1 lab embed (≥ 2 in
Chapter 8), ≥ 10 practice. At the start of each chapter, raise the floor in
lessons_chN.py (min_words=7000, and add min_viz / min_examples to
dmlib.check_lessons) so CI enforces it. Raising a bar is allowed; lowering
one never is.

══════════════════════════════════════════════════════════════
4. ANIMATIONS: THE OWNER'S TOP PRIORITY
══════════════════════════════════════════════════════════════
- Every process with steps is animated: every check of a property, every
  construction, every algorithm, every proof that builds something, every
  count that is built up, every table that fills.
- Graph theory has a system (dm.md jobs E1, E2, E3). Build it BEFORE Chapter 8
  and use it everywhere graphs appear (Ch 3 digraphs, Ch 4 Hasse diagrams,
  Ch 8):
  · vertices are `node` elements (ids v_<name>), edges are `arrow` elements
    with head "none", snapped to vertex ids, so they follow moving vertices;
  · layouts are deterministic and designed for both canvases (circle,
    bipartite, grid, layered tree, hand-tuned presets for Petersen, Q3, K5,
    K3,3, the dodecahedron, and every PYQ graph);
  · the state colours are fixed for the whole subject: current = accent,
    visited/in tree/in matching = success, frontier/candidate/augmenting =
    info, conflict/odd cycle/crossing/bridge = danger, about to change =
    warning, finished = muted, removed = hidden. Colour is never the only
    signal: captions say it, and colouring scenes also write the colour
    number in the vertex label;
  · algorithm scenes are generated from the algorithm's own event trace
    (graphlib traces → steps_from_trace), then captions are edited by hand
    to read like a teacher;
  · morphs (isomorphism, complements, planar redrawing, contraction, Hasse
    re-drawing, matrix reordering) use E1's smooth motion: patch cx/cy and let
    the engine glide.
- Rules: data from code, never typed; one idea per step; ≤ 60 steps (split
  long processes); captions ≤ 400 characters; text ≥ 12 px wide and ≥ 11 px
  narrow; nothing overlaps; no edge passes through a vertex it does not touch;
  colours by meaning, tokens only; reduced motion shows the final frame with
  all captions listed; no glows, gradients or decoration.
- Never fake an animation with an image, a screenshot or an embed. If the
  engine cannot show something clearly, improve the engine in its own PR first
  (with schema validation, rendering, tests), like E1 and E2.

══════════════════════════════════════════════════════════════
5. LIVE LABS
══════════════════════════════════════════════════════════════
Build each chapter's lab before its chapter (the table in dm.md §4, "L-labs"):
logic in labs/<name>Logic.ts, UI in labs/<Name>.tsx, registered in
labs/index.ts AND LAB_TABS in scripts/build-gate-notes.js (same ids; add
"trees" and "matching" to graph-lab), a Python twin in _checks/dm/, test
vectors lab_vectors_chN.json from lN_lab_vectors.py, and a Node test in
tests/gate-notes-dm.test.js that runs the TS logic on every vector. Step / Back
/ Play / Reset, editable input, the current step explained in words
(aria-live="polite"), input limits with clear messages, keyboard only,
360 px, light and dark, all ten themes, axe 0, no auto-play under reduced
motion. Use the site kit (ed-* classes, tokens, data-ui hooks).

══════════════════════════════════════════════════════════════
6. LINKING
══════════════════════════════════════════════════════════════
- content/nexus/dm.json: link every lesson from a node as in dm.md §6 (add the
  nodes euler-hamilton and matching-covers); rewrite desc, summary and topics
  to match the lessons; keep the README rules. Run npm run nexus:check and
  node --test tests/nexus-subjects.test.js.
- Link related lessons across subjects in the text: DM ↔ Digital Logic
  (Boolean algebra, lattices), DM → Algorithms (BFS/DFS, MST, matching), DM →
  TOC (countability, induction, relations). Link, don't re-teach.
- Check /learn/dm shows the chapter and every lesson opens in the reader.

══════════════════════════════════════════════════════════════
7. USING THE WEB
══════════════════════════════════════════════════════════════
Use web search and fetch freely to check facts, find what to cover, confirm
official answer keys, and see which traps students fall into: the official
GATE syllabus and answer keys, free textbooks and notes (dm.md §8: Diestel,
Wilf, MIT's Mathematics for Computer Science, Bondy–Murty, NPTEL), Wikipedia
for cross-checking definitions, GATE Overflow for disputed keys and traps.
Write everything in your own words with your own numbers and graphs. Never copy
text, figures or questions. Never use paid, leaked or pirated material. When
sources disagree, derive it yourself and verify by script.

══════════════════════════════════════════════════════════════
8. CHECK BEFORE EVERY PUSH (all must pass; fix causes, never skip)
══════════════════════════════════════════════════════════════
  node scripts/build-gate-notes.js --drafts
  npm run notes:build && npm run notes:check
  python3 scripts/gate-notes/run_checks.py
  npm run nexus:check
  npm test
  cd client && npx tsc -b && npx oxlint src && npx vite build
Browser (for engine jobs, labs and every lesson):
  PORT=3300 node scripts/hive-demo.js            (login owner / owner123)
  node client/scripts/check-page.cjs /gate/notes/dm/<lesson-id> <name> light,dark,phone
  → axe 0, overflowX 0, every scene plays to the end, every lab loads; also
  check 360 px wide, reduced motion, and two other themes.
Then review yourself as a strict GATE examiner and answer every line in the PR:
  [ ] Every definition exact; every theorem with its conditions; every proof valid.
  [ ] Every number re-derived by a passing script; every PYQ key verified.
  [ ] Exactly the outline's PYQs embedded, each with tests="…".
  [ ] ≥ 8 scenes (≥ 10 in Ch 8); every caption matches its frame; phone
      layout designed; no overlaps; graph drawings pass check_drawing.
  [ ] The lab matches its Python twin on every vector; keyboard; axe 0.
  [ ] Nothing copied; no author names anywhere; no PDF or render committed.
  [ ] Nexus links every lesson; /learn/dm shows them.
  [ ] Light, dark, 360 px, reduced motion, two other themes all fine.
  [ ] The dm.md §3 bar is met (paste the lessons_chN.py report).

══════════════════════════════════════════════════════════════
9. GIT, PR, REVIEW, PUBLISH
══════════════════════════════════════════════════════════════
- NEVER commit to main. Branch names as in dm.md §4. No force-push, no rebase
  of shared branches; on conflict merge main in, regenerate src/gate/notes/
  with the build script (never hand-merge generated JSON), re-run all checks.
- No model names or ids in commits, PRs or code comments. No secrets. No
  personal data sent anywhere.
- One PR per job: what you built, the numbers (paste the lessons_chN.py
  report), the self-review answers, screenshots (light, dark, phone). Merge
  (squash) when CI is green; lessons stay status: review.
- Publishing a chapter needs an independent review by a reviewer from a
  different model family: write docs/handoff/review-dm-chNN.md (every lesson,
  every PYQ id, every scene name, what to check) and stop. After every finding
  is fixed, flip the chapter's lessons to status: published, rebuild, merge.
- Never edit the published Chapter 1 lessons except to add links to new ones.
- Do not touch Hive. Design tokens only; no raw colours; light and dark both
  work.

══════════════════════════════════════════════════════════════
10. END OF EVERY SESSION
══════════════════════════════════════════════════════════════
- Update content/gate-notes/_progress.json (subjects.dm) in the same PR.
- Append to docs/handoff/notes-build-log.md: date, job, PR link, the numbers,
  what is next, anything blocked and why.
- Tell the owner in short, simple sentences: what you finished, the PR link,
  what is next, and anything you need from them. Be honest about what failed
  or is not done.
````
