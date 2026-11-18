# GATE notes build log (DM, TOC, CD, COA)

One entry per session, newest last. The pipeline is
`docs/gate/notes-pipeline/README.md`; the prompt is
`docs/gate/notes-pipeline/VIBE_PROMPT.md`.

Each entry: date · unit · PR · numbers (words, examples, scenes, labs, PYQs
embedded, practice) · what is next · anything blocked and why.

## 2026-11-17 · pipeline written

- Pipeline, animation standard and per-subject plans written in
  `docs/gate/notes-pipeline/`.
- Next unit: A1, viz engine element `state` + `loop`.
- Reference notes: not yet in the private repo `nexora-gate-notes` (the owner is
  uploading them). Until then, digests are "textbook-only".

## 2026-11-18 · Discrete Mathematics job book

- `docs/gate/notes-pipeline/dm.md` rewritten as the ordered job book (J0, E1 smooth
  motion, E2 loops, E3 graph toolkit, six labs, C2–C8, wrap-up), with the scenes each
  lesson must have; `VIBE_PROMPT_DM.md` is the prompt.
- The owner uploaded `GATE_CSE_Discrete_Mathematics_5_Notes.pdf` to the repository root.
  Vibe copies it into `GATE_NOTES/` and never commits anything from it.
- Next job: J0, then E1.

## 2026-11-18 · DM job E3 — Python graph toolkit (branch `notes/dm-graph-toolkit`)

- `content/gate-notes/_checks/dm/graphlib.py`: `Graph` (simple/multi, directed)
  with adjacency/incidence matrices, complement, line graph, induced subgraph,
  edge deletion/contraction, union, cartesian product, relabel; Havel–Hakimi
  with trace; BFS/DFS with event traces; components, distances, diameter, BFS
  layers; Tarjan articulation points and bridges with events; κ/λ and min edge
  cut (exact, n ≤ 10); isomorphism with invariant pruning + backtracking and
  non-isomorphism certificates; automorphism count; tree test, Prüfer
  encode/decode with trace, matrix-tree count (sympy), spanning-tree
  enumeration, fundamental cycles, Kruskal/Prim with traces; Euler tests,
  Hierholzer, Fleury; Hamiltonian cycle/path backtracking, Dirac/Ore; Euler
  planarity bounds + exhaustive Kuratowski-subdivision search (n ≤ 8);
  crossing counter; faces from a rotation system; greedy/exact χ, chromatic
  polynomial (deletion–contraction), bipartite with the odd cycle, König edge
  colouring (Δ rounds of Hopcroft–Karp), χ′ by search; augmenting-path and exact
  maximum matching, perfect-matching count, vertex cover, independent set,
  edge cover, clique, König/Gallai identities, Hall violator; counting
  formulas. Named graphs: K, C, P, W, K_{m,n}, Q_n, Petersen, grid,
  dodecahedron, crown; one builder per dm PYQ that has a graph (named by PYQ
  id), re-laid-out from the figure descriptions.
- `content/gate-notes/_checks/dm/graphdraw.py`: deterministic layouts for both
  canvases (circle, bipartite, grid, layered, star/wheel; presets Petersen,
  Q3, K5, K3,3, dodecahedron Schlegel, baked planar PYQ layouts); element
  builders (`vertex`/`edge`/`loop`, queue/stack panels, degree table,
  adjacency matrix grid); fixed state tones; `steps_from_trace`;
  `check_drawing` (drawn sets equal the graph's, vertex separation ≥ 2.4r,
  edge clearance ≥ r+4, no crossings when planar, canvas bounds, min text) in
  both canvases.
- `content/gate-notes/_checks/dm/graph_toolkit.py` (run by CI): unit checks on
  hand-known answers; every dm PYQ-with-graph computed property asserted
  against the official key (articulation points 3; min cut 2; χ = 4, 3, 3, 2;
  only G1 non-planar; isomorphism option B; Petersen ≅ option C; K4 and Q3
  planar); networkx (pinned 3.4.2, referee only) cross-check on 300 random
  small graphs, fixed seed — degrees, handshake, components, BFS distances,
  articulation points, bridges, κ, λ, bipartite + odd cycle, χ, max matching,
  spanning-tree count (vs enumeration), Eulerian, planarity, isomorphism; 19
  sample scenes (10 layouts + 9 PYQ graphs) pass `check_drawing` in both
  canvases.
- CI: `notes-checks` job now installs `networkx==3.4.2`.
- Checks: `run_checks.py` 119/119; `notes:build` + `notes:check` ok;
  `nexus:check` ok; `npm test` 767/773 (the 6 failures are the dry-run C/Java
  tests needing clang/javac, absent here and failing on main too).
- Next job per dm.md §4: C2 (Chapter 2, first-order logic) — expand its plan,
  then lessons one per commit.

## 2026-11-18 · DM job C2 — Chapter 2 predicate logic, both lessons (branch `notes/dm-ch02`)

- `content/gate-notes/dm/02-predicate-logic/_plan.md` expanded to DL-plan depth
  (teaching sequences with block ids, PYQ→tests maps, scene-by-scene plans, lab tabs,
  practice themes for both lessons); `dmlib.check_lessons` gained floor params
  (`min_viz/min_animated/min_examples/min_practice/min_labs/min_intuition`, defaults keep ch1
  behaviour) and `lessons_ch2.py` now enforces the dm.md §3 bar:
  `min_words=7000, min_viz=8, min_animated=7, min_examples=25, min_practice=10, min_labs=1`.
- Lesson `01-predicates-quantifiers`: 7,446 words, 42 worked examples, 9 viz (9 animated),
  1 lab (quantifier-lab/evaluate), 19 PYQs, 12 practice — status review.
- Lesson `02-quantifier-laws-validity`: 7,430 words, 54 worked examples, 8 viz (8 animated),
  1 lab (quantifier-lab/models), 16 PYQs, 12 practice — status review.
- `predlib.py` (FOL parser/evaluator) + one tokenizer fix (ASCII `exists!`); `l2_01_predicates.py`
  and `l2_02_validity.py` re-derive every example answer, all 35 ch2 PYQ keys (finite-domain
  search + seeded sampling, seed 20261118) and all 24 practice answers; `_sol_ch2_l01.py` /
  `_sol_ch2_l02.py` write 35 teacher-style v2 solutions; `_viz_ch2_l01.py` / `_viz_ch2_l02.py`
  generate the 17 scenes (all animated; `viz_ch2.py` checks files == generator).
- needsReview PYQs resolved with evidence, keys unchanged (logged in `_errata/dm.md` §3):
  cse-2008-cs-30 (loose ∃y brackets in option A), cse-2003-cs-71 (B and D printed identically),
  cse-2013-cs-47 (as printed A and D both non-equivalent; GATE 2013 marks-to-all; intended key D),
  cse-2015-2-cs-55 (propositional vs FOL "tautology"; key C).
- Nexus: `predicate-logic` node now lists both lessons with updated desc/summary/topics/tags.
- Checks: `run_checks.py` 121/121; `build-gate-notes.js --drafts` 0 errors;
  `nexus:check` OK (65 subjects); nexus tests 29/29; `npm test` 765/773 — the 6 known
  clang/javac dry-run failures plus the 2 notes `--check` assertions, which fail only because
  the two lessons are `status: review` (by design; they pass after the N7/N8 flip to
  published). `notes:build`/`notes:check` production modes likewise expect published.
- Next: independent review (`docs/handoff/review-dm-ch02.md`), then flip to published (N8),
  rebuild, merge. After that the next job per dm.md §4 is relation-lab.
